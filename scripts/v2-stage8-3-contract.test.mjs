import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  assertCommandContract,
  assertConnectedIdentity,
  assertExpectedInventoryDigest,
  assertMainMigrationGates,
  assertNonEmptyLearningInventory,
  assertPinnedAdditiveMigration,
  assertPinnedMigration,
  assertPinnedTtsMigration,
  assertTargetIdentity,
  buildSafeInventoryArtifact,
  compareInventoryParity,
  digestCanonicalRows,
  safeFailure,
  sha256,
  unwrapSafeInventoryArtifact,
  V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256,
  V2_STAGE8_3_ADDITIVE_MIGRATION_SHA256,
  V2_STAGE8_3_MIGRATION_SHA256,
  V2_STAGE8_3_TTS_MIGRATION_SHA256,
} from "./v2-stage8-3-contract.mjs";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const PROJECT_ID = "mimi-project-123";
const APPROVED_PROJECT_SHA256 = sha256(PROJECT_ID);
const PRODUCTION_PROJECT_SHA256 =
  "70b4a70d6cfcd6a872c5d9be7649be69332266624fb3cfec3aa6b32143caa880";

function cloneEnv() {
  return {
    STAGE6B_DATABASE_TARGET: "production-clone",
    MIMI_STORAGE_RUNTIME: "postgres-production-clone",
    MIMI_V2_8_3_DATABASE_TARGET: "production-clone",
    MIMI_V2_8_3_EXPECTED_BRANCH_ID: "br-production-clone",
    MIMI_V2_8_3_EXPECTED_BRANCH_NAME: "v2-8-3-production-clone",
    MIMI_V2_8_3_PRODUCTION_MAIN_BRANCH_ID: "br-production-main",
    MIMI_V2_8_3_PRODUCTION_MAIN_ENDPOINT_ID: "ep-production-main",
    MIMI_V2_8_3_CLONE_SOURCE_MAIN_BRANCH_ID: "br-production-main",
    MIMI_V2_8_3_EXPECTED_ENDPOINT_ID: "ep-production-clone",
    MIMI_V2_8_3_EXPECTED_DATABASE: "neondb",
    MIMI_V2_8_3_EXPECTED_ROLE: "migration_owner",
    MIMI_V2_8_3_NEON_PROJECT_ID: PROJECT_ID,
    NEON_API_KEY: "test-neon-api-key",
  };
}

function mainEnv() {
  return {
    STAGE6B_DATABASE_TARGET: "production",
    VERCEL_ENV: "production",
    MIMI_STORAGE_RUNTIME: "postgres-production",
    MIMI_V2_8_3_DATABASE_TARGET: "production-main",
    MIMI_V2_8_3_EXPECTED_BRANCH_ID: "br-production-main",
    MIMI_V2_8_3_EXPECTED_BRANCH_NAME: "main",
    MIMI_V2_8_3_PRODUCTION_MAIN_BRANCH_ID: "br-production-main",
    MIMI_V2_8_3_PRODUCTION_MAIN_ENDPOINT_ID: "ep-production-main",
    MIMI_V2_8_3_EXPECTED_ENDPOINT_ID: "ep-production-main",
    MIMI_V2_8_3_EXPECTED_DATABASE: "neondb",
    MIMI_V2_8_3_EXPECTED_ROLE: "migration_owner",
    MIMI_V2_8_3_NEON_PROJECT_ID: PROJECT_ID,
    NEON_API_KEY: "test-neon-api-key",
  };
}

function mainGateEnv() {
  return {
    ...mainEnv(),
    MIMI_V2_8_3_PRODUCTION_BACKUP_VERIFIED: "true",
    MIMI_V2_8_3_PRODUCTION_BACKUP_EVIDENCE_SHA256: SHA_A,
    MIMI_V2_8_3_SCHEMA5_RECOVERY_POINT_CONFIRMED: "true",
    MIMI_V2_8_3_SCHEMA5_RECOVERY_BRANCH_ID: "br-schema5-recovery",
    MIMI_V2_8_3_CLONE_REHEARSAL_CONFIRMED: "true",
    MIMI_V2_8_3_CLONE_REHEARSAL_NON_EMPTY_CONFIRMED: "true",
    MIMI_V2_8_3_CLONE_REHEARSAL_EVIDENCE_SHA256: SHA_B,
    MIMI_V2_8_3_WRITE_FREE_WINDOW_CONFIRMED: "true",
    MIMI_V2_8_3_OLD_RUNTIME_WRITE_PATH_BLOCKED: "true",
    MIMI_V2_8_3_OLD_RUNTIME_WRITE_PATH_EVIDENCE_SHA256: SHA_A,
    MIMI_V2_8_3_NO_IN_FLIGHT_WRITES_CONFIRMED: "true",
    MIMI_V2_8_3_WRITE_FREE_WINDOW_ID: "cutover-20260719",
    MIMI_V2_8_3_EXPECTED_MAIN_SCHEMA5_DIGEST: SHA_A,
  };
}

function databaseUrl(endpoint = "ep-production-clone", role = "migration_owner", database = "neondb") {
  return `postgresql://${role}:secret@${endpoint}-pooler.ap-southeast-2.aws.neon.tech/${database}?sslmode=require`;
}

function neonControlPlaneFetch(env, overrides = {}) {
  const endpoint = {
    id: env.MIMI_V2_8_3_EXPECTED_ENDPOINT_ID,
    project_id: PROJECT_ID,
    branch_id: env.MIMI_V2_8_3_EXPECTED_BRANCH_ID,
    type: "read_write",
    ...overrides.endpoint,
  };
  const mainEndpoint = {
    id: env.MIMI_V2_8_3_PRODUCTION_MAIN_ENDPOINT_ID,
    project_id: PROJECT_ID,
    branch_id: env.MIMI_V2_8_3_PRODUCTION_MAIN_BRANCH_ID,
    type: "read_write",
    ...overrides.mainEndpoint,
  };
  const branch = {
    id: env.MIMI_V2_8_3_EXPECTED_BRANCH_ID,
    project_id: PROJECT_ID,
    parent_id:
      env.MIMI_V2_8_3_DATABASE_TARGET === "production-clone"
        ? env.MIMI_V2_8_3_PRODUCTION_MAIN_BRANCH_ID
        : null,
    name: env.MIMI_V2_8_3_EXPECTED_BRANCH_NAME,
    current_state: "ready",
    init_source:
      env.MIMI_V2_8_3_DATABASE_TARGET === "production-clone"
        ? "parent-data"
        : "empty",
    ...overrides.branch,
  };
  const mainBranch = {
    id: env.MIMI_V2_8_3_PRODUCTION_MAIN_BRANCH_ID,
    project_id: PROJECT_ID,
    parent_id: null,
    name: "main",
    current_state: "ready",
    init_source: "empty",
    ...overrides.mainBranch,
  };
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (overrides.rejectNetwork) throw new Error("network detail must be hidden");
    if (options?.headers?.authorization !== "Bearer test-neon-api-key") {
      return new Response("forbidden", { status: 401 });
    }
    if (overrides.httpStatus) {
      return new Response("provider detail must be hidden", {
        status: overrides.httpStatus,
      });
    }
    if (overrides.invalidJson) {
      return new Response("not-json", { status: 200 });
    }
    const path = new URL(String(url)).pathname;
    if (path.endsWith(`/endpoints/${env.MIMI_V2_8_3_EXPECTED_ENDPOINT_ID}`)) {
      return Response.json({ endpoint });
    }
    if (path.endsWith(`/endpoints/${env.MIMI_V2_8_3_PRODUCTION_MAIN_ENDPOINT_ID}`)) {
      return Response.json({ endpoint: mainEndpoint });
    }
    if (path.endsWith(`/branches/${env.MIMI_V2_8_3_EXPECTED_BRANCH_ID}`)) {
      return Response.json({ branch });
    }
    if (path.endsWith(`/branches/${env.MIMI_V2_8_3_PRODUCTION_MAIN_BRANCH_ID}`)) {
      return Response.json({ branch: mainBranch });
    }
    return new Response("not found", { status: 404 });
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

function targetIdentityInput(env, rawUrl, controlPlaneOverrides = {}) {
  return {
    approvedProjectIdSha256: APPROVED_PROJECT_SHA256,
    env,
    fetchImpl: neonControlPlaneFetch(env, controlPlaneOverrides),
    rawUrl,
  };
}

function artifact(schemaVersion, target = "production-clone", changedDigest = false) {
  const identityDigest = sha256(`${target}-identity`);
  return buildSafeInventoryArtifact({
    counts: { people: 1, vocabulary_items: 2 },
    identity: {
      connectedDatabaseMatched: true,
      connectedRoleMatched: true,
      controlPlaneConfirmed: true,
      controlPlaneEvidenceSha256: SHA_A,
      databaseMatched: true,
      endpointMatched: true,
      identityDigest,
      roleMatched: true,
      target,
    },
    invariants: { orphan_rows: 0 },
    schema: { constraints: schemaVersion === 6 ? 8 : 9, tables: schemaVersion === 6 ? 20 : 8 },
    schemaVersion,
    tableDigests: {
      people: { count: 1, sha256: SHA_A },
      vocabulary_items: { count: 2, sha256: changedDigest ? SHA_B : SHA_A },
    },
  });
}

describe("V2-8-3 migration integrity", () => {
  it("pins the unchanged Schema 6 migration", async () => {
    const bytes = await readFile(
      resolve(process.cwd(), "db/migrations/0003_v2_schema6_data_model.sql"),
    );
    expect(assertPinnedMigration(bytes)).toBe(V2_STAGE8_3_MIGRATION_SHA256);
  });

  it("pins the additive bilingual example migration independently", async () => {
    const bytes = await readFile(
      resolve(process.cwd(), "db/migrations/0004_v2_bilingual_examples.sql"),
    );
    expect(assertPinnedAdditiveMigration(bytes)).toBe(
      V2_STAGE8_3_ADDITIVE_MIGRATION_SHA256,
    );
  });

  it("pins the additive TTS accounting migration independently", async () => {
    const bytes = await readFile(
      resolve(process.cwd(), "db/migrations/0005_v2_standard_tts_accounting.sql"),
    );
    expect(assertPinnedTtsMigration(bytes)).toBe(
      V2_STAGE8_3_TTS_MIGRATION_SHA256,
    );
  });

  it("rejects any migration drift", () => {
    expect(() => assertPinnedMigration("alter table anything;")).toThrow(
      /pinned V2-8-3 digest/u,
    );
  });
});

describe("V2-8-3 command and target guards", () => {
  it("requires the exact action and confirmation flag", () => {
    const env = {
      ...cloneEnv(),
      MIMI_V2_8_3_DATABASE_ACTION: "migrate-clone",
    };
    expect(
      assertCommandContract({
        argv: ["--i-confirm-v2-8-3-clone-migration"],
        command: "migrate-clone",
        env,
      }),
    ).toEqual({ command: "migrate-clone", target: "production-clone" });
    expect(() =>
      assertCommandContract({ argv: [], command: "migrate-clone", env }),
    ).toThrow(/exact confirmation flag/u);
    expect(() =>
      assertCommandContract({
        argv: ["--i-confirm-v2-8-3-clone-migration"],
        command: "migrate-main",
        env,
      }),
    ).toThrow(/not allowed/u);
  });

  it("checks clone endpoint, database and role against live control-plane data without returning them", async () => {
    const input = targetIdentityInput(cloneEnv(), databaseUrl());
    const identity = await assertTargetIdentity(input);
    expect(identity).toEqual({
      controlPlaneConfirmed: true,
      controlPlaneEvidenceSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      databaseMatched: true,
      endpointMatched: true,
      identityDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
      roleMatched: true,
      target: "production-clone",
    });
    expect(JSON.stringify(identity)).not.toContain("migration_owner");
    expect(JSON.stringify(identity)).not.toContain("ep-production-clone");
    expect(JSON.stringify(identity)).not.toContain("test-neon-api-key");
    expect(input.fetchImpl.calls).toHaveLength(4);
    expect(input.fetchImpl.calls.every(({ url }) =>
      url.startsWith("https://console.neon.tech/api/v2/projects/"),
    )).toBe(true);
  });

  it.each([
    ["endpoint", databaseUrl("ep-wrong")],
    ["role", databaseUrl("ep-production-clone", "wrong_role")],
    ["database", databaseUrl("ep-production-clone", "migration_owner", "wrongdb")],
  ])("rejects a mismatched %s", async (_label, rawUrl) => {
    await expect(
      assertTargetIdentity(targetIdentityInput(cloneEnv(), rawUrl)),
    ).rejects.toThrow(
      /does not match/u,
    );
  });

  it("requires postgres-production and exact main identity", async () => {
    const identity = await assertTargetIdentity(
      targetIdentityInput(mainEnv(), databaseUrl("ep-production-main")),
    );
    expect(identity.target).toBe("production-main");
    await expect(
      assertTargetIdentity(
        targetIdentityInput(
          { ...mainEnv(), MIMI_STORAGE_RUNTIME: "postgres-preview" },
          databaseUrl("ep-production-main"),
        ),
      ),
    ).rejects.toThrow(/postgres-production/u);
  });

  it("refuses a clone that aliases main", async () => {
    await expect(
      assertTargetIdentity(
        targetIdentityInput(
          {
          ...cloneEnv(),
          MIMI_V2_8_3_EXPECTED_BRANCH_ID: "br-production-main",
          },
          databaseUrl(),
        ),
      ),
    ).rejects.toThrow(/distinct from main/u);
  });

  it("rechecks database and role after connecting", () => {
    expect(
      assertConnectedIdentity(
        { database_name: "neondb", role_name: "migration_owner" },
        cloneEnv(),
      ),
    ).toEqual({ connectedDatabaseMatched: true, connectedRoleMatched: true });
    expect(() =>
      assertConnectedIdentity(
        { database_name: "neondb", role_name: "other" },
        cloneEnv(),
      ),
    ).toThrow(/unexpected role/u);
  });

  it("requires a Neon API credential before the database connection", async () => {
    const env = cloneEnv();
    delete env.NEON_API_KEY;
    await expect(
      assertTargetIdentity(targetIdentityInput(env, databaseUrl())),
    ).rejects.toThrow(/NEON_API_KEY is required/u);
  });

  it("pins only the approved Production project and rejects a different project before any request", async () => {
    const env = cloneEnv();
    const fetchImpl = neonControlPlaneFetch(env);

    expect(V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256).toBe(
      PRODUCTION_PROJECT_SHA256,
    );
    await expect(
      assertTargetIdentity({ env, fetchImpl, rawUrl: databaseUrl() }),
    ).rejects.toThrow(/does not match the approved Gate 2 target/u);
    expect(fetchImpl.calls).toHaveLength(0);
  });

  it("rejects a different accessible Neon project before any control-plane request", async () => {
    const env = {
      ...cloneEnv(),
      MIMI_V2_8_3_NEON_PROJECT_ID: "other-accessible-project",
    };
    const fetchImpl = neonControlPlaneFetch(env);

    await expect(
      assertTargetIdentity({
        approvedProjectIdSha256: APPROVED_PROJECT_SHA256,
        env,
        fetchImpl,
        rawUrl: databaseUrl(),
      }),
    ).rejects.toThrow(/does not match the approved Gate 2 target/u);
    expect(fetchImpl.calls).toHaveLength(0);
  });

  it("rejects a clone URL that the live control plane binds to Production main", async () => {
    const env = {
      ...cloneEnv(),
      MIMI_V2_8_3_EXPECTED_ENDPOINT_ID: "ep-production-main-real",
      MIMI_V2_8_3_PRODUCTION_MAIN_ENDPOINT_ID: "ep-declared-main",
    };
    const input = targetIdentityInput(
      env,
      databaseUrl("ep-production-main-real"),
      { endpoint: { branch_id: "br-production-main" } },
    );
    await expect(assertTargetIdentity(input)).rejects.toThrow(
      /live Neon endpoint metadata/u,
    );
  });

  it("rejects a wrong branch parent, schema-only clone, or unavailable control plane", async () => {
    await expect(
      assertTargetIdentity(
        targetIdentityInput(cloneEnv(), databaseUrl(), {
          branch: { parent_id: "br-wrong-parent" },
        }),
      ),
    ).rejects.toThrow(/branch topology/u);
    await expect(
      assertTargetIdentity(
        targetIdentityInput(cloneEnv(), databaseUrl(), {
          branch: { init_source: "schema-only" },
        }),
      ),
    ).rejects.toThrow(/branch topology/u);
    await expect(
      assertTargetIdentity(
        targetIdentityInput(cloneEnv(), databaseUrl(), {
          httpStatus: 401,
        }),
      ),
    ).rejects.toThrow(/verification was rejected/u);
    await expect(
      assertTargetIdentity(
        targetIdentityInput(cloneEnv(), databaseUrl(), {
          rejectNetwork: true,
        }),
      ),
    ).rejects.toThrow(/could not be completed/u);
  });
});

describe("V2-8-3 Production migration gates", () => {
  it("accepts the complete backup, recovery, clone and write-free evidence set", () => {
    expect(assertMainMigrationGates(mainGateEnv())).toEqual({
      backupVerified: true,
      cloneRehearsalNonEmpty: true,
      cloneRehearsalVerified: true,
      noInFlightWritesConfirmed: true,
      oldRuntimeWritePathBlocked: true,
      schema5RecoveryPointConfirmed: true,
      writeFreeWindowConfirmed: true,
    });
    expect(
      assertExpectedInventoryDigest(mainGateEnv(), "production-main"),
    ).toBe(SHA_A);
  });

  it.each([
    "MIMI_V2_8_3_PRODUCTION_BACKUP_VERIFIED",
    "MIMI_V2_8_3_SCHEMA5_RECOVERY_POINT_CONFIRMED",
    "MIMI_V2_8_3_CLONE_REHEARSAL_CONFIRMED",
    "MIMI_V2_8_3_CLONE_REHEARSAL_NON_EMPTY_CONFIRMED",
    "MIMI_V2_8_3_WRITE_FREE_WINDOW_CONFIRMED",
    "MIMI_V2_8_3_OLD_RUNTIME_WRITE_PATH_BLOCKED",
    "MIMI_V2_8_3_NO_IN_FLIGHT_WRITES_CONFIRMED",
  ])("rejects a missing %s gate", (name) => {
    const env = mainGateEnv();
    delete env[name];
    expect(() => assertMainMigrationGates(env)).toThrow(/must be true/u);
  });

  it("requires a recovery point separate from main", () => {
    expect(() =>
      assertMainMigrationGates({
        ...mainGateEnv(),
        MIMI_V2_8_3_SCHEMA5_RECOVERY_BRANCH_ID: "br-production-main",
      }),
    ).toThrow(/distinct/u);
  });

  it("requires evidence for the old V1 runtime write-path block", () => {
    const env = mainGateEnv();
    delete env.MIMI_V2_8_3_OLD_RUNTIME_WRITE_PATH_EVIDENCE_SHA256;
    expect(() => assertMainMigrationGates(env)).toThrow(
      /MIMI_V2_8_3_OLD_RUNTIME_WRITE_PATH_EVIDENCE_SHA256 is required/u,
    );
  });
});

describe("safe inventory and parity", () => {
  it("requires real non-empty learning data", () => {
    expect(assertNonEmptyLearningInventory({ people: 1, vocabulary_items: 1 })).toBe(true);
    expect(() =>
      assertNonEmptyLearningInventory({ people: 1, vocabulary_items: 0 }),
    ).toThrow(/non-empty/u);
  });

  it("hashes canonical rows and never exposes their content", () => {
    const sensitive = "private vocabulary and person label";
    const digest = digestCanonicalRows([{ canonical: sensitive }]);
    expect(digest).toMatch(/^[a-f0-9]{64}$/u);
    expect(digest).not.toContain(sensitive);
  });

  it("accepts exact Schema 5 to Schema 6 parity", () => {
    const before = artifact(5);
    const after = artifact(6);
    expect(compareInventoryParity(before, after)).toEqual({
      matched: true,
      mismatches: [],
      preservedCoreRows: 3,
    });
    expect(unwrapSafeInventoryArtifact({ ok: true, result: before })).toEqual(before);
  });

  it("identifies changed row digests", () => {
    const parity = compareInventoryParity(artifact(5), artifact(6, "production-clone", true));
    expect(parity.matched).toBe(false);
    expect(parity.mismatches).toContain("vocabulary_items:digest");
    expect(parity.mismatches).toContain("combined-digest");
  });

  it("emits no vocabulary text, person label, URL, endpoint, database or role", () => {
    const output = JSON.stringify(artifact(5));
    for (const forbidden of [
      "private vocabulary",
      "person label",
      "postgresql://",
      "ep-production",
      "neondb",
      "migration_owner",
    ]) {
      expect(output).not.toContain(forbidden);
    }
  });

  it("drops unknown fields from a supplied parity artifact", () => {
    const supplied = {
      ...artifact(5),
      vocabularyText: "must never be echoed",
      identity: {
        ...artifact(5).identity,
        endpoint: "must never be echoed",
      },
    };
    const normalized = unwrapSafeInventoryArtifact(supplied);
    expect(JSON.stringify(normalized)).not.toContain("must never be echoed");
    expect(normalized).not.toHaveProperty("vocabularyText");
    expect(normalized.identity).not.toHaveProperty("endpoint");
  });

  it("rejects a parity artifact with any unconfirmed identity check", () => {
    const supplied = artifact(5);
    supplied.identity.endpointMatched = false;
    expect(() => unwrapSafeInventoryArtifact(supplied)).toThrow(
      /integrity check failed/u,
    );
  });

  it("never coerces a string identity marker into a confirmed boolean", () => {
    expect(() =>
      buildSafeInventoryArtifact({
        counts: { people: 1, vocabulary_items: 1 },
        identity: {
          connectedDatabaseMatched: "false",
          connectedRoleMatched: true,
          controlPlaneConfirmed: true,
          controlPlaneEvidenceSha256: SHA_A,
          databaseMatched: true,
          endpointMatched: true,
          identityDigest: SHA_B,
          roleMatched: true,
          target: "production-clone",
        },
        invariants: { orphan_rows: 0 },
        schema: { tables: 8 },
        schemaVersion: 5,
        tableDigests: { people: { count: 1, sha256: SHA_A } },
      }),
    ).toThrow(/connectedDatabaseMatched is not confirmed/u);
  });
});

describe("failure handling", () => {
  it("suppresses unexpected database error details", () => {
    const failure = safeFailure(
      Object.assign(new Error("postgresql://user:password@secret-host/db"), {
        code: "ECONNREFUSED",
      }),
      "database-connect",
    );
    expect(JSON.stringify(failure)).not.toContain("password");
    expect(JSON.stringify(failure)).not.toContain("secret-host");
    expect(failure.code).toBe("ECONNREFUSED");
  });

  it("fails closed before database access when markers are absent", () => {
    const result = spawnSync(
      process.execPath,
      [
        "scripts/v2-stage8-3-db.mjs",
        "inventory-schema5",
        "--i-confirm-v2-8-3-read-only-inventory",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { PATH: process.env.PATH },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("V2_8_3_ENV_MISSING");
    expect(result.stderr).not.toContain("postgresql://");
  });

  it("requires direct control-plane authentication before any database connection", () => {
    const env = cloneEnv();
    delete env.NEON_API_KEY;
    const result = spawnSync(
      process.execPath,
      [
        "scripts/v2-stage8-3-db.mjs",
        "inventory-schema5",
        "--i-confirm-v2-8-3-read-only-inventory",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          ...env,
          DATABASE_URL: databaseUrl(),
          MIMI_V2_8_3_DATABASE_ACTION: "inventory-schema5",
        },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("V2_8_3_ENV_MISSING");
    expect(result.stderr).toContain("NEON_API_KEY is required");
    expect(result.stderr).not.toContain("postgresql://");
    expect(result.stderr).not.toContain("secret");
  });
});
