import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertCommandContract,
  assertPinnedV21Migration,
  parseTarget,
  sha256,
  V2_1_MIGRATION_SHA256,
} from "./v2-1-production-contract.mjs";
import {
  selectTargetMetadata,
  validateConnectionUri,
} from "./v2-1-neon-target.mjs";

const projectId = "approved-project";
const projectSha = sha256(projectId);
const projects = [{ id: projectId }];
const branches = [
  {
    current_state: "ready",
    id: "br-main",
    name: "main",
    parent_id: null,
    project_id: projectId,
  },
  {
    current_state: "ready",
    id: "br-staging",
    name: "staging",
    parent_id: "br-main",
    project_id: projectId,
  },
];
const endpoints = [
  {
    branch_id: "br-main",
    id: "ep-main",
    project_id: projectId,
    region_id: "aws-ap-southeast-2",
    type: "read_write",
  },
  {
    branch_id: "br-staging",
    id: "ep-staging",
    project_id: projectId,
    region_id: "aws-ap-southeast-2",
    type: "read_write",
  },
];

describe("V2.1 Production release guard", () => {
  it("pins the immutable 0006 migration digest", async () => {
    expect(V2_1_MIGRATION_SHA256).toMatch(/^[a-f0-9]{64}$/u);
    const migration = await readFile(
      resolve(
        process.cwd(),
        "db/migrations/0006_v2_1_vocabulary_unique_normalized_text.sql",
      ),
      "utf8",
    );
    expect(assertPinnedV21Migration(migration)).toBe(V2_1_MIGRATION_SHA256);
    expect(() => assertPinnedV21Migration("changed")).toThrow(/pinned digest/u);
  });

  it("requires one exact target and command confirmation", () => {
    expect(parseTarget(["--target", "staging"])).toBe("staging");
    expect(() => parseTarget(["--target", "other"])).toThrow(/staging or production-main/u);
    expect(
      assertCommandContract({
        argv: [
          "--target",
          "staging",
          "--i-confirm-v2-1-read-only-inventory",
        ],
        command: "inventory",
      }),
    ).toMatchObject({ target: "staging" });
  });

  it("keeps Production migration behind backup, deploy, cleanup and zero-duplicate gates", () => {
    const argv = [
      "--target",
      "production-main",
      "--i-confirm-v2-1-production-migration",
    ];
    expect(() =>
      assertCommandContract({ argv, command: "migrate", env: {} }),
    ).toThrow(/must be true/u);
    expect(
      assertCommandContract({
        argv,
        command: "migrate",
        env: {
          MIMI_V2_1_PRODUCTION_BACKUP_EVIDENCE_SHA256: "a".repeat(64),
          MIMI_V2_1_PRODUCTION_BACKUP_VERIFIED: "true",
          MIMI_V2_1_PRODUCTION_CLEANUP_ACCEPTED: "true",
          MIMI_V2_1_PRODUCTION_DEPLOYMENT_READY: "true",
          MIMI_V2_1_ZERO_DUPLICATES_VERIFIED: "true",
        },
      }),
    ).toMatchObject({ target: "production-main" });
  });

  it("binds main and staging to the pinned project topology and Sydney endpoints", () => {
    const main = selectTargetMetadata({
      approvedProjectSha256: projectSha,
      branches,
      endpoints,
      projects,
      target: "production-main",
    });
    expect(main.branch.id).toBe("br-main");
    const staging = selectTargetMetadata({
      approvedProjectSha256: projectSha,
      branches,
      endpoints,
      projects,
      target: "staging",
    });
    expect(staging.branch.id).toBe("br-staging");
    expect(staging.safeIdentity).not.toHaveProperty("projectId");
  });

  it("accepts only an unpooled URI for the exact endpoint, role and database", () => {
    const metadata = selectTargetMetadata({
      approvedProjectSha256: projectSha,
      branches,
      endpoints,
      projects,
      target: "production-main",
    });
    expect(
      validateConnectionUri(
        "postgresql://neondb_owner:secret@ep-main.ap-southeast-2.aws.neon.tech/neondb?sslmode=require",
        metadata,
      ).hostname,
    ).toBe("ep-main.ap-southeast-2.aws.neon.tech");
    expect(() =>
      validateConnectionUri(
        "postgresql://neondb_owner:secret@ep-main-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require",
        metadata,
      ),
    ).toThrow(/does not match/u);
  });
});
