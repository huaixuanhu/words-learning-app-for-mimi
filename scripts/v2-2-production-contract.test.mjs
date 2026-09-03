import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertBackupEvidenceBinding,
  assertCommandContract,
  assertPinnedV22Migration,
  assertStagingEvidenceBinding,
  classifyConstraintGeneration,
  compareDataSnapshots,
  parseTarget,
  sha256,
  V2_2_MIGRATION_SHA256,
} from "./v2-2-production-contract.mjs";
import { selectTargetMetadata } from "./v2-1-neon-target.mjs";
import { V2_STAGE8_3_TARGETS } from "./v2-stage8-3-contract.mjs";

function constraints(generation) {
  const ids =
    generation === "v2"
      ? [
          "recognition-fsrs-v1",
          "recognition-fsrs-v2",
          "active-fsrs-v1",
          "active-fsrs-v2",
        ]
      : ["recognition-fsrs-v1"];
  const definition = `check (review_profile is not null and parameter_set_id in (${ids
    .map((id) => `'${id}'`)
    .join(", ")}))`;
  return [
    {
      definition,
      name: "review_states_parameter_set_profile_valid",
      table: "review_states",
      type: "c",
      validated: true,
    },
    {
      definition: `${definition} and activity_type is not null`,
      name: "review_events_profile_evidence_consistent",
      table: "review_events",
      type: "c",
      validated: true,
    },
  ];
}

describe("V2.2 Production release guard", () => {
  it("pins the immutable constraint-only 0007 migration", async () => {
    expect(V2_2_MIGRATION_SHA256).toMatch(/^[a-f0-9]{64}$/u);
    const migration = await readFile(
      resolve(process.cwd(), "db/migrations/0007_v2_2_fsrs_parameter_sets.sql"),
      "utf8",
    );
    expect(assertPinnedV22Migration(migration)).toBe(V2_2_MIGRATION_SHA256);
    expect(() => assertPinnedV22Migration("changed")).toThrow(/pinned digest/u);
    expect(migration).not.toMatch(/\b(?:insert|update|delete|truncate)\b/iu);
  });

  it("requires one exact target and exact command arguments", () => {
    expect(parseTarget(["--target", "staging"])).toBe("staging");
    expect(() => parseTarget(["--target", "other"])).toThrow(
      /staging or production-main/u,
    );
    expect(
      assertCommandContract({
        argv: [
          "--target",
          "staging",
          "--i-confirm-v2-2-read-only-inventory",
        ],
        command: "inventory",
      }),
    ).toMatchObject({ target: "staging" });
    expect(() =>
      assertCommandContract({
        argv: [
          "--target",
          "staging",
          "--i-confirm-v2-2-read-only-inventory",
          "--extra",
        ],
        command: "inventory",
      }),
    ).toThrow(/exact V2.2 arguments/u);
  });

  it("keeps Production migration behind release, Staging and backup evidence", () => {
    const argv = [
      "--target",
      "production-main",
      "--i-confirm-v2-2-production-migration",
    ];
    expect(() =>
      assertCommandContract({ argv, command: "migrate", env: {} }),
    ).toThrow(/must be true/u);
    expect(
      assertCommandContract({
        argv,
        command: "migrate",
        env: {
          MIMI_V2_2_PRODUCTION_BACKUP_EVIDENCE_PATH: "/private/evidence.json",
          MIMI_V2_2_PRODUCTION_BACKUP_EVIDENCE_SHA256: "b".repeat(64),
          MIMI_V2_2_PRODUCTION_BACKUP_VERIFIED: "true",
          MIMI_V2_2_RELEASE_ACCEPTED: "true",
          MIMI_V2_2_RELEASE_COMMIT_SHA: "c".repeat(40),
          MIMI_V2_2_STAGING_EVIDENCE_PATH: "/staging/evidence.json",
          MIMI_V2_2_STAGING_EVIDENCE_SHA256: "a".repeat(64),
          MIMI_V2_2_STAGING_MIGRATION_VERIFIED: "true",
        },
      }),
    ).toMatchObject({
      releaseCommitSha: "c".repeat(40),
      target: "production-main",
    });
  });

  it("permits only V2.2 to wake an exact archived Staging branch", () => {
    expect(V2_STAGE8_3_TARGETS.STAGING).toBe("staging");
    const projectId = "approved-project";
    const mainId = "br-main";
    const stagingId = "br-staging";
    const input = {
      approvedProjectSha256: sha256(projectId),
      branches: [
        {
          current_state: "ready",
          id: mainId,
          name: "main",
          parent_id: null,
          project_id: projectId,
        },
        {
          current_state: "archived",
          id: stagingId,
          name: "staging",
          parent_id: mainId,
          project_id: projectId,
        },
      ],
      endpoints: [
        {
          branch_id: stagingId,
          id: "ep-staging",
          project_id: projectId,
          region_id: "aws-ap-southeast-2",
          type: "read_write",
        },
      ],
      projects: [{ id: projectId }],
      target: "staging",
    };
    expect(() => selectTargetMetadata(input)).toThrow(/expected staging/u);
    expect(
      selectTargetMetadata({ ...input, allowArchivedStaging: true }).branch
        .current_state,
    ).toBe("archived");
  });

  it("classifies only complete v1 or v2 constraint pairs", () => {
    expect(classifyConstraintGeneration(constraints("v1")).generation).toBe(
      "v1",
    );
    expect(classifyConstraintGeneration(constraints("v2")).generation).toBe(
      "v2",
    );
    expect(() =>
      classifyConstraintGeneration([
        constraints("v2")[0],
        constraints("v1")[1],
      ]),
    ).toThrow(/partial or unexpected/u);
  });

  it("compares every table count and row digest", () => {
    const before = {
      people: { count: 1, sha256: "a".repeat(64) },
      review_events: { count: 2, sha256: "b".repeat(64) },
    };
    expect(compareDataSnapshots(before, structuredClone(before))).toMatchObject({
      matched: true,
      mismatches: [],
    });
    expect(
      compareDataSnapshots(before, {
        ...before,
        review_events: { count: 2, sha256: "c".repeat(64) },
      }),
    ).toMatchObject({ matched: false, mismatches: ["review_events"] });
  });

  it("binds Staging and backup evidence to the same exact commit", () => {
    const releaseCommitSha = "c".repeat(40);
    const staging = {
      after: {
        constraints: {
          combinedSha256: "e".repeat(64),
          generation: "v2",
        },
      },
      artifactKind: "v2-2-schema6-0007-migration-v1",
      before: { constraints: { generation: "v1" } },
      dataParity: { matched: true },
      git: { commitSha: releaseCommitSha },
      migration: { sha256: V2_2_MIGRATION_SHA256 },
      target: { target: "staging" },
    };
    expect(
      assertStagingEvidenceBinding({
        actualSha256: "a".repeat(64),
        evidence: staging,
        expectedSha256: "a".repeat(64),
        releaseCommitSha,
      }),
    ).toBe(true);
    const backup = {
      archive: { bytes: 1, sha256: "f".repeat(64) },
      artifactKind: "v2-1-schema6-production-backup-restore-v1",
      git: { commitSha: releaseCommitSha },
      restore: { snapshotMatched: true, verified: true },
      source: { schemaVersion: 6 },
      target: { target: "production-main" },
    };
    expect(
      assertBackupEvidenceBinding({
        actualSha256: "b".repeat(64),
        evidence: backup,
        expectedSha256: "b".repeat(64),
        releaseCommitSha,
      }),
    ).toBe(true);
    expect(() =>
      assertBackupEvidenceBinding({
        actualSha256: "b".repeat(64),
        evidence: backup,
        expectedSha256: "b".repeat(64),
        releaseCommitSha: "d".repeat(40),
      }),
    ).toThrow(/not bound/u);
  });

  it("keeps the database runner aggregate-only and backup streams private", async () => {
    const runner = await readFile(
      resolve(process.cwd(), "scripts/v2-2-production-db.mjs"),
      "utf8",
    );
    expect(runner).toContain("to_jsonb(source_row)::text as canonical");
    expect(runner).toContain("V2_2_MIGRATION_DATA_PARITY_FAILED");
    expect(runner).toContain("V2_2_MIGRATION_RESULT_AMBIGUOUS");
    expect(runner).not.toContain("console.log(connection");

    const backup = await readFile(
      resolve(process.cwd(), "scripts/v2-1-production-backup.mjs"),
      "utf8",
    );
    expect(backup).toContain(
      'encoding: options.encoding === undefined ? "utf8" : options.encoding',
    );
    expect(backup.match(/stdio: "ignore"/gu)).toHaveLength(3);
  });
});
