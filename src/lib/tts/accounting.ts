import { resolveCalendarMonth, resolvePersonDay } from "@/lib/daily-study/day-window";

export const TTS_BUDGET_TIMEZONE = "Australia/Melbourne";
export const TTS_PROVIDER_LEASE_MS = 2 * 60 * 1_000;
export const TTS_LIST_PRICE_USD_PER_CHARACTER = 4 / 1_000_000;

export const TTS_GLOBAL_LIMITS = Object.freeze({
  attemptsPerDay: 2_000,
  charactersPerDay: 100_000,
  charactersPerMonth: 1_000_000,
  estimatedCostUsdPerDay: 0.5,
  estimatedCostUsdPerMonth: 4,
  concurrentProviderCalls: 4,
});

export type TtsRunStatus = "submitted" | "succeeded" | "failed";

export type TtsReservationInput = Readonly<{
  executionScope: string;
  requestIdHash: string;
  cacheKeyHash: string;
  voiceContractId: string;
  characterCount: number;
  now: string;
}>;

export type TtsReservationHandle = Readonly<{
  executionScope: string;
  requestIdHash: string;
  dayBucketKey: string;
  monthBucketKey: string;
  concurrencyBucketKey: string;
  characterCount: number;
  estimatedCostUsd: number;
}>;

export type TtsReservationResult =
  | Readonly<{ status: "reserved"; handle: TtsReservationHandle }>
  | Readonly<{ status: "blocked"; reasons: readonly string[] }>
  | Readonly<{ status: "replay"; runStatus: TtsRunStatus }>;

export type TtsSettlement = Readonly<{
  outcome: "succeeded" | "failed";
  terminalCategory: string | null;
  latencyMs: number;
  completedAt: string;
}>;

export type TtsAccounting = Readonly<{
  reserve: (input: TtsReservationInput) => Promise<TtsReservationResult>;
  settle: (handle: TtsReservationHandle, settlement: TtsSettlement) => Promise<void>;
}>;

type MemoryBucket = {
  attemptsReserved: number;
  charactersReserved: number;
  estimatedCostUsdReserved: number;
  activeProviderCalls: number;
};

type MemoryRun = {
  status: TtsRunStatus;
  createdAt: string;
  completedAt: string | null;
};

function assertTimestamp(value: string, label: string) {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} is invalid`);
}

function assertReservationInput(input: TtsReservationInput) {
  if (!input.executionScope.trim()) throw new Error("TTS execution scope is required");
  if (!/^[a-f0-9]{64}$/u.test(input.requestIdHash)) {
    throw new Error("TTS request id hash is invalid");
  }
  if (!/^[a-f0-9]{64}$/u.test(input.cacheKeyHash)) {
    throw new Error("TTS cache key hash is invalid");
  }
  if (!input.voiceContractId.trim()) throw new Error("TTS voice contract is required");
  if (!Number.isSafeInteger(input.characterCount) || input.characterCount < 1) {
    throw new Error("TTS character count is invalid");
  }
  assertTimestamp(input.now, "TTS reservation time");
}

export function estimateTtsListPriceUsd(characterCount: number) {
  return characterCount * TTS_LIST_PRICE_USD_PER_CHARACTER;
}

export function buildTtsBudgetKeys(executionScope: string, now: string) {
  const day = resolvePersonDay(now, TTS_BUDGET_TIMEZONE);
  const month = resolveCalendarMonth(now, TTS_BUDGET_TIMEZONE);
  return {
    day,
    month,
    dayBucketKey: `${executionScope}:global_day:${day.localDate}`,
    monthBucketKey: `${executionScope}:global_month:${month.localMonth}`,
    concurrencyBucketKey: `${executionScope}:global_concurrency:singleton`,
  };
}

function blockReasons(
  day: MemoryBucket,
  month: MemoryBucket,
  concurrency: MemoryBucket,
  characterCount: number,
  estimatedCostUsd: number,
) {
  const reasons: string[] = [];
  if (day.attemptsReserved + 1 > TTS_GLOBAL_LIMITS.attemptsPerDay) {
    reasons.push("daily_attempt_limit");
  }
  if (day.charactersReserved + characterCount > TTS_GLOBAL_LIMITS.charactersPerDay) {
    reasons.push("daily_character_limit");
  }
  if (month.charactersReserved + characterCount > TTS_GLOBAL_LIMITS.charactersPerMonth) {
    reasons.push("monthly_character_limit");
  }
  if (
    day.estimatedCostUsdReserved + estimatedCostUsd >
    TTS_GLOBAL_LIMITS.estimatedCostUsdPerDay + Number.EPSILON
  ) {
    reasons.push("daily_cost_limit");
  }
  if (
    month.estimatedCostUsdReserved + estimatedCostUsd >
    TTS_GLOBAL_LIMITS.estimatedCostUsdPerMonth + Number.EPSILON
  ) {
    reasons.push("monthly_cost_limit");
  }
  if (concurrency.activeProviderCalls + 1 > TTS_GLOBAL_LIMITS.concurrentProviderCalls) {
    reasons.push("concurrency_limit");
  }
  return reasons;
}

function emptyBucket(): MemoryBucket {
  return {
    attemptsReserved: 0,
    charactersReserved: 0,
    estimatedCostUsdReserved: 0,
    activeProviderCalls: 0,
  };
}

export class InMemoryTtsAccounting implements TtsAccounting {
  private readonly buckets = new Map<string, MemoryBucket>();
  private readonly runs = new Map<string, MemoryRun>();

  private bucket(key: string) {
    const existing = this.buckets.get(key);
    if (existing) return existing;
    const created = emptyBucket();
    this.buckets.set(key, created);
    return created;
  }

  private reconcile(executionScope: string, now: string) {
    const cutoff = Date.parse(now) - TTS_PROVIDER_LEASE_MS;
    let active = 0;
    for (const [key, run] of this.runs) {
      if (!key.startsWith(`${executionScope}:`) || run.status !== "submitted") continue;
      if (Date.parse(run.createdAt) < cutoff) {
        run.status = "failed";
        run.completedAt = now;
      } else {
        active += 1;
      }
    }
    const keys = buildTtsBudgetKeys(executionScope, now);
    this.bucket(keys.concurrencyBucketKey).activeProviderCalls = active;
    return active;
  }

  async reserve(input: TtsReservationInput): Promise<TtsReservationResult> {
    assertReservationInput(input);
    this.reconcile(input.executionScope, input.now);
    const runKey = `${input.executionScope}:${input.requestIdHash}`;
    const existing = this.runs.get(runKey);
    if (existing) return { status: "replay", runStatus: existing.status };

    const keys = buildTtsBudgetKeys(input.executionScope, input.now);
    const day = this.bucket(keys.dayBucketKey);
    const month = this.bucket(keys.monthBucketKey);
    const concurrency = this.bucket(keys.concurrencyBucketKey);
    const estimatedCostUsd = estimateTtsListPriceUsd(input.characterCount);
    const reasons = blockReasons(
      day,
      month,
      concurrency,
      input.characterCount,
      estimatedCostUsd,
    );
    if (reasons.length) return { status: "blocked", reasons };

    day.attemptsReserved += 1;
    day.charactersReserved += input.characterCount;
    day.estimatedCostUsdReserved += estimatedCostUsd;
    month.attemptsReserved += 1;
    month.charactersReserved += input.characterCount;
    month.estimatedCostUsdReserved += estimatedCostUsd;
    concurrency.activeProviderCalls += 1;
    this.runs.set(runKey, {
      status: "submitted",
      createdAt: input.now,
      completedAt: null,
    });
    return {
      status: "reserved",
      handle: {
        executionScope: input.executionScope,
        requestIdHash: input.requestIdHash,
        dayBucketKey: keys.dayBucketKey,
        monthBucketKey: keys.monthBucketKey,
        concurrencyBucketKey: keys.concurrencyBucketKey,
        characterCount: input.characterCount,
        estimatedCostUsd,
      },
    };
  }

  async settle(handle: TtsReservationHandle, settlement: TtsSettlement) {
    assertTimestamp(settlement.completedAt, "TTS completion time");
    if (!Number.isSafeInteger(settlement.latencyMs) || settlement.latencyMs < 0) {
      throw new Error("TTS latency is invalid");
    }
    const runKey = `${handle.executionScope}:${handle.requestIdHash}`;
    const run = this.runs.get(runKey);
    if (!run || run.status !== "submitted") {
      throw new Error("TTS reservation is not active");
    }
    run.status = settlement.outcome;
    run.completedAt = settlement.completedAt;
    const concurrency = this.bucket(handle.concurrencyBucketKey);
    concurrency.activeProviderCalls = Math.max(0, concurrency.activeProviderCalls - 1);
  }

  snapshot(executionScope: string, now: string) {
    this.reconcile(executionScope, now);
    const keys = buildTtsBudgetKeys(executionScope, now);
    return {
      day: { ...this.bucket(keys.dayBucketKey) },
      month: { ...this.bucket(keys.monthBucketKey) },
      concurrency: { ...this.bucket(keys.concurrencyBucketKey) },
      runs: [...this.runs.entries()]
        .filter(([key]) => key.startsWith(`${executionScope}:`))
        .map(([, run]) => ({ ...run })),
    };
  }
}

export const ttsInternal = Object.freeze({ blockReasons });
