import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPostgresPool } from "./client";
import {
  createPostgresPerson,
  createPostgresRepository,
  getPostgresVocabularyDataSnapshot,
} from "./repository";
import type { ImportCandidate } from "@/lib/vocabulary/types";

const runIntegration = process.env.MIMI_POSTGRES_INTEGRATION === "1";
const integrationDescribe = runIntegration ? describe : describe.skip;
const slug = "stage6b-p1f-repository";
const timezone = "Australia/Melbourne";
const now = "2026-07-09T13:40:00.000Z";
const recognitionItemId = "00000000-0000-4000-8000-000000006f01";
const activeItemId = "00000000-0000-4000-8000-000000006f02";
const importBatchId = "00000000-0000-4000-8000-000000006f10";

async function cleanupBySlug() {
  const pool = getPostgresPool();
  const peopleResult = await pool.query<{ id: string }>(
    "select id from people where slug = $1",
    [slug],
  );
  const personIds = peopleResult.rows.map((row) => row.id);

  if (personIds.length === 0) {
    return;
  }

  await pool.query("begin");
  try {
    await pool.query("delete from backup_import_mappings where person_id = any($1::uuid[])", [personIds]);
    await pool.query("delete from backup_imports where person_id = any($1::uuid[])", [personIds]);
    await pool.query("delete from review_events where person_id = any($1::uuid[])", [personIds]);
    await pool.query("delete from review_states where person_id = any($1::uuid[])", [personIds]);
    await pool.query("delete from vocabulary_items where person_id = any($1::uuid[])", [personIds]);
    await pool.query("delete from import_batches where person_id = any($1::uuid[])", [personIds]);
    await pool.query("delete from review_settings where person_id = any($1::uuid[])", [personIds]);
    await pool.query("delete from people where id = any($1::uuid[]) and slug = $2", [personIds, slug]);
    await pool.query("commit");
  } catch (error) {
    await pool.query("rollback").catch(() => undefined);
    throw error;
  }
}

function importCandidates(): ImportCandidate[] {
  return [
    {
      tempId: "candidate-recognition",
      lineNumber: 1,
      rawLine: "json recognition",
      surfaceText: "repository import recognition",
      normalizedText: "repository import recognition",
      meaningZh: "仓储导入阅读词",
      meaningsZh: ["仓储导入阅读词", "数据库阅读词"],
      example: "Review the imported recognition item.",
      examples: ["Review the imported recognition item."],
      exampleTranslationsZh: ["复习导入的阅读词条。"],
      notes: "Stage 6B P1-F repository integration",
      rarityScore: 3,
      learningTrack: "recognition",
      tags: ["PTE"],
      status: "new",
      errors: [],
    },
    {
      tempId: "candidate-active",
      lineNumber: 2,
      rawLine: "json active",
      surfaceText: "repository import active",
      normalizedText: "repository import active",
      meaningZh: "仓储导入输出词",
      meaningsZh: ["仓储导入输出词"],
      example: "Use the imported active item in writing.",
      examples: ["Use the imported active item in writing."],
      exampleTranslationsZh: ["在写作中使用导入的输出词条。"],
      notes: "Stage 6B P1-F repository integration",
      rarityScore: null,
      learningTrack: "active",
      tags: ["Writing"],
      status: "new",
      errors: [],
    },
  ];
}

integrationDescribe("Postgres repository integration", () => {
  beforeAll(async () => {
    await cleanupBySlug();
  });

  afterAll(async () => {
    await cleanupBySlug();
    await getPostgresPool().end();
  });

  it("round-trips schema version 5 repository behavior against a migrated database", async () => {
    const repository = createPostgresRepository();
    const person = await createPostgresPerson({ displayName: "Stage 6B P1-F Repository", slug }, now);
    const context = { personId: person.id, now, timezone };

    const settings = await repository.reviewSettings.updateSettings(context, {
      sessionLimit: 18,
      recognitionSessionLimit: 18,
      activeSessionLimit: 6,
      timezone,
    });

    expect(settings).toMatchObject({
      sessionLimit: 18,
      recognitionSessionLimit: 18,
      activeSessionLimit: 6,
      timezone,
    });

    const recognitionItem = await repository.vocabulary.addItem(context, {
      id: recognitionItemId,
      surfaceText: "repository recognition",
      meaningZh: "仓储阅读词",
      meaningsZh: ["仓储阅读词", "数据库阅读词"],
      example: "Review this repository recognition item.",
      examples: [
        "Review this repository recognition item.",
        "Repository smoke tests durable fields.",
      ],
      notes: "Stage 6B P1-F repository integration",
      rarityScore: 3,
      learningTrack: "recognition",
      tags: ["PTE", "Writing"],
      source: "manual",
      timezone,
    });
    const activeItem = await repository.vocabulary.addItem(context, {
      id: activeItemId,
      surfaceText: "repository active",
      meaningZh: "仓储输出词",
      meaningsZh: ["仓储输出词"],
      example: "Use this active item in a sentence.",
      examples: ["Use this active item in a sentence."],
      notes: "Stage 6B P1-F repository integration",
      rarityScore: null,
      learningTrack: "active",
      tags: ["Writing"],
      source: "manual",
      timezone,
    });

    expect(recognitionItem.meaningsZh).toEqual(["仓储阅读词", "数据库阅读词"]);
    expect(activeItem.learningTrack).toBe("active");

    await expect(
      repository.review.recordReview({
        personId: person.id,
        vocabularyItemId: activeItem.id,
        rating: "remembered",
        elapsedMs: 0,
        reviewedAt: now,
      }),
    ).rejects.toThrow("Reviewable vocabulary item not found");

    const reviewResult = await repository.review.recordReview({
      personId: person.id,
      vocabularyItemId: recognitionItem.id,
      rating: "remembered",
      elapsedMs: 1250,
      reviewedAt: now,
    });

    expect(reviewResult.event.vocabularyItemId).toBe(recognitionItem.id);
    expect(reviewResult.state.difficulty).toEqual(expect.any(Number));
    expect(await repository.review.getReviewState({ personId: person.id }, recognitionItem.id))
      .toMatchObject({ vocabularyItemId: recognitionItem.id, reviewCount: 1 });

    const rollbackResult = await repository.review.rollbackEvent(
      { ...context, now: "2026-07-09T13:45:00.000Z" },
      reviewResult.event.id,
    );

    expect(rollbackResult.state).toBeNull();
    expect(await repository.review.listReviewEvents({ personId: person.id })).toEqual([]);

    const resetReview = await repository.review.recordReview({
      personId: person.id,
      vocabularyItemId: recognitionItem.id,
      rating: "forgot",
      elapsedMs: 900,
      reviewedAt: now,
    });

    expect(resetReview.state.reviewCount).toBe(1);
    const resetResult = await repository.review.resetToday(
      { ...context, now: "2026-07-09T13:50:00.000Z" },
    );

    expect(resetResult.resetEventsCount).toBe(1);
    expect(await repository.review.getReviewState({ personId: person.id }, recognitionItem.id)).toBeNull();

    const importResult = await repository.vocabulary.commitImportCandidates(
      { ...context, now: "2026-07-09T14:00:00.000Z" },
      {
        id: importBatchId,
        sourceType: "json_paste",
        fileName: null,
      },
      importCandidates(),
      ["candidate-recognition", "candidate-active"],
    );

    expect(importResult.batch.sourceType).toBe("json_paste");
    expect(importResult.items).toHaveLength(2);
    expect(importResult.items.map((item) => item.learningTrack).sort()).toEqual([
      "active",
      "recognition",
    ]);

    const importedRecognition = importResult.items.find((item) => item.learningTrack === "recognition");

    expect(importedRecognition).toBeDefined();
    await repository.review.recordReview({
      personId: person.id,
      vocabularyItemId: importedRecognition!.id,
      rating: "remembered",
      elapsedMs: 800,
      reviewedAt: "2026-07-09T14:05:00.000Z",
    });

    const batchRollback = await repository.vocabulary.rollbackImportBatch(
      { ...context, now: "2026-07-09T14:10:00.000Z" },
      importResult.batch.id,
    );

    expect(batchRollback.deletedItemsCount).toBe(2);
    expect(batchRollback.deletedReviewEventsCount).toBe(1);

    const deleteActive = await repository.vocabulary.deleteItem(
      { ...context, now: "2026-07-09T14:15:00.000Z" },
      activeItem.id,
    );

    expect(deleteActive.item.id).toBe(activeItem.id);

    const snapshot = await getPostgresVocabularyDataSnapshot(person.id, "2026-07-09T14:20:00.000Z");

    expect(snapshot.schemaVersion).toBe(5);
    expect(snapshot.people).toHaveLength(1);
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({
      id: recognitionItem.id,
      learningTrack: "recognition",
      meaningsZh: ["仓储阅读词", "数据库阅读词"],
      tags: ["PTE", "Writing"],
    });
    expect(snapshot.importBatches).toHaveLength(0);
    expect(snapshot.reviewEvents).toHaveLength(0);
    expect(snapshot.reviewStates).toHaveLength(0);
  });
});
