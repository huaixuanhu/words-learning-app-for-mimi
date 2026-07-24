import { createHash } from "node:crypto";

export const V2_1_MIGRATION_SHA256 =
  "fefb5cd66916ac6303a83e250e5c9913fd82602113673c6fe5a9e11830624fe8";
export const V2_1_UNIQUE_INDEX =
  "vocabulary_items_person_normalized_text_unique";
export const V2_1_OLD_NON_UNIQUE_INDEX =
  "vocabulary_items_person_normalized_text_idx";
export const V2_1_STAGING_FIXTURE_PERSON_ID =
  "00000000-0000-4000-8000-000000021001";
export const V2_1_STAGING_FIXTURE_PERSON_LABEL = "V2.1 Duplicate Test";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const TARGETS = new Set(["staging", "production-main"]);

export class V21ProductionGuardError extends Error {
  constructor(message, code = "V2_1_PRODUCTION_GUARD_REJECTED") {
    super(message);
    this.name = "V21ProductionGuardError";
    this.code = code;
    this.safeToReport = true;
  }
}

function reject(message, code) {
  throw new V21ProductionGuardError(message, code);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function assertPinnedV21Migration(value) {
  const actual = sha256(value);
  if (actual !== V2_1_MIGRATION_SHA256) {
    reject(
      "The V2.1 migration does not match the pinned digest",
      "V2_1_MIGRATION_DIGEST_MISMATCH",
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
      "V2_1_TARGET_REQUIRED",
    );
  }
  const target = argv[positions[0] + 1];
  if (!TARGETS.has(target)) {
    reject(
      "The V2.1 target must be staging or production-main",
      "V2_1_TARGET_INVALID",
    );
  }
  return target;
}

export function assertCommandContract({ argv, command, env = process.env }) {
  const target = parseTarget(argv);
  const flags = {
    inventory: "--i-confirm-v2-1-read-only-inventory",
  };
  let flag = flags[command];
  if (command === "migrate") {
    flag =
      target === "staging"
        ? "--i-confirm-v2-1-staging-migration"
        : "--i-confirm-v2-1-production-migration";
  }
  if (!flag) {
    reject("Unknown V2.1 Production command", "V2_1_COMMAND_INVALID");
  }
  if (!argv.includes(flag)) {
    reject(`The exact confirmation flag ${flag} is required`, "V2_1_CONFIRMATION_REQUIRED");
  }
  if (command === "migrate" && target === "production-main") {
    const requirements = [
      "MIMI_V2_1_PRODUCTION_BACKUP_VERIFIED",
      "MIMI_V2_1_ZERO_DUPLICATES_VERIFIED",
      "MIMI_V2_1_PRODUCTION_DEPLOYMENT_READY",
      "MIMI_V2_1_PRODUCTION_CLEANUP_ACCEPTED",
    ];
    for (const name of requirements) {
      if (env[name] !== "true") {
        reject(`${name} must be true`, "V2_1_PRODUCTION_GATE_INCOMPLETE");
      }
    }
    if (!SHA256_PATTERN.test(env.MIMI_V2_1_PRODUCTION_BACKUP_EVIDENCE_SHA256 || "")) {
      reject(
        "A valid Production backup evidence SHA-256 is required",
        "V2_1_PRODUCTION_BACKUP_EVIDENCE_INVALID",
      );
    }
  }
  return { command, flag, target };
}

export function safeFailure(error, phase) {
  const output = {
    code:
      error?.safeToReport && typeof error.code === "string"
        ? error.code
        : "V2_1_PRODUCTION_OPERATION_FAILED",
    message:
      error?.safeToReport && typeof error.message === "string"
        ? error.message
        : "The V2.1 Production operation failed safely",
    phase,
  };
  if (/^[0-9A-Z]{5}$/u.test(error?.code || "")) {
    output.databaseCode = error.code;
  }
  return output;
}
