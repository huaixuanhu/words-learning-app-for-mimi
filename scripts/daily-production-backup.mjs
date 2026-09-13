import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, mkdir, mkdtemp, open, readFile, readdir, realpath, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256 } from "./v2-stage8-3-contract.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_ROOT = join(REPO_ROOT, "local_artifacts", "daily-production-backups");
const RUNNER = join(REPO_ROOT, "scripts", "v2-1-production-backup.mjs");
const CONFIRMATION = "--i-confirm-daily-production-backup";
const MONTHLY_CONFIRMATION = "--i-confirm-monthly-production-backup";
const MONTHLY_NAMESPACE = "monthly-local-v1";
const BACKUP_ROOT = join(homedir(), "Documents", "Mimi Vocabulary Backups");
const EVIDENCE_ROOT = join(REPO_ROOT, "local_artifacts", "v2-1-production");
const ARCHIVE_NAME = /^mimi-production-schema6-v2-1-(\d{8}T\d{6}Z)-[a-f0-9]{12}\.dump\.age$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const PG_CTL = "/opt/homebrew/opt/postgresql@17/bin/pg_ctl";
const SAFE_PHASES = new Set(["local-guard", "neon-target", "source-inventory-before", "encrypted-backup", "source-inventory-after", "isolated-restore"]);
const SAFE_CODES = new Set([
  "V2_1_PRODUCTION_OPERATION_FAILED",
  ...["COMMAND_FAILED", "CONFIRMATION_REQUIRED", "DIRECTORY_INVALID", "GIT_DIRTY", "GIT_INVALID", "IDENTITY_INVALID", "RECIPIENT_INVALID", "RESTORE_MISMATCH", "SCHEMA_MISMATCH", "SNAPSHOT_INVALID", "SOURCE_CHANGED", "TOOL_VERSION_MISMATCH"].map((code) => `V2_1_BACKUP_${code}`),
  ...["API_KEY_INVALID", "CONNECTION_INVALID", "CONNECTION_MISMATCH", "CONTROL_PLANE_INVALID", "CONTROL_PLANE_REJECTED", "CONTROL_PLANE_UNAVAILABLE", "ENDPOINT_MISMATCH", "KEYCHAIN_VALUE_UNAVAILABLE", "MAIN_BRANCH_MISMATCH", "PROJECT_MISMATCH", "READY_IDENTITY_MISMATCH", "STAGING_BRANCH_MISMATCH"].map((code) => `V2_1_NEON_${code}`),
]);
const RETRY_REVIEW_REASON = "operator-reviewed-failure-and-approved-one-retry";

function safeRunnerFailure(value) {
  return value && SAFE_CODES.has(value.code) && SAFE_PHASES.has(value.phase)
    ? { code: value.code, phase: value.phase } : null;
}

export async function createBackupWorkRoot() {
  // macOS's per-user TMPDIR makes the nested PostgreSQL socket exceed 104 bytes.
  const base = await realpath("/tmp");
  const root = await mkdtemp(join(base, "mimi-bak-"));
  await chmod(root, 0o700);
  const socket = join(root, "mimi-v2-1-schema6-backup-XXXXXX", "socket", ".s.PGSQL.55931");
  if (Buffer.byteLength(socket) >= 104) {
    await rmdir(root);
    throw new Error("The isolated restore socket path is too long");
  }
  return root;
}

export function backupDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** A dedicated POSIX process group also bounds non-daemon child tools. */
export function runBoundedProcess(command, args, {
  cwd = REPO_ROOT, env = process.env, timeoutMs = 10 * 60_000,
  graceMs = 2_000, maxOutputBytes = 1024 * 1024,
} = {}) {
  return new Promise((resolveResult) => {
    const child = spawn(command, args, { cwd, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderrLine = "";
    let safeError = null;
    let outputBytes = 0;
    let stopping = false;
    let groupCleanupRequired = false;
    let completed = false;
    let deadline;
    let escalation;
    const finish = (result) => {
      if (completed) return;
      completed = true;
      clearTimeout(deadline);
      clearTimeout(escalation);
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      resolveResult({ ...result, ...(safeError ? { safeError } : {}) });
    };
    const inspectErrorLine = (line) => {
      try {
        const value = JSON.parse(line);
        if (value?.ok === false) safeError = safeRunnerFailure(value.error) ?? safeError;
      } catch { /* Raw stderr is discarded, including unstructured driver errors. */ }
    };
    const signalGroup = (signal) => {
      if (!child.pid) return;
      try { process.kill(-child.pid, signal); } catch (error) {
        if (error.code !== "ESRCH") groupCleanupRequired = true;
      }
    };
    const stop = () => {
      if (stopping || completed) return;
      stopping = true;
      signalGroup("SIGTERM");
      // Do not finish on the parent's close: a child may ignore SIGTERM.
      escalation = setTimeout(() => {
        signalGroup("SIGKILL");
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
        finish({ status: null, stopped: true, stdout: "", cleanupRequired: groupCleanupRequired });
      }, graceMs);
    };
    child.stdout.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) stop();
      else stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) stop();
      else {
        stderrLine += chunk.toString("utf8");
        let newline;
        while ((newline = stderrLine.indexOf("\n")) >= 0) {
          inspectErrorLine(stderrLine.slice(0, newline));
          stderrLine = stderrLine.slice(newline + 1);
        }
      }
    });
    child.on("error", () => finish({ status: null, stopped: false, stdout: "" }));
    child.on("close", (status) => {
      if (stderrLine) inspectErrorLine(stderrLine);
      if (!stopping) finish({ status, stopped: false, stdout });
    });
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    deadline = setTimeout(stop, timeoutMs);
  });
}

// pg_ctl starts a daemon that can escape the process group. Each invocation has
// its own TMPDIR so timeout cleanup can identify only its isolated restore DB.
export async function cleanRestoreDirectory(workRoot, {
  execute = runBoundedProcess, interrupted = false,
} = {}) {
  try {
    for (const entry of await readdir(workRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("mimi-v2-1-schema6-backup-")) continue;
      const pgData = join(workRoot, entry.name, "pgdata");
      try { await readFile(join(pgData, "postmaster.pid"), "utf8"); } catch (error) {
        if (error.code === "ENOENT") {
          // An interrupted pg_ctl start can race before its PID file appears.
          // Keep the directory and global lock if absence cannot prove cleanup.
          if (interrupted) {
            try { await stat(pgData); return false; } catch (statError) {
              if (statError.code !== "ENOENT") throw statError;
            }
          }
          continue;
        }
        throw error;
      }
      await execute(PG_CTL, ["-D", pgData, "-m", "immediate", "-t", "5", "-w", "stop"], { timeoutMs: 10_000 });
      const status = await execute(PG_CTL, ["-D", pgData, "status"], { timeoutMs: 10_000 });
      if (status.status !== 3) return false;
    }
    await rm(workRoot, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

async function executeExistingBackup({ monthly = false } = {}) {
  const workRoot = await createBackupWorkRoot();
  let result;
  try {
    result = await runBoundedProcess(process.execPath, [
      RUNNER, "production", "--i-confirm-v2-1-production-encrypted-backup",
      ...(monthly ? ["--monthly-local-archive"] : []),
    ], {
      env: { ...process.env, PGCONNECT_TIMEOUT: "10", TMPDIR: workRoot },
    });
  } catch {
    result = { status: null };
  }
  const tempCleaned = await cleanRestoreDirectory(workRoot, { interrupted: result.stopped === true });
  const failure = safeRunnerFailure(result.safeError);
  if (!tempCleaned || result.cleanupRequired) return { ok: false, cleanupRequired: true, ...(failure ? { failure } : {}) };
  if (result.status !== 0 || result.stopped) return { ok: false, ...(failure ? { failure } : {}) };
  try {
    const value = JSON.parse(result.stdout);
    return value?.ok === true && value.restoreVerified === true &&
      typeof value.evidence?.path === "string" &&
      typeof value.evidence?.sha256 === "string" &&
      /^[a-f0-9]{64}$/u.test(value.evidence.sha256)
      ? { ok: true, evidence: value.evidence }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}

function digest(bytes) { return createHash("sha256").update(bytes).digest("hex"); }

async function regularFile(path) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!(await file.stat()).isFile()) throw new Error("Backup file is not a regular owned file");
    return await file.readFile();
  } finally { await file.close(); }
}

async function ownedDirectory(path) {
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Backup directory is not an owned directory");
}

async function updateReceipt(path, value) {
  const temporary = `${path}.${randomUUID()}.pending`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}

async function verifyMonthlyArchive(archiveRoot, archive) {
  await ownedDirectory(archiveRoot);
  if (!archive || archive.namespace !== MONTHLY_NAMESPACE || !ARCHIVE_NAME.test(archive.filename) ||
    !Number.isSafeInteger(archive.bytes) || archive.bytes <= 0 || !SHA256.test(archive.sha256)) {
    throw new Error("Monthly archive identity is invalid");
  }
  const path = join(archiveRoot, archive.filename);
  const bytes = await regularFile(path);
  if (bytes.length !== archive.bytes || digest(bytes) !== archive.sha256) throw new Error("Monthly archive checksum mismatch");
  return path;
}

async function verifiedMonthlyResult(result, { archiveRoot, evidenceRoot, attemptedAt, completedAt }) {
  if (!result?.ok || !result.evidence || !SHA256.test(result.evidence.sha256)) return null;
  const evidenceDirectory = dirname(result.evidence.path);
  const timestamp = evidenceDirectory.split(/[\\/]/u).at(-1);
  if (!/^\d{8}T\d{6}Z$/u.test(timestamp) ||
    resolve(result.evidence.path) !== join(resolve(evidenceRoot), timestamp, "production-backup-evidence.json")) return null;
  await ownedDirectory(evidenceRoot);
  await ownedDirectory(evidenceDirectory);
  const bytes = await regularFile(result.evidence.path);
  if (digest(bytes) !== result.evidence.sha256) return null;
  const evidence = JSON.parse(bytes.toString("utf8"));
  const archiveTime = Date.parse(timestamp.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/u, "$1-$2-$3T$4:$5:$6Z"));
  const attemptTime = Date.parse(attemptedAt);
  const completeTime = Date.parse(completedAt);
  const evidenceTime = Date.parse(evidence.completedAt);
  if (evidence.artifactKind !== "v2-1-schema6-production-backup-restore-v1" ||
    evidence.restore?.verified !== true || evidence.restore?.snapshotMatched !== true ||
    ![archiveTime, attemptTime, completeTime, evidenceTime].every(Number.isFinite) ||
    evidenceTime < attemptTime || evidenceTime > completeTime ||
    archiveTime < Math.floor(attemptTime / 1000) * 1000 || archiveTime > evidenceTime ||
    evidence.archive?.filename?.match(ARCHIVE_NAME)?.[1] !== timestamp ||
    evidence.target?.projectIdSha256 !== V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256 ||
    evidence.target?.target !== "production-main" || evidence.target?.branchName !== "main" ||
    evidence.target?.regionId !== "aws-ap-southeast-2" ||
    ["controlPlaneConfirmed", "databaseMatched", "endpointMatched", "roleMatched"].some((key) => evidence.target[key] !== true) ||
    !SHA256.test(evidence.target.branchIdSha256) || !SHA256.test(evidence.target.endpointIdSha256) ||
    evidence.target.identityDigest !== digest([
      "production-main", evidence.target.branchIdSha256, evidence.target.endpointIdSha256,
      V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256, "aws-ap-southeast-2", "neondb", "neondb_owner",
    ].join("\0"))) return null;
  await verifyMonthlyArchive(archiveRoot, evidence.archive);
  return {
    namespace: MONTHLY_NAMESPACE, filename: evidence.archive.filename,
    bytes: evidence.archive.bytes, sha256: evidence.archive.sha256,
  };
}

/** Only this namespace's verified monthly receipts can authorize rotation. */
async function retainMonthlyArchives({ stateRoot, archiveRoot, evidenceRoot, currentMonth, currentArchive }) {
  const verified = [];
  for (const name of await readdir(stateRoot)) {
    const match = name.match(/^(\d{4}-\d{2})(\.retry-1)?\.json$/u);
    if (!match) continue;
    try {
      const receipt = JSON.parse((await regularFile(join(stateRoot, name))).toString("utf8"));
      if (receipt.artifactKind !== "monthly-production-backup-attempt-v1" ||
        receipt.date !== match[1] || receipt.status !== "verified" || !receipt.archive ||
        backupDateKey(new Date(receipt.attemptedAt)).slice(0, 7) !== receipt.date) continue;
      if (match[2]) {
        const original = await regularFile(join(stateRoot, `${receipt.date}.json`));
        if (receipt.reviewedRetry?.originalReceipt !== `${receipt.date}.json` ||
          receipt.reviewedRetry?.originalReceiptSha256 !== digest(original) ||
          JSON.parse(original.toString("utf8")).status !== "failed") continue;
      }
      const boundArchive = await verifiedMonthlyResult({ ok: true, evidence: receipt.evidence }, {
        archiveRoot, evidenceRoot, attemptedAt: receipt.attemptedAt, completedAt: receipt.completedAt,
      });
      if (JSON.stringify(boundArchive) !== JSON.stringify(receipt.archive)) continue;
      const path = await verifyMonthlyArchive(archiveRoot, receipt.archive);
      verified.push({ month: receipt.date, path, archive: receipt.archive });
    } catch {
      // Unreadable, altered or unclaimed archives are preserved for review.
    }
  }
  verified.sort((left, right) => right.month.localeCompare(left.month));
  const names = new Set();
  const months = new Set();
  const distinct = verified.filter((entry) => {
    if (names.has(entry.archive.filename) || months.has(entry.month)) return false;
    names.add(entry.archive.filename);
    months.add(entry.month);
    return true;
  });
  const removed = [];
  // Re-check the newly verified archive immediately before any older deletion.
  await verifyMonthlyArchive(archiveRoot, currentArchive);
  for (const entry of distinct.slice(3)) {
    if (entry.month >= currentMonth || entry.archive.filename === currentArchive.filename) continue;
    await verifyMonthlyArchive(archiveRoot, entry.archive);
    await rm(entry.path);
    removed.push(entry.archive.filename);
  }
  return { status: "complete", keptVerified: distinct.length - removed.length, removed };
}

/** One attempt per local period; failed/unfinished attempts need human review. */
export async function runDailyProductionBackup({
  now = new Date(), stateRoot = STATE_ROOT, execute,
  cadence = "daily", backupRoot = BACKUP_ROOT, evidenceRoot = EVIDENCE_ROOT, reviewedRetry = false,
} = {}) {
  if (cadence !== "daily" && cadence !== "monthly") throw new Error("Unsupported backup cadence");
  if (reviewedRetry && cadence !== "monthly") throw new Error("Reviewed retry is monthly only");
  const monthly = cadence === "monthly";
  const date = monthly ? backupDateKey(now).slice(0, 7) : backupDateKey(now);
  const archiveRoot = join(backupRoot, MONTHLY_NAMESPACE);
  await mkdir(stateRoot, { recursive: true, mode: 0o700 });
  await ownedDirectory(stateRoot);
  await chmod(stateRoot, 0o700);
  const lockPath = join(stateRoot, "run.lock");
  try {
    await mkdir(lockPath, { mode: 0o700 });
  } catch (error) {
    if (error.code === "EEXIST") return { ok: false, status: "busy", date };
    throw error;
  }

  const originalReceiptName = `${date}.json`;
  const originalReceiptPath = join(stateRoot, originalReceiptName);
  const retryReceiptPath = join(stateRoot, `${date}.retry-1.json`);
  const receiptPath = reviewedRetry ? retryReceiptPath : originalReceiptPath;
  let retainLock = false;
  try {
    let retryReview;
    if (reviewedRetry) {
      const originalBytes = await regularFile(originalReceiptPath);
      const original = JSON.parse(originalBytes.toString("utf8"));
      if (original.artifactKind !== "monthly-production-backup-attempt-v1" ||
        original.date !== date || original.status !== "failed") {
        return { ok: false, status: "reviewed-retry-not-allowed", date };
      }
      retryReview = {
        originalReceipt: originalReceiptName,
        originalReceiptSha256: digest(originalBytes),
        reason: RETRY_REVIEW_REASON,
      };
    }
    try {
      const previousBytes = await regularFile(receiptPath);
      let previous = JSON.parse(previousBytes.toString("utf8"));
      if (monthly && !reviewedRetry && previous.status === "failed") {
        try {
          const retry = JSON.parse((await regularFile(retryReceiptPath)).toString("utf8"));
          if (retry.artifactKind !== "monthly-production-backup-attempt-v1" || retry.date !== date ||
            retry.reviewedRetry?.originalReceipt !== originalReceiptName ||
            retry.reviewedRetry?.originalReceiptSha256 !== digest(previousBytes)) throw new Error("Reviewed retry does not match the original receipt");
          previous = retry;
        }
        catch (error) { if (error.code !== "ENOENT") throw error; }
      }
      return {
        ok: previous.status === "verified" && previous.retention?.status !== "review-required",
        status: "already-attempted",
        previousStatus: previous.status,
        ...(previous.retention ? { retention: previous.retention } : {}),
        date,
      };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    const receipt = {
      artifactKind: monthly ? "monthly-production-backup-attempt-v1" : "daily-production-backup-attempt-v1",
      date,
      attemptedAt: now.toISOString(),
      status: "running",
      ...(retryReview ? { reviewedRetry: retryReview } : {}),
    };
    // Record before any remote read, so a restart cannot repeatedly consume quota.
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    let result;
    try {
      if (monthly) {
        await mkdir(backupRoot, { recursive: true, mode: 0o700 });
        await ownedDirectory(backupRoot);
        await mkdir(archiveRoot, { recursive: true, mode: 0o700 });
        await ownedDirectory(archiveRoot);
        await chmod(archiveRoot, 0o700);
      }
      result = await (execute ?? (() => executeExistingBackup({ monthly })))();
    } catch { result = { ok: false }; }
    retainLock = result?.cleanupRequired === true;
    const completedAt = new Date().toISOString();
    let archive = null;
    if (monthly && !retainLock) {
      try { archive = await verifiedMonthlyResult(result, { archiveRoot, evidenceRoot, attemptedAt: receipt.attemptedAt, completedAt }); } catch { /* Preserve all old backups. */ }
    }
    const verified = result?.ok === true && (!monthly || archive !== null);
    const status = retainLock ? "cleanup-required" : verified ? "verified" : "failed";
    const completed = {
      ...receipt,
      status,
      completedAt,
      ...(verified && result.evidence ? { evidence: result.evidence } : {}),
      ...(archive ? { archive } : {}),
      ...(safeRunnerFailure(result?.failure) ? { failure: safeRunnerFailure(result.failure) } : {}),
    };
    await updateReceipt(receiptPath, completed);
    let retention;
    if (monthly && verified && !retainLock) {
      try { retention = await retainMonthlyArchives({ stateRoot, archiveRoot, evidenceRoot, currentMonth: date, currentArchive: archive }); }
      catch { retention = { status: "review-required" }; }
      await updateReceipt(receiptPath, { ...completed, retention });
    }
    return { ok: verified && !retainLock && retention?.status !== "review-required", status, date, receiptPath,
      ...(retention ? { retention } : {}) };
  } finally {
    if (!retainLock) await rmdir(lockPath);
  }
}

export function runMonthlyProductionBackup(options = {}) {
  return runDailyProductionBackup({ ...options, cadence: "monthly" });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const reviewedRetry = process.argv.length === 5 && process.argv[4] === "--retry-reviewed-monthly-backup";
  const monthly = (process.argv.length === 4 || reviewedRetry) && process.argv[2] === "--monthly" && process.argv[3] === MONTHLY_CONFIRMATION;
  if (!monthly && (process.argv.length !== 3 || process.argv[2] !== CONFIRMATION)) {
    console.error(JSON.stringify({ ok: false, code: "DAILY_BACKUP_CONFIRMATION_REQUIRED" }));
    process.exitCode = 1;
  } else {
    try {
      const result = await runDailyProductionBackup({ cadence: monthly ? "monthly" : "daily", reviewedRetry });
      console.log(JSON.stringify(result));
      if (!result.ok) process.exitCode = 1;
    } catch {
      console.error(JSON.stringify({ ok: false, code: "DAILY_BACKUP_STOPPED_SAFELY" }));
      process.exitCode = 1;
    }
  }
}
