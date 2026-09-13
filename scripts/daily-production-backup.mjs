import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_ROOT = join(REPO_ROOT, "local_artifacts", "daily-production-backups");
const RUNNER = join(REPO_ROOT, "scripts", "v2-1-production-backup.mjs");
const CONFIRMATION = "--i-confirm-daily-production-backup";
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

async function executeExistingBackup() {
  const workRoot = await mkdtemp(join(tmpdir(), "mimi-daily-backup-"));
  await chmod(workRoot, 0o700);
  let result;
  try {
    result = await runBoundedProcess(process.execPath, [
      RUNNER, "production", "--i-confirm-v2-1-production-encrypted-backup",
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

/** One attempt per local calendar day; failed/unfinished attempts need human review. */
export async function runDailyProductionBackup({
  now = new Date(), stateRoot = STATE_ROOT, execute = executeExistingBackup,
} = {}) {
  const date = backupDateKey(now);
  await mkdir(stateRoot, { recursive: true, mode: 0o700 });
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
      const previous = JSON.parse(await readFile(receiptPath, "utf8"));
      return {
        ok: previous.status === "verified",
        status: "already-attempted",
        previousStatus: previous.status,
        date,
      };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    const receipt = {
      artifactKind: "daily-production-backup-attempt-v1",
      date,
      attemptedAt: now.toISOString(),
      status: "running",
    };
    // Record before any remote read, so a restart cannot repeatedly consume quota.
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    let result;
    try { result = await execute(); } catch { result = { ok: false }; }
    retainLock = result?.cleanupRequired === true;
    const verified = result?.ok === true;
    const status = retainLock ? "cleanup-required" : verified ? "verified" : "failed";
    await writeFile(receiptPath, `${JSON.stringify({
      ...receipt,
      status,
      completedAt: new Date().toISOString(),
      ...(verified && result.evidence ? { evidence: result.evidence } : {}),
    }, null, 2)}\n`, { mode: 0o600 });
    return { ok: verified && !retainLock, status, date, receiptPath };
  } finally {
    if (!retainLock) await rmdir(lockPath);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3 || process.argv[2] !== CONFIRMATION) {
    console.error(JSON.stringify({ ok: false, code: "DAILY_BACKUP_CONFIRMATION_REQUIRED" }));
    process.exitCode = 1;
  } else {
    try {
      const result = await runDailyProductionBackup();
      console.log(JSON.stringify(result));
      if (!result.ok) process.exitCode = 1;
    } catch {
      console.error(JSON.stringify({ ok: false, code: "DAILY_BACKUP_STOPPED_SAFELY" }));
      process.exitCode = 1;
    }
  }
}
