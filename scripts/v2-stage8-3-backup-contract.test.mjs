import { homedir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertBackupCommand,
  assertBackupFileName,
  assertGate2Baseline,
  assertProductionBackupEnvironment,
  assertSchema5BackupInventory,
  assertSecretFreeEvidence,
  compareBackupInventories,
  parseNeonDatabaseIdentity,
  sha256,
  validateBackupEvidence,
  V2_STAGE8_3_BACKUP_EVIDENCE_KIND,
  V2_STAGE8_3_BACKUP_METHOD,
  V2_STAGE8_3_GATE2_BASELINE_COUNTS,
} from "./v2-stage8-3-backup-contract.mjs";

const SECRET = "test-password";
const ENDPOINT = "ep-calm-river-a1b2c3d4.ap-southeast-2.aws.neon.tech";

function databaseUrl({ pooled = false, database = "neondb", role = "neondb_owner" } = {}) {
  const host = pooled ? ENDPOINT.replace(".", "-pooler.") : ENDPOINT;
  return `postgresql://${role}:${SECRET}@${host}/${database}?sslmode=require&channel_binding=require`;
}

function productionEnv() {
  return {
    VERCEL_ENV: "production",
    STAGE6B_DATABASE_TARGET: "production",
    MIMI_STORAGE_RUNTIME: "postgres-production",
    MIMI_V2_8_3_BACKUP_TARGET: "production-main",
    MIMI_V2_8_3_BACKUP_ACTION: "encrypted-logical-backup",
    MIMI_V2_8_3_BACKUP_APPROVED: "true",
    DATABASE_URL_UNPOOLED: databaseUrl(),
    POSTGRES_URL_NON_POOLING: databaseUrl(),
    DATABASE_URL: databaseUrl({ pooled: true }),
  };
}

function assertFakeProductionEnvironment(env = productionEnv()) {
  return assertProductionBackupEnvironment(env, {
    expectedEndpointSha256: sha256(ENDPOINT),
  });
}

function inventory() {
  const tableDigests = {
    people: { count: 1, sha256: "a".repeat(64) },
    vocabulary_items: { count: 1486, sha256: "b".repeat(64) },
  };
  return {
    combinedSha256: "c".repeat(64),
    counts: { ...V2_STAGE8_3_GATE2_BASELINE_COUNTS },
    database: "neondb",
    invariants: {
      application_shape_violations: 0,
      review_event_item_orphans: 0,
      review_state_item_orphans: 0,
    },
    role: "neondb_owner",
    schema: {
      columns: 6,
      constraints: 9,
      indexes: 1,
      schema6Markers: 0,
      tables: 8,
      triggers: 2,
      unexpectedTables: 0,
    },
    schemaVersion: 5,
    serverMajor: 17,
    tableDigests,
  };
}

describe("V2-8-3 Gate 3 Production source contract", () => {
  it("accepts only the approved unpooled Sydney Schema 5 target shape", () => {
    const result = assertFakeProductionEnvironment();
    expect(result.safeIdentity).toEqual({
      database: "neondb",
      endpointSha256: sha256(ENDPOINT),
      role: "neondb_owner",
      target: "production-main",
    });
    expect(result.rawUrl).toContain(SECRET);
  });

  it("rejects a pooled backup source before a database command", () => {
    const env = productionEnv();
    env.DATABASE_URL_UNPOOLED = databaseUrl({ pooled: true });
    delete env.POSTGRES_URL_NON_POOLING;
    expect(() => assertFakeProductionEnvironment(env)).toThrow(
      /must not use a pooled endpoint/u,
    );
  });

  it("rejects an unpooled endpoint outside the pinned Production main identity", () => {
    expect(() =>
      assertProductionBackupEnvironment(productionEnv(), {
        expectedEndpointSha256: "0".repeat(64),
      }),
    ).toThrow(/not the pinned main endpoint/u);
  });

  it("rejects wrong role, database, region and TLS contracts", () => {
    expect(() => parseNeonDatabaseIdentity(databaseUrl({ role: "other" }))).toThrow(
      /wrong database or role/u,
    );
    expect(() => parseNeonDatabaseIdentity(databaseUrl({ database: "other" }))).toThrow(
      /wrong database or role/u,
    );
    expect(() =>
      parseNeonDatabaseIdentity(
        databaseUrl().replace("ap-southeast-2", "us-east-1"),
      ),
    ).toThrow(/outside the approved Neon target/u);
    expect(() =>
      parseNeonDatabaseIdentity(databaseUrl().replace("sslmode=require", "sslmode=disable")),
    ).toThrow(/must require TLS/u);
  });

  it("requires the exact Production approval flag before credentials are read", () => {
    expect(() =>
      assertBackupCommand({ argv: [], command: "production", env: productionEnv() }),
    ).toThrow(/exact approval flag/u);
    expect(
      assertBackupCommand({
        argv: ["--i-confirm-v2-8-3-production-encrypted-backup"],
        command: "production",
        env: productionEnv(),
      }),
    ).toMatchObject({ command: "production" });
  });

});

describe("V2-8-3 Gate 3 inventory and evidence contract", () => {
  it("locks the Gate 2 baseline and rejects unexplained drift", () => {
    expect(assertGate2Baseline(V2_STAGE8_3_GATE2_BASELINE_COUNTS)).toEqual(
      Object.fromEntries(
        Object.keys(V2_STAGE8_3_GATE2_BASELINE_COUNTS).map((key) => [key, 0]),
      ),
    );
    expect(() =>
      assertGate2Baseline({
        ...V2_STAGE8_3_GATE2_BASELINE_COUNTS,
        vocabulary_items: 1487,
      }),
    ).toThrow(/drifted from Gate 2/u);
  });

  it("requires PostgreSQL 17, Schema 5, non-empty data and zero invariants", () => {
    expect(assertSchema5BackupInventory(inventory())).toBeTruthy();
    expect(() =>
      assertSchema5BackupInventory({ ...inventory(), serverMajor: 18 }),
    ).toThrow(/not the accepted Schema 5 target/u);
    expect(() =>
      assertSchema5BackupInventory({
        ...inventory(),
        invariants: { application_shape_violations: 1 },
      }),
    ).toThrow(/invariants failed/u);
  });

  it("compares every count and core-table digest", () => {
    const expected = inventory();
    expect(compareBackupInventories(expected, structuredClone(expected))).toEqual({
      matched: true,
      mismatches: [],
    });
    const changed = structuredClone(expected);
    changed.tableDigests.people.sha256 = "d".repeat(64);
    expect(compareBackupInventories(expected, changed)).toEqual({
      matched: false,
      mismatches: ["digest:people"],
    });
  });

  it("permits only the fixed external backup filename", () => {
    const valid = join(
      homedir(),
      "Documents",
      "Mimi Vocabulary Backups",
      "mimi-production-schema5-20260723T010203Z-abcdef123456.dump.age",
    );
    expect(assertBackupFileName(valid)).toBe(valid);
    expect(() => assertBackupFileName(join(process.cwd(), "backup.dump.age"))).toThrow(
      /outside the approved location/u,
    );
  });

  it("rejects secret-shaped evidence and validates a complete safe record", () => {
    expect(() =>
      assertSecretFreeEvidence({ connectionString: databaseUrl() }),
    ).toThrow(/Sensitive field name/u);
    const value = {
      artifactKind: V2_STAGE8_3_BACKUP_EVIDENCE_KIND,
      artifactVersion: 1,
      method: V2_STAGE8_3_BACKUP_METHOD,
      archive: { sha256: "a".repeat(64) },
      cleanup: { verified: true },
      encryption: {
        keychainCustodyConfirmed: true,
        recipientSha256: "b".repeat(64),
      },
      restore: { combinedSha256: "c".repeat(64), schemaVersion: 5, verified: true },
      source: { combinedSha256: "c".repeat(64), schemaVersion: 5 },
    };
    expect(validateBackupEvidence(value)).toBe(value);
  });
});
