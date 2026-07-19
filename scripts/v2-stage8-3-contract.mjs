import { createHash } from "node:crypto";

export const V2_STAGE8_3_MIGRATION_SHA256 =
  "ef991928d299a7dfb78483c96fcd7e6fd673a009cd31ca0f0f91c606d2128fba";

export const V2_STAGE8_3_ARTIFACT_KIND = "v2-8-3-safe-inventory-v1";
export const V2_STAGE8_3_NEON_API_BASE_URL =
  "https://console.neon.tech/api/v2";

// Gate 1 intentionally leaves every real database command dormant. Gate 2
// must replace this null with the SHA-256 of the independently verified
// Production Neon project id, followed by review and full validation.
export const V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256 = null;

export const V2_STAGE8_3_TARGETS = Object.freeze({
  CLONE: "production-clone",
  MAIN: "production-main",
});

export const V2_STAGE8_3_COMMANDS = Object.freeze({
  "inventory-schema5": Object.freeze({
    action: "inventory-schema5",
    flag: "--i-confirm-v2-8-3-read-only-inventory",
    targets: [V2_STAGE8_3_TARGETS.CLONE, V2_STAGE8_3_TARGETS.MAIN],
  }),
  "inspect-schema6": Object.freeze({
    action: "inspect-schema6",
    flag: "--i-confirm-v2-8-3-read-only-inspection",
    targets: [V2_STAGE8_3_TARGETS.CLONE, V2_STAGE8_3_TARGETS.MAIN],
  }),
  "migrate-clone": Object.freeze({
    action: "migrate-clone",
    flag: "--i-confirm-v2-8-3-clone-migration",
    targets: [V2_STAGE8_3_TARGETS.CLONE],
  }),
  "migrate-main": Object.freeze({
    action: "migrate-main",
    flag: "--i-confirm-v2-8-3-production-migration",
    targets: [V2_STAGE8_3_TARGETS.MAIN],
  }),
  "parity-schema6": Object.freeze({
    action: "parity-schema6",
    flag: "--i-confirm-v2-8-3-read-only-parity",
    targets: [V2_STAGE8_3_TARGETS.CLONE, V2_STAGE8_3_TARGETS.MAIN],
  }),
});

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const BRANCH_ID_PATTERN = /^br-[a-z0-9-]+$/u;
const ENDPOINT_ID_PATTERN = /^ep-[a-z0-9-]+$/u;
const DATABASE_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]{0,62}$/u;
const ROLE_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]{0,62}$/u;
const NEON_PROJECT_ID_PATTERN = /^[a-z0-9-]{1,60}$/u;

export class V2Stage83GuardError extends Error {
  constructor(message, code = "V2_8_3_GUARD_REJECTED") {
    super(message);
    this.name = "V2Stage83GuardError";
    this.code = code;
    this.safeToReport = true;
  }
}

function reject(message, code) {
  throw new V2Stage83GuardError(message, code);
}

function requiredEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) reject(`${name} is required`, "V2_8_3_ENV_MISSING");
  return value;
}

function requireExact(env, name, expected) {
  if (env[name] !== expected) {
    reject(`${name} must be ${expected}`, "V2_8_3_ENV_MISMATCH");
  }
}

function requirePattern(env, name, pattern) {
  const value = requiredEnv(env, name);
  if (!pattern.test(value)) {
    reject(`${name} has an invalid format`, "V2_8_3_ENV_INVALID");
  }
  return value;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function assertPinnedMigration(migrationBytes) {
  const actual = sha256(migrationBytes);
  if (actual !== V2_STAGE8_3_MIGRATION_SHA256) {
    reject(
      "The Schema 5 to Schema 6 migration does not match the pinned V2-8-3 digest",
      "V2_8_3_MIGRATION_DIGEST_MISMATCH",
    );
  }
  return actual;
}

export function databaseUrlFromEnv(env) {
  return (
    env.DATABASE_URL_UNPOOLED?.trim() ||
    env.POSTGRES_URL_NON_POOLING?.trim() ||
    env.DATABASE_URL?.trim() ||
    ""
  );
}

function controlPlaneObject(value, key, code) {
  const object = value?.[key];
  if (!object || typeof object !== "object" || Array.isArray(object)) {
    reject(
      "The Neon control-plane response shape is invalid",
      code,
    );
  }
  return object;
}

async function fetchNeonControlPlaneJson({ fetchImpl, apiKey, path }) {
  let response;
  try {
    response = await fetchImpl(`${V2_STAGE8_3_NEON_API_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    reject(
      "Neon control-plane verification could not be completed",
      "V2_8_3_NEON_CONTROL_PLANE_UNAVAILABLE",
    );
  }
  if (!response?.ok) {
    reject(
      "Neon control-plane verification was rejected",
      "V2_8_3_NEON_CONTROL_PLANE_REJECTED",
    );
  }
  try {
    return await response.json();
  } catch {
    reject(
      "The Neon control-plane response is not valid JSON",
      "V2_8_3_NEON_CONTROL_PLANE_INVALID",
    );
  }
}

export async function fetchAndAssertNeonControlPlaneTarget({
  env,
  fetchImpl = globalThis.fetch,
  approvedProjectIdSha256 =
    V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256,
}) {
  if (typeof fetchImpl !== "function") {
    reject(
      "A trusted HTTPS client is required for Neon control-plane verification",
      "V2_8_3_NEON_CONTROL_PLANE_UNAVAILABLE",
    );
  }
  const apiKey = requiredEnv(env, "NEON_API_KEY");
  const projectId = requirePattern(
    env,
    "MIMI_V2_8_3_NEON_PROJECT_ID",
    NEON_PROJECT_ID_PATTERN,
  );
  const projectIdSha256 = sha256(projectId);
  if (
    !SHA256_PATTERN.test(approvedProjectIdSha256 || "") ||
    projectIdSha256 !== approvedProjectIdSha256
  ) {
    reject(
      "The Production Neon project is not pinned or does not match the approved Gate 2 target",
      "V2_8_3_NEON_PROJECT_NOT_APPROVED",
    );
  }
  const target = requiredEnv(env, "MIMI_V2_8_3_DATABASE_TARGET");
  const expectedBranchId = requirePattern(
    env,
    "MIMI_V2_8_3_EXPECTED_BRANCH_ID",
    BRANCH_ID_PATTERN,
  );
  const expectedBranchName = requiredEnv(
    env,
    "MIMI_V2_8_3_EXPECTED_BRANCH_NAME",
  );
  const expectedEndpointId = requirePattern(
    env,
    "MIMI_V2_8_3_EXPECTED_ENDPOINT_ID",
    ENDPOINT_ID_PATTERN,
  );
  const mainBranchId = requirePattern(
    env,
    "MIMI_V2_8_3_PRODUCTION_MAIN_BRANCH_ID",
    BRANCH_ID_PATTERN,
  );
  const mainEndpointId = requirePattern(
    env,
    "MIMI_V2_8_3_PRODUCTION_MAIN_ENDPOINT_ID",
    ENDPOINT_ID_PATTERN,
  );

  if (
    (target === V2_STAGE8_3_TARGETS.CLONE &&
      expectedEndpointId === mainEndpointId) ||
    (target === V2_STAGE8_3_TARGETS.MAIN &&
      expectedEndpointId !== mainEndpointId)
  ) {
    reject(
      "The target endpoint is not distinct from or equal to Production main as required",
      "V2_8_3_NEON_CONTROL_PLANE_MAIN_ENDPOINT_MISMATCH",
    );
  }

  const endpointPayload = await fetchNeonControlPlaneJson({
    fetchImpl,
    apiKey,
    path: `/projects/${encodeURIComponent(projectId)}/endpoints/${encodeURIComponent(expectedEndpointId)}`,
  });
  const mainEndpointPayload =
    expectedEndpointId === mainEndpointId
      ? endpointPayload
      : await fetchNeonControlPlaneJson({
          fetchImpl,
          apiKey,
          path: `/projects/${encodeURIComponent(projectId)}/endpoints/${encodeURIComponent(mainEndpointId)}`,
        });
  const endpoint = controlPlaneObject(
    endpointPayload,
    "endpoint",
    "V2_8_3_NEON_CONTROL_PLANE_ENDPOINT_INVALID",
  );
  const mainEndpoint = controlPlaneObject(
    mainEndpointPayload,
    "endpoint",
    "V2_8_3_NEON_CONTROL_PLANE_ENDPOINT_INVALID",
  );
  if (
    endpoint.id !== expectedEndpointId ||
    endpoint.project_id !== projectId ||
    endpoint.branch_id !== expectedBranchId ||
    endpoint.type !== "read_write" ||
    mainEndpoint.id !== mainEndpointId ||
    mainEndpoint.project_id !== projectId ||
    mainEndpoint.branch_id !== mainBranchId ||
    mainEndpoint.type !== "read_write"
  ) {
    reject(
      "The live Neon endpoint metadata does not bind the confirmed target",
      "V2_8_3_NEON_CONTROL_PLANE_ENDPOINT_MISMATCH",
    );
  }

  const branchPayload = await fetchNeonControlPlaneJson({
    fetchImpl,
    apiKey,
    path: `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(expectedBranchId)}`,
  });
  const mainBranchPayload =
    expectedBranchId === mainBranchId
      ? branchPayload
      : await fetchNeonControlPlaneJson({
          fetchImpl,
          apiKey,
          path: `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(mainBranchId)}`,
        });
  const branch = controlPlaneObject(
    branchPayload,
    "branch",
    "V2_8_3_NEON_CONTROL_PLANE_BRANCH_INVALID",
  );
  const mainBranch = controlPlaneObject(
    mainBranchPayload,
    "branch",
    "V2_8_3_NEON_CONTROL_PLANE_BRANCH_INVALID",
  );
  const mainParentId = mainBranch.parent_id ?? null;
  if (
    branch.id !== expectedBranchId ||
    branch.project_id !== projectId ||
    branch.name !== expectedBranchName ||
    branch.current_state !== "ready" ||
    mainBranch.id !== mainBranchId ||
    mainBranch.project_id !== projectId ||
    mainBranch.name !== "main" ||
    mainBranch.current_state !== "ready" ||
    mainParentId !== null
  ) {
    reject(
      "The live Neon branch metadata does not bind the confirmed target",
      "V2_8_3_NEON_CONTROL_PLANE_BRANCH_MISMATCH",
    );
  }
  if (
    (target === V2_STAGE8_3_TARGETS.CLONE &&
      (branch.parent_id !== mainBranchId ||
        branch.init_source !== "parent-data")) ||
    (target === V2_STAGE8_3_TARGETS.MAIN &&
      (branch.id !== mainBranchId || (branch.parent_id ?? null) !== null))
  ) {
    reject(
      "The live Neon branch topology is not valid for this target mode",
      "V2_8_3_NEON_CONTROL_PLANE_TOPOLOGY_MISMATCH",
    );
  }

  const controlPlaneEvidenceSha256 = sha256(
    JSON.stringify({
      branchId: branch.id,
      branchInitSource: branch.init_source ?? null,
      branchName: branch.name,
      endpointBranchId: endpoint.branch_id,
      endpointId: endpoint.id,
      mainBranchId: mainBranch.id,
      mainEndpointId: mainEndpoint.id,
      parentBranchId: branch.parent_id ?? null,
      projectIdSha256,
      target,
    }),
  );
  return {
    controlPlaneConfirmed: true,
    controlPlaneEvidenceSha256,
    projectIdSha256,
  };
}

export function assertCommandContract({ argv, command, env }) {
  const contract = V2_STAGE8_3_COMMANDS[command];
  if (!contract) {
    reject(
      "Unknown V2-8-3 database command",
      "V2_8_3_COMMAND_UNKNOWN",
    );
  }
  const target = requiredEnv(env, "MIMI_V2_8_3_DATABASE_TARGET");
  if (!contract.targets.includes(target)) {
    reject(
      `The ${command} command is not allowed for this target mode`,
      "V2_8_3_COMMAND_TARGET_MISMATCH",
    );
  }
  if (env.MIMI_V2_8_3_DATABASE_ACTION !== contract.action) {
    reject(
      `MIMI_V2_8_3_DATABASE_ACTION must be ${contract.action}`,
      "V2_8_3_ACTION_MISMATCH",
    );
  }
  if (!argv.includes(contract.flag)) {
    reject(
      `The exact confirmation flag ${contract.flag} is required`,
      "V2_8_3_CONFIRMATION_FLAG_MISSING",
    );
  }
  return { command, target };
}

function parseDatabaseUrl(rawUrl) {
  if (!rawUrl) {
    reject("A database URL is required", "V2_8_3_DATABASE_URL_MISSING");
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    reject("The database URL is invalid", "V2_8_3_DATABASE_URL_INVALID");
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    reject(
      "The database URL must use Postgres",
      "V2_8_3_DATABASE_URL_INVALID",
    );
  }
  if (!parsed.hostname.endsWith(".neon.tech")) {
    reject(
      "The V2-8-3 database target must be Neon",
      "V2_8_3_DATABASE_HOST_MISMATCH",
    );
  }
  return parsed;
}

export async function assertTargetIdentity({
  env,
  rawUrl,
  fetchImpl = globalThis.fetch,
  approvedProjectIdSha256 =
    V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256,
}) {
  const target = requiredEnv(env, "MIMI_V2_8_3_DATABASE_TARGET");
  if (!Object.values(V2_STAGE8_3_TARGETS).includes(target)) {
    reject(
      "MIMI_V2_8_3_DATABASE_TARGET must be production-clone or production-main",
      "V2_8_3_TARGET_INVALID",
    );
  }

  const expectedBranchId = requirePattern(
    env,
    "MIMI_V2_8_3_EXPECTED_BRANCH_ID",
    BRANCH_ID_PATTERN,
  );
  const expectedBranchName = requiredEnv(
    env,
    "MIMI_V2_8_3_EXPECTED_BRANCH_NAME",
  );
  const productionMainBranchId = requirePattern(
    env,
    "MIMI_V2_8_3_PRODUCTION_MAIN_BRANCH_ID",
    BRANCH_ID_PATTERN,
  );
  const productionMainEndpointId = requirePattern(
    env,
    "MIMI_V2_8_3_PRODUCTION_MAIN_ENDPOINT_ID",
    ENDPOINT_ID_PATTERN,
  );
  const expectedEndpointId = requirePattern(
    env,
    "MIMI_V2_8_3_EXPECTED_ENDPOINT_ID",
    ENDPOINT_ID_PATTERN,
  );
  const expectedDatabase = requirePattern(
    env,
    "MIMI_V2_8_3_EXPECTED_DATABASE",
    DATABASE_PATTERN,
  );
  const expectedRole = requirePattern(
    env,
    "MIMI_V2_8_3_EXPECTED_ROLE",
    ROLE_PATTERN,
  );
  if (!/^[A-Za-z0-9][A-Za-z0-9/_-]{0,127}$/u.test(expectedBranchName)) {
    reject(
      "MIMI_V2_8_3_EXPECTED_BRANCH_NAME has an invalid format",
      "V2_8_3_ENV_INVALID",
    );
  }

  if (target === V2_STAGE8_3_TARGETS.MAIN) {
    requireExact(env, "STAGE6B_DATABASE_TARGET", "production");
    requireExact(env, "MIMI_STORAGE_RUNTIME", "postgres-production");
    requireExact(env, "VERCEL_ENV", "production");
    if (expectedBranchName !== "main") {
      reject(
        "The Production-main target requires the confirmed main branch name",
        "V2_8_3_MAIN_IDENTITY_MISMATCH",
      );
    }
    if (expectedBranchId !== productionMainBranchId) {
      reject(
        "The Production-main branch marker does not match",
        "V2_8_3_MAIN_IDENTITY_MISMATCH",
      );
    }
  } else {
    requireExact(env, "STAGE6B_DATABASE_TARGET", "production-clone");
    requireExact(env, "MIMI_STORAGE_RUNTIME", "postgres-production-clone");
    if (env.VERCEL_ENV === "production") {
      reject(
        "The Production clone refuses VERCEL_ENV=production",
        "V2_8_3_CLONE_ENVIRONMENT_MISMATCH",
      );
    }
    if (expectedBranchName === "main" || expectedBranchId === productionMainBranchId) {
      reject(
        "The Production clone must be distinct from main",
        "V2_8_3_CLONE_IDENTITY_MISMATCH",
      );
    }
    requireExact(
      env,
      "MIMI_V2_8_3_CLONE_SOURCE_MAIN_BRANCH_ID",
      productionMainBranchId,
    );
  }

  const parsed = parseDatabaseUrl(rawUrl);
  const endpointLabel = parsed.hostname.split(".")[0];
  if (
    endpointLabel !== expectedEndpointId &&
    endpointLabel !== `${expectedEndpointId}-pooler`
  ) {
    reject(
      "The database URL does not match the confirmed endpoint",
      "V2_8_3_ENDPOINT_MISMATCH",
    );
  }
  if (decodeURIComponent(parsed.username) !== expectedRole) {
    reject(
      "The database URL does not match the confirmed role",
      "V2_8_3_ROLE_MISMATCH",
    );
  }
  if (decodeURIComponent(parsed.pathname.slice(1)) !== expectedDatabase) {
    reject(
      "The database URL does not match the confirmed database",
      "V2_8_3_DATABASE_NAME_MISMATCH",
    );
  }

  const controlPlane = await fetchAndAssertNeonControlPlaneTarget({
    env,
    fetchImpl,
    approvedProjectIdSha256,
  });

  const identityDigest = sha256(
    [
      target,
      expectedBranchId,
      expectedBranchName,
      expectedEndpointId,
      expectedDatabase,
      expectedRole,
      productionMainEndpointId,
      controlPlane.projectIdSha256,
    ].join("\0"),
  );
  return {
    controlPlaneConfirmed: true,
    controlPlaneEvidenceSha256: controlPlane.controlPlaneEvidenceSha256,
    databaseMatched: true,
    endpointMatched: true,
    identityDigest,
    roleMatched: true,
    target,
  };
}

export function assertConnectedIdentity(row, env) {
  const expectedDatabase = requiredEnv(env, "MIMI_V2_8_3_EXPECTED_DATABASE");
  const expectedRole = requiredEnv(env, "MIMI_V2_8_3_EXPECTED_ROLE");
  if (row?.database_name !== expectedDatabase) {
    reject(
      "The connected server reports an unexpected database",
      "V2_8_3_CONNECTED_DATABASE_MISMATCH",
    );
  }
  if (row?.role_name !== expectedRole) {
    reject(
      "The connected server reports an unexpected role",
      "V2_8_3_CONNECTED_ROLE_MISMATCH",
    );
  }
  return { connectedDatabaseMatched: true, connectedRoleMatched: true };
}

function requireTrue(env, name) {
  requireExact(env, name, "true");
  return true;
}

function requireSha(env, name) {
  return requirePattern(env, name, SHA256_PATTERN);
}

export function assertExpectedInventoryDigest(env, target) {
  const name =
    target === V2_STAGE8_3_TARGETS.MAIN
      ? "MIMI_V2_8_3_EXPECTED_MAIN_SCHEMA5_DIGEST"
      : "MIMI_V2_8_3_EXPECTED_CLONE_SCHEMA5_DIGEST";
  return requireSha(env, name);
}

export function assertMainMigrationGates(env) {
  requireTrue(env, "MIMI_V2_8_3_PRODUCTION_BACKUP_VERIFIED");
  requireSha(env, "MIMI_V2_8_3_PRODUCTION_BACKUP_EVIDENCE_SHA256");
  requireTrue(env, "MIMI_V2_8_3_SCHEMA5_RECOVERY_POINT_CONFIRMED");
  const recoveryBranchId = requirePattern(
    env,
    "MIMI_V2_8_3_SCHEMA5_RECOVERY_BRANCH_ID",
    BRANCH_ID_PATTERN,
  );
  const mainBranchId = requirePattern(
    env,
    "MIMI_V2_8_3_PRODUCTION_MAIN_BRANCH_ID",
    BRANCH_ID_PATTERN,
  );
  if (recoveryBranchId === mainBranchId) {
    reject(
      "The Schema 5 recovery point must be distinct from Production main",
      "V2_8_3_RECOVERY_POINT_MISMATCH",
    );
  }
  requireTrue(env, "MIMI_V2_8_3_CLONE_REHEARSAL_CONFIRMED");
  requireTrue(env, "MIMI_V2_8_3_CLONE_REHEARSAL_NON_EMPTY_CONFIRMED");
  requireSha(env, "MIMI_V2_8_3_CLONE_REHEARSAL_EVIDENCE_SHA256");
  requireTrue(env, "MIMI_V2_8_3_WRITE_FREE_WINDOW_CONFIRMED");
  requireTrue(env, "MIMI_V2_8_3_OLD_RUNTIME_WRITE_PATH_BLOCKED");
  requireSha(env, "MIMI_V2_8_3_OLD_RUNTIME_WRITE_PATH_EVIDENCE_SHA256");
  requireTrue(env, "MIMI_V2_8_3_NO_IN_FLIGHT_WRITES_CONFIRMED");
  const writeFreeWindowId = requiredEnv(
    env,
    "MIMI_V2_8_3_WRITE_FREE_WINDOW_ID",
  );
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u.test(writeFreeWindowId)) {
    reject(
      "MIMI_V2_8_3_WRITE_FREE_WINDOW_ID has an invalid format",
      "V2_8_3_ENV_INVALID",
    );
  }
  return {
    backupVerified: true,
    cloneRehearsalNonEmpty: true,
    cloneRehearsalVerified: true,
    noInFlightWritesConfirmed: true,
    oldRuntimeWritePathBlocked: true,
    schema5RecoveryPointConfirmed: true,
    writeFreeWindowConfirmed: true,
  };
}

export function assertNonEmptyLearningInventory(counts) {
  if (
    !Number.isSafeInteger(Number(counts?.people)) ||
    !Number.isSafeInteger(Number(counts?.vocabulary_items)) ||
    Number(counts.people) <= 0 ||
    Number(counts.vocabulary_items) <= 0
  ) {
    reject(
      "V2-8-3 requires a non-empty learning inventory",
      "V2_8_3_EMPTY_INVENTORY",
    );
  }
  return true;
}

export function digestCanonicalRows(rows) {
  const digest = createHash("sha256");
  for (const row of rows) {
    const canonical = String(row?.canonical ?? "");
    digest.update(String(Buffer.byteLength(canonical, "utf8")));
    digest.update("\0");
    digest.update(canonical);
    digest.update("\0");
  }
  return digest.digest("hex");
}

export function combineTableDigests(tableDigests) {
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

function safeIntegerRecord(record) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      const number = Number(value);
      if (!Number.isSafeInteger(number) || number < 0) {
        reject(
          `Inventory value ${key} is not a safe non-negative integer`,
          "V2_8_3_INVENTORY_INVALID",
        );
      }
      return [key, number];
    }),
  );
}

function requireConfirmedIdentity(value, label) {
  if (value !== true) {
    reject(
      `Inventory identity ${label} is not confirmed`,
      "V2_8_3_INVENTORY_IDENTITY_INVALID",
    );
  }
  return true;
}

export function buildSafeInventoryArtifact({
  counts,
  identity,
  invariants,
  schema,
  schemaVersion,
  tableDigests,
}) {
  const safeCounts = safeIntegerRecord(counts);
  const safeInvariants = safeIntegerRecord(invariants);
  if (
    !SHA256_PATTERN.test(identity?.identityDigest || "") ||
    !SHA256_PATTERN.test(identity?.controlPlaneEvidenceSha256 || "") ||
    !Object.values(V2_STAGE8_3_TARGETS).includes(identity?.target)
  ) {
    reject(
      "The inventory target identity is invalid",
      "V2_8_3_INVENTORY_IDENTITY_INVALID",
    );
  }
  const safeTableDigests = Object.fromEntries(
    Object.entries(tableDigests)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([table, value]) => {
        if (
          !Number.isSafeInteger(value.count) ||
          value.count < 0 ||
          !SHA256_PATTERN.test(value.sha256)
        ) {
          reject("A table digest is invalid", "V2_8_3_INVENTORY_INVALID");
        }
        return [table, { count: value.count, sha256: value.sha256 }];
      }),
  );
  return {
    artifactKind: V2_STAGE8_3_ARTIFACT_KIND,
    artifactVersion: 1,
    counts: safeCounts,
    identity: {
      connectedDatabaseMatched: requireConfirmedIdentity(
        identity.connectedDatabaseMatched,
        "connectedDatabaseMatched",
      ),
      connectedRoleMatched: requireConfirmedIdentity(
        identity.connectedRoleMatched,
        "connectedRoleMatched",
      ),
      controlPlaneConfirmed: requireConfirmedIdentity(
        identity.controlPlaneConfirmed,
        "controlPlaneConfirmed",
      ),
      controlPlaneEvidenceSha256: identity.controlPlaneEvidenceSha256,
      databaseMatched: requireConfirmedIdentity(
        identity.databaseMatched,
        "databaseMatched",
      ),
      endpointMatched: requireConfirmedIdentity(
        identity.endpointMatched,
        "endpointMatched",
      ),
      identityDigest: identity.identityDigest,
      roleMatched: requireConfirmedIdentity(identity.roleMatched, "roleMatched"),
      target: identity.target,
    },
    invariants: safeInvariants,
    migrationSha256: V2_STAGE8_3_MIGRATION_SHA256,
    parity: {
      combinedSha256: combineTableDigests(safeTableDigests),
      tableDigests: safeTableDigests,
      totalCoreRows: Object.values(safeTableDigests).reduce(
        (total, item) => total + item.count,
        0,
      ),
    },
    schema,
    schemaVersion,
  };
}

function assertSafeArtifact(value) {
  if (
    !value ||
    value.artifactKind !== V2_STAGE8_3_ARTIFACT_KIND ||
    value.artifactVersion !== 1 ||
    (value.schemaVersion !== 5 && value.schemaVersion !== 6) ||
    !value.parity ||
    !SHA256_PATTERN.test(value.parity.combinedSha256 || "") ||
    !value.parity.tableDigests
  ) {
    reject(
      "The supplied V2-8-3 inventory artifact is invalid",
      "V2_8_3_ARTIFACT_INVALID",
    );
  }
  for (const item of Object.values(value.parity.tableDigests)) {
    if (
      !Number.isSafeInteger(item?.count) ||
      item.count < 0 ||
      !SHA256_PATTERN.test(item?.sha256 || "")
    ) {
      reject(
        "The supplied V2-8-3 table digest is invalid",
        "V2_8_3_ARTIFACT_INVALID",
      );
    }
  }
  const tableDigests = Object.fromEntries(
    Object.entries(value.parity.tableDigests)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([table, item]) => [
        table,
        { count: item.count, sha256: item.sha256 },
      ]),
  );
  const combinedSha256 = combineTableDigests(tableDigests);
  const totalCoreRows = Object.values(tableDigests).reduce(
    (total, item) => total + item.count,
    0,
  );
  if (
    value.parity.combinedSha256 !== combinedSha256 ||
    value.parity.totalCoreRows !== totalCoreRows ||
    value.migrationSha256 !== V2_STAGE8_3_MIGRATION_SHA256 ||
    !Object.values(V2_STAGE8_3_TARGETS).includes(value.identity?.target) ||
    !SHA256_PATTERN.test(value.identity?.identityDigest || "") ||
    value.identity?.connectedDatabaseMatched !== true ||
    value.identity?.connectedRoleMatched !== true ||
    value.identity?.controlPlaneConfirmed !== true ||
    !SHA256_PATTERN.test(value.identity?.controlPlaneEvidenceSha256 || "") ||
    value.identity?.databaseMatched !== true ||
    value.identity?.endpointMatched !== true ||
    value.identity?.roleMatched !== true
  ) {
    reject(
      "The supplied V2-8-3 inventory artifact integrity check failed",
      "V2_8_3_ARTIFACT_INVALID",
    );
  }
  return {
    artifactKind: V2_STAGE8_3_ARTIFACT_KIND,
    artifactVersion: 1,
    counts: safeIntegerRecord(value.counts || {}),
    identity: {
      connectedDatabaseMatched: value.identity.connectedDatabaseMatched === true,
      connectedRoleMatched: value.identity.connectedRoleMatched === true,
      controlPlaneConfirmed: true,
      controlPlaneEvidenceSha256: value.identity.controlPlaneEvidenceSha256,
      databaseMatched: value.identity.databaseMatched === true,
      endpointMatched: value.identity.endpointMatched === true,
      identityDigest: value.identity.identityDigest,
      roleMatched: value.identity.roleMatched === true,
      target: value.identity.target,
    },
    invariants: safeIntegerRecord(value.invariants || {}),
    migrationSha256: V2_STAGE8_3_MIGRATION_SHA256,
    parity: { combinedSha256, tableDigests, totalCoreRows },
    schema: safeIntegerRecord(value.schema || {}),
    schemaVersion: value.schemaVersion,
  };
}

export function unwrapSafeInventoryArtifact(value) {
  const candidate = value?.ok === true && value?.result ? value.result : value;
  return assertSafeArtifact(candidate);
}

export function compareInventoryParity(beforeValue, afterValue) {
  const before = assertSafeArtifact(beforeValue);
  const after = assertSafeArtifact(afterValue);
  const mismatches = [];
  if (before.schemaVersion !== 5) mismatches.push("before-schema-version");
  if (after.schemaVersion !== 6) mismatches.push("after-schema-version");
  if (before.identity?.target !== after.identity?.target) {
    mismatches.push("target-mode");
  }
  if (before.identity?.identityDigest !== after.identity?.identityDigest) {
    mismatches.push("target-identity");
  }
  const tableNames = new Set([
    ...Object.keys(before.parity.tableDigests),
    ...Object.keys(after.parity.tableDigests),
  ]);
  for (const table of [...tableNames].sort()) {
    const left = before.parity.tableDigests[table];
    const right = after.parity.tableDigests[table];
    if (!left || !right || left.count !== right.count) {
      mismatches.push(`${table}:count`);
    }
    if (!left || !right || left.sha256 !== right.sha256) {
      mismatches.push(`${table}:digest`);
    }
  }
  if (before.parity.combinedSha256 !== after.parity.combinedSha256) {
    mismatches.push("combined-digest");
  }
  return {
    matched: mismatches.length === 0,
    mismatches,
    preservedCoreRows:
      mismatches.length === 0 ? after.parity.totalCoreRows : null,
  };
}

export function safeFailure(error, phase) {
  if (error?.safeToReport === true) {
    return {
      code: error.code || "V2_8_3_GUARD_REJECTED",
      message: error.message,
      phase,
    };
  }
  return {
    code:
      typeof error?.code === "string" && /^[A-Z0-9_]{1,64}$/u.test(error.code)
        ? error.code
        : "V2_8_3_OPERATION_FAILED",
    message: "V2-8-3 database operation failed; sensitive connection details were suppressed",
    phase,
  };
}
