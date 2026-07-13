import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  BackupImportPlanError,
  buildBackupImportPlan,
  buildBackupImportPlanFromText,
  createStage5LFixtureBackup,
  createStage6BP1ESchema5FixtureBackup,
  createV2Stage3Schema6FixtureBackup,
  STAGE5L_FIXTURE_FILE_NAME,
  STAGE6B_P1E_SCHEMA5_FIXTURE_FILE_NAME,
  V2_STAGE3_SCHEMA6_FIXTURE_FILE_NAME,
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
      dailyStudyDefaults: 2,
      dailyStudyPlans: 0,
      vocabularyCreationFacts: 1,
      vocabularyCreationReversals: 0,
      aiRuns: 0,
      aiEnrichmentDrafts: 0,
      vocabularyRelations: 0,
      backupImports: 1,
      backupImportMappings: 9,
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
      dailyStudyDefaults: 2,
      dailyStudyPlans: 0,
      vocabularyCreationFacts: 1,
      vocabularyCreationReversals: 0,
      aiRuns: 0,
      aiEnrichmentDrafts: 0,
      vocabularyRelations: 0,
      backupImports: 1,
      backupImportMappings: 9,
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
        backupImportId: "00000000-0000-4000-8000-000000000007",
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
      dailyStudyDefaults: 2,
      dailyStudyPlans: 0,
      vocabularyCreationFacts: 2,
      vocabularyCreationReversals: 0,
      aiRuns: 0,
      aiEnrichmentDrafts: 0,
      vocabularyRelations: 0,
      backupImports: 1,
      backupImportMappings: 11,
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

  it("remaps every formal Schema Version 6 domain without operational records", async () => {
    const text = await readFile(
      new URL("../test_fixtures/v2-stage3-schema6-backup.json", import.meta.url),
      "utf8",
    );
    expect(JSON.parse(text)).toEqual(createV2Stage3Schema6FixtureBackup());
    const plan = buildBackupImportPlanFromText(text, {
      sourceFileName: V2_STAGE3_SCHEMA6_FIXTURE_FILE_NAME,
      importedAt: "2026-07-13T11:00:00.000Z",
      uuidFactory: createUuidFactory(),
    });

    expect(plan.sourceSchemaVersion).toBe(6);
    expect(plan.counts).toEqual({
      people: 1,
      importBatches: 0,
      vocabularyItems: 2,
      reviewStates: 2,
      reviewEvents: 2,
      reviewSettings: 1,
      dailyStudyDefaults: 2,
      dailyStudyPlans: 2,
      vocabularyCreationFacts: 3,
      vocabularyCreationReversals: 1,
      aiRuns: 1,
      aiEnrichmentDrafts: 1,
      vocabularyRelations: 1,
      backupImports: 1,
      backupImportMappings: 19,
    });
    expect(plan.rows.reviewStates.map((row) => row.reviewProfile)).toEqual([
      "recognition",
      "active",
    ]);
    expect(plan.rows.reviewEvents[1]).toMatchObject({
      reviewProfile: "active",
      activityType: "dictation",
      answerOutcome: "exact",
      parameterSetId: "active-fsrs-v1",
    });
    expect(plan.rows.dailyStudyDefaults).toHaveLength(2);
    expect(plan.rows.dailyStudyPlans).toHaveLength(2);
    expect(plan.rows.vocabularyCreationFacts).toHaveLength(3);
    expect(plan.rows.vocabularyCreationReversals[0].sourceActionId).toBe(
      plan.rows.vocabularyCreationFacts[2].sourceActionId,
    );
    expect(
      plan.rows.vocabularyItems.some(
        (item) => item.id === plan.rows.vocabularyCreationFacts[2].originalVocabularyItemId,
      ),
    ).toBe(false);
    expect(plan.rows.aiEnrichmentDrafts[0]).toMatchObject({
      status: "accepted",
      aiRunId: plan.rows.aiRuns[0].id,
    });
    expect(plan.rows.vocabularyRelations[0]).toMatchObject({
      sourceVocabularyItemId: plan.rows.vocabularyItems[0].id,
      targetVocabularyItemId: plan.rows.vocabularyItems[1].id,
      aiRunId: plan.rows.aiRuns[0].id,
    });
    expect(plan.rows).not.toHaveProperty("aiUsageBuckets");
    expect(plan.rows).not.toHaveProperty("studyCommandIdempotency");
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

  it("keeps prior-profile history after a Schema Version 6 Track transition", () => {
    const backup = createV2Stage3Schema6FixtureBackup();
    backup.data.items[0].learningTrack = "active";
    const plan = buildBackupImportPlan(backup, { uuidFactory: createUuidFactory() });

    expect(plan.rows.vocabularyItems[0].learningTrack).toBe("active");
    expect(plan.rows.reviewStates[0].reviewProfile).toBe("recognition");
    expect(plan.rows.reviewEvents[0].reviewProfile).toBe("recognition");
  });
});
