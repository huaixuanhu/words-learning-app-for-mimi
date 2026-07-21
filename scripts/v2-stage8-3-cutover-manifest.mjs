import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  V2_STAGE8_3_ADDITIVE_MIGRATION_SHA256,
  V2_STAGE8_3_MIGRATION_SHA256,
  V2_STAGE8_3_TTS_MIGRATION_SHA256,
} from "./v2-stage8-3-contract.mjs";

export const V2_STAGE8_3_CUTOVER_MANIFEST_KIND =
  "v2-8-3-cutover-manifest-v1";

const MANIFEST_STATUSES = new Set([
  "draft",
  "ready-for-main-migration",
  "schema6-verified",
  "live",
  "rollback-requested",
]);

const RECONCILIATION_DECISIONS = new Set([
  "unselected",
  "no-v2-writes",
  "forward-repair",
  "approved-loss",
  "approved-import-route",
]);

const AI_PHASES = new Set(["initial-rollout", "steady-state"]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const SAFE_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const FORBIDDEN_KEY_PATTERN =
  /(?:password|secret|api.?key|auth.?key|credential|database.?url|connection.?string|shareable.?link|encryption.?key|authorization|access.?token)/iu;
const FORBIDDEN_VALUE_PATTERNS = [
  /postgres(?:ql)?:\/\//iu,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/u,
  /\bBasic\s+[A-Za-z0-9+/=]{12,}/u,
  /\b(?:AQ\.|AIza|sk-)[A-Za-z0-9_-]{20,}/u,
  /https?:\/\/[^\s]*\.neon\.tech\b/iu,
  /[?&]__vercel_shareable_link=/iu,
];

export class V2Stage83ManifestError extends Error {
  constructor(message, code = "V2_8_3_MANIFEST_REJECTED") {
    super(message);
    this.name = "V2Stage83ManifestError";
    this.code = code;
    this.safeToReport = true;
  }
}

function reject(message, code) {
  throw new V2Stage83ManifestError(message, code);
}

function assertSecretFree(value, path = "manifest") {
  if (typeof value === "string") {
    if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      reject(
        `Sensitive value shape is forbidden at ${path}`,
        "V2_8_3_MANIFEST_SENSITIVE_VALUE",
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSecretFree(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      reject(
        `Sensitive field names are forbidden at ${path}.${key}`,
        "V2_8_3_MANIFEST_SENSITIVE_FIELD",
      );
    }
    assertSecretFree(item, `${path}.${key}`);
  }
}

function nullableString(value, label, pattern = SAFE_LABEL_PATTERN) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !pattern.test(value)) {
    reject(`${label} has an invalid format`, "V2_8_3_MANIFEST_INVALID");
  }
  return value;
}

function nullableHash(value, label) {
  return nullableString(value, label, SHA256_PATTERN);
}

function nullableTimestamp(value, label) {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    reject(`${label} must be an ISO timestamp`, "V2_8_3_MANIFEST_INVALID");
  }
  return value;
}

function required(value, label) {
  if (value === null || value === undefined || value === false || value === "") {
    reject(`${label} is required`, "V2_8_3_MANIFEST_INCOMPLETE");
  }
  return value;
}

function strictBoolean(value, label) {
  if (value !== true && value !== false) {
    reject(`${label} must be a boolean`, "V2_8_3_MANIFEST_INVALID");
  }
  return value;
}

function nullableCount(value, label) {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    reject(`${label} must be a safe non-negative integer`, "V2_8_3_MANIFEST_INVALID");
  }
  return value;
}

function requiredPositiveCount(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    reject(
      `${label} must prove a non-empty inventory`,
      "V2_8_3_MANIFEST_NON_EMPTY_INVENTORY_REQUIRED",
    );
  }
  return value;
}

export function createV2Stage83CutoverManifestTemplate() {
  return {
    artifactKind: V2_STAGE8_3_CUTOVER_MANIFEST_KIND,
    artifactVersion: 1,
    status: "draft",
    record: {
      createdAt: null,
      updatedAt: null,
      approverRole: null,
    },
    source: {
      exactCommitSha: null,
      v1CommitSha: null,
      v1DeploymentId: null,
      maintenanceDeploymentId: null,
      v2DeploymentId: null,
    },
    database: {
      targetMode: "production-main",
      migrationSha256: V2_STAGE8_3_MIGRATION_SHA256,
      additiveMigrationSha256: V2_STAGE8_3_ADDITIVE_MIGRATION_SHA256,
      ttsMigrationSha256: V2_STAGE8_3_TTS_MIGRATION_SHA256,
      before: {
        schemaVersion: 5,
        inventoryArtifactSha256: null,
        combinedRowSha256: null,
        coreRowCount: null,
      },
      after: {
        schemaVersion: 6,
        inventoryArtifactSha256: null,
        combinedRowSha256: null,
        coreRowCount: null,
        parityMatched: false,
      },
      backup: {
        encrypted: false,
        checksumSha256: null,
        evidenceSha256: null,
        restoreVerified: false,
        custodyConfirmed: false,
      },
      recovery: {
        schemaVersion: 5,
        recoveryId: null,
        evidenceSha256: null,
        confirmed: false,
      },
    },
    writeWindow: {
      windowId: null,
      startedAt: null,
      endedAt: null,
      firstV2WriteAt: null,
      oldRuntimeWritePathBlocked: false,
      oldRuntimeEvidenceSha256: null,
      noInFlightWritesConfirmed: false,
    },
    ai: {
      phase: "initial-rollout",
      killSwitchEnabled: true,
      rolloutMaximumProviderAttempts: 4,
      ledgerBeforeSha256: null,
      ledgerAfterSha256: null,
      steadyStateAcceptanceEvidenceSha256: null,
    },
    rollback: {
      v1ArtifactConfirmed: false,
      schema5AccessRouteConfirmed: false,
      schema5AccessEvidenceSha256: null,
      schema5RecoveryConfirmed: false,
      encryptedBackupConfirmed: false,
      pairedReady: false,
      reconciliationDecision: "unselected",
      reconciliationEvidenceSha256: null,
      lossAcceptanceEvidenceSha256: null,
    },
  };
}

function normalizeManifest(value) {
  if (!value || typeof value !== "object") {
    reject("The cutover manifest must be an object", "V2_8_3_MANIFEST_INVALID");
  }
  assertSecretFree(value);
  if (
    value.artifactKind !== V2_STAGE8_3_CUTOVER_MANIFEST_KIND ||
    value.artifactVersion !== 1 ||
    !MANIFEST_STATUSES.has(value.status)
  ) {
    reject("The cutover manifest identity is invalid", "V2_8_3_MANIFEST_INVALID");
  }

  const record = value.record ?? {};
  const source = value.source ?? {};
  const database = value.database ?? {};
  const before = database.before ?? {};
  const after = database.after ?? {};
  const backup = database.backup ?? {};
  const recovery = database.recovery ?? {};
  const writeWindow = value.writeWindow ?? {};
  const ai = value.ai ?? {};
  const rollback = value.rollback ?? {};

  if (
    database.targetMode !== "production-main" ||
    database.migrationSha256 !== V2_STAGE8_3_MIGRATION_SHA256 ||
    database.additiveMigrationSha256 !==
      V2_STAGE8_3_ADDITIVE_MIGRATION_SHA256 ||
    database.ttsMigrationSha256 !== V2_STAGE8_3_TTS_MIGRATION_SHA256 ||
    before.schemaVersion !== 5 ||
    after.schemaVersion !== 6 ||
    recovery.schemaVersion !== 5 ||
    !AI_PHASES.has(ai.phase) ||
    (ai.phase === "initial-rollout" &&
      ai.rolloutMaximumProviderAttempts !== 4) ||
    (ai.phase === "steady-state" &&
      ai.rolloutMaximumProviderAttempts !== null) ||
    !RECONCILIATION_DECISIONS.has(rollback.reconciliationDecision)
  ) {
    reject("The fixed V2-8-3 contract is invalid", "V2_8_3_MANIFEST_INVALID");
  }

  return {
    artifactKind: V2_STAGE8_3_CUTOVER_MANIFEST_KIND,
    artifactVersion: 1,
    status: value.status,
    record: {
      createdAt: nullableTimestamp(record.createdAt, "record.createdAt"),
      updatedAt: nullableTimestamp(record.updatedAt, "record.updatedAt"),
      approverRole: nullableString(record.approverRole, "record.approverRole"),
    },
    source: {
      exactCommitSha: nullableString(source.exactCommitSha, "source.exactCommitSha", COMMIT_PATTERN),
      v1CommitSha: nullableString(source.v1CommitSha, "source.v1CommitSha", COMMIT_PATTERN),
      v1DeploymentId: nullableString(source.v1DeploymentId, "source.v1DeploymentId"),
      maintenanceDeploymentId: nullableString(
        source.maintenanceDeploymentId,
        "source.maintenanceDeploymentId",
      ),
      v2DeploymentId: nullableString(source.v2DeploymentId, "source.v2DeploymentId"),
    },
    database: {
      targetMode: "production-main",
      migrationSha256: V2_STAGE8_3_MIGRATION_SHA256,
      additiveMigrationSha256: V2_STAGE8_3_ADDITIVE_MIGRATION_SHA256,
      ttsMigrationSha256: V2_STAGE8_3_TTS_MIGRATION_SHA256,
      before: {
        schemaVersion: 5,
        inventoryArtifactSha256: nullableHash(
          before.inventoryArtifactSha256,
          "database.before.inventoryArtifactSha256",
        ),
        combinedRowSha256: nullableHash(
          before.combinedRowSha256,
          "database.before.combinedRowSha256",
        ),
        coreRowCount: nullableCount(before.coreRowCount, "database.before.coreRowCount"),
      },
      after: {
        schemaVersion: 6,
        inventoryArtifactSha256: nullableHash(
          after.inventoryArtifactSha256,
          "database.after.inventoryArtifactSha256",
        ),
        combinedRowSha256: nullableHash(
          after.combinedRowSha256,
          "database.after.combinedRowSha256",
        ),
        coreRowCount: nullableCount(after.coreRowCount, "database.after.coreRowCount"),
        parityMatched: strictBoolean(
          after.parityMatched,
          "database.after.parityMatched",
        ),
      },
      backup: {
        encrypted: strictBoolean(backup.encrypted, "database.backup.encrypted"),
        checksumSha256: nullableHash(backup.checksumSha256, "database.backup.checksumSha256"),
        evidenceSha256: nullableHash(backup.evidenceSha256, "database.backup.evidenceSha256"),
        restoreVerified: strictBoolean(
          backup.restoreVerified,
          "database.backup.restoreVerified",
        ),
        custodyConfirmed: strictBoolean(
          backup.custodyConfirmed,
          "database.backup.custodyConfirmed",
        ),
      },
      recovery: {
        schemaVersion: 5,
        recoveryId: nullableString(recovery.recoveryId, "database.recovery.recoveryId"),
        evidenceSha256: nullableHash(
          recovery.evidenceSha256,
          "database.recovery.evidenceSha256",
        ),
        confirmed: strictBoolean(
          recovery.confirmed,
          "database.recovery.confirmed",
        ),
      },
    },
    writeWindow: {
      windowId: nullableString(writeWindow.windowId, "writeWindow.windowId"),
      startedAt: nullableTimestamp(writeWindow.startedAt, "writeWindow.startedAt"),
      endedAt: nullableTimestamp(writeWindow.endedAt, "writeWindow.endedAt"),
      firstV2WriteAt: nullableTimestamp(
        writeWindow.firstV2WriteAt,
        "writeWindow.firstV2WriteAt",
      ),
      oldRuntimeWritePathBlocked: strictBoolean(
        writeWindow.oldRuntimeWritePathBlocked,
        "writeWindow.oldRuntimeWritePathBlocked",
      ),
      oldRuntimeEvidenceSha256: nullableHash(
        writeWindow.oldRuntimeEvidenceSha256,
        "writeWindow.oldRuntimeEvidenceSha256",
      ),
      noInFlightWritesConfirmed: strictBoolean(
        writeWindow.noInFlightWritesConfirmed,
        "writeWindow.noInFlightWritesConfirmed",
      ),
    },
    ai: {
      phase: ai.phase,
      killSwitchEnabled: strictBoolean(
        ai.killSwitchEnabled,
        "ai.killSwitchEnabled",
      ),
      rolloutMaximumProviderAttempts: ai.rolloutMaximumProviderAttempts,
      ledgerBeforeSha256: nullableHash(ai.ledgerBeforeSha256, "ai.ledgerBeforeSha256"),
      ledgerAfterSha256: nullableHash(ai.ledgerAfterSha256, "ai.ledgerAfterSha256"),
      steadyStateAcceptanceEvidenceSha256: nullableHash(
        ai.steadyStateAcceptanceEvidenceSha256,
        "ai.steadyStateAcceptanceEvidenceSha256",
      ),
    },
    rollback: {
      v1ArtifactConfirmed: strictBoolean(
        rollback.v1ArtifactConfirmed,
        "rollback.v1ArtifactConfirmed",
      ),
      schema5AccessRouteConfirmed: strictBoolean(
        rollback.schema5AccessRouteConfirmed,
        "rollback.schema5AccessRouteConfirmed",
      ),
      schema5AccessEvidenceSha256: nullableHash(
        rollback.schema5AccessEvidenceSha256,
        "rollback.schema5AccessEvidenceSha256",
      ),
      schema5RecoveryConfirmed: strictBoolean(
        rollback.schema5RecoveryConfirmed,
        "rollback.schema5RecoveryConfirmed",
      ),
      encryptedBackupConfirmed: strictBoolean(
        rollback.encryptedBackupConfirmed,
        "rollback.encryptedBackupConfirmed",
      ),
      pairedReady: strictBoolean(rollback.pairedReady, "rollback.pairedReady"),
      reconciliationDecision: rollback.reconciliationDecision,
      reconciliationEvidenceSha256: nullableHash(
        rollback.reconciliationEvidenceSha256,
        "rollback.reconciliationEvidenceSha256",
      ),
      lossAcceptanceEvidenceSha256: nullableHash(
        rollback.lossAcceptanceEvidenceSha256,
        "rollback.lossAcceptanceEvidenceSha256",
      ),
    },
  };
}

export function assertPairedRollbackPacket(manifest) {
  const { source, database, writeWindow, rollback } = manifest;
  required(source.v1CommitSha, "source.v1CommitSha");
  required(source.v1DeploymentId, "source.v1DeploymentId");
  required(database.backup.encrypted, "database.backup.encrypted");
  required(database.backup.checksumSha256, "database.backup.checksumSha256");
  required(database.backup.evidenceSha256, "database.backup.evidenceSha256");
  required(database.backup.restoreVerified, "database.backup.restoreVerified");
  required(database.backup.custodyConfirmed, "database.backup.custodyConfirmed");
  required(database.recovery.confirmed, "database.recovery.confirmed");
  required(database.recovery.recoveryId, "database.recovery.recoveryId");
  required(database.recovery.evidenceSha256, "database.recovery.evidenceSha256");
  required(rollback.v1ArtifactConfirmed, "rollback.v1ArtifactConfirmed");
  required(rollback.schema5AccessRouteConfirmed, "rollback.schema5AccessRouteConfirmed");
  required(rollback.schema5AccessEvidenceSha256, "rollback.schema5AccessEvidenceSha256");
  required(rollback.schema5RecoveryConfirmed, "rollback.schema5RecoveryConfirmed");
  required(rollback.encryptedBackupConfirmed, "rollback.encryptedBackupConfirmed");
  required(rollback.pairedReady, "rollback.pairedReady");

  if (writeWindow.firstV2WriteAt === null) {
    if (rollback.reconciliationDecision !== "no-v2-writes") {
      reject(
        "A pre-write rollback packet must record no-v2-writes",
        "V2_8_3_RECONCILIATION_REQUIRED",
      );
    }
  } else if (
    !["forward-repair", "approved-loss", "approved-import-route"].includes(
      rollback.reconciliationDecision,
    )
  ) {
    reject(
      "A post-write rollback packet requires an explicit reconciliation decision",
      "V2_8_3_RECONCILIATION_REQUIRED",
    );
  }

  if (writeWindow.firstV2WriteAt !== null) {
    required(writeWindow.windowId, "writeWindow.windowId");
    required(writeWindow.startedAt, "writeWindow.startedAt");
    required(writeWindow.endedAt, "writeWindow.endedAt");
  }

  if (
    writeWindow.firstV2WriteAt !== null &&
    rollback.reconciliationEvidenceSha256 === null
  ) {
    reject(
      "A post-write rollback packet requires reconciliation evidence",
      "V2_8_3_RECONCILIATION_EVIDENCE_REQUIRED",
    );
  }

  if (
    rollback.reconciliationDecision === "approved-loss" &&
    rollback.lossAcceptanceEvidenceSha256 === null
  ) {
    reject(
      "Approved loss requires separate acceptance evidence",
      "V2_8_3_LOSS_ACCEPTANCE_REQUIRED",
    );
  }
  return true;
}

function assertReadyForMainMigration(
  manifest,
  { requireInitialAiLock = true } = {},
) {
  required(manifest.record.createdAt, "record.createdAt");
  required(manifest.record.updatedAt, "record.updatedAt");
  required(manifest.record.approverRole, "record.approverRole");
  required(manifest.source.exactCommitSha, "source.exactCommitSha");
  required(manifest.source.maintenanceDeploymentId, "source.maintenanceDeploymentId");
  required(manifest.source.v2DeploymentId, "source.v2DeploymentId");
  required(
    manifest.database.before.inventoryArtifactSha256,
    "database.before.inventoryArtifactSha256",
  );
  required(manifest.database.before.combinedRowSha256, "database.before.combinedRowSha256");
  requiredPositiveCount(
    manifest.database.before.coreRowCount,
    "database.before.coreRowCount",
  );
  required(manifest.writeWindow.windowId, "writeWindow.windowId");
  required(manifest.writeWindow.startedAt, "writeWindow.startedAt");
  required(
    manifest.writeWindow.oldRuntimeWritePathBlocked,
    "writeWindow.oldRuntimeWritePathBlocked",
  );
  required(
    manifest.writeWindow.oldRuntimeEvidenceSha256,
    "writeWindow.oldRuntimeEvidenceSha256",
  );
  required(
    manifest.writeWindow.noInFlightWritesConfirmed,
    "writeWindow.noInFlightWritesConfirmed",
  );
  required(manifest.ai.ledgerBeforeSha256, "ai.ledgerBeforeSha256");
  if (requireInitialAiLock) {
    if (
      manifest.ai.phase !== "initial-rollout" ||
      manifest.ai.rolloutMaximumProviderAttempts !== 4 ||
      manifest.ai.killSwitchEnabled !== true
    ) {
      reject(
        "The migration gate requires the initial AI cap and enabled Kill Switch",
        "V2_8_3_AI_INITIAL_GATE_REQUIRED",
      );
    }
  }
  assertPairedRollbackPacket(manifest);
}

function assertSchema6Verified(
  manifest,
  { requireInitialAiLock = true } = {},
) {
  assertReadyForMainMigration(manifest, { requireInitialAiLock });
  required(
    manifest.database.after.inventoryArtifactSha256,
    "database.after.inventoryArtifactSha256",
  );
  required(manifest.database.after.combinedRowSha256, "database.after.combinedRowSha256");
  requiredPositiveCount(
    manifest.database.after.coreRowCount,
    "database.after.coreRowCount",
  );
  required(manifest.database.after.parityMatched, "database.after.parityMatched");
  if (manifest.database.before.coreRowCount !== manifest.database.after.coreRowCount) {
    reject(
      "Before and after core row counts must match",
      "V2_8_3_MANIFEST_PARITY_MISMATCH",
    );
  }
  if (
    manifest.database.before.combinedRowSha256 !==
    manifest.database.after.combinedRowSha256
  ) {
    reject(
      "Before and after core row digests must match",
      "V2_8_3_MANIFEST_PARITY_MISMATCH",
    );
  }
}

function assertLiveAiEvidence(manifest) {
  required(manifest.ai.ledgerBeforeSha256, "ai.ledgerBeforeSha256");
  if (manifest.ai.phase === "initial-rollout") {
    if (manifest.ai.rolloutMaximumProviderAttempts !== 4) {
      reject(
        "Initial AI rollout must keep the four-attempt cap",
        "V2_8_3_AI_INITIAL_GATE_REQUIRED",
      );
    }
    if (manifest.ai.killSwitchEnabled === false) {
      required(manifest.ai.ledgerAfterSha256, "ai.ledgerAfterSha256");
    }
    return;
  }
  required(manifest.ai.ledgerAfterSha256, "ai.ledgerAfterSha256");
  required(
    manifest.ai.steadyStateAcceptanceEvidenceSha256,
    "ai.steadyStateAcceptanceEvidenceSha256",
  );
}

export function validateV2Stage83CutoverManifest(value) {
  const manifest = normalizeManifest(value);

  if (
    manifest.record.createdAt !== null &&
    manifest.record.updatedAt !== null &&
    manifest.record.updatedAt < manifest.record.createdAt
  ) {
    reject(
      "record.updatedAt cannot precede record.createdAt",
      "V2_8_3_MANIFEST_TIME_ORDER",
    );
  }
  if (
    manifest.writeWindow.startedAt !== null &&
    manifest.writeWindow.endedAt !== null &&
    manifest.writeWindow.endedAt < manifest.writeWindow.startedAt
  ) {
    reject(
      "writeWindow.endedAt cannot precede writeWindow.startedAt",
      "V2_8_3_MANIFEST_TIME_ORDER",
    );
  }
  if (
    manifest.writeWindow.startedAt !== null &&
    manifest.writeWindow.firstV2WriteAt !== null &&
    manifest.writeWindow.firstV2WriteAt < manifest.writeWindow.startedAt
  ) {
    reject(
      "writeWindow.firstV2WriteAt cannot precede writeWindow.startedAt",
      "V2_8_3_MANIFEST_TIME_ORDER",
    );
  }
  if (
    manifest.writeWindow.endedAt !== null &&
    manifest.writeWindow.firstV2WriteAt !== null &&
    manifest.writeWindow.firstV2WriteAt < manifest.writeWindow.endedAt
  ) {
    reject(
      "writeWindow.firstV2WriteAt cannot precede writeWindow.endedAt",
      "V2_8_3_MANIFEST_TIME_ORDER",
    );
  }

  if (manifest.status === "ready-for-main-migration") {
    assertReadyForMainMigration(manifest);
  } else if (manifest.status === "schema6-verified") {
    assertSchema6Verified(manifest);
  } else if (manifest.status === "live") {
    assertSchema6Verified(manifest, { requireInitialAiLock: false });
    required(manifest.writeWindow.endedAt, "writeWindow.endedAt");
    assertLiveAiEvidence(manifest);
  } else if (manifest.status === "rollback-requested") {
    assertPairedRollbackPacket(manifest);
  }

  return manifest;
}

function manifestPath(argv) {
  const indexes = argv
    .map((value, index) => (value === "--file" ? index : -1))
    .filter((index) => index >= 0);
  if (indexes.length !== 1 || !argv[indexes[0] + 1]) {
    reject("validate requires exactly one --file path", "V2_8_3_MANIFEST_FILE_REQUIRED");
  }
  const candidate = resolve(process.cwd(), argv[indexes[0] + 1]);
  const location = relative(process.cwd(), candidate);
  if (location.startsWith("..") || location === "" || !candidate.endsWith(".json")) {
    reject(
      "The manifest file must be a JSON file inside the repository",
      "V2_8_3_MANIFEST_FILE_REJECTED",
    );
  }
  return candidate;
}

async function main() {
  try {
    const command = process.argv[2];
    if (command === "template") {
      console.log(JSON.stringify(createV2Stage83CutoverManifestTemplate(), null, 2));
      return;
    }
    if (command !== "validate") {
      reject("Use template or validate", "V2_8_3_MANIFEST_COMMAND_UNKNOWN");
    }
    const parsed = JSON.parse(await readFile(manifestPath(process.argv.slice(3)), "utf8"));
    const result = validateV2Stage83CutoverManifest(parsed);
    console.log(JSON.stringify({ ok: true, result }, null, 2));
  } catch (error) {
    const message =
      error?.safeToReport === true
        ? error.message
        : "V2-8-3 manifest validation failed; sensitive details were suppressed";
    const code =
      error?.safeToReport === true
        ? error.code
        : "V2_8_3_MANIFEST_VALIDATION_FAILED";
    console.error(JSON.stringify({ ok: false, error: { code, message } }));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
