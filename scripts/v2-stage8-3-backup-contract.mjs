import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export const V2_STAGE8_3_BACKUP_METHOD =
  "postgres17-custom-age-keychain-v1";
export const V2_STAGE8_3_BACKUP_EVIDENCE_KIND =
  "v2-8-3-encrypted-backup-restore-v1";
export const V2_STAGE8_3_BACKUP_KEYCHAIN_SERVICE =
  "mimi-vocabulary-backup-age-identity-v1";
export const V2_STAGE8_3_BACKUP_DIR = join(
  homedir(),
  "Documents",
  "Mimi Vocabulary Backups",
);
export const V2_STAGE8_3_BACKUP_IDENTITY_DIR = join(
  homedir(),
  "Library",
  "Application Support",
  "Mimi Vocabulary Backup",
);
export const V2_STAGE8_3_PRODUCTION_MAIN_ENDPOINT_SHA256 =
  "f1c0c90fa8a4a030219af9a9604158567b755d4e64bc70624d325fe48ae72d7e";

export const V2_STAGE8_3_GATE2_BASELINE_COUNTS = Object.freeze({
  people: 1,
  vocabulary_items: 1486,
  import_batches: 38,
  review_states: 125,
  review_events: 203,
  review_settings: 1,
  backup_imports: 0,
  backup_import_mappings: 0,
});

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SAFE_FILENAME_PATTERN =
  /^mimi-production-schema5-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}\.dump\.age$/u;
const NEON_SYDNEY_HOST_PATTERN =
  /^ep-[a-z0-9-]+(?:-pooler)?\.ap-southeast-2\.aws\.neon\.tech$/u;
const FORBIDDEN_KEY_PATTERN =
  /(?:password|secret|api.?key|auth.?key|credential|database.?url|connection.?string|private.?identity|passphrase|authorization|access.?token|raw.?row)/iu;
const FORBIDDEN_VALUE_PATTERNS = [
  /postgres(?:ql)?:\/\//iu,
  /\.neon\.tech\b/iu,
  /AGE-SECRET-KEY-/u,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/u,
  /\bBasic\s+[A-Za-z0-9+/=]{12,}/u,
  /\b(?:AQ\.|AIza|sk-)[A-Za-z0-9_-]{20,}/u,
];

export class V2Stage83BackupGuardError extends Error {
  constructor(message, code = "V2_8_3_BACKUP_GUARD_REJECTED") {
    super(message);
    this.name = "V2Stage83BackupGuardError";
    this.code = code;
    this.safeToReport = true;
  }
}

function reject(message, code) {
  throw new V2Stage83BackupGuardError(message, code);
}

function requireExact(env, name, expected) {
  if (env[name] !== expected) {
    reject(`${name} must be ${expected}`, "V2_8_3_BACKUP_ENV_MISMATCH");
  }
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function combineBackupTableDigests(tableDigests) {
  const digest = createHash("sha256");
  for (const table of Object.keys(tableDigests).sort()) {
    const item = tableDigests[table];
    digest.update(table);
    digest.update("\0");
    digest.update(String(item.count));
    digest.update("\0");
    digest.update(item.sha256);
    digest.update("\0");
  }
  return digest.digest("hex");
}

function decoded(value, label) {
  try {
    return decodeURIComponent(value);
  } catch {
    reject(`${label} is not valid URL encoding`, "V2_8_3_BACKUP_URL_INVALID");
  }
}

export function parseNeonDatabaseIdentity(rawUrl, label = "database URL") {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    reject(`${label} is invalid`, "V2_8_3_BACKUP_URL_INVALID");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !NEON_SYDNEY_HOST_PATTERN.test(parsed.hostname) ||
    !parsed.password ||
    parsed.port && parsed.port !== "5432"
  ) {
    reject(`${label} is outside the approved Neon target`, "V2_8_3_BACKUP_URL_INVALID");
  }
  const role = decoded(parsed.username, `${label} role`);
  const database = decoded(parsed.pathname.replace(/^\//u, ""), `${label} database`);
  if (role !== "neondb_owner" || database !== "neondb") {
    reject(`${label} has the wrong database or role`, "V2_8_3_BACKUP_URL_TARGET_MISMATCH");
  }
  const sslMode = parsed.searchParams.get("sslmode");
  if (!sslMode || !["require", "verify-ca", "verify-full"].includes(sslMode)) {
    reject(`${label} must require TLS`, "V2_8_3_BACKUP_URL_TLS_REQUIRED");
  }
  if (parsed.searchParams.get("channel_binding") !== "require") {
    reject(
      `${label} must require channel binding`,
      "V2_8_3_BACKUP_URL_TLS_REQUIRED",
    );
  }
  const pooled = parsed.hostname.includes("-pooler.");
  const endpointFamily = parsed.hostname.replace("-pooler.", ".");
  return {
    database,
    endpointFamily,
    endpointSha256: sha256(endpointFamily),
    pooled,
    role,
  };
}

export function postgresEnvironmentFromNeonUrl(
  rawUrl,
  label = "database URL",
) {
  parseNeonDatabaseIdentity(rawUrl, label);
  const parsed = new URL(rawUrl);
  return {
    PGCHANNELBINDING: "require",
    PGDATABASE: decoded(
      parsed.pathname.replace(/^\//u, ""),
      `${label} database`,
    ),
    PGHOST: parsed.hostname,
    PGPASSWORD: decoded(parsed.password, `${label} password`),
    PGPORT: parsed.port || "5432",
    PGSSLMODE: parsed.searchParams.get("sslmode"),
    PGUSER: decoded(parsed.username, `${label} role`),
  };
}

function assertSameDatabaseTarget(left, right, label) {
  if (
    left.database !== right.database ||
    left.role !== right.role ||
    left.endpointFamily !== right.endpointFamily
  ) {
    reject(`${label} does not resolve to the same Production target`, "V2_8_3_BACKUP_URL_TARGET_MISMATCH");
  }
}

export function assertProductionBackupEnvironment(
  env,
  {
    expectedEndpointSha256 = V2_STAGE8_3_PRODUCTION_MAIN_ENDPOINT_SHA256,
  } = {},
) {
  requireExact(env, "VERCEL_ENV", "production");
  requireExact(env, "STAGE6B_DATABASE_TARGET", "production");
  requireExact(env, "MIMI_STORAGE_RUNTIME", "postgres-production");
  requireExact(env, "MIMI_V2_8_3_BACKUP_TARGET", "production-main");
  requireExact(
    env,
    "MIMI_V2_8_3_BACKUP_ACTION",
    "encrypted-logical-backup",
  );
  requireExact(env, "MIMI_V2_8_3_BACKUP_APPROVED", "true");

  const unpooledRaw =
    env.DATABASE_URL_UNPOOLED?.trim() ||
    env.POSTGRES_URL_NON_POOLING?.trim() ||
    "";
  if (!unpooledRaw) {
    reject(
      "A Production unpooled database URL is required",
      "V2_8_3_BACKUP_UNPOOLED_URL_MISSING",
    );
  }
  const unpooled = parseNeonDatabaseIdentity(unpooledRaw, "unpooled database URL");
  if (unpooled.pooled) {
    reject(
      "The Production backup source must not use a pooled endpoint",
      "V2_8_3_BACKUP_POOLED_URL_REJECTED",
    );
  }
  if (unpooled.endpointSha256 !== expectedEndpointSha256) {
    reject(
      "The Production backup source is not the pinned main endpoint",
      "V2_8_3_BACKUP_URL_TARGET_MISMATCH",
    );
  }

  if (env.DATABASE_URL_UNPOOLED?.trim() && env.POSTGRES_URL_NON_POOLING?.trim()) {
    const alternative = parseNeonDatabaseIdentity(
      env.POSTGRES_URL_NON_POOLING,
      "alternative unpooled database URL",
    );
    if (alternative.pooled) {
      reject(
        "The alternative Production backup source is pooled",
        "V2_8_3_BACKUP_POOLED_URL_REJECTED",
      );
    }
    assertSameDatabaseTarget(unpooled, alternative, "Unpooled URLs");
  }

  if (env.DATABASE_URL?.trim()) {
    const application = parseNeonDatabaseIdentity(
      env.DATABASE_URL,
      "application database URL",
    );
    assertSameDatabaseTarget(unpooled, application, "Application and backup URLs");
  }

  return {
    endpointSha256: unpooled.endpointSha256,
    rawUrl: unpooledRaw,
    safeIdentity: {
      database: unpooled.database,
      endpointSha256: unpooled.endpointSha256,
      role: unpooled.role,
      target: "production-main",
    },
  };
}

export function assertBackupCommand({ argv, command }) {
  const expectedFlags = {
    "create-identity": "--i-confirm-v2-8-3-create-backup-identity",
    production: "--i-confirm-v2-8-3-production-encrypted-backup",
    synthetic: "--i-confirm-v2-8-3-synthetic-backup-rehearsal",
    tools: null,
  };
  if (!(command in expectedFlags)) {
    reject("Unknown Gate 3 backup command", "V2_8_3_BACKUP_COMMAND_INVALID");
  }
  const flag = expectedFlags[command];
  if (flag && (argv.length !== 1 || argv[0] !== flag)) {
    reject(
      `The ${command} command requires its exact approval flag`,
      "V2_8_3_BACKUP_CONFIRMATION_REQUIRED",
    );
  }
  if (!flag && argv.length !== 0) {
    reject("The tools command accepts no arguments", "V2_8_3_BACKUP_COMMAND_INVALID");
  }
  return { command, flag };
}

export function assertGate2Baseline(counts) {
  const deltas = {};
  for (const [name, expected] of Object.entries(V2_STAGE8_3_GATE2_BASELINE_COUNTS)) {
    const actual = Number(counts?.[name]);
    if (!Number.isSafeInteger(actual) || actual < 0) {
      reject(`Invalid Production count for ${name}`, "V2_8_3_BACKUP_INVENTORY_INVALID");
    }
    deltas[name] = actual - expected;
  }
  const changed = Object.entries(deltas).filter(([, value]) => value !== 0);
  if (changed.length > 0) {
    reject(
      `Production counts drifted from Gate 2: ${changed.map(([name]) => name).join(", ")}`,
      "V2_8_3_BACKUP_GATE2_BASELINE_DRIFT",
    );
  }
  return deltas;
}

export function assertSchema5BackupInventory(
  inventory,
  { expectedDatabase = "neondb", expectedRole = "neondb_owner" } = {},
) {
  const expected = {
    schemaVersion: 5,
    serverMajor: 17,
    database: expectedDatabase,
    role: expectedRole,
    "schema.tables": 8,
    "schema.columns": 6,
    "schema.constraints": 9,
    "schema.indexes": 1,
    "schema.triggers": 2,
    "schema.unexpectedTables": 0,
    "schema.schema6Markers": 0,
  };
  const actual = {
    schemaVersion: inventory?.schemaVersion,
    serverMajor: inventory?.serverMajor,
    database: inventory?.database,
    role: inventory?.role,
    "schema.tables": inventory?.schema?.tables,
    "schema.columns": inventory?.schema?.columns,
    "schema.constraints": inventory?.schema?.constraints,
    "schema.indexes": inventory?.schema?.indexes,
    "schema.triggers": inventory?.schema?.triggers,
    "schema.unexpectedTables": inventory?.schema?.unexpectedTables,
    "schema.schema6Markers": inventory?.schema?.schema6Markers,
  };
  const mismatches = Object.keys(expected).filter(
    (key) => actual[key] !== expected[key],
  );
  if (mismatches.length > 0) {
    reject(
      `The backup source is not the accepted Schema 5 target: ${mismatches.join(", ")}`,
      "V2_8_3_BACKUP_SCHEMA_MISMATCH",
    );
  }
  const people = Number(inventory.counts?.people);
  const vocabularyItems = Number(inventory.counts?.vocabulary_items);
  if (!Number.isSafeInteger(people) || people <= 0 || !Number.isSafeInteger(vocabularyItems) || vocabularyItems <= 0) {
    reject("The backup inventory is empty", "V2_8_3_BACKUP_EMPTY_INVENTORY");
  }
  const invariantFailures = Object.entries(inventory.invariants ?? {}).filter(
    ([, value]) => Number(value) !== 0,
  );
  if (invariantFailures.length > 0) {
    reject(
      `Backup invariants failed: ${invariantFailures.map(([name]) => name).join(", ")}`,
      "V2_8_3_BACKUP_INVARIANT_FAILURE",
    );
  }
  if (!SHA256_PATTERN.test(inventory.combinedSha256 || "")) {
    reject("The backup inventory digest is invalid", "V2_8_3_BACKUP_INVENTORY_INVALID");
  }
  return inventory;
}

export function compareBackupInventories(expected, actual) {
  const mismatches = [];
  for (const name of Object.keys(expected.counts ?? {}).sort()) {
    if (Number(expected.counts[name]) !== Number(actual.counts?.[name])) {
      mismatches.push(`count:${name}`);
    }
  }
  for (const table of Object.keys(expected.tableDigests ?? {}).sort()) {
    const left = expected.tableDigests[table];
    const right = actual.tableDigests?.[table];
    if (!right || left.count !== right.count || left.sha256 !== right.sha256) {
      mismatches.push(`digest:${table}`);
    }
  }
  if (expected.combinedSha256 !== actual.combinedSha256) {
    mismatches.push("combinedSha256");
  }
  return { matched: mismatches.length === 0, mismatches };
}

export function assertBackupFileName(filePath) {
  const resolved = resolve(filePath);
  if (
    dirname(resolved) !== resolve(V2_STAGE8_3_BACKUP_DIR) ||
    !SAFE_FILENAME_PATTERN.test(basename(resolved))
  ) {
    reject("The encrypted backup path is outside the approved location", "V2_8_3_BACKUP_PATH_INVALID");
  }
  return resolved;
}

export function assertSecretFreeEvidence(value, path = "evidence") {
  if (typeof value === "string") {
    if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      reject(`Sensitive value shape is forbidden at ${path}`, "V2_8_3_BACKUP_EVIDENCE_SENSITIVE");
    }
    return true;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSecretFreeEvidence(item, `${path}[${index}]`));
    return true;
  }
  if (!value || typeof value !== "object") return true;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      reject(`Sensitive field name is forbidden at ${path}.${key}`, "V2_8_3_BACKUP_EVIDENCE_SENSITIVE");
    }
    assertSecretFreeEvidence(item, `${path}.${key}`);
  }
  return true;
}

export function validateBackupEvidence(value) {
  assertSecretFreeEvidence(value);
  if (
    value?.artifactKind !== V2_STAGE8_3_BACKUP_EVIDENCE_KIND ||
    value?.artifactVersion !== 1 ||
    value?.method !== V2_STAGE8_3_BACKUP_METHOD ||
    value?.source?.schemaVersion !== 5 ||
    value?.restore?.schemaVersion !== 5 ||
    value?.restore?.verified !== true ||
    value?.cleanup?.verified !== true ||
    value?.encryption?.keychainCustodyConfirmed !== true ||
    !SHA256_PATTERN.test(value?.archive?.sha256 || "") ||
    !SHA256_PATTERN.test(value?.encryption?.recipientSha256 || "") ||
    !SHA256_PATTERN.test(value?.source?.combinedSha256 || "") ||
    value?.source?.combinedSha256 !== value?.restore?.combinedSha256
  ) {
    reject("The Gate 3 backup evidence is incomplete", "V2_8_3_BACKUP_EVIDENCE_INVALID");
  }
  return value;
}

export function safeBackupFailure(error, phase) {
  const safe = error?.safeToReport === true;
  return {
    code:
      safe
        ? error.code
        : "V2_8_3_BACKUP_EXECUTION_FAILED",
    message:
      safe
        ? error.message
        : "The Gate 3 backup operation failed safely",
    phase,
  };
}
