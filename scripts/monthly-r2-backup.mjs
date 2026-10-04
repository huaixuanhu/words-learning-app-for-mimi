import { chmod, mkdir, open, readdir, rm, rmdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { backupDateKey, runMonthlyProductionBackup, verifiedMonthlyResult } from "./daily-production-backup.mjs";
import { V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256 as PROJECT_SHA } from "./v2-stage8-3-contract.mjs";
import { ARCHIVE, MONTH, MAX_ARCHIVE_BYTES, R2_BUCKET, assertOwnedDirectory, createR2Store, hash, readOwnedFile, readR2Config } from "./r2-backup-store.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULTS = {
  stateRoot: join(ROOT, "local_artifacts", "monthly-r2-backups"),
  attemptRoot: join(ROOT, "local_artifacts", "daily-production-backups"),
  evidenceRoot: join(ROOT, "local_artifacts", "v2-1-production"),
  stagingRoot: join(ROOT, "local_artifacts", "monthly-r2-staging"),
  legacyRoot: join(homedir(), "Documents", "Mimi Vocabulary Backups"),
};
const NAMESPACE = "monthly-local-v1";
const DIGEST = /^[a-f0-9]{64}$/u;
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

async function optionalFile(path) {
  try { return await readOwnedFile(path); } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function readMonthlyAttempt(attemptRoot, month) {
  if (!MONTH.test(month)) throw new Error("R2_MONTH_INVALID");
  try { await assertOwnedDirectory(attemptRoot); } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  const originalBytes = await optionalFile(join(attemptRoot, `${month}.json`));
  if (!originalBytes) return null;
  let attempt = JSON.parse(originalBytes.toString("utf8"));
  if (attempt.status === "failed") {
    const retried = await optionalFile(join(attemptRoot, `${month}.retry-1.json`));
    if (retried) {
      const retry = JSON.parse(retried.toString("utf8"));
      if (retry.reviewedRetry?.originalReceipt !== `${month}.json` ||
        retry.reviewedRetry?.originalReceiptSha256 !== hash(originalBytes)) throw new Error("R2_RETRY_RECEIPT_MISMATCH");
      attempt = retry;
    }
  }
  if (attempt.artifactKind !== "monthly-production-backup-attempt-v1" || attempt.date !== month ||
    backupDateKey(new Date(attempt.attemptedAt)).slice(0, 7) !== month ||
    attempt.status !== "verified" || attempt.retention?.status === "review-required") throw new Error("R2_SOURCE_ATTEMPT_NEEDS_REVIEW");
  return attempt;
}

export function validateManifest(value, month) {
  if (value?.artifactKind !== "mimi-monthly-r2-backup-v1" || value.month !== month ||
    value.bucket !== R2_BUCKET || value.restore?.verified !== true || value.restore?.snapshotMatched !== true ||
    value.target?.projectIdSha256 !== PROJECT_SHA || value.target?.target !== "production-main" ||
    value.target?.branchName !== "main" || !DIGEST.test(value.target?.identityDigest ?? "") ||
    !DIGEST.test(value.evidenceSha256 ?? "") || !DIGEST.test(value.archive?.sha256 ?? "") ||
    !ARCHIVE.test(value.archive?.filename ?? "") || !Number.isSafeInteger(value.archive.bytes) ||
    value.archive.bytes <= 0 || value.archive.bytes > MAX_ARCHIVE_BYTES ||
    value.archive.key !== `monthly-v1/${month}/${value.archive.filename}`) throw new Error("R2_MANIFEST_INVALID");
  return value;
}

async function verifyRemote(store, manifest) {
  const bytes = await store.get(manifest.archive.key);
  if (!bytes || bytes.length !== manifest.archive.bytes || hash(bytes) !== manifest.archive.sha256) throw new Error("R2_ARCHIVE_READBACK_MISMATCH");
}

async function saveReceipt(path, manifest, manifestBytes) {
  const value = { artifactKind: "mimi-r2-upload-receipt-v1", month: manifest.month, status: "verified",
    bucket: R2_BUCKET, archive: manifest.archive, manifestSha256: hash(manifestBytes),
    sourceRestoreVerified: true, remoteReadbackVerified: true, verifiedAt: new Date().toISOString() };
  const previous = await optionalFile(path);
  if (previous) {
    const parsed = JSON.parse(previous.toString("utf8"));
    if (parsed.artifactKind !== value.artifactKind || parsed.month !== value.month ||
      parsed.status !== "verified" || parsed.manifestSha256 !== value.manifestSha256 ||
      JSON.stringify(parsed.archive) !== JSON.stringify(value.archive)) throw new Error("R2_LOCAL_RECEIPT_CONFLICT");
    return;
  }
  const handle = await open(path, "wx", 0o600);
  try { await handle.writeFile(jsonBytes(value)); await handle.sync(); } finally { await handle.close(); }
}

async function cleanOwnStaging(paths, manifest, receiptPath) {
  const file = join(paths.stagingRoot, NAMESPACE, manifest.archive.filename);
  try {
    await assertOwnedDirectory(paths.stagingRoot, { privateMode: true });
    await assertOwnedDirectory(join(paths.stagingRoot, NAMESPACE), { privateMode: true });
  } catch (error) { if (error.code === "ENOENT") return "absent"; throw error; }
  if (await optionalFile(file) === null) return "absent";
  const receipt = JSON.parse((await readOwnedFile(receiptPath)).toString("utf8"));
  if (receipt.status !== "verified" || receipt.archive.sha256 !== manifest.archive.sha256 ||
    hash(await readOwnedFile(file)) !== manifest.archive.sha256) throw new Error("R2_STAGING_CLEANUP_REFUSED");
  await rm(file);
  return "removed-after-verified-upload";
}

/** R2 is checked before any database attempt; upload resumption never reruns a dump. */
export async function runR2Month({ month, store, paths: overrides = {}, allowNewBackup = false,
  now = new Date(), runProduction = runMonthlyProductionBackup } = {}) {
  if (!MONTH.test(month)) throw new Error("R2_MONTH_INVALID");
  const paths = { ...DEFAULTS, ...overrides };
  await assertOwnedDirectory(dirname(paths.stateRoot));
  await mkdir(paths.stateRoot, { recursive: true, mode: 0o700 });
  await assertOwnedDirectory(paths.stateRoot);
  await chmod(paths.stateRoot, 0o700);
  const lock = join(paths.stateRoot, "run.lock");
  try { await mkdir(lock, { mode: 0o700 }); } catch (error) {
    if (error.code === "EEXIST") throw new Error("R2_BACKUP_BUSY");
    throw error;
  }
  try {
    const manifestKey = `monthly-v1/${month}/manifest.json`;
    let manifestBytes = await store.get(manifestKey);
    let manifest;
    if (manifestBytes !== null) {
      manifest = validateManifest(JSON.parse(manifestBytes.toString("utf8")), month);
      await verifyRemote(store, manifest);
    } else {
      let attempt = await readMonthlyAttempt(paths.attemptRoot, month);
      if (!attempt) {
        if (!allowNewBackup || backupDateKey(now).slice(0, 7) !== month) throw new Error("R2_VERIFIED_SOURCE_MISSING");
        const result = await runProduction({ now, stateRoot: paths.attemptRoot, evidenceRoot: paths.evidenceRoot,
          backupRoot: paths.stagingRoot, r2Staging: true });
        if (!result.ok) throw new Error("R2_DATABASE_ATTEMPT_STOPPED");
        attempt = await readMonthlyAttempt(paths.attemptRoot, month);
      }
      let archive;
      let archivePath;
      for (const root of [paths.stagingRoot, paths.legacyRoot]) {
        if (!ARCHIVE.test(attempt?.archive?.filename ?? "")) throw new Error("R2_SOURCE_ARCHIVE_INVALID");
        try {
          await assertOwnedDirectory(root);
          await assertOwnedDirectory(join(root, NAMESPACE));
        } catch (error) { if (error.code === "ENOENT") continue; throw error; }
        const file = join(root, NAMESPACE, attempt.archive.filename);
        if (await optionalFile(file) === null) continue;
        archive = await verifiedMonthlyResult({ ok: true, evidence: attempt.evidence }, {
          archiveRoot: join(root, NAMESPACE), evidenceRoot: paths.evidenceRoot,
          attemptedAt: attempt.attemptedAt, completedAt: attempt.completedAt,
        });
        if (!archive || JSON.stringify(archive) !== JSON.stringify(attempt.archive)) throw new Error("R2_SOURCE_VERIFICATION_FAILED");
        archivePath = file;
        break;
      }
      if (!archive) throw new Error("R2_VERIFIED_ARCHIVE_MISSING");
      const evidence = JSON.parse((await readOwnedFile(attempt.evidence.path)).toString("utf8"));
      manifest = validateManifest({ artifactKind: "mimi-monthly-r2-backup-v1", month, bucket: R2_BUCKET,
        archive: { filename: archive.filename, bytes: archive.bytes, sha256: archive.sha256,
          key: `monthly-v1/${month}/${archive.filename}` },
        evidenceSha256: attempt.evidence.sha256, sourceCompletedAt: evidence.completedAt,
        sourceCommit: evidence.git?.commitSha, target: { target: evidence.target.target, branchName: evidence.target.branchName,
          projectIdSha256: evidence.target.projectIdSha256, identityDigest: evidence.target.identityDigest },
        restore: { verified: true, snapshotMatched: true, isolatedLocalPostgres: "17" },
      }, month);
      const bytes = await readOwnedFile(archivePath);
      if (hash(bytes) !== archive.sha256 || bytes.length !== archive.bytes) throw new Error("R2_SOURCE_CHANGED");
      await store.put(manifest.archive.key, bytes);
      await verifyRemote(store, manifest);
      manifestBytes = jsonBytes(manifest);
      await store.put(manifestKey, manifestBytes);
      const saved = await store.get(manifestKey);
      if (!saved?.equals(manifestBytes)) throw new Error("R2_MANIFEST_READBACK_MISMATCH");
    }
    const receiptPath = join(paths.stateRoot, `${month}.json`);
    await saveReceipt(receiptPath, manifest, manifestBytes);
    const staging = await cleanOwnStaging(paths, manifest, receiptPath);
    return { ok: true, month, bucket: R2_BUCKET, bytes: manifest.archive.bytes,
      archiveKey: manifest.archive.key, remoteReadbackVerified: true, staging };
  } finally { await rmdir(lock); }
}

async function main() {
  const args = process.argv.slice(2);
  const monthly = args.length === 2 && args[0] === "monthly" && args[1] === "--i-confirm-monthly-production-backup-to-r2";
  const migrate = args.length === 2 && args[0] === "migrate" && args[1] === "--i-confirm-mimi-r2-migration";
  if (!monthly && !migrate) throw new Error("R2_CONFIRMATION_REQUIRED");
  const store = createR2Store(await readR2Config());
  const months = monthly ? [backupDateKey().slice(0, 7)] : (await readdir(DEFAULTS.attemptRoot))
    .filter((name) => /^20\d{2}-(?:0[1-9]|1[0-2])\.json$/u.test(name)).map((name) => name.slice(0, 7)).sort();
  if (months.length === 0) throw new Error("R2_VERIFIED_SOURCE_MISSING");
  const results = [];
  for (const month of months) results.push(await runR2Month({ month, store, allowNewBackup: monthly }));
  console.log(JSON.stringify({ ok: true, results }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); } catch (error) {
    const code = /^R2_[A-Z_]+$/u.test(error.message) ? error.message : "R2_BACKUP_STOPPED_SAFELY";
    console.error(JSON.stringify({ ok: false, code })); process.exitCode = 1;
  }
}
