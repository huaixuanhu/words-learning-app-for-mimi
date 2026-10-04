import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createR2Store, hash, readR2Config, R2_BUCKET, validateR2Config } from "./r2-backup-store.mjs";
import { runR2Month } from "./monthly-r2-backup.mjs";
import { installLocalKeyLinks } from "./local-key-links.mjs";
import { V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256 as PROJECT_SHA } from "./v2-stage8-3-contract.mjs";

const roots = [];
async function temporary() {
  const root = await mkdtemp(join(tmpdir(), "mimi-r2-test-")); roots.push(root); return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });
const config = { endpoint: "https://b7a2cbe8cc6721f057217b73428e2392.r2.cloudflarestorage.com",
  bucket: R2_BUCKET, accessKeyId: "0".repeat(32), secretAccessKey: "0".repeat(64) };
const manifestKey = "monthly-v1/2026-10/manifest.json";

function memoryStore() {
  const objects = new Map();
  return { objects, get: vi.fn(async (key) => objects.get(key) ?? null),
    put: vi.fn(async (key, value) => { if (objects.has(key) && !objects.get(key).equals(value)) throw new Error("conflict"); objects.set(key, value); }) };
}

async function fixture({ staging = false } = {}) {
  const root = await temporary();
  const paths = Object.fromEntries(["stateRoot", "attemptRoot", "evidenceRoot", "stagingRoot", "legacyRoot"].map((key) => [key, join(root, key)]));
  for (const dir of Object.values(paths)) await mkdir(dir, { mode: 0o700 });
  const timestamp = "20261002T144712Z";
  const filename = `mimi-production-schema6-v2-1-${timestamp}-0123456789ab.dump.age`;
  const archiveRoot = join(staging ? paths.stagingRoot : paths.legacyRoot, "monthly-local-v1");
  await mkdir(archiveRoot, { mode: 0o700 });
  const bytes = Buffer.from("synthetic encrypted archive");
  const archivePath = join(archiveRoot, filename);
  await writeFile(archivePath, bytes, { mode: 0o600 });
  const target = { target: "production-main", branchName: "main", regionId: "aws-ap-southeast-2",
    projectIdSha256: PROJECT_SHA, branchIdSha256: "1".repeat(64), endpointIdSha256: "2".repeat(64),
    controlPlaneConfirmed: true, databaseMatched: true, endpointMatched: true, roleMatched: true };
  target.identityDigest = hash([target.target, target.branchIdSha256, target.endpointIdSha256, PROJECT_SHA,
    target.regionId, "neondb", "neondb_owner"].join("\0"));
  const archive = { namespace: "monthly-local-v1", filename, bytes: bytes.length, sha256: hash(bytes) };
  const evidence = { artifactKind: "v2-1-schema6-production-backup-restore-v1", archive,
    completedAt: "2026-10-02T14:47:30Z", target, restore: { verified: true, snapshotMatched: true },
    git: { commitSha: "0".repeat(40) }, source: { privateStudyData: "must never enter R2 manifest" } };
  await mkdir(join(paths.evidenceRoot, timestamp), { mode: 0o700 });
  const evidencePath = join(paths.evidenceRoot, timestamp, "production-backup-evidence.json");
  const evidenceBytes = Buffer.from(JSON.stringify(evidence));
  await writeFile(evidencePath, evidenceBytes);
  const attempt = { artifactKind: "monthly-production-backup-attempt-v1", date: "2026-10", status: "verified",
    attemptedAt: "2026-10-02T14:47:12Z", completedAt: "2026-10-02T14:47:38Z", archive,
    evidence: { path: evidencePath, sha256: hash(evidenceBytes) } };
  const attemptPath = join(paths.attemptRoot, "2026-10.json");
  await writeFile(attemptPath, JSON.stringify(attempt));
  return { paths, bytes, archivePath, attempt, attemptPath, evidencePath };
}

describe("R2 credential and transfer boundary", () => {
  it.each([{ bucket: "different-project" }, { endpoint: "https://example.com" }, { endpoint: "https://00000000000000000000000000000000.r2.cloudflarestorage.com" }])("rejects target drift: %j", (change) => {
    expect(() => validateR2Config({ ...config, ...change })).toThrow("R2_CREDENTIALS_INVALID");
  });
  it("requires original private credential file, rejects broad modes and symlinks", async () => {
    const root = await temporary(); const directory = join(root, "credentials"); await mkdir(directory, { mode: 0o700 });
    const file = join(directory, "r2.json"); await writeFile(file, JSON.stringify(config), { mode: 0o600 });
    await expect(readR2Config(file)).resolves.toEqual(config);
    await chmod(file, 0o644); await expect(readR2Config(file)).rejects.toThrow("UNSAFE");
    await chmod(file, 0o600); const link = join(directory, "pointer.json"); await symlink(file, link);
    await expect(readR2Config(link)).rejects.toBeDefined();
    await chmod(directory, 0o755); await expect(readR2Config(file)).rejects.toThrow("UNSAFE");
  });
  it("does not overwrite differing objects or retry read failures", async () => {
    const execute = vi.fn(async () => ({ status: 0, bytes: Buffer.from("existing") }));
    const store = createR2Store(config, { execute });
    await expect(store.put(manifestKey, Buffer.from("different"))).rejects.toThrow("CONFLICT");
    expect(execute).toHaveBeenCalledTimes(1);
    execute.mockResolvedValue({ status: 1, bytes: Buffer.from("untrusted private diagnostic") });
    await expect(store.get(manifestKey)).rejects.toThrow("R2_READ_FAILED");
  });
  it("uses a pinned, isolated client and complete readback; credentials never enter argv", async () => {
    const value = Buffer.from("test object"); let uploaded = false;
    const execute = vi.fn(async (args, env) => {
      expect(args).toContain("/dev/null"); expect(args).toContain("--s3-no-check-bucket");
      expect(args.join(" ")).not.toContain(config.secretAccessKey); expect(env.RCLONE_CONFIG_MIMI_R2_SECRET_ACCESS_KEY).toBe(config.secretAccessKey);
      if (args[0] === "copyto") { expect(args).toContain("--immutable"); expect(await readFile(args[1])).toEqual(value); uploaded = true; return { status: 0 }; }
      return uploaded ? { status: 0, bytes: value } : { status: 4 };
    });
    const store = createR2Store(config, { execute });
    await expect(store.put(manifestKey, value)).resolves.toEqual({ reused: false });
    await expect(store.put(manifestKey, value)).resolves.toEqual({ reused: true });
    await expect(store.get("../another-bucket/key")).rejects.toThrow("SCOPE_INVALID");
    expect(execute.mock.calls.filter(([args]) => args[0] === "copyto")).toHaveLength(1);
  });
});

describe("verified monthly R2 custody", () => {
  it("migrates verified legacy bytes without a database read and keeps originals", async () => {
    const f = await fixture(); const store = memoryStore(); const runProduction = vi.fn();
    const result = await runR2Month({ ...f, month: "2026-10", store, runProduction });
    expect(result.remoteReadbackVerified).toBe(true); expect(store.objects.get(result.archiveKey)).toEqual(f.bytes);
    expect(await readFile(f.archivePath)).toEqual(f.bytes); expect(runProduction).not.toHaveBeenCalled();
    expect(store.objects.get(manifestKey).toString()).not.toContain("privateStudyData");
    expect(await readdir(f.paths.stateRoot)).toEqual(["2026-10.json"]);
  });
  it("only clears own staging after both remote readbacks and a persisted receipt", async () => {
    const f = await fixture({ staging: true }); const store = memoryStore();
    await writeFile(join(f.paths.stagingRoot, "keep-unclaimed"), "keep");
    const result = await runR2Month({ ...f, month: "2026-10", store });
    expect(result.staging).toBe("removed-after-verified-upload");
    await expect(readFile(f.archivePath)).rejects.toMatchObject({ code: "ENOENT" });
    expect(JSON.parse(await readFile(join(f.paths.stateRoot, "2026-10.json"), "utf8")).remoteReadbackVerified).toBe(true);
    expect(await readFile(join(f.paths.stagingRoot, "keep-unclaimed"), "utf8")).toBe("keep");
  });
  it.each(["upload", "archive-readback", "manifest-readback"])("preserves source on %s failure", async (failure) => {
    const f = await fixture({ staging: true }); const store = memoryStore();
    if (failure === "upload") store.put.mockRejectedValue(new Error("upload unavailable"));
    else store.get.mockImplementation(async (key) => {
      const value = store.objects.get(key);
      if (value && ((failure === "archive-readback" && key !== manifestKey) || (failure === "manifest-readback" && key === manifestKey))) return Buffer.from("corrupt");
      return value ?? null;
    });
    await expect(runR2Month({ ...f, month: "2026-10", store })).rejects.toBeDefined();
    expect(await readFile(f.archivePath)).toEqual(f.bytes); expect(await readdir(f.paths.stateRoot)).toEqual([]);
  });
  it("resumes only uploading after failure and skips database work even if local history is removed", async () => {
    const f = await fixture({ staging: true }); const store = memoryStore(); const runProduction = vi.fn();
    store.put.mockRejectedValueOnce(new Error("network"));
    await expect(runR2Month({ ...f, month: "2026-10", store, runProduction })).rejects.toBeDefined();
    await runR2Month({ ...f, month: "2026-10", store, runProduction });
    await rm(f.attemptPath); await rm(join(f.paths.stateRoot, "2026-10.json"));
    await expect(runR2Month({ ...f, month: "2026-10", store, runProduction, allowNewBackup: true })).resolves.toMatchObject({ ok: true });
    expect(runProduction).not.toHaveBeenCalled();
  });
  it("does not rerun a failed database attempt or proceed with a stale global upload lock", async () => {
    const f = await fixture(); const store = memoryStore(); const runProduction = vi.fn();
    await writeFile(f.attemptPath, JSON.stringify({ ...f.attempt, status: "failed" }));
    await expect(runR2Month({ ...f, month: "2026-10", store, runProduction, allowNewBackup: true })).rejects.toThrow("NEEDS_REVIEW");
    await mkdir(join(f.paths.stateRoot, "run.lock"));
    await expect(runR2Month({ ...f, month: "2026-10", store, runProduction })).rejects.toThrow("BUSY");
    expect(runProduction).not.toHaveBeenCalled();
  });
  it("dispatches at most one new current-month attempt into R2 staging and never on cloud read failure", async () => {
    const f = await fixture({ staging: true }); const store = memoryStore();
    await rm(f.attemptPath);
    const runProduction = vi.fn(async (options) => {
      expect(options.r2Staging).toBe(true); expect(options.reviewedRetry).toBeUndefined();
      expect(options.backupRoot).toBe(f.paths.stagingRoot);
      await writeFile(f.attemptPath, JSON.stringify(f.attempt)); return { ok: true };
    });
    const input = { ...f, month: "2026-10", now: new Date("2026-10-03T00:00:00Z"), store, runProduction, allowNewBackup: true };
    store.get.mockRejectedValueOnce(new Error("offline"));
    await expect(runR2Month(input)).rejects.toThrow("offline"); expect(runProduction).not.toHaveBeenCalled();
    await runR2Month(input); await runR2Month(input); expect(runProduction).toHaveBeenCalledTimes(1);
  });
  it("refuses source directory symlinks before upload", async () => {
    const f = await fixture(); const store = memoryStore();
    const link = join(await temporary(), "linked-source"); await symlink(f.paths.legacyRoot, link);
    await expect(runR2Month({ ...f, paths: { ...f.paths, legacyRoot: link }, month: "2026-10", store })).rejects.toThrow("DIRECTORY_UNSAFE");
    expect(store.put).not.toHaveBeenCalled(); expect(await readFile(f.archivePath)).toEqual(f.bytes);
  });
  it("rejects corrupted source evidence, source links and manifest target drift", async () => {
    const f = await fixture(); const store = memoryStore();
    await writeFile(f.evidencePath, "corrupt");
    await expect(runR2Month({ ...f, month: "2026-10", store })).rejects.toThrow("VERIFICATION_FAILED");
    expect(store.put).not.toHaveBeenCalled();
    store.objects.set(manifestKey, Buffer.from('{"bucket":"other"}'));
    await expect(runR2Month({ ...f, month: "2026-10", store })).rejects.toThrow("MANIFEST_INVALID");
  });
});

describe("clickable local credential pointers", () => {
  it("is repeatable, preserves secret bytes and refuses unknown pointer conflicts", async () => {
    const root = await temporary(); await mkdir(join(root, "governance"));
    await writeFile(join(root, "governance", "CREDENTIAL_LOCATIONS.md"), "locator only");
    await writeFile(join(root, ".env.local"), "synthetic unchanged environment\n");
    await installLocalKeyLinks({ root, home: root }); await installLocalKeyLinks({ root, home: root });
    expect((await stat(join(root, "local_key"))).mode & 0o777).toBe(0o700);
    expect((await stat(join(root, ".env.local"))).mode & 0o777).toBe(0o600);
    expect(await readFile(join(root, ".env.local"), "utf8")).toBe("synthetic unchanged environment\n");
    await rm(join(root, "local_key", "Development.env")); await writeFile(join(root, "local_key", "Development.env"), "user file");
    await expect(installLocalKeyLinks({ root, home: root })).rejects.toThrow("CONFLICT");
  });
});
