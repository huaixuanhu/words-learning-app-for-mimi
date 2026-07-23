import { spawn, spawnSync } from "node:child_process";
import {
  access,
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants as fsConstants, existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import {
  assertBackupCommand,
  assertBackupFileName,
  assertGate2Baseline,
  assertProductionBackupEnvironment,
  assertSchema5BackupInventory,
  assertSecretFreeEvidence,
  combineBackupTableDigests,
  compareBackupInventories,
  postgresEnvironmentFromNeonUrl,
  safeBackupFailure,
  sha256,
  validateBackupEvidence,
  V2_STAGE8_3_BACKUP_DIR,
  V2_STAGE8_3_BACKUP_EVIDENCE_KIND,
  V2_STAGE8_3_BACKUP_IDENTITY_DIR,
  V2_STAGE8_3_BACKUP_KEYCHAIN_SERVICE,
  V2_STAGE8_3_BACKUP_METHOD,
} from "./v2-stage8-3-backup-contract.mjs";

const POSTGRES_BIN = "/opt/homebrew/opt/postgresql@17/bin";
const AGE_BIN = "/opt/homebrew/bin/age";
const AGE_KEYGEN_BIN = "/opt/homebrew/bin/age-keygen";
const PBCOPY_BIN = "/usr/bin/pbcopy";
const PBPASTE_BIN = "/usr/bin/pbpaste";
const SECURITY_BIN = "/usr/bin/security";
const CORE_TABLES = Object.freeze({
  backup_import_mappings: "id",
  backup_imports: "id",
  import_batches: "id",
  people: "id",
  review_events: "id",
  review_settings: "person_id",
  review_states: "id",
  vocabulary_items: "id",
});
const SCHEMA5_TABLES = Object.freeze(Object.keys(CORE_TABLES).sort());
const EVIDENCE_ROOT = resolve(
  process.cwd(),
  "local_artifacts",
  "v2-stage8-3-gate3",
);
const SYNTHETIC_PROOF_PATH = join(EVIDENCE_ROOT, "synthetic-proof.json");
const RECIPIENT_PATH = join(V2_STAGE8_3_BACKUP_IDENTITY_DIR, "recipient.txt");
const LOCAL_PORT = "55439";
const MAX_CAPTURE_BYTES = 256 * 1024 * 1024;

class BackupExecutionError extends Error {
  constructor(message, code = "V2_8_3_BACKUP_EXECUTION_FAILED") {
    super(message);
    this.name = "BackupExecutionError";
    this.code = code;
    this.safeToReport = true;
  }
}

function fail(message, code) {
  throw new BackupExecutionError(message, code);
}

function postgresTool(name) {
  return join(POSTGRES_BIN, name);
}

function minimalBaseEnv() {
  return {
    HOME: homedir(),
    LANG: process.env.LANG || "en_US.UTF-8",
    LC_ALL: process.env.LC_ALL || "en_US.UTF-8",
    PATH: `${POSTGRES_BIN}:/opt/homebrew/bin:/usr/bin:/bin`,
    TMPDIR: process.env.TMPDIR || tmpdir(),
  };
}

function commandResult(bin, args, options = {}) {
  const result = spawnSync(bin, args, {
    encoding: options.encoding ?? "utf8",
    env: options.env ?? minimalBaseEnv(),
    input: options.input,
    maxBuffer: options.maxBuffer ?? MAX_CAPTURE_BYTES,
    stdio: options.stdio,
  });
  if (result.error || result.status !== 0) {
    fail(
      options.failureMessage || "A Gate 3 local command failed safely",
      options.failureCode || "V2_8_3_BACKUP_TOOL_FAILED",
    );
  }
  return result;
}

function toolVersions() {
  const pgDump = commandResult(postgresTool("pg_dump"), ["--version"], {
    failureMessage: "PostgreSQL 17 pg_dump is unavailable",
  }).stdout.trim();
  const pgRestore = commandResult(postgresTool("pg_restore"), ["--version"], {
    failureMessage: "PostgreSQL 17 pg_restore is unavailable",
  }).stdout.trim();
  const postgres = commandResult(postgresTool("postgres"), ["--version"], {
    failureMessage: "PostgreSQL 17 server tools are unavailable",
  }).stdout.trim();
  const age = commandResult(AGE_BIN, ["--version"], {
    failureMessage: "age is unavailable",
  }).stdout.trim();
  if (
    !pgDump.includes(" 17.") ||
    !pgRestore.includes(" 17.") ||
    !postgres.includes(" 17.") ||
    !/^v?1\.3\./u.test(age)
  ) {
    fail(
      "Gate 3 requires PostgreSQL major 17 and age 1.3.x",
      "V2_8_3_BACKUP_TOOL_VERSION_MISMATCH",
    );
  }
  return { age, pgDump, pgRestore, postgres };
}

function timestampToken(date = new Date()) {
  return date
    .toISOString()
    .replace(/[-:]/gu, "")
    .replace(/\.\d{3}Z$/u, "Z");
}

function gitCommitSha() {
  const result = commandResult("/usr/bin/git", ["rev-parse", "HEAD"], {
    env: { ...minimalBaseEnv(), PATH: process.env.PATH || minimalBaseEnv().PATH },
    failureMessage: "The exact Git commit could not be resolved",
  });
  const value = result.stdout.trim();
  if (!/^[a-f0-9]{40}$/u.test(value)) {
    fail("The exact Git commit is invalid", "V2_8_3_BACKUP_GIT_INVALID");
  }
  return value;
}

function gitIsClean() {
  const result = commandResult(
    "/usr/bin/git",
    ["status", "--short", "--untracked-files=all"],
    {
      env: { ...minimalBaseEnv(), PATH: process.env.PATH || minimalBaseEnv().PATH },
      failureMessage: "Git status could not be inspected",
    },
  );
  return result.stdout.trim().length === 0;
}

function clearSystemClipboard() {
  const result = spawnSync(PBCOPY_BIN, [], {
    encoding: "utf8",
    env: minimalBaseEnv(),
    input: "",
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    fail(
      "The Production credential could not be cleared from the clipboard",
      "V2_8_3_BACKUP_CLIPBOARD_CLEAR_FAILED",
    );
  }
}

function retrieveProductionEnvironmentFromClipboard() {
  const result = spawnSync(PBPASTE_BIN, [], {
    encoding: "utf8",
    env: minimalBaseEnv(),
    maxBuffer: 1024 * 1024,
  });
  let rawUrl = "";
  try {
    if (result.error || result.status !== 0) {
      fail(
        "The approved Neon Production credential is unavailable on the clipboard",
        "V2_8_3_BACKUP_CLIPBOARD_READ_FAILED",
      );
    }
    rawUrl = result.stdout.trim();
    if (!rawUrl || rawUrl.includes("\n") || rawUrl.includes("\r")) {
      fail(
        "The clipboard does not contain one Neon connection string",
        "V2_8_3_BACKUP_CLIPBOARD_VALUE_INVALID",
      );
    }
  } finally {
    clearSystemClipboard();
  }
  return {
    DATABASE_URL_UNPOOLED: rawUrl,
    MIMI_STORAGE_RUNTIME: "postgres-production",
    MIMI_V2_8_3_BACKUP_ACTION: "encrypted-logical-backup",
    MIMI_V2_8_3_BACKUP_APPROVED: "true",
    MIMI_V2_8_3_BACKUP_TARGET: "production-main",
    STAGE6B_DATABASE_TARGET: "production",
    VERCEL_ENV: "production",
  };
}

async function fileSha256(path) {
  const contents = await readFile(path);
  return sha256(contents);
}

async function writePrivateFile(path, contents) {
  await mkdir(resolve(path, ".."), { mode: 0o700, recursive: true });
  await chmod(resolve(path, ".."), 0o700);
  await writeFile(path, contents, { flag: "wx", mode: 0o600 });
  await chmod(path, 0o600);
}

function generateAgeIdentity() {
  const result = commandResult(AGE_KEYGEN_BIN, [], {
    failureMessage: "A dedicated age identity could not be generated",
  });
  const privateMatch = result.stdout.match(/AGE-SECRET-KEY-[A-Z0-9-]+/u);
  const recipientMatch = result.stderr.match(/age1[a-z0-9]+/u);
  if (!privateMatch || !recipientMatch) {
    fail("The generated age identity has an invalid shape", "V2_8_3_BACKUP_IDENTITY_INVALID");
  }
  return { privateIdentity: privateMatch[0], recipient: recipientMatch[0] };
}

function keychainAccount() {
  return process.env.USER?.trim() || "anoria";
}

function readIdentityFromKeychain() {
  const result = spawnSync(
    SECURITY_BIN,
    [
      "find-generic-password",
      "-a",
      keychainAccount(),
      "-s",
      V2_STAGE8_3_BACKUP_KEYCHAIN_SERVICE,
      "-w",
    ],
    { encoding: "utf8", env: minimalBaseEnv(), maxBuffer: 1024 * 1024 },
  );
  if (result.error || result.status !== 0) {
    if (existsSync(RECIPIENT_PATH)) {
      fail(
        "The existing Keychain age identity is unavailable",
        "V2_8_3_BACKUP_KEYCHAIN_READ_FAILED",
      );
    }
    return null;
  }
  const value = result.stdout.trim();
  if (!/^AGE-SECRET-KEY-[A-Z0-9-]+$/u.test(value)) {
    fail("The Keychain age identity has an invalid shape", "V2_8_3_BACKUP_IDENTITY_INVALID");
  }
  return value;
}

function addIdentityToKeychain(privateIdentity) {
  const result = spawnSync(
    SECURITY_BIN,
    [
      "add-generic-password",
      "-a",
      keychainAccount(),
      "-s",
      V2_STAGE8_3_BACKUP_KEYCHAIN_SERVICE,
      "-l",
      "Mimi Vocabulary Backup age identity v1",
      "-T",
      SECURITY_BIN,
      "-w",
    ],
    {
      encoding: "utf8",
      env: minimalBaseEnv(),
      input: `${privateIdentity}\n${privateIdentity}\n`,
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    fail("The age identity could not be stored in macOS Keychain", "V2_8_3_BACKUP_KEYCHAIN_WRITE_FAILED");
  }
}

async function withTemporaryIdentityFile(root, privateIdentity, operation) {
  const path = join(root, "age-identity.txt");
  await writeFile(path, `${privateIdentity}\n`, { flag: "wx", mode: 0o600 });
  await chmod(path, 0o600);
  try {
    return await operation(path);
  } finally {
    await rm(path, { force: true });
  }
}

async function ensurePermanentAgeIdentity() {
  let privateIdentity = readIdentityFromKeychain();
  let recipient;
  let created = false;
  if (!privateIdentity) {
    const generated = generateAgeIdentity();
    privateIdentity = generated.privateIdentity;
    recipient = generated.recipient;
    addIdentityToKeychain(privateIdentity);
    created = true;
  }

  const probeRoot = await mkdtemp(join(tmpdir(), "mimi-gate3-age-recipient-"));
  try {
    recipient = await withTemporaryIdentityFile(
      probeRoot,
      privateIdentity,
      async (identityPath) =>
        commandResult(AGE_KEYGEN_BIN, ["-y", identityPath], {
          failureMessage: "The age recipient could not be derived",
        }).stdout.trim(),
    );
  } finally {
    await rm(probeRoot, { force: true, recursive: true });
  }
  if (!/^age1[a-z0-9]+$/u.test(recipient)) {
    fail("The age recipient has an invalid shape", "V2_8_3_BACKUP_IDENTITY_INVALID");
  }

  await mkdir(V2_STAGE8_3_BACKUP_IDENTITY_DIR, { mode: 0o700, recursive: true });
  await chmod(V2_STAGE8_3_BACKUP_IDENTITY_DIR, 0o700);
  let existing = null;
  try {
    existing = (await readFile(RECIPIENT_PATH, "utf8")).trim();
  } catch {
    // First creation writes the public recipient below.
  }
  if (existing && existing !== recipient) {
    fail("The stored public recipient does not match Keychain", "V2_8_3_BACKUP_IDENTITY_MISMATCH");
  }
  if (!existing) await writePrivateFile(RECIPIENT_PATH, `${recipient}\n`);
  return {
    created,
    keychainCustodyConfirmed: true,
    privateIdentity,
    recipient,
    recipientSha256: sha256(recipient),
  };
}

function databaseEnv(rawUrl) {
  return {
    ...minimalBaseEnv(),
    ...postgresEnvironmentFromNeonUrl(rawUrl, "Production database URL"),
    PGAPPNAME: "mimi-v2-8-3-gate3-backup",
    PGCONNECT_TIMEOUT: "15",
    PGOPTIONS: "-c default_transaction_read_only=on",
  };
}

function localDatabaseEnv(socketDir, database) {
  return {
    ...minimalBaseEnv(),
    PGAPPNAME: "mimi-v2-8-3-gate3-local-restore",
    PGDATABASE: database,
    PGHOST: socketDir,
    PGPORT: LOCAL_PORT,
    PGUSER: "mimi_gate3",
  };
}

function schema5InventorySql() {
  const tableArray = SCHEMA5_TABLES.map((table) => `'${table}'`).join(", ");
  const tableSections = Object.entries(CORE_TABLES)
    .map(
      ([table, orderBy]) => `
\\echo __MIMI_TABLE_${table}__
copy (
  select to_jsonb(source_row)::text
  from ${table} source_row
  order by ${orderBy}
) to stdout;`,
    )
    .join("\n");
  return `
begin transaction isolation level repeatable read read only;
set local timezone = 'UTC';
\\echo __MIMI_METADATA__
with
actual_tables as (
  select table_name
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
),
expected_tables as (
  select unnest(array[${tableArray}]::text[]) as table_name
),
expected_columns(table_name, column_name, data_type, is_nullable) as (
  values
    ('vocabulary_items', 'learning_track', 'text', 'NO'),
    ('vocabulary_items', 'tags', 'jsonb', 'YES'),
    ('vocabulary_items', 'meanings_zh', 'jsonb', 'NO'),
    ('vocabulary_items', 'examples', 'jsonb', 'NO'),
    ('review_settings', 'recognition_session_limit', 'integer', 'NO'),
    ('review_settings', 'active_session_limit', 'integer', 'NO')
),
expected_constraints as (
  select unnest(array[
    'import_batches_source_type_valid',
    'vocabulary_items_learning_track_valid',
    'vocabulary_items_tags_array_or_null',
    'vocabulary_items_meanings_zh_array',
    'vocabulary_items_examples_array',
    'vocabulary_items_source_valid',
    'review_settings_recognition_session_limit_range',
    'review_settings_active_session_limit_range',
    'backup_imports_schema_version_supported'
  ]::text[]) as name
),
expected_triggers(table_name, trigger_name) as (
  values
    ('review_states', 'review_states_recognition_only'),
    ('review_events', 'review_events_recognition_only')
)
select json_build_object(
  'serverMajor', current_setting('server_version_num')::integer / 10000,
  'database', current_database(),
  'role', current_user,
  'schemaVersion', 5,
  'schema', json_build_object(
    'tables', (select count(*) from actual_tables where table_name in (select table_name from expected_tables)),
    'unexpectedTables', (select count(*) from actual_tables where table_name not in (select table_name from expected_tables)),
    'columns', (
      select count(*)
      from expected_columns expected
      join information_schema.columns actual
        on actual.table_schema = 'public'
       and actual.table_name = expected.table_name
       and actual.column_name = expected.column_name
       and actual.data_type = expected.data_type
       and actual.is_nullable = expected.is_nullable
    ),
    'constraints', (
      select count(*)
      from information_schema.table_constraints
      where table_schema = 'public'
        and constraint_name in (select name from expected_constraints)
    ),
    'indexes', (
      select count(*) from pg_indexes
      where schemaname = 'public'
        and indexname = 'vocabulary_items_person_learning_track_idx'
    ),
    'triggers', (
      select count(*) from (
        select distinct event_object_table, trigger_name
        from information_schema.triggers
        where trigger_schema = 'public'
          and (event_object_table, trigger_name) in (select * from expected_triggers)
      ) found
    ),
    'schema6Markers', (
      select count(*) from information_schema.columns
      where table_schema = 'public'
        and table_name = 'review_states'
        and column_name = 'review_profile'
    )
  ),
  'counts', json_build_object(
    'people', (select count(*) from people),
    'vocabulary_items', (select count(*) from vocabulary_items),
    'import_batches', (select count(*) from import_batches),
    'review_states', (select count(*) from review_states),
    'review_events', (select count(*) from review_events),
    'review_settings', (select count(*) from review_settings),
    'backup_imports', (select count(*) from backup_imports),
    'backup_import_mappings', (select count(*) from backup_import_mappings),
    'recognition_vocabulary_items', (select count(*) from vocabulary_items where learning_track = 'recognition'),
    'active_vocabulary_items', (select count(*) from vocabulary_items where learning_track = 'active'),
    'archived_vocabulary_items', (select count(*) from vocabulary_items where status = 'archived')
  ),
  'invariants', json_build_object(
    'vocabulary_person_orphans', (
      select count(*) from vocabulary_items item
      left join people person on person.id = item.person_id where person.id is null
    ),
    'import_batch_person_orphans', (
      select count(*) from import_batches batch
      left join people person on person.id = batch.person_id where person.id is null
    ),
    'vocabulary_batch_orphans', (
      select count(*) from vocabulary_items item
      left join import_batches batch
        on batch.person_id = item.person_id and batch.id = item.import_batch_id
      where item.import_batch_id is not null and batch.id is null
    ),
    'review_state_item_orphans', (
      select count(*) from review_states state
      left join vocabulary_items item
        on item.person_id = state.person_id and item.id = state.vocabulary_item_id
      where item.id is null
    ),
    'review_event_item_orphans', (
      select count(*) from review_events event
      left join vocabulary_items item
        on item.person_id = event.person_id and item.id = event.vocabulary_item_id
      where item.id is null
    ),
    'review_setting_person_orphans', (
      select count(*) from review_settings setting
      left join people person on person.id = setting.person_id where person.id is null
    ),
    'application_shape_violations', (
      select count(*) from vocabulary_items
      where length(trim(surface_text)) = 0
         or length(trim(normalized_text)) = 0
         or learning_track not in ('recognition', 'active')
         or jsonb_typeof(meanings_zh) <> 'array'
         or jsonb_typeof(examples) <> 'array'
         or (tags is not null and jsonb_typeof(tags) <> 'array')
    ),
    'active_review_rows', (
      select (select count(*) from review_states state join vocabulary_items item on item.id = state.vocabulary_item_id and item.person_id = state.person_id where item.learning_track <> 'recognition')
           + (select count(*) from review_events event join vocabulary_items item on item.id = event.vocabulary_item_id and item.person_id = event.person_id where item.learning_track <> 'recognition')
    )
  )
)::text;
${tableSections}
\\echo __MIMI_DONE__
commit;
`;
}

function parseIntegerRecord(value, label) {
  return Object.fromEntries(
    Object.entries(value ?? {}).map(([key, item]) => {
      const number = Number(item);
      if (!Number.isSafeInteger(number) || number < 0) {
        fail(`Invalid ${label} value`, "V2_8_3_BACKUP_INVENTORY_INVALID");
      }
      return [key, number];
    }),
  );
}

function parseInventoryOutput(raw) {
  const lines = raw.toString("utf8").split("\n");
  let section = null;
  let metadata = null;
  const tableLines = Object.fromEntries(SCHEMA5_TABLES.map((table) => [table, []]));
  for (const line of lines) {
    if (line === "__MIMI_METADATA__") {
      section = "metadata";
      continue;
    }
    if (line === "__MIMI_DONE__") {
      section = null;
      continue;
    }
    const tableMatch = line.match(/^__MIMI_TABLE_([a-z_]+)__$/u);
    if (tableMatch) {
      if (!(tableMatch[1] in tableLines)) {
        fail("Unexpected inventory table marker", "V2_8_3_BACKUP_INVENTORY_INVALID");
      }
      section = tableMatch[1];
      continue;
    }
    if (!section || line.length === 0) continue;
    if (section === "metadata") {
      if (metadata) fail("Duplicate inventory metadata", "V2_8_3_BACKUP_INVENTORY_INVALID");
      try {
        metadata = JSON.parse(line);
      } catch {
        fail("Inventory metadata is invalid", "V2_8_3_BACKUP_INVENTORY_INVALID");
      }
    } else {
      tableLines[section].push(line);
    }
  }
  if (!metadata) fail("Inventory metadata is missing", "V2_8_3_BACKUP_INVENTORY_INVALID");
  const counts = parseIntegerRecord(metadata.counts, "count");
  const invariants = parseIntegerRecord(metadata.invariants, "invariant");
  const schema = parseIntegerRecord(metadata.schema, "schema");
  const tableDigests = Object.fromEntries(
    SCHEMA5_TABLES.map((table) => {
      const bytes = tableLines[table].length
        ? `${tableLines[table].join("\n")}\n`
        : "";
      return [
        table,
        {
          count: tableLines[table].length,
          sha256: sha256(bytes),
        },
      ];
    }),
  );
  for (const [table, digest] of Object.entries(tableDigests)) {
    if (digest.count !== Number(counts[table])) {
      fail(`Inventory count mismatch for ${table}`, "V2_8_3_BACKUP_INVENTORY_INVALID");
    }
  }
  return {
    combinedSha256: combineBackupTableDigests(tableDigests),
    counts,
    database: String(metadata.database),
    invariants,
    role: String(metadata.role),
    schema,
    schemaVersion: Number(metadata.schemaVersion),
    serverMajor: Number(metadata.serverMajor),
    tableDigests,
  };
}

function inventoryDatabase(env, expectedIdentity) {
  const result = commandResult(
    postgresTool("psql"),
    ["-X", "-qAt", "--no-password", "-v", "ON_ERROR_STOP=1"],
    {
      encoding: null,
      env,
      input: schema5InventorySql(),
      failureMessage: "Schema 5 inventory failed safely",
      failureCode: "V2_8_3_BACKUP_INVENTORY_FAILED",
    },
  );
  const inventory = parseInventoryOutput(result.stdout);
  assertSchema5BackupInventory(inventory, expectedIdentity);
  return inventory;
}

function runPsql(env, sql, failureMessage) {
  commandResult(
    postgresTool("psql"),
    ["-X", "-q", "--no-password", "-v", "ON_ERROR_STOP=1"],
    {
      env,
      input: sql,
      failureMessage,
      failureCode: "V2_8_3_BACKUP_LOCAL_DATABASE_FAILED",
    },
  );
}

async function runPipeline(left, right, failureMessage) {
  const leftProcess = spawn(left.bin, left.args, {
    env: left.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const rightProcess = spawn(right.bin, right.args, {
    env: right.env,
    stdio: ["pipe", "ignore", "pipe"],
  });
  const stderr = { left: 0, right: 0 };
  leftProcess.stderr.on("data", (chunk) => {
    stderr.left += chunk.length;
  });
  rightProcess.stderr.on("data", (chunk) => {
    stderr.right += chunk.length;
  });
  leftProcess.stdout.on("error", () => {});
  rightProcess.stdin.on("error", () => {});
  leftProcess.stdout.pipe(rightProcess.stdin);
  const wait = (child) =>
    new Promise((resolvePromise, rejectPromise) => {
      child.once("error", rejectPromise);
      child.once("close", (code, signal) => resolvePromise({ code, signal }));
    });
  let results;
  try {
    results = await Promise.all([wait(leftProcess), wait(rightProcess)]);
  } catch {
    leftProcess.kill("SIGTERM");
    rightProcess.kill("SIGTERM");
    fail(failureMessage, "V2_8_3_BACKUP_PIPELINE_FAILED");
  }
  if (results.some((item) => item.code !== 0 || item.signal)) {
    fail(failureMessage, "V2_8_3_BACKUP_PIPELINE_FAILED");
  }
  return stderr;
}

async function createEncryptedArchive({ databaseEnvironment, outputPath, recipient }) {
  const finalPath = assertBackupFileName(outputPath);
  const partialPath = `${finalPath}.partial`;
  await rm(partialPath, { force: true });
  try {
    await runPipeline(
      {
        args: [
          "--format=custom",
          "--compress=zstd:level=6",
          "--no-owner",
          "--no-acl",
          "--serializable-deferrable",
          "--no-password",
        ],
        bin: postgresTool("pg_dump"),
        env: databaseEnvironment,
      },
      {
        args: ["--encrypt", "--recipient", recipient, "--output", partialPath],
        bin: AGE_BIN,
        env: minimalBaseEnv(),
      },
      "The encrypted logical backup pipeline failed safely",
    );
    await chmod(partialPath, 0o600);
    await rename(partialPath, finalPath);
  } catch (error) {
    await rm(partialPath, { force: true });
    throw error;
  }
  const details = await stat(finalPath);
  if (!details.isFile() || details.size <= 0) {
    await rm(finalPath, { force: true });
    fail("The encrypted archive is empty", "V2_8_3_BACKUP_ARCHIVE_INVALID");
  }
  return { bytes: details.size, path: finalPath, sha256: await fileSha256(finalPath) };
}

async function createSyntheticEncryptedArchive({ databaseEnvironment, outputPath, recipient }) {
  const partialPath = `${outputPath}.partial`;
  await rm(partialPath, { force: true });
  try {
    await runPipeline(
      {
        args: ["--format=custom", "--compress=zstd:level=6", "--no-owner", "--no-acl", "--no-password"],
        bin: postgresTool("pg_dump"),
        env: databaseEnvironment,
      },
      {
        args: ["--encrypt", "--recipient", recipient, "--output", partialPath],
        bin: AGE_BIN,
        env: minimalBaseEnv(),
      },
      "The synthetic encrypted backup pipeline failed",
    );
    await rename(partialPath, outputPath);
  } catch (error) {
    await rm(partialPath, { force: true });
    throw error;
  }
  return { bytes: (await stat(outputPath)).size, path: outputPath, sha256: await fileSha256(outputPath) };
}

async function restoreEncryptedArchive({ archivePath, identityPath, localEnv }) {
  await runPipeline(
    {
      args: ["--decrypt", "--identity", identityPath, archivePath],
      bin: AGE_BIN,
      env: minimalBaseEnv(),
    },
    {
      args: [
        "--exit-on-error",
        "--single-transaction",
        "--no-owner",
        "--no-acl",
        "--dbname",
        localEnv.PGDATABASE,
      ],
      bin: postgresTool("pg_restore"),
      env: localEnv,
    },
    "The encrypted archive restore failed safely",
  );
  runPsql(localEnv, "analyze;", "The restored database could not be analyzed");
}

function expectDecryptFailure(archivePath, identityPath) {
  const result = spawnSync(
    AGE_BIN,
    ["--decrypt", "--identity", identityPath, archivePath],
    { env: minimalBaseEnv(), maxBuffer: 1024 * 1024, stdio: ["ignore", "ignore", "ignore"] },
  );
  if (result.status === 0) {
    fail("An invalid encrypted archive unexpectedly decrypted", "V2_8_3_BACKUP_NEGATIVE_TEST_FAILED");
  }
  return true;
}

async function corruptArchive(source, destination) {
  await copyFile(source, destination);
  const bytes = await readFile(destination);
  if (bytes.length < 64) fail("Synthetic archive is unexpectedly small", "V2_8_3_BACKUP_ARCHIVE_INVALID");
  bytes[Math.floor(bytes.length / 2)] ^= 0x01;
  await writeFile(destination, bytes, { flag: "w", mode: 0o600 });
}

async function withTemporaryPostgres(operation) {
  const root = await mkdtemp(join(tmpdir(), "mimi-v2-8-3-gate3-"));
  const dataDir = join(root, "data");
  const socketDir = join(root, "socket");
  const logPath = join(root, "postgres.log");
  await mkdir(socketDir, { mode: 0o700 });
  let started = false;
  let result;
  let cleanupFailure = null;
  try {
    commandResult(
      postgresTool("initdb"),
      [
        "--pgdata",
        dataDir,
        "--username=mimi_gate3",
        "--encoding=UTF8",
        "--no-locale",
        "--auth-local=trust",
        "--auth-host=reject",
        "--no-instructions",
      ],
      { failureMessage: "The isolated PostgreSQL cluster could not be initialized" },
    );
    commandResult(
      postgresTool("pg_ctl"),
      [
        "--pgdata",
        dataDir,
        "--log",
        logPath,
        "--options",
        `-F -k ${socketDir} -h '' -p ${LOCAL_PORT}`,
        "--wait",
        "start",
      ],
      { failureMessage: "The isolated PostgreSQL cluster could not start" },
    );
    started = true;
    result = await operation({ root, socketDir });
  } finally {
    if (started) {
      const stopped = spawnSync(
        postgresTool("pg_ctl"),
        ["--pgdata", dataDir, "--mode=fast", "--wait", "stop"],
        { encoding: "utf8", env: minimalBaseEnv(), maxBuffer: 1024 * 1024 },
      );
      if (stopped.status !== 0) cleanupFailure = "stop";
    }
    await rm(root, { force: true, recursive: true });
    try {
      await access(root, fsConstants.F_OK);
      cleanupFailure = cleanupFailure || "remove";
    } catch {
      // The temporary cluster is gone.
    }
  }
  if (cleanupFailure) {
    fail("The temporary PostgreSQL cleanup did not complete", "V2_8_3_BACKUP_CLEANUP_FAILED");
  }
  return { cleanupVerified: true, result };
}

function createLocalDatabase(socketDir, database) {
  commandResult(
    postgresTool("createdb"),
    [
      "--host",
      socketDir,
      "--port",
      LOCAL_PORT,
      "--username",
      "mimi_gate3",
      "--template",
      "template0",
      database,
    ],
    { failureMessage: "The isolated restore database could not be created" },
  );
  return localDatabaseEnv(socketDir, database);
}

async function applySchema5Fixture(localEnv) {
  const initial = await readFile(resolve(process.cwd(), "db/migrations/0001_initial.sql"), "utf8");
  const schema5 = await readFile(
    resolve(process.cwd(), "db/migrations/0002_schema5_production_runtime.sql"),
    "utf8",
  );
  runPsql(localEnv, initial, "The synthetic initial schema could not be applied");
  runPsql(localEnv, schema5, "The synthetic Schema 5 migration could not be applied");
  runPsql(
    localEnv,
    `
      begin;
      insert into people (id, display_name, slug, is_active, created_at, updated_at)
      values ('00000000-0000-4000-8000-000000000301', 'Fixture Learner', 'fixture-learner', true, '2026-07-23T00:00:00Z', '2026-07-23T00:00:00Z');
      insert into import_batches (id, person_id, source_type, file_name, created_at, total_rows, accepted_rows, duplicate_rows, invalid_rows)
      values ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000301', 'json_paste', null, '2026-07-23T00:00:00Z', 2, 2, 0, 0);
      insert into vocabulary_items (
        id, person_id, surface_text, normalized_text, meaning_zh, example, notes, rarity_score,
        source, import_batch_id, status, created_at, system_created_at, updated_at, timezone,
        archived_at, learning_track, tags, meanings_zh, examples
      ) values
      ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000301', 'fixture alpha', 'fixture alpha', '样本一', 'Fixture alpha appears.', '', 2, 'json_paste', '00000000-0000-4000-8000-000000000302', 'new', '2026-07-23T00:00:00Z', '2026-07-23T00:00:00Z', '2026-07-23T00:00:00Z', 'Australia/Melbourne', null, 'recognition', '["fixture"]'::jsonb, '["样本一"]'::jsonb, '["Fixture alpha appears."]'::jsonb),
      ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000301', 'fixture beta', 'fixture beta', '样本二', 'Fixture beta appears.', '', null, 'json_paste', '00000000-0000-4000-8000-000000000302', 'new', '2026-07-23T00:00:00Z', '2026-07-23T00:00:00Z', '2026-07-23T00:00:00Z', 'Australia/Melbourne', null, 'recognition', null, '["样本二"]'::jsonb, '["Fixture beta appears."]'::jsonb);
      insert into review_states (
        id, person_id, vocabulary_item_id, status, due_at, last_reviewed_at, review_count,
        lapse_count, interval_minutes, difficulty, stability, updated_at
      ) values ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000303', 'learning', '2026-07-24T00:00:00Z', '2026-07-23T00:05:00Z', 1, 0, 1440, 5, 1, '2026-07-23T00:05:00Z');
      insert into review_events (
        id, person_id, vocabulary_item_id, reviewed_at, rating, previous_due_at,
        next_due_at, previous_interval_minutes, next_interval_minutes, elapsed_ms
      ) values ('00000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000303', '2026-07-23T00:05:00Z', 'vague', null, '2026-07-24T00:00:00Z', null, 1440, 1200);
      insert into review_settings (
        person_id, session_limit, timezone, updated_at, recognition_session_limit, active_session_limit
      ) values ('00000000-0000-4000-8000-000000000301', 20, 'Australia/Melbourne', '2026-07-23T00:00:00Z', 20, 8);
      commit;
    `,
    "The synthetic Schema 5 data could not be inserted",
  );
}

async function writeSafeEvidence(path, value) {
  assertSecretFreeEvidence(value);
  await mkdir(resolve(path, ".."), { recursive: true });
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(path, bytes, { mode: 0o600 });
  return { path, sha256: sha256(bytes) };
}

async function runSynthetic(tools) {
  const commitSha = gitCommitSha();
  const generated = generateAgeIdentity();
  const wrong = generateAgeIdentity();
  const outcome = await withTemporaryPostgres(async ({ root, socketDir }) => {
    const sourceEnv = createLocalDatabase(socketDir, "source_schema5");
    sourceEnv.PGOPTIONS = "-c timezone=Australia/Melbourne";
    await applySchema5Fixture(sourceEnv);
    const source = inventoryDatabase(sourceEnv, {
      expectedDatabase: "source_schema5",
      expectedRole: "mimi_gate3",
    });
    const archive = await createSyntheticEncryptedArchive({
      databaseEnvironment: sourceEnv,
      outputPath: join(root, "synthetic-schema5.dump.age"),
      recipient: generated.recipient,
    });
    return withTemporaryIdentityFile(root, generated.privateIdentity, async (identityPath) => {
      const wrongIdentityPath = join(root, "wrong-age-identity.txt");
      await writeFile(wrongIdentityPath, `${wrong.privateIdentity}\n`, { flag: "wx", mode: 0o600 });
      expectDecryptFailure(archive.path, wrongIdentityPath);
      const corruptPath = join(root, "synthetic-schema5-corrupt.dump.age");
      await corruptArchive(archive.path, corruptPath);
      expectDecryptFailure(corruptPath, identityPath);
      const restoreEnv = createLocalDatabase(socketDir, "restored_schema5");
      restoreEnv.PGOPTIONS = "-c timezone=UTC";
      await restoreEncryptedArchive({ archivePath: archive.path, identityPath, localEnv: restoreEnv });
      const restored = inventoryDatabase(restoreEnv, {
        expectedDatabase: "restored_schema5",
        expectedRole: "mimi_gate3",
      });
      const parity = compareBackupInventories(source, restored);
      if (!parity.matched) {
        fail(`Synthetic restore parity failed: ${parity.mismatches.join(", ")}`, "V2_8_3_BACKUP_SYNTHETIC_PARITY_FAILED");
      }
      return {
        archiveBytes: archive.bytes,
        archiveSha256: archive.sha256,
        corruptedArchiveRejected: true,
        restoredCombinedSha256: restored.combinedSha256,
        sourceCombinedSha256: source.combinedSha256,
        wrongIdentityRejected: true,
      };
    });
  });
  const proof = {
    artifactKind: "v2-8-3-backup-synthetic-proof-v1",
    artifactVersion: 1,
    cleanupVerified: outcome.cleanupVerified,
    commitSha,
    completedAt: new Date().toISOString(),
    method: V2_STAGE8_3_BACKUP_METHOD,
    negativeTests: {
      corruptedArchiveRejected: outcome.result.corruptedArchiveRejected,
      wrongIdentityRejected: outcome.result.wrongIdentityRejected,
    },
    parity: {
      matched:
        outcome.result.restoredCombinedSha256 === outcome.result.sourceCombinedSha256,
      restoredCombinedSha256: outcome.result.restoredCombinedSha256,
      sourceCombinedSha256: outcome.result.sourceCombinedSha256,
    },
    tools,
  };
  const evidence = await writeSafeEvidence(SYNTHETIC_PROOF_PATH, proof);
  return { evidenceSha256: evidence.sha256, proof };
}

async function readCurrentSyntheticProof(tools) {
  let value;
  try {
    value = JSON.parse(await readFile(SYNTHETIC_PROOF_PATH, "utf8"));
  } catch {
    fail("A current synthetic backup proof is required", "V2_8_3_BACKUP_SYNTHETIC_PROOF_REQUIRED");
  }
  if (
    value?.artifactKind !== "v2-8-3-backup-synthetic-proof-v1" ||
    value?.commitSha !== gitCommitSha() ||
    value?.method !== V2_STAGE8_3_BACKUP_METHOD ||
    value?.cleanupVerified !== true ||
    value?.negativeTests?.corruptedArchiveRejected !== true ||
    value?.negativeTests?.wrongIdentityRejected !== true ||
    value?.parity?.matched !== true ||
    JSON.stringify(value?.tools) !== JSON.stringify(tools)
  ) {
    fail("The synthetic backup proof is stale or incomplete", "V2_8_3_BACKUP_SYNTHETIC_PROOF_STALE");
  }
  assertSecretFreeEvidence(value);
  return { sha256: await fileSha256(SYNTHETIC_PROOF_PATH), value };
}

async function runProduction(tools) {
  if (!gitIsClean()) {
    fail("Production backup requires a clean exact Git state", "V2_8_3_BACKUP_GIT_DIRTY");
  }
  const commitSha = gitCommitSha();
  const synthetic = await readCurrentSyntheticProof(tools);
  const productionEnvironment = retrieveProductionEnvironmentFromClipboard();
  const sourceIdentity = assertProductionBackupEnvironment(productionEnvironment);
  const identity = await ensurePermanentAgeIdentity();
  await mkdir(V2_STAGE8_3_BACKUP_DIR, { mode: 0o700, recursive: true });
  await chmod(V2_STAGE8_3_BACKUP_DIR, 0o700);
  const createdAt = new Date();
  const archivePath = assertBackupFileName(
    join(
      V2_STAGE8_3_BACKUP_DIR,
      `mimi-production-schema5-${timestampToken(createdAt)}-${commitSha.slice(0, 12)}.dump.age`,
    ),
  );
  const sourceEnv = databaseEnv(sourceIdentity.rawUrl);
  let archive = null;
  try {
    const sourceBefore = inventoryDatabase(sourceEnv, {
      expectedDatabase: "neondb",
      expectedRole: "neondb_owner",
    });
    const gate2Delta = assertGate2Baseline(sourceBefore.counts);
    archive = await createEncryptedArchive({
      databaseEnvironment: sourceEnv,
      outputPath: archivePath,
      recipient: identity.recipient,
    });
    const sourceAfter = inventoryDatabase(sourceEnv, {
      expectedDatabase: "neondb",
      expectedRole: "neondb_owner",
    });
    const sourceStable = compareBackupInventories(sourceBefore, sourceAfter);
    if (!sourceStable.matched) {
      await rm(archive.path, { force: true });
      fail(
        `Production changed during the backup window: ${sourceStable.mismatches.join(", ")}`,
        "V2_8_3_BACKUP_SOURCE_CHANGED",
      );
    }

    const restoredAtStart = Date.now();
    const restoredOutcome = await withTemporaryPostgres(async ({ root, socketDir }) =>
      withTemporaryIdentityFile(root, identity.privateIdentity, async (identityPath) => {
        const restoreEnv = createLocalDatabase(socketDir, "restored_schema5");
        await restoreEncryptedArchive({ archivePath: archive.path, identityPath, localEnv: restoreEnv });
        return inventoryDatabase(restoreEnv, {
          expectedDatabase: "restored_schema5",
          expectedRole: "mimi_gate3",
        });
      }),
    );
    const restored = restoredOutcome.result;
    const parity = compareBackupInventories(sourceBefore, restored);
    if (!parity.matched) {
      await rm(archive.path, { force: true });
      fail(`Production restore parity failed: ${parity.mismatches.join(", ")}`, "V2_8_3_BACKUP_RESTORE_PARITY_FAILED");
    }

    const evidence = {
      artifactKind: V2_STAGE8_3_BACKUP_EVIDENCE_KIND,
      artifactVersion: 1,
      archive: {
        bytes: archive.bytes,
        filename: basename(archive.path),
        sha256: archive.sha256,
      },
      cleanup: {
        partialArchiveRemoved: true,
        temporaryIdentityRemoved: true,
        temporaryPostgresRemoved: restoredOutcome.cleanupVerified,
        verified: restoredOutcome.cleanupVerified,
      },
      completedAt: new Date().toISOString(),
      encryption: {
        keychainCustodyConfirmed: identity.keychainCustodyConfirmed,
        recipientSha256: identity.recipientSha256,
      },
      git: { commitSha },
      method: V2_STAGE8_3_BACKUP_METHOD,
      restore: {
        combinedSha256: restored.combinedSha256,
        counts: restored.counts,
        durationMs: Date.now() - restoredAtStart,
        invariants: restored.invariants,
        schema: restored.schema,
        schemaVersion: restored.schemaVersion,
        tableDigests: restored.tableDigests,
        verified: true,
      },
      source: {
        baselineDelta: gate2Delta,
        combinedSha256: sourceBefore.combinedSha256,
        counts: sourceBefore.counts,
        database: sourceIdentity.safeIdentity.database,
        endpointSha256: sourceIdentity.endpointSha256,
        invariants: sourceBefore.invariants,
        role: sourceIdentity.safeIdentity.role,
        schema: sourceBefore.schema,
        schemaVersion: sourceBefore.schemaVersion,
        tableDigests: sourceBefore.tableDigests,
        target: sourceIdentity.safeIdentity.target,
      },
      syntheticProofSha256: synthetic.sha256,
      tools,
    };
    validateBackupEvidence(evidence);
    const evidencePath = join(
      EVIDENCE_ROOT,
      timestampToken(createdAt),
      "production-backup-evidence.json",
    );
    const saved = await writeSafeEvidence(evidencePath, evidence);
    return {
      archiveBytes: archive.bytes,
      archiveFile: basename(archive.path),
      archiveSha256: archive.sha256,
      combinedSha256: sourceBefore.combinedSha256,
      evidencePath,
      evidenceSha256: saved.sha256,
      restoreVerified: true,
    };
  } catch (error) {
    if (archive?.path) await rm(archive.path, { force: true });
    throw error;
  }
}

async function main() {
  let phase = "local-contract";
  try {
    const command = process.argv[2];
    assertBackupCommand({
      argv: process.argv.slice(3),
      command,
      env: process.env,
    });
    phase = "tool-preflight";
    const tools = toolVersions();
    if (command === "tools") {
      console.log(JSON.stringify({ ok: true, tools }, null, 2));
      return;
    }
    if (command === "create-identity") {
      phase = "keychain-identity";
      const identity = await ensurePermanentAgeIdentity();
      console.log(
        JSON.stringify(
          {
            ok: true,
            created: identity.created,
            keychainCustodyConfirmed: identity.keychainCustodyConfirmed,
            recipientSha256: identity.recipientSha256,
          },
          null,
          2,
        ),
      );
      return;
    }
    if (command === "synthetic") {
      phase = "synthetic-rehearsal";
      const result = await runSynthetic(tools);
      console.log(
        JSON.stringify(
          {
            ok: true,
            cleanupVerified: result.proof.cleanupVerified,
            evidenceSha256: result.evidenceSha256,
            parityMatched: result.proof.parity.matched,
            negativeTests: result.proof.negativeTests,
          },
          null,
          2,
        ),
      );
      return;
    }
    phase = "production-backup-restore";
    const result = await runProduction(tools);
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: safeBackupFailure(error, phase) }));
    process.exitCode = 1;
  }
}

await main();
