import type { PostgresQueryable } from "@/lib/storage/postgres/client";
import { withPostgresTransaction } from "@/lib/storage/postgres/client";
import {
  buildTtsBudgetKeys,
  estimateTtsListPriceUsd,
  TTS_GLOBAL_LIMITS,
  TTS_PROVIDER_LEASE_MS,
  type TtsAccounting,
  type TtsReservationHandle,
  type TtsReservationInput,
  type TtsReservationResult,
  type TtsSettlement,
} from "./accounting";

type TransactionRunner = <T>(
  callback: (queryable: PostgresQueryable) => Promise<T>,
) => Promise<T>;

type BucketRow = {
  bucket_key: string;
  scope: "global_day" | "global_month" | "global_concurrency";
  attempts_reserved: number | string;
  characters_reserved: number | string;
  estimated_cost_usd_reserved: number | string;
  active_provider_calls: number | string;
};

type RunRow = {
  status: "submitted" | "succeeded" | "failed";
};

function whole(value: number | string, label: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} is invalid`);
  return parsed;
}

function amount(value: number | string, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} is invalid`);
  return parsed;
}

function rowsByKey(rows: readonly BucketRow[]) {
  return new Map(rows.map((row) => [row.bucket_key, row]));
}

async function ensureAndLockBuckets(
  queryable: PostgresQueryable,
  input: TtsReservationInput,
) {
  const keys = buildTtsBudgetKeys(input.executionScope, input.now);
  await queryable.query(
    `
      insert into tts_usage_buckets (
        bucket_key, execution_scope, scope, period_starts_at, period_ends_at,
        attempts_reserved, characters_reserved, estimated_cost_usd_reserved,
        active_provider_calls, updated_at
      )
      values
        ($1, $8, 'global_day', $2, $3, 0, 0, 0, 0, $9),
        ($4, $8, 'global_month', $5, $6, 0, 0, 0, 0, $9),
        ($7, $8, 'global_concurrency', '2000-01-01T00:00:00.000Z',
          '2100-01-01T00:00:00.000Z', 0, 0, 0, 0, $9)
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
      input.executionScope,
      input.now,
    ],
  );
  const locked = await queryable.query<BucketRow>(
    `
      select bucket_key, scope, attempts_reserved, characters_reserved,
        estimated_cost_usd_reserved, active_provider_calls
      from tts_usage_buckets
      where bucket_key = any($1::text[])
      order by bucket_key
      for update
    `,
    [[keys.dayBucketKey, keys.monthBucketKey, keys.concurrencyBucketKey]],
  );
  if (locked.rows.length !== 3) throw new Error("TTS usage buckets are incomplete");
  return { keys, rows: locked.rows };
}

async function reconcileStaleRuns(
  queryable: PostgresQueryable,
  executionScope: string,
  now: string,
) {
  const cutoff = new Date(Date.parse(now) - TTS_PROVIDER_LEASE_MS).toISOString();
  await queryable.query(
    `
      update tts_runs
      set status = 'failed', terminal_category = 'provider_lease_expired',
        latency_ms = greatest(0, extract(epoch from ($2::timestamptz - created_at)) * 1000)::integer,
        completed_at = $2
      where execution_scope = $1 and status = 'submitted' and created_at < $3
    `,
    [executionScope, now, cutoff],
  );
  const active = await queryable.query<{ count: number | string }>(
    `select count(*)::integer as count from tts_runs where execution_scope = $1 and status = 'submitted'`,
    [executionScope],
  );
  return whole(active.rows[0]?.count ?? 0, "TTS active provider calls");
}

function postgresBlockReasons(
  day: BucketRow,
  month: BucketRow,
  active: number,
  characterCount: number,
  cost: number,
) {
  const reasons: string[] = [];
  if (whole(day.attempts_reserved, "daily attempts") + 1 > TTS_GLOBAL_LIMITS.attemptsPerDay) reasons.push("daily_attempt_limit");
  if (whole(day.characters_reserved, "daily characters") + characterCount > TTS_GLOBAL_LIMITS.charactersPerDay) reasons.push("daily_character_limit");
  if (whole(month.characters_reserved, "monthly characters") + characterCount > TTS_GLOBAL_LIMITS.charactersPerMonth) reasons.push("monthly_character_limit");
  if (amount(day.estimated_cost_usd_reserved, "daily cost") + cost > TTS_GLOBAL_LIMITS.estimatedCostUsdPerDay + Number.EPSILON) reasons.push("daily_cost_limit");
  if (amount(month.estimated_cost_usd_reserved, "monthly cost") + cost > TTS_GLOBAL_LIMITS.estimatedCostUsdPerMonth + Number.EPSILON) reasons.push("monthly_cost_limit");
  if (active + 1 > TTS_GLOBAL_LIMITS.concurrentProviderCalls) reasons.push("concurrency_limit");
  return reasons;
}

export function createPostgresTtsAccounting(
  transaction: TransactionRunner = withPostgresTransaction,
): TtsAccounting {
  return {
    async reserve(input): Promise<TtsReservationResult> {
      return transaction(async (queryable) => {
        const { keys, rows } = await ensureAndLockBuckets(queryable, input);
        const active = await reconcileStaleRuns(
          queryable,
          input.executionScope,
          input.now,
        );
        await queryable.query(
          `update tts_usage_buckets set active_provider_calls = $2, updated_at = $3 where bucket_key = $1`,
          [keys.concurrencyBucketKey, active, input.now],
        );
        const existing = await queryable.query<RunRow>(
          `select status from tts_runs where execution_scope = $1 and request_id_hash = $2`,
          [input.executionScope, input.requestIdHash],
        );
        if (existing.rows[0]) {
          return { status: "replay", runStatus: existing.rows[0].status };
        }
        const buckets = rowsByKey(rows);
        const day = buckets.get(keys.dayBucketKey);
        const month = buckets.get(keys.monthBucketKey);
        if (!day || !month) throw new Error("TTS budget buckets are incomplete");
        const cost = estimateTtsListPriceUsd(input.characterCount);
        const reasons = postgresBlockReasons(day, month, active, input.characterCount, cost);
        if (reasons.length) return { status: "blocked", reasons };

        await queryable.query(
          `
            insert into tts_runs (
              execution_scope, request_id_hash, cache_key_hash, voice_contract_id,
              character_count, estimated_cost_usd, status, created_at
            ) values ($1, $2, $3, $4, $5, $6, 'submitted', $7)
          `,
          [
            input.executionScope,
            input.requestIdHash,
            input.cacheKeyHash,
            input.voiceContractId,
            input.characterCount,
            cost,
            input.now,
          ],
        );
        await queryable.query(
          `
            update tts_usage_buckets
            set attempts_reserved = attempts_reserved + 1,
              characters_reserved = characters_reserved + $2,
              estimated_cost_usd_reserved = estimated_cost_usd_reserved + $3,
              updated_at = $4
            where bucket_key = any($1::text[])
          `,
          [[keys.dayBucketKey, keys.monthBucketKey], input.characterCount, cost, input.now],
        );
        await queryable.query(
          `update tts_usage_buckets set active_provider_calls = $2, updated_at = $3 where bucket_key = $1`,
          [keys.concurrencyBucketKey, active + 1, input.now],
        );
        return {
          status: "reserved",
          handle: {
            executionScope: input.executionScope,
            requestIdHash: input.requestIdHash,
            dayBucketKey: keys.dayBucketKey,
            monthBucketKey: keys.monthBucketKey,
            concurrencyBucketKey: keys.concurrencyBucketKey,
            characterCount: input.characterCount,
            estimatedCostUsd: cost,
          },
        };
      });
    },

    async settle(handle: TtsReservationHandle, settlement: TtsSettlement) {
      await transaction(async (queryable) => {
        const locked = await queryable.query<RunRow>(
          `
            select status from tts_runs
            where execution_scope = $1 and request_id_hash = $2
            for update
          `,
          [handle.executionScope, handle.requestIdHash],
        );
        const run = locked.rows[0];
        if (!run) throw new Error("TTS reservation does not exist");
        if (run.status !== "submitted") return;
        await queryable.query(
          `
            update tts_runs
            set status = $3, terminal_category = $4, latency_ms = $5, completed_at = $6
            where execution_scope = $1 and request_id_hash = $2
          `,
          [
            handle.executionScope,
            handle.requestIdHash,
            settlement.outcome,
            settlement.terminalCategory,
            settlement.latencyMs,
            settlement.completedAt,
          ],
        );
        await queryable.query(
          `
            update tts_usage_buckets
            set active_provider_calls = greatest(0, active_provider_calls - 1), updated_at = $2
            where bucket_key = $1
          `,
          [handle.concurrencyBucketKey, settlement.completedAt],
        );
      });
    },
  };
}
