import { describe, expect, it } from "vitest";
import {
  AI_PROVIDER_LEASE_MS,
  reservePostgresAiProviderAttempt,
  settlePostgresAiProviderAttempt,
} from "./postgres-accounting";
import type {
  PostgresAiRunSubmission,
} from "./postgres-accounting";
import { buildDefaultAttemptReservation } from "./contract";
import { GEMINI_PROVIDER_TIMEOUT_MS } from "./gemini-provider-adapter";
import type { PostgresQueryable } from "@/lib/storage/postgres/client";

const NOW = "2026-07-16T02:30:00.000Z";
const RUN_ID = "00000000-0000-4000-8000-000000007a01";
const PERSON_ID = "00000000-0000-4000-8000-000000007a02";
const VOCABULARY_ID = "00000000-0000-4000-8000-000000007a03";

type RunStatus = "submitted" | "succeeded" | "rejected" | "failed";

type FakeRun = {
  id: string;
  personId: string;
  sourceVocabularyItemId: string | null;
  feature: "enrichment_v1" | "context_explain_v1";
  model: string;
  modelLabel: string;
  promptVersion: string;
  sourceHash: string;
  outputSchemaVersion: string;
  disclosureVersion: string;
  idempotencyKeyHash: string;
  cacheKeyHash: string;
  status: RunStatus;
  createdAt: string;
  completedAt: string | null;
};

type FakeBucket = {
  bucket_key: string;
  scope: "global_day" | "global_month" | "global_concurrency";
  attempts_reserved: number;
  input_tokens_reserved: number;
  output_tokens_reserved: number;
  estimated_cost_usd_reserved: number;
  active_provider_calls: number;
  personId: null;
};

type QueryLogEntry = {
  sql: string;
  values: readonly unknown[];
};

type FakeOptions = {
  day?: Partial<Omit<FakeBucket, "bucket_key" | "scope" | "personId">>;
  month?: Partial<Omit<FakeBucket, "bucket_key" | "scope" | "personId">>;
  concurrency?: Partial<Omit<FakeBucket, "bucket_key" | "scope" | "personId">>;
  runs?: FakeRun[];
};

function submission(
  overrides: Partial<PostgresAiRunSubmission> = {},
): PostgresAiRunSubmission {
  return {
    id: RUN_ID,
    personId: PERSON_ID,
    sourceVocabularyItemId: VOCABULARY_ID,
    feature: "enrichment_v1",
    model: "gemini-3.1-flash-lite",
    modelLabel: "Gemini 3.1 Flash-Lite",
    promptVersion: "v2-ai-enrichment-prompt-v2",
    sourceHash: "source-hash-1",
    outputSchemaVersion: "v2-ai-enrichment-draft-v2",
    disclosureVersion: "ai-disclosure-v3",
    idempotencyKeyHash: "idempotency-hash-1",
    cacheKeyHash: "cache-hash-1",
    createdAt: NOW,
    ...overrides,
  };
}

function runFromSubmission(
  input: PostgresAiRunSubmission,
  overrides: Partial<FakeRun> = {},
): FakeRun {
  return {
    id: input.id,
    personId: input.personId,
    sourceVocabularyItemId: input.sourceVocabularyItemId,
    feature: input.feature,
    model: input.model,
    modelLabel: input.modelLabel,
    promptVersion: input.promptVersion,
    sourceHash: input.sourceHash,
    outputSchemaVersion: input.outputSchemaVersion,
    disclosureVersion: input.disclosureVersion,
    idempotencyKeyHash: input.idempotencyKeyHash,
    cacheKeyHash: input.cacheKeyHash,
    status: "submitted",
    createdAt: input.createdAt,
    completedAt: null,
    ...overrides,
  };
}

function compactSql(sql: string) {
  return sql.replace(/\s+/gu, " ").trim().toLocaleLowerCase("en-US");
}

function queryResult<TRow>(rows: TRow[]) {
  return {
    rows,
    rowCount: rows.length,
    command: "",
    oid: 0,
    fields: [],
  };
}

class AccountingFake {
  readonly logs: QueryLogEntry[] = [];
  readonly buckets = new Map<string, FakeBucket>();
  readonly runs: FakeRun[];
  transactionCount = 0;

  private readonly options: FakeOptions;

  constructor(options: FakeOptions = {}) {
    this.options = options;
    this.runs = structuredClone(options.runs ?? []);
  }

  readonly transaction = async <T>(
    callback: (queryable: PostgresQueryable) => Promise<T>,
  ) => {
    this.transactionCount += 1;
    return callback(this.queryable);
  };

  readonly queryable: PostgresQueryable = {
    query: async <TRow extends object = Record<string, unknown>>(
      queryText: string,
      values: unknown[] = [],
    ) => {
      const sql = compactSql(queryText);
      this.logs.push({ sql, values: [...values] });

      if (sql.startsWith("select pg_advisory_xact_lock")) {
        return queryResult([]) as never;
      }

      if (sql.startsWith("insert into ai_usage_buckets")) {
        this.ensureBucket(
          String(values[0]),
          "global_day",
          this.options.day,
        );
        this.ensureBucket(
          String(values[3]),
          "global_month",
          this.options.month,
        );
        this.ensureBucket(
          String(values[6]),
          "global_concurrency",
          this.options.concurrency,
        );
        return queryResult([]) as never;
      }

      if (
        sql.includes("from ai_usage_buckets") &&
        sql.includes("bucket_key = any") &&
        sql.includes("for update")
      ) {
        const keys = values[0] as string[];
        const rows = keys
          .map((key) => this.buckets.get(key))
          .filter((row): row is FakeBucket => Boolean(row))
          .sort((left, right) => left.bucket_key.localeCompare(right.bucket_key));
        return queryResult(rows as unknown as TRow[]) as never;
      }

      if (
        sql.startsWith("update ai_runs") &&
        sql.includes("where status = 'submitted'") &&
        sql.includes("created_at <")
      ) {
        const completedAt = String(values[0]);
        const cutoff = Date.parse(String(values[1]));
        const excludedRunId = values[2] === null ? null : String(values[2]);
        let changed = 0;
        for (const run of this.runs) {
          if (
            run.id !== excludedRunId &&
            run.status === "submitted" &&
            Date.parse(run.createdAt) < cutoff
          ) {
            run.status = "failed";
            run.completedAt = completedAt;
            changed += 1;
          }
        }
        return {
          ...queryResult([]),
          rowCount: changed,
        } as never;
      }

      if (
        sql.includes("count(*)") &&
        sql.includes("from ai_runs") &&
        sql.includes("status = 'submitted'")
      ) {
        const count = this.runs.filter((run) => run.status === "submitted").length;
        return queryResult([{ count }] as unknown as TRow[]) as never;
      }

      if (
        sql.includes("count(*)") &&
        sql.includes("from ai_runs") &&
        sql.includes("provider = 'google-gemini-api'")
      ) {
        return queryResult([{ count: this.runs.length }] as unknown as TRow[]) as never;
      }

      if (
        sql.includes("from ai_runs") &&
        sql.includes("person_id = $1") &&
        sql.includes("idempotency_key_hash = $2")
      ) {
        const existing = this.runs.find(
          (run) =>
            run.personId === values[0] && run.idempotencyKeyHash === values[1],
        );
        const rows = existing ? [this.existingRunRow(existing)] : [];
        return queryResult(rows as unknown as TRow[]) as never;
      }

      if (sql.startsWith("insert into ai_runs")) {
        const personId = String(values[1]);
        const idempotencyKeyHash = String(values[10]);
        const conflict = this.runs.find(
          (run) =>
            run.personId === personId &&
            run.idempotencyKeyHash === idempotencyKeyHash,
        );
        if (conflict) return queryResult([]) as never;

        this.runs.push({
          id: String(values[0]),
          personId,
          sourceVocabularyItemId: String(values[2]),
          feature: values[3] as FakeRun["feature"],
          model: String(values[4]),
          modelLabel: String(values[5]),
          promptVersion: String(values[6]),
          sourceHash: String(values[7]),
          outputSchemaVersion: String(values[8]),
          disclosureVersion: String(values[9]),
          idempotencyKeyHash,
          cacheKeyHash: String(values[11]),
          status: "submitted",
          createdAt: String(values[12]),
          completedAt: null,
        });
        return queryResult([{ id: String(values[0]) }] as unknown as TRow[]) as never;
      }

      if (
        sql.includes("select status from ai_runs") &&
        sql.includes("where id = $1")
      ) {
        const run = this.runs.find((candidate) => candidate.id === values[0]);
        return queryResult(
          (run ? [{ status: run.status }] : []) as unknown as TRow[],
        ) as never;
      }

      if (sql.startsWith("update ai_runs") && sql.includes("where id = $1")) {
        const run = this.runs.find((candidate) => candidate.id === values[0]);
        if (run && run.status === "submitted") {
          run.status = values[1] as RunStatus;
          run.completedAt = String(values[11]);
          return queryResult([{ id: run.id }] as unknown as TRow[]) as never;
        }
        return queryResult([]) as never;
      }

      if (sql.startsWith("update ai_usage_buckets")) {
        const bucket = this.buckets.get(String(values[0]));
        if (!bucket) throw new Error(`Unknown fake bucket: ${String(values[0])}`);

        if (sql.includes("attempts_reserved = attempts_reserved + 1")) {
          bucket.attempts_reserved += 1;
          bucket.input_tokens_reserved += Number(values[1]);
          bucket.output_tokens_reserved += Number(values[2]);
          bucket.estimated_cost_usd_reserved += Number(values[3]);
        } else if (sql.includes("input_tokens_reserved = input_tokens_reserved -")) {
          bucket.input_tokens_reserved =
            bucket.input_tokens_reserved - Number(values[1]) + Number(values[2]);
          bucket.output_tokens_reserved =
            bucket.output_tokens_reserved - Number(values[3]) + Number(values[4]);
          bucket.estimated_cost_usd_reserved =
            bucket.estimated_cost_usd_reserved - Number(values[5]) + Number(values[6]);
        } else if (sql.includes("input_tokens_reserved = $2")) {
          bucket.input_tokens_reserved = Number(values[1]);
          bucket.output_tokens_reserved = Number(values[2]);
          bucket.estimated_cost_usd_reserved = Number(values[3]);
        } else if (sql.includes("active_provider_calls = $2")) {
          bucket.active_provider_calls = Number(values[1]);
        } else {
          throw new Error(`Unhandled fake bucket update: ${sql}`);
        }
        return { ...queryResult([]), rowCount: 1 } as never;
      }

      throw new Error(`Unhandled accounting SQL in test fake: ${sql}`);
    },
  };

  private ensureBucket(
    key: string,
    scope: FakeBucket["scope"],
    overrides:
      | Partial<Omit<FakeBucket, "bucket_key" | "scope" | "personId">>
      | undefined,
  ) {
    if (this.buckets.has(key)) return;
    this.buckets.set(key, {
      bucket_key: key,
      scope,
      attempts_reserved: 0,
      input_tokens_reserved: 0,
      output_tokens_reserved: 0,
      estimated_cost_usd_reserved: 0,
      active_provider_calls: 0,
      personId: null,
      ...overrides,
    });
  }

  private existingRunRow(run: FakeRun) {
    return {
      id: run.id,
      status: run.status,
      source_vocabulary_item_id: run.sourceVocabularyItemId,
      feature: run.feature,
      model: run.model,
      model_label: run.modelLabel,
      prompt_version: run.promptVersion,
      source_hash: run.sourceHash,
      output_schema_version: run.outputSchemaVersion,
      disclosure_version: run.disclosureVersion,
      cache_key_hash: run.cacheKeyHash,
    };
  }
}

function findBucket(fake: AccountingFake, prefix: string) {
  const bucket = [...fake.buckets.values()].find((candidate) =>
    candidate.bucket_key.startsWith(prefix),
  );
  if (!bucket) throw new Error(`Missing fake ${prefix} bucket`);
  return bucket;
}

describe("Postgres AI quota accounting", () => {
  it("keeps the provider timeout shorter than the stale-call lease", () => {
    expect(GEMINI_PROVIDER_TIMEOUT_MS).toBeLessThan(AI_PROVIDER_LEASE_MS);
  });

  it("returns an idempotent replay before applying full quota and concurrency", async () => {
    const input = submission();
    const fake = new AccountingFake({
      day: {
        attempts_reserved: 300,
        input_tokens_reserved: 600_000,
        output_tokens_reserved: 210_000,
        estimated_cost_usd_reserved: 0.465,
      },
      month: { estimated_cost_usd_reserved: 2 },
      concurrency: { active_provider_calls: 2 },
      runs: [runFromSubmission(input, { status: "succeeded", completedAt: NOW })],
    });

    const result = await reservePostgresAiProviderAttempt(input, {
      transaction: fake.transaction,
      maximumProviderAttempts: 1,
    });

    expect(result).toEqual({
      status: "replay",
      aiRunId: RUN_ID,
      runStatus: "succeeded",
    });
    expect(fake.logs.some((entry) => entry.sql.startsWith("insert into ai_runs")))
      .toBe(false);
    expect(
      fake.logs.some(
        (entry) =>
          entry.sql.startsWith("update ai_usage_buckets") &&
          entry.sql.includes("attempts_reserved = attempts_reserved + 1"),
      ),
    ).toBe(false);
  });

  it("blocks a new attempt before inserting a run or changing reservations", async () => {
    const fake = new AccountingFake({
      day: {
        attempts_reserved: 300,
        input_tokens_reserved: 600_000,
        output_tokens_reserved: 210_000,
        estimated_cost_usd_reserved: 0.465,
      },
    });

    const result = await reservePostgresAiProviderAttempt(submission(), {
      transaction: fake.transaction,
    });

    expect(result).toMatchObject({
      status: "blocked",
      reasons: expect.arrayContaining([
        "global_attempt_limit",
        "daily_input_token_limit",
        "daily_output_token_limit",
      ]),
    });
    expect(fake.runs).toEqual([]);
    expect(
      fake.logs.some(
        (entry) =>
          entry.sql.startsWith("update ai_usage_buckets") &&
          entry.sql.includes("attempts_reserved = attempts_reserved + 1"),
      ),
    ).toBe(false);
  });

  it("atomically reserves the global day, month, and concurrency buckets", async () => {
    const fake = new AccountingFake();

    const result = await reservePostgresAiProviderAttempt(submission(), {
      transaction: fake.transaction,
    });

    expect(result).toMatchObject({
      status: "reserved",
      handle: {
        aiRunId: RUN_ID,
        dayBucketKey: "global_day:2026-07-16",
        monthBucketKey: "global_month:2026-07",
        concurrencyBucketKey: "global_concurrency:singleton",
      },
      budget: {
        globalAttemptsToday: 1,
        activeProviderCalls: 1,
        reservedInputTokensToday: 2_000,
        reservedOutputTokensToday: 700,
      },
    });
    expect(fake.transactionCount).toBe(1);
    expect(fake.runs).toHaveLength(1);
    expect(findBucket(fake, "global_day:")).toMatchObject({
      attempts_reserved: 1,
      input_tokens_reserved: 2_000,
      output_tokens_reserved: 700,
      personId: null,
    });
    expect(findBucket(fake, "global_month:")).toMatchObject({
      attempts_reserved: 1,
      input_tokens_reserved: 2_000,
      output_tokens_reserved: 700,
      personId: null,
    });
    expect(findBucket(fake, "global_concurrency:")).toMatchObject({
      active_provider_calls: 1,
      personId: null,
    });

    const lockIndex = fake.logs.findIndex(
      (entry) =>
        entry.sql.includes("from ai_usage_buckets") &&
        entry.sql.includes("for update"),
    );
    const runInsertIndex = fake.logs.findIndex((entry) =>
      entry.sql.startsWith("insert into ai_runs"),
    );
    const reservationUpdateIndex = fake.logs.findIndex(
      (entry) =>
        entry.sql.startsWith("update ai_usage_buckets") &&
        entry.sql.includes("attempts_reserved = attempts_reserved + 1"),
    );
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(runInsertIndex).toBeGreaterThan(lockIndex);
    expect(reservationUpdateIndex).toBeGreaterThan(runInsertIndex);
  });

  it("blocks a third V2-7B-2 provider attempt before creating a run", async () => {
    const first = submission({
      id: "00000000-0000-4000-8000-000000007a21",
      idempotencyKeyHash: "first-key",
      cacheKeyHash: "first-cache",
    });
    const second = submission({
      id: "00000000-0000-4000-8000-000000007a22",
      idempotencyKeyHash: "second-key",
      cacheKeyHash: "second-cache",
    });
    const fake = new AccountingFake({
      runs: [
        runFromSubmission(first, { status: "succeeded", completedAt: NOW }),
        runFromSubmission(second, { status: "failed", completedAt: NOW }),
      ],
    });

    const result = await reservePostgresAiProviderAttempt(submission(), {
      transaction: fake.transaction,
      maximumProviderAttempts: 2,
    });

    expect(result).toEqual({
      status: "blocked",
      reasons: ["stage7b2_smoke_attempt_limit"],
    });
    expect(fake.runs).toHaveLength(2);
    expect(
      fake.logs.some((entry) => entry.sql.startsWith("insert into ai_runs")),
    ).toBe(false);
  });

  it("uses the V2-8-2 rollout reason for a bounded Preview proof", async () => {
    const fake = new AccountingFake({
      runs: Array.from({ length: 4 }, (_, index) => {
        const suffix = String(index + 1).padStart(2, "0");
        const input = submission({
          id: `00000000-0000-4000-8000-000000007b${suffix}`,
          idempotencyKeyHash: `preview-key-${suffix}`,
          cacheKeyHash: `preview-cache-${suffix}`,
        });
        return runFromSubmission(input, { status: "succeeded", completedAt: NOW });
      }),
    });

    const result = await reservePostgresAiProviderAttempt(submission(), {
      transaction: fake.transaction,
      maximumProviderAttempts: 4,
      maximumProviderAttemptsReason: "stage8_2_preview_rollout_attempt_limit",
    });

    expect(result).toEqual({
      status: "blocked",
      reasons: ["stage8_2_preview_rollout_attempt_limit"],
    });
    expect(fake.runs).toHaveLength(4);
  });

  it("uses the V2-8-3 rollout reason for the bounded Production opening", async () => {
    const fake = new AccountingFake({
      runs: Array.from({ length: 4 }, (_, index) => {
        const suffix = String(index + 1).padStart(2, "0");
        const input = submission({
          id: `00000000-0000-4000-8000-000000007c${suffix}`,
          idempotencyKeyHash: `production-key-${suffix}`,
          cacheKeyHash: `production-cache-${suffix}`,
        });
        return runFromSubmission(input, { status: "succeeded", completedAt: NOW });
      }),
    });

    const result = await reservePostgresAiProviderAttempt(submission(), {
      transaction: fake.transaction,
      maximumProviderAttempts: 4,
      maximumProviderAttemptsReason: "stage8_3_production_rollout_attempt_limit",
    });

    expect(result).toEqual({
      status: "blocked",
      reasons: ["stage8_3_production_rollout_attempt_limit"],
    });
    expect(fake.runs).toHaveLength(4);
  });

  it("rejects an attempt-ceiling reason without a matching ceiling", async () => {
    await expect(
      reservePostgresAiProviderAttempt(submission(), {
        transaction: new AccountingFake().transaction,
        maximumProviderAttemptsReason: "stage8_2_preview_rollout_attempt_limit",
      }),
    ).rejects.toThrow(
      "maximumProviderAttemptsReason requires maximumProviderAttempts",
    );
  });

  it("expires stale submitted leases without refunding their consumed budget", async () => {
    const reservation = buildDefaultAttemptReservation();
    const staleCreatedAt = new Date(
      Date.parse(NOW) - AI_PROVIDER_LEASE_MS - 1,
    ).toISOString();
    const staleInput = submission({
      id: "00000000-0000-4000-8000-000000007a11",
      idempotencyKeyHash: "stale-idempotency",
      cacheKeyHash: "stale-cache",
      createdAt: staleCreatedAt,
    });
    const fake = new AccountingFake({
      day: {
        attempts_reserved: 1,
        input_tokens_reserved: reservation.inputTokens,
        output_tokens_reserved: reservation.outputTokens,
        estimated_cost_usd_reserved: reservation.estimatedCostUsd,
      },
      month: {
        attempts_reserved: 1,
        input_tokens_reserved: reservation.inputTokens,
        output_tokens_reserved: reservation.outputTokens,
        estimated_cost_usd_reserved: reservation.estimatedCostUsd,
      },
      concurrency: { active_provider_calls: 1 },
      runs: [runFromSubmission(staleInput)],
    });

    const result = await reservePostgresAiProviderAttempt(submission(), {
      transaction: fake.transaction,
    });

    expect(result).toMatchObject({
      status: "reserved",
      budget: {
        globalAttemptsToday: 2,
        activeProviderCalls: 1,
      },
    });
    expect(fake.runs.find((run) => run.id === staleInput.id)).toMatchObject({
      status: "failed",
      completedAt: NOW,
    });
    expect(fake.runs.find((run) => run.id === RUN_ID)?.status).toBe("submitted");
    expect(findBucket(fake, "global_day:").attempts_reserved).toBe(2);
    expect(findBucket(fake, "global_concurrency:").active_provider_calls).toBe(1);
  });

  it("replays an already-settled run without changing run or bucket state", async () => {
    const fake = new AccountingFake();
    const reserved = await reservePostgresAiProviderAttempt(submission(), {
      transaction: fake.transaction,
    });
    if (reserved.status !== "reserved") {
      throw new Error("Expected the fake attempt to reserve");
    }
    const run = fake.runs.find((candidate) => candidate.id === RUN_ID);
    if (!run) throw new Error("Expected the fake run to exist");
    run.status = "succeeded";
    run.completedAt = NOW;
    const dayBefore = structuredClone(findBucket(fake, "global_day:"));
    const monthBefore = structuredClone(findBucket(fake, "global_month:"));
    const logStart = fake.logs.length;

    const result = await settlePostgresAiProviderAttempt(
      reserved.handle,
      {
        outcome: "succeeded",
        usage: {
          promptTokenCount: 100,
          candidatesTokenCount: 80,
          thoughtsTokenCount: 20,
          totalTokenCount: 200,
        },
        providerResponseId: "provider-response-1",
        latencyMs: 100,
        completedAt: "2026-07-16T02:31:00.000Z",
      },
      { transaction: fake.transaction },
    );

    expect(result).toEqual({ status: "replay", runStatus: "succeeded" });
    expect(findBucket(fake, "global_day:")).toEqual(dayBefore);
    expect(findBucket(fake, "global_month:")).toEqual(monthBefore);
    expect(findBucket(fake, "global_concurrency:").active_provider_calls).toBe(0);
    expect(
      fake.logs
        .slice(logStart)
        .filter((entry) => entry.sql.startsWith("update ai_usage_buckets")),
    ).toHaveLength(1);
    expect(
      fake.logs
        .slice(logStart)
        .some(
          (entry) =>
            entry.sql.startsWith("update ai_runs") &&
            entry.sql.includes("where id = $1"),
        ),
    ).toBe(false);
  });

  it("settles reliable usage once and preserves the current run during lease cleanup", async () => {
    const input = submission({
      createdAt: new Date(Date.parse(NOW) - AI_PROVIDER_LEASE_MS - 1).toISOString(),
    });
    const fake = new AccountingFake();
    const reserved = await reservePostgresAiProviderAttempt(input, {
      transaction: fake.transaction,
    });
    if (reserved.status !== "reserved") throw new Error("Expected a reservation");

    const result = await settlePostgresAiProviderAttempt(
      reserved.handle,
      {
        outcome: "succeeded",
        usage: {
          promptTokenCount: 100,
          candidatesTokenCount: 80,
          thoughtsTokenCount: 20,
          totalTokenCount: 200,
        },
        providerResponseId: "provider-response-1",
        latencyMs: 90_000,
        completedAt: NOW,
      },
      { transaction: fake.transaction, persistResult: async () => undefined },
    );

    expect(result).toEqual({ status: "settled", runStatus: "succeeded" });
    expect(fake.runs.find((run) => run.id === RUN_ID)?.status).toBe("succeeded");
    expect(findBucket(fake, "global_day:")).toMatchObject({
      attempts_reserved: 1,
      input_tokens_reserved: 100,
      output_tokens_reserved: 100,
      active_provider_calls: 0,
    });
    expect(findBucket(fake, "global_concurrency:").active_provider_calls).toBe(0);
  });

  it("rejects a successful settlement without provider usage before a transaction", async () => {
    const fake = new AccountingFake();
    const reserved = await reservePostgresAiProviderAttempt(submission(), {
      transaction: fake.transaction,
    });
    if (reserved.status !== "reserved") throw new Error("Expected a reservation");
    const transactionCountBefore = fake.transactionCount;

    await expect(
      settlePostgresAiProviderAttempt(
        reserved.handle,
        {
          outcome: "succeeded",
          usage: null,
          providerResponseId: null,
          latencyMs: 100,
          completedAt: "2026-07-16T02:31:00.000Z",
        } as never,
        { transaction: fake.transaction },
      ),
    ).rejects.toThrow("requires provider usage metadata");
    expect(fake.transactionCount).toBe(transactionCountBefore);
    expect(fake.runs.find((run) => run.id === RUN_ID)?.status).toBe("submitted");
  });

  it("never creates a person-scoped accounting bucket", async () => {
    const fake = new AccountingFake();

    await reservePostgresAiProviderAttempt(submission(), {
      transaction: fake.transaction,
    });

    expect([...fake.buckets.values()].map((bucket) => bucket.scope).sort()).toEqual([
      "global_concurrency",
      "global_day",
      "global_month",
    ]);
    expect([...fake.buckets.values()].every((bucket) => bucket.personId === null))
      .toBe(true);
    const bucketSql = fake.logs
      .filter((entry) => entry.sql.includes("ai_usage_buckets"))
      .map((entry) => entry.sql)
      .join("\n");
    expect(bucketSql).not.toContain("person_day");
    expect(bucketSql).not.toContain("person_id =");
  });
});
