import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueServerPromptToken, verifyServerPromptToken } from "@/lib/daily-study/opaque-token";
import { getDailyEpisodeEvents, scheduleDailyEpisodeAttempt } from "@/lib/review/daily-episode";
import { createActiveTargetRevision } from "@/lib/daily-study/runtime-engine";
import {
  mapDailyStudyPlanRow, mapReviewEventRow, mapReviewStateRow, mapVocabularyItemRow,
  type DailyStudyPlanRow, type ReviewEventRow, type ReviewStateRow, type VocabularyItemRow,
} from "./mappers";

const mocked = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("./client", () => ({
  getPostgresPool: () => ({ query: mocked.query }),
  withPostgresTransaction: (callback: (client: { query: typeof mocked.query }) => Promise<unknown>) =>
    callback({ query: mocked.query }),
}));
import { recordPostgresDailyStudyRating, refreshPostgresDailyStudyPrompt } from "./repository";

const PERSON = "00000000-0000-4000-8000-000000000001";
const ITEM = "00000000-0000-4000-8000-000000000002";
const PLAN = "00000000-0000-4000-8000-000000000003";
const PROMPT = "00000000-0000-4000-8000-000000000004";
const OTHER = "00000000-0000-4000-8000-000000000099";
const NOW = "2026-07-14T15:00:00.000Z";
const SECRET = "synthetic-hot-path-secret-over-32-bytes";

function createFakeDatabase(unrelatedRows = 0) {
  const plan: DailyStudyPlanRow = {
    id: PLAN, person_id: PERSON, review_profile: "recognition", local_date: "2026-07-14",
    timezone: "Australia/Melbourne", day_starts_at: "2026-07-13T20:00:00.000Z",
    day_ends_at: "2026-07-14T20:00:00.000Z", suggested_review: 2, review_goal: 2,
    new_word_goal: 2, plan_version: 1, recommendation_version: "daily-suggested-review-v1",
    calculated_at: "2026-07-14T04:00:00.000Z", updated_at: "2026-07-14T04:00:00.000Z",
  };
  const item: VocabularyItemRow = {
    id: ITEM, person_id: PERSON, surface_text: "synthetic", normalized_text: "synthetic",
    meaning_zh: "合成", meanings_zh: ["合成"], example: "A synthetic example.",
    examples: ["A synthetic example."], example_translations_zh: ["合成例句。"],
    notes: "", rarity_score: null, learning_track: "recognition", tags: null,
    source: "manual", import_batch_id: null, status: "new",
    created_at: "2026-07-01T04:00:00.000Z", system_created_at: "2026-07-01T04:00:00.000Z",
    updated_at: "2026-07-01T04:00:00.000Z", timezone: "Australia/Melbourne", archived_at: null,
  };
  const events: ReviewEventRow[] = Array.from({ length: unrelatedRows }, (_, index) => ({
    id: `unrelated-${index}`, prompt_id: null, person_id: PERSON, vocabulary_item_id: OTHER,
    review_profile: "recognition", activity_type: "recognition_card", answer_outcome: "self_rated",
    answer_normalization_version: null, target_revision: null, parameter_set_id: "recognition-fsrs-v2",
    reviewed_at: "2026-07-14T14:00:00.000Z", rating: "remembered", previous_due_at: null,
    next_due_at: "2026-07-16T14:00:00.000Z", previous_interval_minutes: null,
    next_interval_minutes: 2880, elapsed_ms: 1000,
  }));
  const plans: DailyStudyPlanRow[] = [plan, ...Array.from({ length: unrelatedRows }, (_, index) => ({
    ...plan, id: `past-${index}`, local_date: "2026-07-01",
    day_starts_at: "2026-06-30T20:00:00.000Z", day_ends_at: "2026-07-01T20:00:00.000Z",
  }))];
  const receipts = new Map<string, Record<string, unknown>>();
  const db = {
    plan, item, events, plans, receipts, state: null as ReviewStateRow | null,
    activePerson: true, planLockMatches: true, mutateTargetOnLock: false,
    returnedBytes: 0, statements: [] as string[],
  };
  mocked.query.mockImplementation(async (statement: string, values: unknown[] = []) => {
    const sql = statement.replace(/\s+/gu, " ").trim();
    db.statements.push(sql);
    let rows: unknown[];
    if (sql.includes("from daily_study_plans daily_plan")) {
      expect(sql).toContain("person.is_active = true");
      expect(values.slice(0, 4)).toEqual([PERSON, PLAN, "2026-07-14", plan.review_profile]);
      expect(sql).toContain("and not exists ( select 1 from daily_study_plans peer");
      expect(sql).toContain("is distinct from (daily_plan.local_date, daily_plan.timezone");
      const now = Date.parse(String(values[4]));
      const conflict = plans.some((peer) => peer.person_id === plan.person_id &&
        (peer.local_date === plan.local_date ||
          (Date.parse(String(peer.day_starts_at)) <= now && Date.parse(String(peer.day_ends_at)) > now)) &&
        [peer.local_date, peer.timezone, peer.day_starts_at, peer.day_ends_at].join() !==
          [plan.local_date, plan.timezone, plan.day_starts_at, plan.day_ends_at].join());
      rows = db.activePerson && !conflict ? [plan] : [];
    } else if (sql.startsWith("select id from daily_study_plans")) {
      expect(sql).toContain("for update");
      rows = db.planLockMatches && values[2] === plan.plan_version ? [{ id: PLAN }] : [];
    } else if (sql.includes("from daily_study_plans")) {
      expect(sql).toContain("day_starts_at < $3::timestamptz and day_ends_at > $4::timestamptz");
      expect(values).toHaveLength(4);
      rows = plans.filter((entry) => entry.person_id === values[0] && entry.review_profile === values[1] &&
        Date.parse(String(entry.day_starts_at)) < Date.parse(String(values[2])) &&
        Date.parse(String(entry.day_ends_at)) > Date.parse(String(values[3])));
    } else if (sql.includes("from vocabulary_items")) {
      expect(sql).toContain("where person_id = $1 and id = $2");
      expect(values).toEqual([PERSON, ITEM]);
      rows = [sql.endsWith("for update") && db.mutateTargetOnLock
        ? { ...item, normalized_text: "changed-target", updated_at: NOW } : item];
    } else if (sql.startsWith("select") && sql.includes("from review_states")) {
      expect(values).toEqual([PERSON, ITEM, plan.review_profile]);
      rows = db.state ? [db.state] : [];
    } else if (sql.startsWith("select") && sql.includes("from review_events")) {
      expect(sql).toContain("reviewed_at >= $4::timestamptz and reviewed_at < $5::timestamptz");
      expect(values).toHaveLength(5);
      rows = events.filter((event) => event.person_id === values[0] && event.vocabulary_item_id === values[1] &&
        event.review_profile === values[2] && Date.parse(String(event.reviewed_at)) >= Date.parse(String(values[3])) &&
        Date.parse(String(event.reviewed_at)) < Date.parse(String(values[4])));
    } else if (sql.startsWith("insert into study_command_idempotency")) {
      const key = String(values[3]);
      rows = receipts.has(key) ? [] : [{ id: "receipt" }];
      if (rows.length) receipts.set(key, {
        canonical_request_hash: values[4], status: "in_progress", result_json: null, expires_at: values[6],
      });
    } else if (sql.startsWith("select * from study_command_idempotency")) {
      rows = [receipts.get(String(values[2]))];
    } else if (sql.startsWith("select idempotency_key from study_command_idempotency")) {
      rows = [...receipts.entries()].filter(([key, receipt]) => receipt.status === "succeeded" &&
        (receipt.result_json as { promptId: string }).promptId === values[1] && key !== values[2])
        .map(([key]) => ({ idempotency_key: key }));
    } else if (sql.startsWith("insert into review_events")) {
      const fields = ["id", "prompt_id", "person_id", "vocabulary_item_id", "review_profile", "activity_type",
        "answer_outcome", "answer_normalization_version", "target_revision", "parameter_set_id", "reviewed_at",
        "rating", "previous_due_at", "next_due_at", "previous_interval_minutes", "next_interval_minutes", "elapsed_ms"];
      const event = Object.fromEntries(fields.map((key, index) => [key, values[index]])) as ReviewEventRow;
      events.push(event); rows = [event];
    } else if (sql.startsWith("insert into review_states")) {
      const fields = ["id", "person_id", "vocabulary_item_id", "review_profile", "parameter_set_id", "first_rated_at",
        "history_origin", "status", "due_at", "last_reviewed_at", "review_count", "lapse_count", "interval_minutes",
        "difficulty", "stability", "updated_at"];
      db.state = Object.fromEntries(fields.map((key, index) => [key, values[index]])) as ReviewStateRow;
      rows = [db.state];
    } else if (sql.startsWith("update study_command_idempotency")) {
      Object.assign(receipts.get(String(values[2]))!, { status: "succeeded", result_json: JSON.parse(String(values[3])) });
      rows = [];
    } else throw new Error(`Unexpected SQL on card hot path: ${sql}`);
    db.returnedBytes += Buffer.byteLength(JSON.stringify(rows));
    return { rows, rowCount: rows.length };
  });
  return db;
}

function command(db: ReturnType<typeof createFakeDatabase>, rating: "forgot" | "remembered" = "remembered", now = NOW, promptId = PROMPT) {
  const active = db.plan.review_profile === "active";
  const targetRevision = active ? createActiveTargetRevision(mapVocabularyItemRow(db.item)) : null;
  const token = issueServerPromptToken({
    personId: PERSON, planId: PLAN, planVersion: db.plan.plan_version, localDate: "2026-07-14",
    vocabularyItemId: ITEM,
    ...(active ? { reviewProfile: "active" as const, activityType: "say" as const, targetRevision: targetRevision! }
      : { reviewProfile: "recognition" as const, activityType: "recognition_card" as const }),
  }, now, SECRET, { promptId });
  return {
    personId: PERSON, planId: PLAN, localDate: "2026-07-14", vocabularyItemId: ITEM,
    promptToken: token.promptToken, idempotencyKey: `command-${promptId}`,
    evidence: {
      reviewProfile: db.plan.review_profile, activityType: active ? "say" : "recognition_card",
      answerOutcome: "self_rated", answerNormalizationVersion: null, memoryRating: rating, elapsedMs: 1000,
    },
  };
}

beforeEach(() => { mocked.query.mockReset(); });

describe("bounded Postgres study card reads", () => {
  it("refreshes only the bound plan and target even with large unrelated history", async () => {
    const db = createFakeDatabase(10_000);
    const input = command(db);
    const result = await refreshPostgresDailyStudyPrompt({ personId: PERSON, promptToken: input.promptToken }, NOW, SECRET);
    expect(verifyServerPromptToken(result.promptToken, NOW, SECRET).promptId).toBe(PROMPT);
    expect(db.statements).toHaveLength(4);
    expect(db.returnedBytes).toBeLessThan(2_000);
    expect(db.statements.some((sql) => sql.includes("from review_events"))).toBe(false);
  });

  it("keeps rating query count and returned bytes independent of unrelated library/history size", async () => {
    const measurements = [];
    for (const count of [0, 10_000]) {
      const db = createFakeDatabase(count);
      const input = command(db);
      const result = await recordPostgresDailyStudyRating(input, NOW, SECRET);
      const expected = scheduleDailyEpisodeAttempt({
        previousState: undefined, priorEpisodeEvents: [], rating: "remembered", reviewedAt: NOW,
        plan: mapDailyStudyPlanRow(db.plan),
      });
      expect(result.state).toMatchObject({ dueAt: expected.schedule.dueAt, stability: expected.schedule.stability });
      measurements.push({ queries: db.statements.length, bytes: db.returnedBytes });
    }
    expect(measurements[0].queries).toBe(12);
    expect(measurements[1]).toEqual(measurements[0]);
    expect(measurements[0].bytes).toBeLessThan(5_000);
  });

  it.each(["recognition", "active"] as const)("preserves %s episode scheduling and idempotent replay", async (profile) => {
    const db = createFakeDatabase(10_000);
    db.plan.review_profile = profile; db.item.learning_track = profile;
    const first = command(db, "forgot");
    await recordPostgresDailyStudyRating(first, NOW, SECRET);
    const state = mapReviewStateRow(db.state!);
    const episode = db.events.filter((event) => event.vocabulary_item_id === ITEM).map(mapReviewEventRow);
    const nextNow = "2026-07-14T15:01:00.000Z";
    const second = command(db, "remembered", nextNow, OTHER);
    const expected = scheduleDailyEpisodeAttempt({
      previousState: state, priorEpisodeEvents: episode, rating: "remembered", reviewedAt: nextNow,
      plan: mapDailyStudyPlanRow(db.plan),
    });
    const result = await recordPostgresDailyStudyRating(second, nextNow, SECRET);
    expect(result.state).toMatchObject({ dueAt: expected.schedule.dueAt, stability: state.stability, reviewCount: state.reviewCount });
    const eventCount = db.events.length;
    const replay = await recordPostgresDailyStudyRating(second, nextNow, SECRET);
    expect(replay).toEqual(result);
    expect(db.events).toHaveLength(eventCount);
    await expect(refreshPostgresDailyStudyPrompt({ personId: PERSON, promptToken: second.promptToken }, nextNow, SECRET))
      .rejects.toThrow("already saved");
  });

  it("retains overlapping historical plan evidence when assigning the target's episode", async () => {
    const db = createFakeDatabase(10_000);
    const firstAt = "2026-07-14T14:30:00.000Z";
    await recordPostgresDailyStudyRating(command(db, "forgot", firstAt), firstAt, SECRET);
    const previousState = mapReviewStateRow(db.state!);
    db.plans.push({
      ...db.plan, id: OTHER, local_date: "2026-07-13",
      day_starts_at: "2026-07-14T14:00:00.000Z", day_ends_at: "2026-07-14T14:45:00.000Z",
      calculated_at: "2026-07-14T14:00:00.000Z",
    });
    const plan = mapDailyStudyPlanRow(db.plan);
    const priorEpisodeEvents = getDailyEpisodeEvents(db.events.map(mapReviewEventRow), plan, ITEM,
      db.plans.map(mapDailyStudyPlanRow));
    expect(priorEpisodeEvents).toEqual([]);
    const expected = scheduleDailyEpisodeAttempt({
      previousState, priorEpisodeEvents, rating: "remembered", reviewedAt: NOW, plan,
    });
    const result = await recordPostgresDailyStudyRating(command(db, "remembered", NOW, OTHER), NOW, SECRET);
    expect(result.state).toMatchObject({ dueAt: expected.schedule.dueAt, reviewCount: expected.schedule.reviewCount });
    expect(expected.schedule.reviewCount).toBeGreaterThan(previousState.reviewCount);
  });

  it("rejects closed days, disabled people, stale plan locks and changed Active targets", async () => {
    let db = createFakeDatabase();
    const closing = command(db, "remembered", "2026-07-14T19:59:59.000Z");
    await expect(recordPostgresDailyStudyRating(closing, "2026-07-14T20:00:00.000Z", SECRET)).rejects.toThrow("closed daily plan");
    await expect(refreshPostgresDailyStudyPrompt({ personId: PERSON, promptToken: closing.promptToken }, "2026-07-14T20:00:00.000Z", SECRET))
      .rejects.toThrow("current plan");
    db = createFakeDatabase(); db.activePerson = false;
    await expect(recordPostgresDailyStudyRating(command(db), NOW, SECRET)).rejects.toThrow("could not be resolved");
    db = createFakeDatabase();
    db.plans.push({ ...db.plan, id: OTHER, review_profile: "active", day_ends_at: "2026-07-14T21:00:00.000Z" });
    await expect(recordPostgresDailyStudyRating(command(db), NOW, SECRET)).rejects.toThrow("could not be resolved");
    db = createFakeDatabase(); db.planLockMatches = false;
    await expect(recordPostgresDailyStudyRating(command(db), NOW, SECRET)).rejects.toThrow("plan is stale");
    db = createFakeDatabase(); db.plan.review_profile = "active"; db.item.learning_track = "active"; db.mutateTargetOnLock = true;
    await expect(recordPostgresDailyStudyRating(command(db), NOW, SECRET)).rejects.toThrow("target changed");
    expect(db.events).toHaveLength(0);
  });
});
