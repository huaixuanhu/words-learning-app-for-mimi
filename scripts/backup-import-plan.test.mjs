import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  BackupImportPlanError,
  buildBackupImportPlan,
  buildBackupImportPlanFromText,
  createStage5LFixtureBackup,
  createStage6BP1ESchema5FixtureBackup,
  STAGE5L_FIXTURE_FILE_NAME,
  STAGE6B_P1E_SCHEMA5_FIXTURE_FILE_NAME,
} from "./backup-import-plan.mjs";

function createUuidFactory() {
  let next = 1;

  return () => {
    const suffix = String(next).padStart(12, "0");
    next += 1;

    return `00000000-0000-4000-8000-${suffix}`;
  };
}

describe("Stage 5L backup import plan", () => {
  it("builds a file-backed Stage 5M import plan from backup text", async () => {
    const text = await readFile(
      new URL("../test_fixtures/stage5m-backup.json", import.meta.url),
      "utf8",
    );
    const plan = buildBackupImportPlanFromText(text, {
      sourceFileName: "stage5m-backup.json",
      importedAt: "2026-07-05T06:30:00.000Z",
      uuidFactory: createUuidFactory(),
    });

    expect(plan.rows.people[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      slug: "stage5m-fixture",
    });
    expect(plan.counts).toEqual({
      people: 1,
      importBatches: 1,
      vocabularyItems: 1,
      reviewStates: 1,
      reviewEvents: 1,
      reviewSettings: 1,
      backupImports: 1,
      backupImportMappings: 6,
    });
  });

  it("builds a person-scoped fixture import plan without database access", () => {
    const plan = buildBackupImportPlan(createStage5LFixtureBackup(), {
      sourceFileName: STAGE5L_FIXTURE_FILE_NAME,
      importedAt: "2026-07-05T06:00:00.000Z",
      uuidFactory: createUuidFactory(),
    });

    expect(plan.counts).toEqual({
      people: 1,
      importBatches: 1,
      vocabularyItems: 1,
      reviewStates: 1,
      reviewEvents: 1,
      reviewSettings: 1,
      backupImports: 1,
      backupImportMappings: 6,
    });
    expect(plan.rows.people[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      slug: "stage5l-fixture",
    });
    expect(plan.rows.vocabularyItems[0]).toMatchObject({
      personId: "00000000-0000-4000-8000-000000000001",
      importBatchId: "00000000-0000-4000-8000-000000000002",
      meaningsZh: ["Stage 5L import fixture"],
      examples: ["This fixture proves backup import mapping without persisting trial rows."],
      learningTrack: "recognition",
      tags: null,
    });
    expect(plan.rows.reviewEvents[0]).toMatchObject({
      personId: "00000000-0000-4000-8000-000000000001",
      vocabularyItemId: "00000000-0000-4000-8000-000000000003",
    });
    expect(plan.perPersonCounts).toEqual([
      {
        sourcePersonId: "person_stage5l_fixture",
        targetPersonId: "00000000-0000-4000-8000-000000000001",
        backupImportId: "00000000-0000-4000-8000-000000000006",
        itemCount: 1,
        reviewEventCount: 1,
      },
    ]);
    expect(plan.rows.reviewSettings[0]).toMatchObject({
      sessionLimit: 12,
      recognitionSessionLimit: 12,
      activeSessionLimit: 8,
    });
  });

  it("builds a schema version 5 import plan with dual-track fields", async () => {
    const text = await readFile(
      new URL("../test_fixtures/stage6b-p1e-schema5-backup.json", import.meta.url),
      "utf8",
    );
    const plan = buildBackupImportPlanFromText(text, {
      sourceFileName: STAGE6B_P1E_SCHEMA5_FIXTURE_FILE_NAME,
      importedAt: "2026-07-09T02:00:00.000Z",
      uuidFactory: createUuidFactory(),
    });

    expect(plan.sourceSchemaVersion).toBe(5);
    expect(plan.counts).toEqual({
      people: 1,
      importBatches: 1,
      vocabularyItems: 2,
      reviewStates: 1,
      reviewEvents: 1,
      reviewSettings: 1,
      backupImports: 1,
      backupImportMappings: 7,
    });
    expect(plan.rows.importBatches[0]).toMatchObject({
      sourceType: "json_paste",
      fileName: null,
    });
    expect(plan.rows.vocabularyItems).toEqual([
      expect.objectContaining({
        surfaceText: "allocate",
        meaningsZh: ["分配", "划拨"],
        examples: [
          "Allocate time wisely.",
          "The manager allocated extra resources to the project.",
        ],
        learningTrack: "recognition",
        tags: ["PTE", "Writing"],
      }),
      expect.objectContaining({
        surfaceText: "coherent",
        meaningsZh: ["连贯的", "条理清楚的"],
        examples: [
          "Write a coherent paragraph.",
          "A coherent response is easier to follow.",
        ],
        learningTrack: "active",
        tags: ["PTE", "Writing"],
      }),
    ]);
    expect(plan.rows.reviewStates[0].vocabularyItemId).toBe(plan.rows.vocabularyItems[0].id);
    expect(plan.rows.reviewEvents[0].vocabularyItemId).toBe(plan.rows.vocabularyItems[0].id);
    expect(plan.rows.reviewSettings[0]).toMatchObject({
      sessionLimit: 18,
      recognitionSessionLimit: 18,
      activeSessionLimit: 6,
    });
  });

  it("rejects metadata count mismatches", () => {
    const backup = createStage5LFixtureBackup();
    backup.metadata.counts.items = 2;

    expect(() => buildBackupImportPlan(backup, { uuidFactory: createUuidFactory() }))
      .toThrow(BackupImportPlanError);
    try {
      buildBackupImportPlan(backup, { uuidFactory: createUuidFactory() });
    } catch (error) {
      expect(error.errors).toContain("metadata.counts.items expected 1 but got 2");
    }
  });

  it("rejects review records that point to another person's item", () => {
    const backup = createStage5LFixtureBackup();
    backup.data.people.push({
      id: "person_other",
      displayName: "Other",
      slug: "other",
      isActive: true,
      createdAt: "2026-07-05T05:30:00.000Z",
      updatedAt: "2026-07-05T05:30:00.000Z",
    });
    backup.data.settingsByPerson.push({
      personId: "person_other",
      sessionLimit: 12,
      timezone: "Australia/Melbourne",
      updatedAt: "2026-07-05T05:30:00.000Z",
    });
    backup.data.reviewEvents[0].personId = "person_other";
    backup.metadata.counts.people = 2;

    expect(() => buildBackupImportPlan(backup, { uuidFactory: createUuidFactory() }))
      .toThrow(BackupImportPlanError);
    try {
      buildBackupImportPlan(backup, { uuidFactory: createUuidFactory() });
    } catch (error) {
      expect(error.errors).toContain(
        "reviewEvents[0].vocabularyItemId does not match an item for the same person",
      );
    }
  });

  it("rejects schema version 5 review records that target Active vocabulary", () => {
    const backup = createStage6BP1ESchema5FixtureBackup();
    const activeItemId = "vocab_stage6b_p1e_schema5_active";
    backup.data.reviewStates[0].vocabularyItemId = activeItemId;
    backup.data.reviewEvents[0].vocabularyItemId = activeItemId;

    expect(() => buildBackupImportPlan(backup, { uuidFactory: createUuidFactory() }))
      .toThrow(BackupImportPlanError);
    try {
      buildBackupImportPlan(backup, { uuidFactory: createUuidFactory() });
    } catch (error) {
      expect(error.errors).toContain(
        "reviewStates[0].vocabularyItemId references an Active item",
      );
      expect(error.errors).toContain(
        "reviewEvents[0].vocabularyItemId references an Active item",
      );
    }
  });
});
