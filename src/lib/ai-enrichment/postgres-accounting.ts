import {
  buildDefaultAttemptReservation,
  estimateGeminiCostUsd,
  reserveAiProviderAttempt,
  settleAiProviderAttempt,
} from "./contract";
import type {
  AiAttemptReservation,
  AiBudgetSnapshot,
  AiFeature,
  GeminiUsage,
} from "./types";
import { GEMINI_PROVIDER_TIMEOUT_MS } from "./gemini-provider-adapter";
import { resolveCalendarMonth, resolvePersonDay } from "@/lib/daily-study/day-window";
import {
  type PostgresQueryable,
  withPostgresTransaction,
} from "@/lib/storage/postgres/client";

export const AI_BUDGET_TIMEZONE = "Australia/Melbourne";
export const AI_PROVIDER_LEASE_MS = 2 * 60 * 1_000;

if (AI_PROVIDER_LEASE_MS <= GEMINI_PROVIDER_TIMEOUT_MS) {
  throw new Error("AI provider lease must remain longer than the provider timeout");
}

const DATABASE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TransactionRunner = <T>(
  callback: (queryable: PostgresQueryable) => Promise<T>,
) => Promise<T>;

type TransactionalPersistence = (
  queryable: PostgresQueryable,
  aiRunId: string,
) => Promise<void>;

type AiUsageBucketRow = {
  bucket_key: string;
  scope: "global_day" | "global_month" | "global_concurrency";
  attempts_reserved: number | string;
  input_tokens_reserved: number | string;
  output_tokens_reserved: number | string;
  estimated_cost_usd_reserved: number | string;
  active_provider_calls: number | string;
};

type ExistingAiRunRow = {
  id: string;
  status: "submitted" | "succeeded" | "rejected" | "failed";
  source_vocabulary_item_id: string | null;
  feature: AiFeature;
  model: string;
  model_label: string;
  prompt_version: string;
  source_hash: string;
  output_schema_version: string;
  disclosure_version: string;
  cache_key_hash: string;
};

export type PostgresAiRunSubmission = Readonly<{
  id: string;
  personId: string;
  sourceVocabularyItemId: string;
  feature: AiFeature;
  model: string;
  modelLabel: string;
  promptVersion: string;
  sourceHash: string;
  outputSchemaVersion: string;
  disclosureVersion: string;
  idempotencyKeyHash: string;
  cacheKeyHash: string;
  createdAt: string;
}>;

export type PostgresAiReservationHandle = Readonly<{
  aiRunId: string;
  dayBucketKey: string;
  monthBucketKey: string;
  concurrencyBucketKey: string;
  reservation: AiAttemptReservation;
}>;

export type PostgresAiReservationResult =
  | Readonly<{
      status: "reserved";
      handle: PostgresAiReservationHandle;
      budget: AiBudgetSnapshot;
    }>
  | Readonly<{
      status: "blocked";
      reasons: readonly string[];
    }>
  | Readonly<{
      status: "replay";
      aiRunId: string;
      runStatus: ExistingAiRunRow["status"];
    }>;

type PostgresAiSettlementEvidence = Readonly<{
  providerResponseId: string | null;
  latencyMs: number;
  completedAt: string;
}>;

export type PostgresAiSettlement =
  | (PostgresAiSettlementEvidence &
      Readonly<{
        outcome: "succeeded";
        usage: GeminiUsage;
        terminalCategory?: null;
      }>)
  | (PostgresAiSettlementEvidence &
      Readonly<{
        outcome: "rejected" | "failed";
        usage: GeminiUsage | null;
        terminalCategory: string;
      }>);

function nonNegativeNumber(value: number | string, label: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} is invalid`);
  }
  return parsed;
}

function wholeNumber(value: number | string, label: string) {
  const parsed = nonNegativeNumber(value, label);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} must be a safe whole number`);
  }
  return parsed;
}

function requiredText(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required`);
  return value;
}

function databaseUuid(value: string, label: string) {
  if (!DATABASE_UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a database UUID`);
  }
  return value;
}

function validateSubmission(input: PostgresAiRunSubmission) {
  databaseUuid(input.id, "AI run id");
  databaseUuid(input.personId, "AI run personId");
  databaseUuid(input.sourceVocabularyItemId, "AI run sourceVocabularyItemId");
  if (input.feature !== "enrichment_v1" && input.feature !== "context_explain_v1") {
    throw new Error("AI run feature is unsupported");
  }
  for (const [label, value] of Object.entries({
    model: input.model,
    modelLabel: input.modelLabel,
    promptVersion: input.promptVersion,
    sourceHash: input.sourceHash,
    outputSchemaVersion: input.outputSchemaVersion,
    disclosureVersion: input.disclosureVersion,
    idempotencyKeyHash: input.idempotencyKeyHash,
    cacheKeyHash: input.cacheKeyHash,
  })) {
    requiredText(value, `AI run ${label}`);
  }
  if (!Number.isFinite(Date.parse(input.createdAt))) {
    throw new Error("AI run createdAt is invalid");
  }
}

function buildBudgetKeys(now: string) {
  const day = resolvePersonDay(now, AI_BUDGET_TIMEZONE);
  const month = resolveCalendarMonth(now, AI_BUDGET_TIMEZONE);
  return {
    day,
    month,
    dayBucketKey: `global_day:${day.localDate}`,
    monthBucketKey: `global_month:${month.localMonth}`,
    concurrencyBucketKey: "global_concurrency:singleton",
  };
}

function bucketMap(rows: readonly AiUsageBucketRow[]) {
  return new Map(rows.map((row) => [row.bucket_key, row]));
}

function budgetSnapshot(
  rows: readonly AiUsageBucketRow[],
  keys: ReturnType<typeof buildBudgetKeys>,
  activeProviderCalls: number,
): AiBudgetSnapshot {
  const buckets = bucketMap(rows);
  const day = buckets.get(keys.dayBucketKey);
  const month = buckets.get(keys.monthBucketKey);
  const concurrency = buckets.get(keys.concurrencyBucketKey);
  if (!day || !month || !concurrency) {
    throw new Error("AI usage accounting buckets are incomplete");
  }
  if (
    day.scope !== "global_day" ||
    month.scope !== "global_month" ||
    concurrency.scope !== "global_concurrency"
  ) {
    throw new Error("AI usage accounting bucket scope is invalid");
  }
  return {
    globalAttemptsToday: wholeNumber(day.attempts_reserved, "daily attempts"),
    activeProviderCalls,
    reservedInputTokensToday: wholeNumber(
      day.input_tokens_reserved,
      "daily input reservation",
    ),
    reservedOutputTokensToday: wholeNumber(
      day.output_tokens_reserved,
      "daily output reservation",
    ),
    estimatedCostUsdToday: nonNegativeNumber(
      day.estimated_cost_usd_reserved,
      "daily cost reservation",
    ),
    estimatedCostUsdMonth: nonNegativeNumber(
      month.estimated_cost_usd_reserved,
      "monthly cost reservation",
    ),
  };
}

function sameCanonicalRun(existing: ExistingAiRunRow, input: PostgresAiRunSubmission) {
  return (
    existing.source_vocabulary_item_id === input.sourceVocabularyItemId &&
    existing.feature === input.feature &&
    existing.model === input.model &&
    existing.model_label === input.modelLabel &&
    existing.prompt_version === input.promptVersion &&
    existing.source_hash === input.sourceHash &&
    existing.output_schema_version === input.outputSchemaVersion &&
    existing.disclosure_version === input.disclosureVersion &&
    existing.cache_key_hash === input.cacheKeyHash
  );
}

async function ensureAndLockBuckets(
  queryable: PostgresQueryable,
  keys: ReturnType<typeof buildBudgetKeys>,
  now: string,
) {
  await queryable.query(
    `
      insert into ai_usage_buckets (
        bucket_key, scope, person_id, period_starts_at, period_ends_at,
        attempts_reserved, input_tokens_reserved, output_tokens_reserved,
        estimated_cost_usd_reserved, active_provider_calls, updated_at
      )
      values
        ($1, 'global_day', null, $2, $3, 0, 0, 0, 0, 0, $8),
        ($4, 'global_month', null, $5, $6, 0, 0, 0, 0, 0, $8),
        ($7, 'global_concurrency', null, '2000-01-01T00:00:00.000Z',
          '2100-01-01T00:00:00.000Z', 0, 0, 0, 0, 0, $8)
      on conflict (bucket_key) do nothing
    `,
    [
      keys.dayBucketKey,
      keys.day.dayStartsAt,
      keys.day.dayEndsAt,
      keys.monthBucketKey,
      keys.month.monthStartsAt,
      keys.month.monthEndsAt,
      keys.concurrencyBucketKey,
      now,
    ],
  );
  const locked = await queryable.query<AiUsageBucketRow>(
    `
      select
        bucket_key, scope, attempts_reserved, input_tokens_reserved,
        output_tokens_reserved, estimated_cost_usd_reserved, active_provider_calls
      from ai_usage_buckets
      where bucket_key = any($1::text[])
      order by bucket_key
      for update
    `,
    [[keys.dayBucketKey, keys.monthBucketKey, keys.concurrencyBucketKey]],
  );
  return locked.rows;
}

async function expireStaleProviderLeases(
  queryable: PostgresQueryable,
  now: string,
  excludedRunId: string | null = null,
) {
  const leaseCutoff = new Date(new Date(now).getTime() - AI_PROVIDER_LEASE_MS).toISOString();
  await queryable.query(
    `
      update ai_runs
      set
        status = 'failed',
        structure_validation_status = 'unavailable',
        terminal_category = 'provider_lease_expired',
        completed_at = $1
      where status = 'submitted'
        and created_at < $2
        and ($3::uuid is null or id <> $3::uuid)
    `,
    [now, leaseCutoff, excludedRunId],
  );
  const active = await queryable.query<{ count: number | string }>(
    `select count(*)::integer as count from ai_runs where status = 'submitted'`,
  );
  return wholeNumber(active.rows[0]?.count ?? 0, "active provider calls");
}

export async function reservePostgresAiProviderAttempt(
  input: PostgresAiRunSubmission,
  dependencies: Readonly<{ transaction?: TransactionRunner }> = {},
): Promise<PostgresAiReservationResult> {
  validateSubmission(input);
  const keys = buildBudgetKeys(input.createdAt);
  const reservation = buildDefaultAttemptReservation();
  const transaction = dependencies.transaction ?? withPostgresTransaction;

  return transaction(async (queryable) => {
    await queryable.query(
      `select pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`${input.personId}:${input.idempotencyKeyHash}`],
    );
    const replay = await queryable.query<ExistingAiRunRow>(
      `
        select
          id, status, source_vocabulary_item_id, feature, model, model_label,
          prompt_version, source_hash, output_schema_version,
          disclosure_version, cache_key_hash
        from ai_runs
        where person_id = $1 and idempotency_key_hash = $2
        for update
      `,
      [input.personId, input.idempotencyKeyHash],
    );
    const existing = replay.rows[0];
    if (existing) {
      if (!sameCanonicalRun(existing, input)) {
        throw new Error("AI idempotency key conflicts with another request");
      }
      return {
        status: "replay",
        aiRunId: existing.id,
        runStatus: existing.status,
      };
    }

    const rows = await ensureAndLockBuckets(queryable, keys, input.createdAt);
    const activeProviderCalls = await expireStaleProviderLeases(
      queryable,
      input.createdAt,
    );
    await queryable.query(
      `
        update ai_usage_buckets
        set active_provider_calls = $2, updated_at = $3
        where bucket_key = $1
      `,
      [keys.concurrencyBucketKey, activeProviderCalls, input.createdAt],
    );
    const current = budgetSnapshot(rows, keys, activeProviderCalls);
    const decision = reserveAiProviderAttempt(current, reservation);
    if (!decision.allowed) {
      return { status: "blocked", reasons: decision.reasons };
    }

    const inserted = await queryable.query<{ id: string }>(
      `
        insert into ai_runs (
          id, person_id, source_vocabulary_item_id, feature, provider, model,
          model_label, prompt_version, source_hash, output_schema_version,
          disclosure_version, idempotency_key_hash, cache_key_hash,
          status, structure_validation_status, provider_response_id,
          terminal_category,
          input_tokens, output_tokens, thinking_tokens, total_tokens,
          latency_ms, estimated_cost_usd, created_at, completed_at
        )
        values (
          $1, $2, $3, $4, 'google-gemini-api', $5,
          $6, $7, $8, $9, $10, $11, $12,
          'submitted', 'pending', null, null, 0, 0, 0, 0, 0, 0, $13, null
        )
        on conflict (person_id, idempotency_key_hash) do nothing
        returning id
      `,
      [
        input.id,
        input.personId,
        input.sourceVocabularyItemId,
        input.feature,
        input.model,
        input.modelLabel,
        input.promptVersion,
        input.sourceHash,
        input.outputSchemaVersion,
        input.disclosureVersion,
        input.idempotencyKeyHash,
        input.cacheKeyHash,
        input.createdAt,
      ],
    );
    if (!inserted.rows.length) {
      const replay = await queryable.query<ExistingAiRunRow>(
        `
          select
            id, status, source_vocabulary_item_id, feature, model, model_label,
            prompt_version, source_hash, output_schema_version,
            disclosure_version, cache_key_hash
          from ai_runs
          where person_id = $1 and idempotency_key_hash = $2
          for update
        `,
        [input.personId, input.idempotencyKeyHash],
      );
      const conflictedRun = replay.rows[0];
      if (!conflictedRun || !sameCanonicalRun(conflictedRun, input)) {
        throw new Error("AI idempotency key conflicts with another request");
      }
      return {
        status: "replay",
        aiRunId: conflictedRun.id,
        runStatus: conflictedRun.status,
      };
    }

    await queryable.query(
      `
        update ai_usage_buckets
        set
          attempts_reserved = attempts_reserved + 1,
          input_tokens_reserved = input_tokens_reserved + $2,
          output_tokens_reserved = output_tokens_reserved + $3,
          estimated_cost_usd_reserved = estimated_cost_usd_reserved + $4,
          updated_at = $5
        where bucket_key = $1
      `,
      [
        keys.dayBucketKey,
        reservation.inputTokens,
        reservation.outputTokens,
        reservation.estimatedCostUsd,
        input.createdAt,
      ],
    );
    await queryable.query(
      `
        update ai_usage_buckets
        set
          attempts_reserved = attempts_reserved + 1,
          input_tokens_reserved = input_tokens_reserved + $2,
          output_tokens_reserved = output_tokens_reserved + $3,
          estimated_cost_usd_reserved = estimated_cost_usd_reserved + $4,
          updated_at = $5
        where bucket_key = $1
      `,
      [
        keys.monthBucketKey,
        reservation.inputTokens,
        reservation.outputTokens,
        reservation.estimatedCostUsd,
        input.createdAt,
      ],
    );
    await queryable.query(
      `
        update ai_usage_buckets
        set active_provider_calls = $2, updated_at = $3
        where bucket_key = $1
      `,
      [keys.concurrencyBucketKey, activeProviderCalls + 1, input.createdAt],
    );

    return {
      status: "reserved",
      handle: {
        aiRunId: input.id,
        dayBucketKey: keys.dayBucketKey,
        monthBucketKey: keys.monthBucketKey,
        concurrencyBucketKey: keys.concurrencyBucketKey,
        reservation,
      },
      budget: decision.next,
    };
  });
}

export async function settlePostgresAiProviderAttempt(
  handle: PostgresAiReservationHandle,
  settlement: PostgresAiSettlement,
  dependencies: Readonly<{
    transaction?: TransactionRunner;
    persistResult?: TransactionalPersistence;
    persistFailure?: TransactionalPersistence;
  }> = {},
) {
  databaseUuid(handle.aiRunId, "AI run id");
  if (settlement.outcome === "succeeded" && !settlement.usage) {
    throw new Error("A successful AI settlement requires provider usage metadata");
  }
  if (!Number.isFinite(Date.parse(settlement.completedAt))) {
    throw new Error("AI settlement completedAt is invalid");
  }
  if (!Number.isSafeInteger(settlement.latencyMs) || settlement.latencyMs < 0) {
    throw new Error("AI settlement latencyMs is invalid");
  }
  if (
    settlement.outcome !== "succeeded" &&
    !settlement.terminalCategory.trim()
  ) {
    throw new Error("A failed AI settlement requires a terminal category");
  }
  const transaction = dependencies.transaction ?? withPostgresTransaction;

  return transaction(async (queryable) => {
    const lockedBuckets = await queryable.query<AiUsageBucketRow>(
      `
        select
          bucket_key, scope, attempts_reserved, input_tokens_reserved,
          output_tokens_reserved, estimated_cost_usd_reserved, active_provider_calls
        from ai_usage_buckets
        where bucket_key = any($1::text[])
        order by bucket_key
        for update
      `,
      [[handle.dayBucketKey, handle.monthBucketKey, handle.concurrencyBucketKey]],
    );
    const activeCountBefore = await expireStaleProviderLeases(
      queryable,
      settlement.completedAt,
      handle.aiRunId,
    );
    const run = await queryable.query<{ status: ExistingAiRunRow["status"] }>(
      `select status from ai_runs where id = $1 for update`,
      [handle.aiRunId],
    );
    const currentStatus = run.rows[0]?.status;
    if (!currentStatus) throw new Error("AI run could not be found for settlement");
    if (currentStatus !== "submitted") {
      await queryable.query(
        `
          update ai_usage_buckets
          set active_provider_calls = $2, updated_at = $3
          where bucket_key = $1
        `,
        [handle.concurrencyBucketKey, activeCountBefore, settlement.completedAt],
      );
      return { status: "replay" as const, runStatus: currentStatus };
    }

    const keyParts = handle.dayBucketKey.split(":");
    const monthParts = handle.monthBucketKey.split(":");
    const fakeKeys = {
      dayBucketKey: handle.dayBucketKey,
      monthBucketKey: handle.monthBucketKey,
      concurrencyBucketKey: handle.concurrencyBucketKey,
      day: {
        localDate: keyParts.slice(1).join(":"),
        timezone: AI_BUDGET_TIMEZONE,
        dayStartsAt: settlement.completedAt,
        dayEndsAt: settlement.completedAt,
      },
      month: {
        localMonth: monthParts.slice(1).join(":"),
        timezone: AI_BUDGET_TIMEZONE,
        monthStartsAt: settlement.completedAt,
        monthEndsAt: settlement.completedAt,
      },
    };
    const current = budgetSnapshot(lockedBuckets.rows, fakeKeys, activeCountBefore);
    const next = settleAiProviderAttempt(
      current,
      handle.reservation,
      settlement.usage,
    );
    const actualInputTokens = settlement.usage?.promptTokenCount ?? 0;
    const actualOutputTokens = settlement.usage?.candidatesTokenCount ?? 0;
    const actualThinkingTokens = settlement.usage?.thoughtsTokenCount ?? 0;
    const actualTotalTokens = settlement.usage?.totalTokenCount ?? 0;
    const actualCostUsd = settlement.usage
      ? estimateGeminiCostUsd(settlement.usage)
      : 0;
    const structureStatus = settlement.outcome === "succeeded"
      ? "valid"
      : settlement.outcome === "rejected"
        ? "invalid"
        : "unavailable";

    const updatedRun = await queryable.query<{ id: string }>(
      `
        update ai_runs
        set
          status = $2,
          structure_validation_status = $3,
          terminal_category = $4,
          provider_response_id = $5,
          input_tokens = $6,
          output_tokens = $7,
          thinking_tokens = $8,
          total_tokens = $9,
          latency_ms = $10,
          estimated_cost_usd = $11,
          completed_at = $12
        where id = $1 and status = 'submitted'
        returning id
      `,
      [
        handle.aiRunId,
        settlement.outcome,
        structureStatus,
        settlement.outcome === "succeeded" ? null : settlement.terminalCategory,
        settlement.providerResponseId,
        actualInputTokens,
        actualOutputTokens,
        actualThinkingTokens,
        actualTotalTokens,
        settlement.latencyMs,
        actualCostUsd,
        settlement.completedAt,
      ],
    );
    if (!updatedRun.rows.length) {
      throw new Error("AI run changed before settlement completed");
    }
    if (settlement.outcome === "succeeded") {
      if (!dependencies.persistResult) {
        throw new Error("A successful AI settlement requires atomic result persistence");
      }
      await dependencies.persistResult(queryable, handle.aiRunId);
    } else if (dependencies.persistFailure) {
      await dependencies.persistFailure(queryable, handle.aiRunId);
    }
    await queryable.query(
      `
        update ai_usage_buckets
        set
          input_tokens_reserved = $2,
          output_tokens_reserved = $3,
          estimated_cost_usd_reserved = $4,
          updated_at = $5
        where bucket_key = $1
      `,
      [
        handle.dayBucketKey,
        next.reservedInputTokensToday,
        next.reservedOutputTokensToday,
        next.estimatedCostUsdToday,
        settlement.completedAt,
      ],
    );
    if (settlement.usage) {
      await queryable.query(
        `
          update ai_usage_buckets
          set
            input_tokens_reserved = input_tokens_reserved - $2 + $3,
            output_tokens_reserved = output_tokens_reserved - $4 + $5,
            estimated_cost_usd_reserved = estimated_cost_usd_reserved - $6 + $7,
            updated_at = $8
          where bucket_key = $1
        `,
        [
          handle.monthBucketKey,
          handle.reservation.inputTokens,
          actualInputTokens,
          handle.reservation.outputTokens,
          actualOutputTokens + actualThinkingTokens,
          handle.reservation.estimatedCostUsd,
          actualCostUsd,
          settlement.completedAt,
        ],
      );
    }
    const remainingActive = Math.max(0, activeCountBefore - 1);
    await queryable.query(
      `
        update ai_usage_buckets
        set active_provider_calls = $2, updated_at = $3
        where bucket_key = $1
      `,
      [handle.concurrencyBucketKey, remainingActive, settlement.completedAt],
    );
    return { status: "settled" as const, runStatus: settlement.outcome };
  });
}
