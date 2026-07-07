import { describe, expect, it } from "vitest";
import {
  mapImportBatchRow,
  mapPersonRow,
  mapReviewEventRow,
  mapReviewSettingsRow,
  mapReviewStateRow,
  mapVocabularyItemRow,
} from "./mappers";

const personId = "11111111-1111-4111-8111-111111111111";
const vocabularyItemId = "22222222-2222-4222-8222-222222222222";

describe("Postgres row mappers", () => {
  it("maps people and review settings into domain types", () => {
    expect(
      mapPersonRow({
        id: personId,
        display_name: "Mimi",
        slug: "mimi",
        is_active: true,
        created_at: new Date("2026-07-05T00:00:00.000Z"),
        updated_at: "2026-07-05T00:01:00.000Z",
      }),
    ).toEqual({
      id: personId,
      displayName: "Mimi",
      slug: "mimi",
      isActive: true,
      createdAt: "2026-07-05T00:00:00.000Z",
      updatedAt: "2026-07-05T00:01:00.000Z",
    });
    expect(
      mapReviewSettingsRow({
        person_id: personId,
        session_limit: 24,
        timezone: "Australia/Melbourne",
        updated_at: "2026-07-05T00:02:00.000Z",
      }),
    ).toMatchObject({
      personId,
      sessionLimit: 24,
      timezone: "Australia/Melbourne",
    });
  });

  it("maps vocabulary items and import batches", () => {
    expect(
      mapVocabularyItemRow({
        id: vocabularyItemId,
        person_id: personId,
        surface_text: "Allocate",
        normalized_text: "allocate",
        meaning_zh: "分配",
        example: "Allocate time wisely.",
        notes: "",
        rarity_score: 3,
        source: "manual",
        import_batch_id: null,
        status: "new",
        created_at: "2026-07-05T00:00:00.000Z",
        system_created_at: "2026-07-05T00:01:00.000Z",
        updated_at: "2026-07-05T00:02:00.000Z",
        timezone: "Australia/Melbourne",
        archived_at: null,
      }),
    ).toMatchObject({
      id: vocabularyItemId,
      personId,
      surfaceText: "Allocate",
      normalizedText: "allocate",
      meaningZh: "分配",
      meaningsZh: ["分配"],
      example: "Allocate time wisely.",
      examples: ["Allocate time wisely."],
      archivedAt: null,
    });
    expect(
      mapImportBatchRow({
        id: "33333333-3333-4333-8333-333333333333",
        person_id: personId,
        source_type: "pasted_text",
        file_name: null,
        created_at: "2026-07-05T00:03:00.000Z",
        total_rows: 3,
        accepted_rows: 2,
        duplicate_rows: 1,
        invalid_rows: 0,
      }),
    ).toMatchObject({
      personId,
      sourceType: "pasted_text",
      totalRows: 3,
    });
  });

  it("maps review state and event timestamps", () => {
    expect(
      mapReviewStateRow({
        id: "44444444-4444-4444-8444-444444444444",
        person_id: personId,
        vocabulary_item_id: vocabularyItemId,
        status: "review",
        due_at: "2026-07-06T00:00:00.000Z",
        last_reviewed_at: null,
        review_count: 1,
        lapse_count: 0,
        interval_minutes: 1440,
        difficulty: null,
        stability: null,
        updated_at: "2026-07-05T00:04:00.000Z",
      }),
    ).toMatchObject({
      personId,
      vocabularyItemId,
      dueAt: "2026-07-06T00:00:00.000Z",
      lastReviewedAt: null,
    });
    expect(
      mapReviewEventRow({
        id: "55555555-5555-4555-8555-555555555555",
        person_id: personId,
        vocabulary_item_id: vocabularyItemId,
        reviewed_at: "2026-07-05T00:05:00.000Z",
        rating: "remembered",
        previous_due_at: null,
        next_due_at: "2026-07-12T00:05:00.000Z",
        previous_interval_minutes: null,
        next_interval_minutes: 10080,
        elapsed_ms: 0,
      }),
    ).toMatchObject({
      rating: "remembered",
      previousDueAt: null,
      nextIntervalMinutes: 10080,
    });
  });
});
