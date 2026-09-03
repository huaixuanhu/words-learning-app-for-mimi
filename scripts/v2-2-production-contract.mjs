import { createHash } from "node:crypto";

export const V2_2_MIGRATION_SHA256 =
  "ad518068b59c41f8c71c8ea4e00d8e582cb4d5d2bb7f2a4400005b15f4a2efe4";
export const V2_2_STATES_CONSTRAINT =
  "review_states_parameter_set_profile_valid";
export const V2_2_EVENTS_CONSTRAINT =
  "review_events_profile_evidence_consistent";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const TARGETS = new Set(["staging", "production-main"]);
const PARAMETER_SET_IDS = Object.freeze({
  v1: ["recognition-fsrs-v1"],
  v2: [
    "active-fsrs-v1",
    "active-fsrs-v2",
    "recognition-fsrs-v1",
    "recognition-fsrs-v2",
  ],
});

export class V22ProductionGuardError extends Error {
  constructor(message, code = "V2_2_PRODUCTION_GUARD_REJECTED") {
    super(message);
    this.name = "V22ProductionGuardError";
    this.code = code;
    this.safeToReport = true;
  }
}

function reject(message, code) {
  throw new V22ProductionGuardError(message, code);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function assertPinnedV22Migration(value) {
  const actual = sha256(value);
  if (actual !== V2_2_MIGRATION_SHA256) {
    reject(
      "The V2.2 migration does not match the pinned digest",
      "V2_2_MIGRATION_DIGEST_MISMATCH",
    );
  }
  return actual;
}

export function parseTarget(argv) {
  const positions = argv
    .map((value, index) => (value === "--target" ? index : -1))
    .filter((index) => index >= 0);
  if (positions.length !== 1) {
    reject(
      "Exactly one --target staging|production-main is required",
      "V2_2_TARGET_REQUIRED",
    );
  }
  const target = argv[positions[0] + 1];
  if (!TARGETS.has(target)) {
    reject(
      "The V2.2 target must be staging or production-main",
      "V2_2_TARGET_INVALID",
    );
  }
  return target;
}

function requireBoolean(env, name) {
  if (env[name] !== "true") {
    reject(`${name} must be true`, "V2_2_PRODUCTION_GATE_INCOMPLETE");
  }
}

function requirePattern(env, name, pattern, code) {
  const value = env[name] || "";
  if (!pattern.test(value)) {
    reject(`${name} has an invalid value`, code);
  }
  return value;
}

export function assertCommandContract({ argv, command, env = process.env }) {
  const target = parseTarget(argv);
  const flag =
    command === "inventory"
      ? "--i-confirm-v2-2-read-only-inventory"
      : command === "migrate" && target === "staging"
        ? "--i-confirm-v2-2-staging-migration"
        : command === "migrate" && target === "production-main"
          ? "--i-confirm-v2-2-production-migration"
          : undefined;
  if (!flag) {
    reject("Unknown V2.2 Production command", "V2_2_COMMAND_INVALID");
  }
  const expectedArgs = ["--target", target, flag];
  if (JSON.stringify(argv) !== JSON.stringify(expectedArgs)) {
    reject(
      `The exact V2.2 arguments ${expectedArgs.join(" ")} are required`,
      "V2_2_CONFIRMATION_REQUIRED",
    );
  }

  let releaseCommitSha;
  if (command === "migrate") {
    requireBoolean(env, "MIMI_V2_2_RELEASE_ACCEPTED");
    releaseCommitSha = requirePattern(
      env,
      "MIMI_V2_2_RELEASE_COMMIT_SHA",
      COMMIT_PATTERN,
      "V2_2_RELEASE_COMMIT_INVALID",
    );
  }
  if (command === "migrate" && target === "production-main") {
    requireBoolean(env, "MIMI_V2_2_STAGING_MIGRATION_VERIFIED");
    requireBoolean(env, "MIMI_V2_2_PRODUCTION_BACKUP_VERIFIED");
    requirePattern(
      env,
      "MIMI_V2_2_STAGING_EVIDENCE_SHA256",
      SHA256_PATTERN,
      "V2_2_STAGING_EVIDENCE_INVALID",
    );
    requirePattern(
      env,
      "MIMI_V2_2_PRODUCTION_BACKUP_EVIDENCE_SHA256",
      SHA256_PATTERN,
      "V2_2_PRODUCTION_BACKUP_EVIDENCE_INVALID",
    );
    if (!env.MIMI_V2_2_STAGING_EVIDENCE_PATH) {
      reject(
        "MIMI_V2_2_STAGING_EVIDENCE_PATH is required",
        "V2_2_STAGING_EVIDENCE_PATH_REQUIRED",
      );
    }
    if (!env.MIMI_V2_2_PRODUCTION_BACKUP_EVIDENCE_PATH) {
      reject(
        "MIMI_V2_2_PRODUCTION_BACKUP_EVIDENCE_PATH is required",
        "V2_2_PRODUCTION_BACKUP_EVIDENCE_PATH_REQUIRED",
      );
    }
  }
  return { command, flag, releaseCommitSha, target };
}

function parameterSetIds(definition) {
  return [
    ...new Set(
      String(definition)
        .match(/(?:active|recognition)-fsrs-v\d+/gu)
        ?.sort() ?? [],
    ),
  ];
}

export function classifyConstraintGeneration(constraints) {
  const byName = new Map(
    constraints.map((constraint) => [constraint.name, constraint]),
  );
  const states = byName.get(V2_2_STATES_CONSTRAINT);
  const events = byName.get(V2_2_EVENTS_CONSTRAINT);
  if (
    !states ||
    !events ||
    states.table !== "review_states" ||
    events.table !== "review_events" ||
    states.type !== "c" ||
    events.type !== "c" ||
    states.validated !== true ||
    events.validated !== true
  ) {
    reject(
      "The V2.2 parameter-set constraints are missing or invalid",
      "V2_2_CONSTRAINT_INVENTORY_INVALID",
    );
  }
  const statesIds = parameterSetIds(states.definition);
  const eventsIds = parameterSetIds(events.definition);
  const generations = Object.entries(PARAMETER_SET_IDS)
    .filter(
      ([, expected]) =>
        JSON.stringify(statesIds) === JSON.stringify(expected) &&
        JSON.stringify(eventsIds) === JSON.stringify(expected),
    )
    .map(([generation]) => generation);
  if (generations.length !== 1) {
    reject(
      "The V2.2 parameter-set constraints have a partial or unexpected definition",
      "V2_2_CONSTRAINT_DEFINITION_INVALID",
    );
  }
  const generation = generations[0];
  return {
    combinedSha256: sha256(
      [states, events]
        .map((constraint) =>
          [
            constraint.table,
            constraint.name,
            constraint.type,
            constraint.validated,
            constraint.definition.replace(/\s+/gu, " ").trim(),
          ].join("\0"),
        )
        .join("\0"),
    ),
    generation,
  };
}

export function compareDataSnapshots(before, after) {
  const tables = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const mismatches = tables.filter(
    (table) =>
      Number(before[table]?.count) !== Number(after[table]?.count) ||
      before[table]?.sha256 !== after[table]?.sha256,
  );
  return {
    matched: mismatches.length === 0,
    mismatches,
    combinedSha256Before: sha256(JSON.stringify(before)),
    combinedSha256After: sha256(JSON.stringify(after)),
  };
}

export function assertStagingEvidenceBinding({
  actualSha256,
  evidence,
  expectedSha256,
  releaseCommitSha,
}) {
  if (
    actualSha256 !== expectedSha256 ||
    evidence?.artifactKind !== "v2-2-schema6-0007-migration-v1" ||
    evidence?.target?.target !== "staging" ||
    evidence?.git?.commitSha !== releaseCommitSha ||
    evidence?.migration?.sha256 !== V2_2_MIGRATION_SHA256 ||
    evidence?.before?.constraints?.generation !== "v1" ||
    evidence?.after?.constraints?.generation !== "v2" ||
    !SHA256_PATTERN.test(
      evidence?.after?.constraints?.combinedSha256 || "",
    ) ||
    evidence?.dataParity?.matched !== true
  ) {
    reject(
      "The Staging migration evidence is not bound to this V2.2 release",
      "V2_2_STAGING_EVIDENCE_BINDING_MISMATCH",
    );
  }
  return true;
}

export function assertBackupEvidenceBinding({
  actualSha256,
  evidence,
  expectedSha256,
  releaseCommitSha,
}) {
  if (
    actualSha256 !== expectedSha256 ||
    evidence?.artifactKind !== "v2-1-schema6-production-backup-restore-v1" ||
    evidence?.target?.target !== "production-main" ||
    evidence?.git?.commitSha !== releaseCommitSha ||
    evidence?.restore?.verified !== true ||
    evidence?.restore?.snapshotMatched !== true ||
    evidence?.source?.schemaVersion !== 6 ||
    !SHA256_PATTERN.test(evidence?.archive?.sha256 || "") ||
    !Number.isSafeInteger(evidence?.archive?.bytes) ||
    evidence.archive.bytes < 1
  ) {
    reject(
      "The Production backup evidence is not bound to this V2.2 release",
      "V2_2_PRODUCTION_BACKUP_BINDING_MISMATCH",
    );
  }
  return true;
}

export function safeFailure(error, phase) {
  const output = {
    code:
      error?.safeToReport && typeof error.code === "string"
        ? error.code
        : "V2_2_PRODUCTION_OPERATION_FAILED",
    message:
      error?.safeToReport && typeof error.message === "string"
        ? error.message
        : "The V2.2 Production operation failed safely",
    phase,
  };
  if (/^[0-9A-Z]{5}$/u.test(error?.code || "")) {
    output.databaseCode = error.code;
  }
  return output;
}
