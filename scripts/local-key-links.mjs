import { chmod, lstat, mkdir, readlink, symlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function installLocalKeyLinks({ root = ROOT, home = homedir() } = {}) {
  const directory = join(root, "local_key");
  await mkdir(directory, { mode: 0o700, recursive: true });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("LOCAL_KEY_DIRECTORY_INVALID");
  await chmod(directory, 0o700);
  const entries = [
    ["00-密钥位置说明.md", join(root, "governance", "CREDENTIAL_LOCATIONS.md"), false],
    ["Development.env", join(root, ".env.local"), true],
    ["Stage2-Gemini.env", join(root, ".env.stage2.local"), true],
    ["Keychain Access.app", "/System/Library/CoreServices/Applications/Keychain Access.app", false],
    ["R2-backup.json", join(home, ".config", "mimi-vocabulary", "r2-backup.json"), true],
  ];
  const linked = [];
  for (const [name, target, privateFile] of entries) {
    let targetInfo;
    try { targetInfo = await lstat(target); } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (targetInfo.isSymbolicLink() || (privateFile && !targetInfo.isFile())) throw new Error("LOCAL_KEY_TARGET_INVALID");
    if (privateFile) await chmod(target, 0o600);
    const link = join(directory, name);
    try { await symlink(target, link); } catch (error) {
      if (error.code !== "EEXIST" || !(await lstat(link)).isSymbolicLink() || await readlink(link) !== target) throw new Error("LOCAL_KEY_POINTER_CONFLICT");
    }
    linked.push(name);
  }
  return { ok: true, directory, linked, secretFilesCopied: 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await installLocalKeyLinks())); }
  catch { console.error(JSON.stringify({ ok: false, code: "LOCAL_KEY_LINKS_STOPPED" })); process.exitCode = 1; }
}
