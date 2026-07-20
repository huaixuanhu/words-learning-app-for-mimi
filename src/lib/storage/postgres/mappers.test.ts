import { describe, expect, it } from "vitest";
import {
  mapAiEnrichmentDraftRow,
  mapAiRunRow,
  mapDailyStudyDefaultRow,
  mapDailyStudyPlanRow,
  mapImportBatchRow,
  mapPersonRow,
  mapReviewEventRow,
  mapReviewSettingsRow,
  mapReviewStateRow,
  mapVocabularyItemRow,
  mapVocabularyCreationFactRow,
  mapVocabularyCreationReversalRow,
  mapVocabularyRelationRow,
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
        recognition_session_limit: 18,
        active_session_limit: 6,
        timezone: "Australia/Melbourne",
        updated_at: "2026-07-05T00:02:00.000Z",
      }),
    ).toMatchObject({
      personId,
      sessionLimit: 18,
      recognitionSessionLimit: 18,
      activeSessionLimit: 6,
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
        meanings_zh: ["分配", "划拨"],
        example: "Allocate time wisely.",
        examples: ["Allocate time wisely.", "They allocate resources."],
        example_translations_zh: ["合理分配时间。", "他们分配资源。"],
        notes: "",
        rarity_score: 3,
        learning_track: "active",
        tags: ["PTE", "Writing"],
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
      meaningsZh: ["分配", "划拨"],
      example: "Allocate time wisely.",
      examples: ["Allocate time wisely.", "They allocate resources."],
      exampleTranslationsZh: ["合理分配时间。", "他们分配资源。"],
      learningTrack: "active",
      tags: ["PTE", "Writing"],
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
        review_profile: "recognition",
        parameter_set_id: "recognition-fsrs-v1",
        first_rated_at: "2026-07-05T00:03:00.000Z",
        history_origin: "recorded",
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
        prompt_id: null,
        person_id: personId,
        vocabulary_item_id: vocabularyItemId,
        review_profile: "recognition",
        activity_type: "recognition_card",
        answer_outcome: "self_rated",
        answer_normalization_version: null,
        target_revision: null,
        parameter_set_id: "recognition-fsrs-v1",
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

  it("maps Schema Version 6 plans, creation evidence, and accepted AI lineage", () => {
    const runId = "66666666-6666-4666-8666-666666666666";
    const targetItemId = "77777777-7777-4777-8777-777777777777";
    const draft = {
      additionalMeaningsZh: ["分派"],
      examples: ["Allocate the work fairly."],
      similarWords: [],
      confusableWords: [],
    };

    expect(
      mapDailyStudyDefaultRow({
        person_id: personId,
        review_profile: "recognition",
        review_goal: 20,
        new_word_goal: 8,
        timezone: "Australia/Melbourne",
        updated_at: "2026-07-13T00:00:00.000Z",
      }),
    ).toMatchObject({ reviewProfile: "recognition", reviewGoal: 20, newWordGoal: 8 });
    expect(
      mapDailyStudyPlanRow({
        id: "88888888-8888-4888-8888-888888888888",
        person_id: personId,
        review_profile: "active",
        local_date: "2026-07-13",
        timezone: "Australia/Melbourne",
        day_starts_at: "2026-07-12T14:00:00.000Z",
        day_ends_at: "2026-07-13T14:00:00.000Z",
        suggested_review: 4,
        review_goal: 10,
        new_word_goal: 3,
        plan_version: 2,
        recommendation_version: "suggested-review-v1",
        calculated_at: "2026-07-13T00:00:00.000Z",
        updated_at: "2026-07-13T01:00:00.000Z",
      }),
    ).toMatchObject({ reviewProfile: "active", localDate: "2026-07-13", planVersion: 2 });
    expect(
      mapVocabularyCreationFactRow({
        id: "99999999-9999-4999-8999-999999999999",
        person_id: personId,
        original_vocabulary_item_id: vocabularyItemId,
        source_action_id: vocabularyItemId,
        track_at_creation: "recognition",
        source_kind: "single",
        history_origin: "recorded",
        system_created_at: "2026-07-13T00:00:00.000Z",
      }),
    ).toMatchObject({ creationFactId: "99999999-9999-4999-8999-999999999999" });
    expect(
      mapVocabularyCreationReversalRow({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        person_id: personId,
        source_action_id: vocabularyItemId,
        reason: "batch_rollback",
        reversed_at: "2026-07-13T01:00:00.000Z",
      }),
    ).toMatchObject({ reason: "batch_rollback" });
    expect(
      mapAiRunRow({
        id: runId,
        person_id: personId,
        source_vocabulary_item_id: vocabularyItemId,
        feature: "enrichment_v1",
        provider: "google-gemini-api",
        model: "gemini-3.1-flash-lite",
        model_label: "Gemini 3.1 Flash-Lite",
        prompt_version: "v2-stage2b-prompt-v2",
        source_hash: "source-hash",
        output_schema_version: "ai-enrichment-v2",
        disclosure_version: "ai-disclosure-v1",
        idempotency_key_hash: "idempotency-hash",
        cache_key_hash: "cache-hash",
        status: "succeeded",
        structure_validation_status: "valid",
        provider_response_id: null,
        input_tokens: 100,
        output_tokens: 200,
        thinking_tokens: 10,
        total_tokens: 310,
        latency_ms: 900,
        estimated_cost_usd: "0.000090",
        created_at: "2026-07-13T00:00:00.000Z",
        completed_at: "2026-07-13T00:00:01.000Z",
      }),
    ).toMatchObject({ id: runId, estimatedCostUsd: 0.00009, totalTokens: 310 });
    expect(
      mapAiEnrichmentDraftRow({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        person_id: personId,
        source_vocabulary_item_id: vocabularyItemId,
        ai_run_id: runId,
        status: "accepted",
        draft_json: draft,
        accepted_content_json: draft,
        created_at: "2026-07-13T00:00:00.000Z",
        updated_at: "2026-07-13T00:01:00.000Z",
        decided_at: "2026-07-13T00:01:00.000Z",
      }),
    ).toMatchObject({ status: "accepted", aiRunId: runId, acceptedContent: draft });
    expect(
      mapVocabularyRelationRow({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        person_id: personId,
        source_vocabulary_item_id: vocabularyItemId,
        target_vocabulary_item_id: targetItemId,
        relation_type: "spelling",
        difference_zh: "拼写相近，用法不同。",
        example_pair: ["Adapt to change.", "Adopt a policy."],
        ai_run_id: runId,
        created_at: "2026-07-13T00:02:00.000Z",
      }),
    ).toMatchObject({ targetVocabularyItemId: targetItemId, relationType: "spelling" });
  });
});
