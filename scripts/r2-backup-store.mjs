import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdtemp, open, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

export const R2_BUCKET = "words-learning-app-for-mimi";
export const R2_CREDENTIAL_PATH = join(homedir(), ".config", "mimi-vocabulary", "r2-backup.json");
const ACCOUNT_SHA256 = "51306a4a8255a621a23819d10b4cf017ed450576fa7c0266eabcc2b2c9aabe98";
export const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
export const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const MONTH = /^20\d{2}-(?:0[1-9]|1[0-2])$/u;
export const ARCHIVE = /^mimi-production-schema6-v2-1-\d{8}T\d{6}Z-[a-f0-9]{12}\.dump\.age$/u;
const KEY = /^monthly-v1\/20\d{2}-(?:0[1-9]|1[0-2])\/(?:manifest\.json|mimi-production-schema6-v2-1-\d{8}T\d{6}Z-[a-f0-9]{12}\.dump\.age)$/u;

export async function readOwnedFile(path, { secret = false, maxBytes = MAX_ARCHIVE_BYTES } = {}) {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.uid !== process.getuid() || info.size > maxBytes ||
      (secret && (info.mode & 0o077) !== 0)) throw new Error("R2_LOCAL_FILE_UNSAFE");
    return await handle.readFile();
  } finally { await handle.close(); }
}

export async function assertOwnedDirectory(path, { privateMode = false } = {}) {
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink() || info.uid !== process.getuid() ||
    (privateMode && (info.mode & 0o077) !== 0)) throw new Error("R2_LOCAL_DIRECTORY_UNSAFE");
}

export function validateR2Config(value) {
  const account = /^https:\/\/([a-f0-9]{32})\.r2\.cloudflarestorage\.com\/?$/u.exec(value?.endpoint ?? "")?.[1];
  if (!account || hash(account) !== ACCOUNT_SHA256 || value.bucket !== R2_BUCKET ||
    !/^[a-f0-9]{32}$/u.test(value.accessKeyId ?? "") ||
    !/^[a-f0-9]{64}$/u.test(value.secretAccessKey ?? "")) throw new Error("R2_CREDENTIALS_INVALID");
  return { endpoint: `https://${account}.r2.cloudflarestorage.com`, bucket: R2_BUCKET,
    accessKeyId: value.accessKeyId, secretAccessKey: value.secretAccessKey };
}

export async function readR2Config(path = R2_CREDENTIAL_PATH) {
  await assertOwnedDirectory(dirname(dirname(path)));
  await assertOwnedDirectory(dirname(path), { privateMode: true });
  return validateR2Config(JSON.parse((await readOwnedFile(path, { secret: true, maxBytes: 8192 })).toString("utf8")));
}

const execFileAsync = promisify(execFile);
async function executeRclone(args, env) {
  try {
    const result = await execFileAsync("/opt/homebrew/bin/rclone", args, {
      env, encoding: "buffer", timeout: 90_000, killSignal: "SIGKILL", maxBuffer: MAX_ARCHIVE_BYTES + 65536,
    });
    return { status: 0, bytes: result.stdout };
  } catch (error) {
    // Never surface raw SDK/CLI diagnostics or credential-bearing environment.
    return { status: Number.isInteger(error.code) ? error.code : -1, bytes: Buffer.alloc(0) };
  }
}

/** Use the installed maintained S3 client, with no user/global remote config. */
export function createR2Store(config, { execute = executeRclone } = {}) {
  const credential = validateR2Config(config);
  const env = {
    PATH: "/opt/homebrew/bin:/usr/bin:/bin", HOME: homedir(), TMPDIR: tmpdir(),
    RCLONE_CONFIG_MIMI_R2_TYPE: "s3", RCLONE_CONFIG_MIMI_R2_PROVIDER: "Cloudflare",
    RCLONE_CONFIG_MIMI_R2_ACCESS_KEY_ID: credential.accessKeyId,
    RCLONE_CONFIG_MIMI_R2_SECRET_ACCESS_KEY: credential.secretAccessKey,
    RCLONE_CONFIG_MIMI_R2_ENDPOINT: credential.endpoint,
    RCLONE_CONFIG_MIMI_R2_REGION: "auto", RCLONE_CONFIG_MIMI_R2_ENV_AUTH: "false",
  };
  const flags = ["--config", "/dev/null", "--s3-no-check-bucket", "--retries", "1",
    "--low-level-retries", "1", "--contimeout", "15s", "--timeout", "60s", "--stats", "0", "--quiet"];
  const remote = (key) => {
    if (!KEY.test(key)) throw new Error("R2_OBJECT_SCOPE_INVALID");
    return `mimi_r2:${R2_BUCKET}/${key}`;
  };
  const get = async (key) => {
    const result = await execute(["cat", remote(key), ...flags], env);
    if (result.status === 3 || result.status === 4) return null;
    if (result.status !== 0) throw new Error("R2_READ_FAILED");
    return result.bytes;
  };
  const put = async (key, bytes) => {
    if (!Buffer.isBuffer(bytes) || bytes.length > MAX_ARCHIVE_BYTES) throw new Error("R2_UPLOAD_SIZE_INVALID");
    const destination = remote(key);
    const existing = await get(key);
    if (existing !== null) {
      if (!existing.equals(bytes)) throw new Error("R2_OBJECT_CONFLICT");
      return { reused: true };
    }
    const temporary = await mkdtemp(join(tmpdir(), "mimi-r2-upload-"));
    try {
      const file = join(temporary, "encrypted-object");
      await writeFile(file, bytes, { mode: 0o600, flag: "wx" });
      const result = await execute(["copyto", file, destination, "--immutable", ...flags], env);
      if (result.status !== 0) throw new Error("R2_UPLOAD_FAILED");
      const downloaded = await get(key);
      if (!downloaded?.equals(bytes)) throw new Error("R2_READBACK_MISMATCH");
      return { reused: false };
    } finally { await rm(temporary, { recursive: true, force: true }); }
  };
  return { get, put };
}
