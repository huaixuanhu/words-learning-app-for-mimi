import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repositorySource = readFileSync(join(process.cwd(), "src/lib/storage/postgres/repository.ts"), "utf8");

describe("Postgres repository parity source", () => {
  it("persists schema version 5 vocabulary fields without source down-mapping", () => {
    expect(repositorySource).toContain("meanings_zh");
    expect(repositorySource).toContain("examples");
    expect(repositorySource).toContain("learning_track");
    expect(repositorySource).toContain("tags");
    expect(repositorySource).toContain("batchInput.sourceType");
    expect(repositorySource).toContain("source: batch.sourceType");
    expect(repositorySource).not.toContain("persistedSourceType");
    expect(repositorySource).not.toContain("batchInput.sourceType === \"txt_file\" ? \"txt_file\" : \"pasted_text\"");
  });

  it("keeps Recognition and Active review settings as separate database fields", () => {
    expect(repositorySource).toContain("recognition_session_limit");
    expect(repositorySource).toContain("active_session_limit");
    expect(repositorySource).toContain("settings.recognitionSessionLimit");
    expect(repositorySource).toContain("settings.activeSessionLimit");
  });

  it("implements destructive and repair operations behind repository methods", () => {
    expect(repositorySource).toContain("deleteItem: (context, vocabularyItemId)");
    expect(repositorySource).toContain("rollbackImportBatch: (context, importBatchId)");
    expect(repositorySource).toContain("resetToday: (context) => resetTodayReview(context)");
    expect(repositorySource).toContain("rollbackEvent: (context, reviewEventId) => rollbackReviewEvent(context, reviewEventId)");
    expect(repositorySource).toContain("delete from vocabulary_items");
    expect(repositorySource).toContain("delete from import_batches");
    expect(repositorySource).toContain("delete from review_events");
    expect(repositorySource).toContain("delete from review_states");
  });

  it("rebuilds review state from remaining events with local natural-day semantics", () => {
    expect(repositorySource).toContain("getLocalDateKey");
    expect(repositorySource).toContain("rebuildReviewProfileStateFromEvents");
    expect(repositorySource).toContain("scheduleNextReviewForProfile");
    expect(repositorySource).toContain("getLocalDateKey(context.now, settings.timezone)");
  });

  it("uses the shared Daily Episode policy for V2 rating and rebuild paths", () => {
    expect(repositorySource).toContain("scheduleDailyEpisodeAttempt");
    expect(repositorySource).toContain("getDailyEpisodeEvents");
    expect(repositorySource).toContain("rebuildReviewProfileStateFromEvents");
    expect(repositorySource).toContain("{ dailyStudyPlans, makeStateId: randomUUID }");

    const ratingSource = repositorySource.slice(
      repositorySource.indexOf("export async function recordPostgresDailyStudyRating"),
      repositorySource.indexOf("export async function rollbackPostgresDailyStudyRating"),
    );

    expect(ratingSource).toContain("plan,");
  });

  it("returns the complete formal Schema Version 6 snapshot", () => {
    expect(repositorySource).toContain("schemaVersion: 6");
    for (const domain of [
      "dailyStudyDefaults",
      "dailyStudyPlans",
      "vocabularyCreationFacts",
      "vocabularyCreationReversals",
      "aiRuns",
      "aiEnrichmentDrafts",
      "vocabularyRelations",
    ]) {
      expect(repositorySource).toContain(domain);
    }
  });

  it("writes creation facts atomically and protects history-bearing Track changes", () => {
    expect(repositorySource).toContain("insertVocabularyCreationFact");
    expect(repositorySource).toContain("vocabularyItemHasReviewHistory");
    expect(repositorySource).toContain("Start it fresh in the other Track instead");
    expect(repositorySource).toContain("startFreshInTrack");
    expect(repositorySource).toContain("vocabularyItemHasReviewHistoryForProfile");
    expect(repositorySource).toContain("insert into vocabulary_creation_reversals");
  });

  it("refreshes the active study prompt and serializes duplicate-rating checks", () => {
    expect(repositorySource).toContain("refreshPostgresDailyStudyPrompt");
    expect(repositorySource).toContain("{ promptId: trustedPrompt.promptId }");
    const ratingSource = repositorySource.slice(
      repositorySource.indexOf("export async function recordPostgresDailyStudyRating"),
      repositorySource.indexOf("export async function rollbackPostgresDailyStudyRating"),
    );

    expect(ratingSource.indexOf("for update")).toBeGreaterThan(-1);
    expect(ratingSource.indexOf("result_json ->> 'promptId'")).toBeGreaterThan(
      ratingSource.indexOf("for update"),
    );
  });
});
