import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { backupDateKey, cleanRestoreDirectory, runBoundedProcess, runDailyProductionBackup, runMonthlyProductionBackup } from "./daily-production-backup.mjs";
import { V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256 } from "./v2-stage8-3-contract.mjs";

const roots = [];
async function temporaryState() {
  const root = await mkdtemp(join(tmpdir(), "mimi-daily-backup-test-"));
  roots.push(root);
  return root;
}
afterEach(async () => {
  vi.useRealTimers();
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

describe("monthly independent local archive retention", () => {
  const digest = (value) => createHash("sha256").update(value).digest("hex");
  async function monthlyFixture() {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-13T00:00:00Z"));
    const root = await temporaryState();
    return { stateRoot: join(root, "state"), backupRoot: join(root, "backups"), evidenceRoot: join(root, "evidence") };
  }
  async function verifiedOutput(input, now, alter = (value) => value) {
    const timestamp = now.toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
    const filename = `mimi-production-schema6-v2-1-${timestamp}-0123456789ab.dump.age`;
    const archiveRoot = join(input.backupRoot, "monthly-local-v1");
    const evidenceDirectory = join(input.evidenceRoot, timestamp);
    await mkdir(archiveRoot, { recursive: true });
    await mkdir(evidenceDirectory, { recursive: true });
    const encrypted = Buffer.from(`synthetic-encrypted-archive-${timestamp}`);
    await writeFile(join(archiveRoot, filename), encrypted);
    const target = {
      projectIdSha256: V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256,
      branchIdSha256: "1".repeat(64), endpointIdSha256: "2".repeat(64),
      target: "production-main", branchName: "main", regionId: "aws-ap-southeast-2",
      controlPlaneConfirmed: true, databaseMatched: true, endpointMatched: true, roleMatched: true,
    };
    const evidence = alter({
      artifactKind: "v2-1-schema6-production-backup-restore-v1", completedAt: now.toISOString(),
      archive: { namespace: "monthly-local-v1", filename, bytes: encrypted.length, sha256: digest(encrypted) },
      restore: { verified: true, snapshotMatched: true },
      target: { ...target, identityDigest: digest([
        target.target, target.branchIdSha256, target.endpointIdSha256, target.projectIdSha256,
        target.regionId, "neondb", "neondb_owner",
      ].join("\0")) },
    });
    const evidenceBytes = JSON.stringify(evidence);
    const path = join(evidenceDirectory, "production-backup-evidence.json");
    await writeFile(path, evidenceBytes);
    return { ok: true, evidence: { path, sha256: digest(evidenceBytes) } };
  }
  async function runMonth(input, month) {
    const now = new Date(`2026-${month}-02T00:00:00Z`);
    vi.setSystemTime(now);
    return runMonthlyProductionBackup({ ...input, now, execute: () => verifiedOutput(input, now) });
  }

  it.each([true, false])("attempts at most once per Melbourne month, including a failed first attempt (%s)", async (success) => {
    const input = await monthlyFixture();
    const now = new Date("2026-09-13T00:00:00Z");
    const execute = vi.fn(() => success ? verifiedOutput(input, now) : { ok: false });
    const first = await runMonthlyProductionBackup({ ...input, now, execute });
    const duplicate = await runMonthlyProductionBackup({ ...input, now: new Date("2026-09-29T00:00:00Z"), execute });
    expect(first.status).toBe(success ? "verified" : "failed");
    expect(duplicate).toMatchObject({ status: "already-attempted", date: "2026-09", ok: success });
    expect(execute).toHaveBeenCalledTimes(1);
    expect((await runMonth(input, "10")).status).toBe("verified");
  });

  it("keeps the latest three verified months and preserves release archives and unclaimed files", async () => {
    const input = await monthlyFixture();
    await mkdir(input.backupRoot, { recursive: true });
    const release = join(input.backupRoot, "release-backup.dump.age");
    await writeFile(release, "historical release");
    for (const month of ["06", "07", "08"]) expect((await runMonth(input, month)).ok).toBe(true);
    const archiveRoot = join(input.backupRoot, "monthly-local-v1");
    await writeFile(join(archiveRoot, "unclaimed.dump.age"), "keep for review");
    const result = await runMonth(input, "09");
    expect(result.retention).toMatchObject({ status: "complete", keptVerified: 3 });
    expect(result.retention.removed).toEqual([expect.stringContaining("20260602")]);
    expect(await readFile(release, "utf8")).toBe("historical release");
    expect(await readFile(join(archiveRoot, "unclaimed.dump.age"), "utf8")).toBe("keep for review");
    expect((await readdir(archiveRoot)).filter((name) => name.startsWith("mimi-production"))).toHaveLength(3);
    expect(JSON.parse(await readFile(join(input.stateRoot, "2026-06.json"), "utf8")).status).toBe("verified");
  });

  it.each(["restore", "checksum", "identity", "evidence", "future"])("never prunes when the newest archive fails %s verification", async (failure) => {
    const input = await monthlyFixture();
    for (const month of ["06", "07", "08"]) await runMonth(input, month);
    const archiveRoot = join(input.backupRoot, "monthly-local-v1");
    const olderNames = await readdir(archiveRoot);
    const now = new Date("2026-09-02T00:00:00Z");
    vi.setSystemTime(now);
    const result = await runMonthlyProductionBackup({ ...input, now, execute: async () => {
      const output = await verifiedOutput(input, now, (evidence) => {
        if (failure === "restore") evidence.restore.snapshotMatched = false;
        if (failure === "checksum") evidence.archive.sha256 = "0".repeat(64);
        if (failure === "identity") evidence.target.projectIdSha256 = "0".repeat(64);
        if (failure === "future") evidence.completedAt = "2026-10-02T00:00:00Z";
        return evidence;
      });
      if (failure === "evidence") output.evidence.sha256 = "0".repeat(64);
      return output;
    } });
    expect(result.status).toBe("failed");
    expect(result.retention).toBeUndefined();
    for (const name of olderNames) await expect(readFile(join(archiveRoot, name))).resolves.toBeDefined();
  });

  it("does not count altered old evidence toward the three retained recovery copies", async () => {
    const input = await monthlyFixture();
    for (const month of ["05", "06", "07", "08"]) {
      if (month === "08") {
        // Prevent an earlier rotation, retaining the three initially verified months.
        const old = JSON.parse(await readFile(join(input.stateRoot, "2026-06.json"), "utf8"));
        await writeFile(old.evidence.path, "altered evidence");
      }
      await runMonth(input, month);
    }
    const result = await runMonth(input, "09");
    expect(result.retention.removed).toEqual([expect.stringContaining("20260502")]);
    expect(await readdir(join(input.backupRoot, "monthly-local-v1"))).toEqual(expect.arrayContaining([expect.stringContaining("20260602")]));
  });

  it("refuses symlink namespaces before dispatch and leaves their targets untouched", async () => {
    const input = await monthlyFixture();
    await mkdir(input.backupRoot, { recursive: true });
    const target = await temporaryState();
    await writeFile(join(target, "protected"), "keep");
    await symlink(target, join(input.backupRoot, "monthly-local-v1"));
    const execute = vi.fn();
    const result = await runMonthlyProductionBackup({ ...input, execute });
    expect(result.status).toBe("failed");
    expect(execute).not.toHaveBeenCalled();
    expect(await readFile(join(target, "protected"), "utf8")).toBe("keep");
  });

  it.each(["backupRoot", "stateRoot"])("does not create descendants through a symlink %s", async (key) => {
    const input = await monthlyFixture();
    const target = await temporaryState();
    await symlink(target, input[key]);
    const execute = vi.fn();
    const request = runMonthlyProductionBackup({ ...input, execute });
    if (key === "stateRoot") await expect(request).rejects.toThrow("owned directory");
    else expect((await request).status).toBe("failed");
    expect(execute).not.toHaveBeenCalled();
    expect(await readdir(target)).toEqual([]);
  });

  it.each(["archive", "evidence"])("does not verify or prune through a symlink %s file", async (key) => {
    const input = await monthlyFixture();
    for (const month of ["06", "07", "08"]) await runMonth(input, month);
    const archiveRoot = join(input.backupRoot, "monthly-local-v1");
    const olderNames = await readdir(archiveRoot);
    const now = new Date("2026-09-02T00:00:00Z");
    vi.setSystemTime(now);
    const result = await runMonthlyProductionBackup({ ...input, now, execute: async () => {
      const output = await verifiedOutput(input, now);
      const evidence = JSON.parse(await readFile(output.evidence.path, "utf8"));
      const path = key === "evidence" ? output.evidence.path : join(archiveRoot, evidence.archive.filename);
      const copy = join(await temporaryState(), "keep");
      await writeFile(copy, await readFile(path));
      await rm(path);
      await symlink(copy, path);
      return output;
    } });
    expect(result.status).toBe("failed");
    for (const name of olderNames) await expect(readFile(join(archiveRoot, name))).resolves.toBeDefined();
  });

  it("rejects a symlink month receipt without altering its target", async () => {
    const input = await monthlyFixture();
    await mkdir(input.stateRoot, { recursive: true });
    const target = join(await temporaryState(), "receipt.json");
    await writeFile(target, '{"status":"verified"}');
    await symlink(target, join(input.stateRoot, "2026-09.json"));
    const execute = vi.fn();
    await expect(runMonthlyProductionBackup({ ...input, execute })).rejects.toBeDefined();
    expect(execute).not.toHaveBeenCalled();
    expect(await readFile(target, "utf8")).toBe('{"status":"verified"}');
  });

  it("continues reporting an unresolved retention review on repeated monthly invocation", async () => {
    const input = await monthlyFixture();
    await mkdir(input.stateRoot, { recursive: true });
    await writeFile(join(input.stateRoot, "2026-09.json"), JSON.stringify({ status: "verified", retention: { status: "review-required" } }));
    const execute = vi.fn();
    expect(await runMonthlyProductionBackup({ ...input, execute })).toMatchObject({
      ok: false, status: "already-attempted", retention: { status: "review-required" },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("shares the existing global lock with a daily invocation", async () => {
    const input = await monthlyFixture();
    await mkdir(input.stateRoot, { recursive: true });
    await mkdir(join(input.stateRoot, "run.lock"));
    const execute = vi.fn();
    expect((await runMonthlyProductionBackup({ ...input, execute })).status).toBe("busy");
    expect(execute).not.toHaveBeenCalled();
  });

  it("keeps the existing runner gates and routes monthly files into only the named namespace", async () => {
    const runner = await readFile(new URL("./v2-1-production-backup.mjs", import.meta.url), "utf8");
    expect(runner).toContain('process.argv.includes("--monthly-local-archive")');
    expect(runner).toContain('const MONTHLY_NAMESPACE = "monthly-local-v1"');
    expect(runner).toContain('monthlyLocal ? join(BACKUP_DIR, MONTHLY_NAMESPACE) : BACKUP_DIR');
    expect(runner).toContain('"--i-confirm-v2-1-production-encrypted-backup"');
    expect(runner).toContain('retrieveGuardedTarget("production-main")');
    expect(runner).toContain('snapshotMatched: true');
    expect(runner).toContain('assertGitClean()');
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
