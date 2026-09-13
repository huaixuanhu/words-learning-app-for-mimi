import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, mkdir, mkdtemp, open, readFile, readdir, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
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
      resolveResult(result);
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
    });
    child.on("error", () => finish({ status: null, stopped: false, stdout: "" }));
    child.on("close", (status) => {
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
  const workRoot = await mkdtemp(join(tmpdir(), "mimi-daily-backup-"));
  await chmod(workRoot, 0o700);
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
  if (!tempCleaned || result.cleanupRequired) return { ok: false, cleanupRequired: true };
  if (result.status !== 0 || result.stopped) return { ok: false };
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
    if (!/^\d{4}-\d{2}\.json$/u.test(name)) continue;
    try {
      const receipt = JSON.parse((await regularFile(join(stateRoot, name))).toString("utf8"));
      if (receipt.artifactKind !== "monthly-production-backup-attempt-v1" ||
        receipt.date !== name.slice(0, -5) || receipt.status !== "verified" || !receipt.archive ||
        backupDateKey(new Date(receipt.attemptedAt)).slice(0, 7) !== receipt.date) continue;
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
  const distinct = verified.filter((entry) => {
    if (names.has(entry.archive.filename)) return false;
    names.add(entry.archive.filename);
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
  cadence = "daily", backupRoot = BACKUP_ROOT, evidenceRoot = EVIDENCE_ROOT,
} = {}) {
  if (cadence !== "daily" && cadence !== "monthly") throw new Error("Unsupported backup cadence");
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

  const receiptPath = join(stateRoot, `${date}.json`);
  let retainLock = false;
  try {
    try {
      const previous = JSON.parse((await regularFile(receiptPath)).toString("utf8"));
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
  const monthly = process.argv.length === 4 && process.argv[2] === "--monthly" && process.argv[3] === MONTHLY_CONFIRMATION;
  if (!monthly && (process.argv.length !== 3 || process.argv[2] !== CONFIRMATION)) {
    console.error(JSON.stringify({ ok: false, code: "DAILY_BACKUP_CONFIRMATION_REQUIRED" }));
    process.exitCode = 1;
  } else {
    try {
      const result = await runDailyProductionBackup({ cadence: monthly ? "monthly" : "daily" });
      console.log(JSON.stringify(result));
      if (!result.ok) process.exitCode = 1;
    } catch {
      console.error(JSON.stringify({ ok: false, code: "DAILY_BACKUP_STOPPED_SAFELY" }));
      process.exitCode = 1;
    }
  }
}
