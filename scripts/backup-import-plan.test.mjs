import { describe, expect, it } from "vitest";
import {
  BackupImportPlanError,
  buildBackupImportPlan,
  createStage5LFixtureBackup,
  STAGE5L_FIXTURE_FILE_NAME,
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
});
