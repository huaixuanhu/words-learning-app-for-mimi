import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { backupDateKey, cleanRestoreDirectory, runBoundedProcess, runDailyProductionBackup } from "./daily-production-backup.mjs";

const roots = [];
async function temporaryState() {
  const root = await mkdtemp(join(tmpdir(), "mimi-daily-backup-test-"));
  roots.push(root);
  return root;
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("daily encrypted backup dispatch", () => {
  it("uses Melbourne calendar dates including DST", () => {
    expect(backupDateKey(new Date("2026-09-13T13:59:59Z"))).toBe("2026-09-13");
    expect(backupDateKey(new Date("2026-09-13T14:00:00Z"))).toBe("2026-09-14");
    expect(backupDateKey(new Date("2026-12-31T13:00:00Z"))).toBe("2027-01-01");
  });

  it.each([true, false])("attempts only once per date even after failure: %s", async (ok) => {
    const stateRoot = await temporaryState();
    const execute = vi.fn(async () => ({ ok }));
    const input = { stateRoot, execute, now: new Date("2026-09-13T21:00:00Z") };
    const first = await runDailyProductionBackup(input);
    const second = await runDailyProductionBackup(input);

    expect(first.status).toBe(ok ? "verified" : "failed");
    expect(second.status).toBe("already-attempted");
    expect(second.ok).toBe(ok);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await readFile(first.receiptPath, "utf8")).status)
      .toBe(ok ? "verified" : "failed");
  });

  it("excludes concurrent runs and leaves a crashed run for review", async () => {
    const stateRoot = await temporaryState();
    await mkdir(join(stateRoot, "run.lock"));
    const execute = vi.fn();
    const result = await runDailyProductionBackup({ stateRoot, execute });
    expect(result.status).toBe("busy");
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not rerun an interrupted attempt after its lock is reviewed", async () => {
    const stateRoot = await temporaryState();
    const now = new Date("2026-09-13T21:00:00Z");
    await writeFile(join(stateRoot, `${backupDateKey(now)}.json`), '{"status":"running"}');
    const execute = vi.fn();
    const result = await runDailyProductionBackup({ stateRoot, execute, now });
    expect(result).toMatchObject({ ok: false, status: "already-attempted", previousStatus: "running" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("records execution failure without storing raw thrown details and permits the next date", async () => {
    const stateRoot = await temporaryState();
    const execute = vi.fn().mockRejectedValueOnce(new Error("private connection detail"))
      .mockResolvedValueOnce({ ok: true });
    const first = await runDailyProductionBackup({ stateRoot, execute, now: new Date("2026-09-13T21:00:00Z") });
    expect(await readFile(first.receiptPath, "utf8")).not.toContain("private connection");
    const next = await runDailyProductionBackup({ stateRoot, execute, now: new Date("2026-09-14T21:00:00Z") });
    expect(next.status).toBe("verified");
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("retains the global lock when isolated restore cleanup cannot be verified", async () => {
    const stateRoot = await temporaryState();
    const execute = vi.fn().mockResolvedValue({ ok: false, cleanupRequired: true });
    const first = await runDailyProductionBackup({ stateRoot, execute, now: new Date("2026-09-13T21:00:00Z") });
    expect(first.status).toBe("cleanup-required");
    expect(JSON.parse(await readFile(first.receiptPath, "utf8")).status).toBe("cleanup-required");
    const next = await runDailyProductionBackup({ stateRoot, execute, now: new Date("2026-09-14T21:00:00Z") });
    expect(next.status).toBe("busy");
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("bounded backup subprocess", () => {
  it("captures successful output and hides failed spawn details", async () => {
    expect(await runBoundedProcess(process.execPath, ["-e", "process.stdout.write('ok')"]))
      .toMatchObject({ status: 0, stdout: "ok", stopped: false });
    expect(await runBoundedProcess("/not-an-executable", []))
      .toMatchObject({ status: null, stdout: "", stopped: false });
  });

  it("kills the owned process group even if a descendant ignores SIGTERM", async () => {
    const stateRoot = await temporaryState();
    const pidFile = join(stateRoot, "descendant.pid");
    const childSource = `process.on('SIGTERM',()=>{});require('node:fs').writeFileSync(process.argv[1],String(process.pid));setInterval(()=>{},1000)`;
    const parentSource = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(childSource)},process.argv[1]],{stdio:'inherit'});setInterval(()=>{},1000)`;
    const started = Date.now();
    const result = await runBoundedProcess(process.execPath, ["-e", parentSource, pidFile], { timeoutMs: 500, graceMs: 100 });
    expect(result).toMatchObject({ status: null, stopped: true, stdout: "", cleanupRequired: false });
    expect(Date.now() - started).toBeLessThan(3_000);
    const pid = Number(await readFile(pidFile, "utf8"));
    await vi.waitFor(() => expect(() => process.kill(pid, 0)).toThrow(), { timeout: 2_000 });
  });

  it("stops excessive output within its bound", async () => {
    const result = await runBoundedProcess(process.execPath, ["-e", "setInterval(()=>process.stdout.write('1234567890'),1)"], { timeoutMs: 2_000, graceMs: 20, maxOutputBytes: 15 });
    expect(result).toMatchObject({ status: null, stopped: true, stdout: "" });
  });
});

describe("isolated restore cleanup after interruption", () => {
  async function restoreDirectory(withPid = true) {
    const workRoot = await temporaryState();
    const pgData = join(workRoot, "mimi-v2-1-schema6-backup-test", "pgdata");
    await mkdir(pgData, { recursive: true });
    if (withPid) await writeFile(join(pgData, "postmaster.pid"), "12345\n");
    return { workRoot, pgData };
  }

  it("stops only this invocation's daemon and checks it stopped before deleting files", async () => {
    const { workRoot, pgData } = await restoreDirectory();
    const execute = vi.fn().mockResolvedValueOnce({ status: 0 }).mockResolvedValueOnce({ status: 3 });
    expect(await cleanRestoreDirectory(workRoot, { execute, interrupted: true })).toBe(true);
    expect(execute).toHaveBeenNthCalledWith(1, "/opt/homebrew/opt/postgresql@17/bin/pg_ctl",
      ["-D", pgData, "-m", "immediate", "-t", "5", "-w", "stop"], { timeoutMs: 10_000 });
    expect(execute).toHaveBeenNthCalledWith(2, "/opt/homebrew/opt/postgresql@17/bin/pg_ctl",
      ["-D", pgData, "status"], { timeoutMs: 10_000 });
    await expect(readFile(join(pgData, "postmaster.pid"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("retains files if daemon shutdown cannot be verified", async () => {
    const { workRoot, pgData } = await restoreDirectory();
    const execute = vi.fn().mockResolvedValue({ status: null });
    expect(await cleanRestoreDirectory(workRoot, { execute, interrupted: true })).toBe(false);
    expect(await readFile(join(pgData, "postmaster.pid"), "utf8")).toBe("12345\n");
  });

  it("requires review if interrupted startup has no PID file yet", async () => {
    const { workRoot, pgData } = await restoreDirectory(false);
    await writeFile(join(pgData, "initializing"), "fixture");
    const execute = vi.fn();
    expect(await cleanRestoreDirectory(workRoot, { execute, interrupted: true })).toBe(false);
    expect(execute).not.toHaveBeenCalled();
    expect(await readFile(join(pgData, "initializing"), "utf8")).toBe("fixture");
  });
});
