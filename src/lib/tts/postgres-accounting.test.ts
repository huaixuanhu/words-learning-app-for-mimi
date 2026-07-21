import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PostgresQueryable } from "@/lib/storage/postgres/client";
import { createPostgresTtsAccounting } from "./postgres-accounting";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function fakeTransaction(options: { active?: number; dailyCharacters?: number } = {}) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  let runStatus: "submitted" | "succeeded" | "failed" | null = null;
  const queryable = {
    async query(sql: string, values: unknown[] = []) {
      const compact = sql.replace(/\s+/gu, " ").trim();
      calls.push({ sql: compact, values });
      if (compact.includes("from tts_usage_buckets") && compact.includes("for update")) {
        const keys = values[0] as string[];
        return {
          rows: [
            {
              bucket_key: keys.find((key) => key.includes("global_day")),
              scope: "global_day",
              attempts_reserved: 0,
              characters_reserved: options.dailyCharacters ?? 0,
              estimated_cost_usd_reserved: 0,
              active_provider_calls: 0,
            },
            {
              bucket_key: keys.find((key) => key.includes("global_month")),
              scope: "global_month",
              attempts_reserved: 0,
              characters_reserved: 0,
              estimated_cost_usd_reserved: 0,
              active_provider_calls: 0,
            },
            {
              bucket_key: keys.find((key) => key.includes("global_concurrency")),
              scope: "global_concurrency",
              attempts_reserved: 0,
              characters_reserved: 0,
              estimated_cost_usd_reserved: 0,
              active_provider_calls: options.active ?? 0,
            },
          ],
          rowCount: 3,
          command: "SELECT",
          oid: 0,
          fields: [],
        };
      }
      if (compact.includes("select count(*)::integer as count from tts_runs")) {
        return {
          rows: [{ count: options.active ?? 0 }],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        };
      }
      if (compact.startsWith("select status from tts_runs")) {
        return {
          rows: runStatus ? [{ status: runStatus }] : [],
          rowCount: runStatus ? 1 : 0,
          command: "SELECT",
          oid: 0,
          fields: [],
        };
      }
      if (compact.startsWith("insert into tts_runs")) runStatus = "submitted";
      if (compact.startsWith("update tts_runs") && compact.includes("set status = $3")) {
        runStatus = values[2] as "succeeded" | "failed";
      }
      return { rows: [], rowCount: 0, command: "UPDATE", oid: 0, fields: [] };
    },
  } as unknown as PostgresQueryable;
  return {
    calls,
    transaction: async <T>(callback: (client: PostgresQueryable) => Promise<T>) =>
      callback(queryable),
  };
}

const input = {
  executionScope: "preview-tts",
  requestIdHash: hash("request-id"),
  cacheKeyHash: hash("voice-contract-and-text"),
  voiceContractId: "standard-voice-v1",
  characterCount: 5,
  now: "2026-07-21T02:00:00.000Z",
};

describe("Postgres TTS accounting", () => {
  it("reserves before submission, stores no raw text, and releases concurrency on success", async () => {
    const fake = fakeTransaction();
    const accounting = createPostgresTtsAccounting(fake.transaction);
    const result = await accounting.reserve(input);
    expect(result.status).toBe("reserved");
    if (result.status !== "reserved") throw new Error("reservation missing");
    await accounting.settle(result.handle, {
      outcome: "succeeded",
      terminalCategory: null,
      latencyMs: 120,
      completedAt: "2026-07-21T02:00:00.120Z",
    });
    const transcript = JSON.stringify(fake.calls);
    expect(transcript).not.toContain("adapt");
    expect(transcript).not.toContain("person_id");
    expect(fake.calls.findIndex((call) => call.sql.startsWith("insert into tts_runs"))).toBeGreaterThan(-1);
    expect(fake.calls.some((call) => call.sql.includes("active_provider_calls = greatest"))).toBe(true);
  });

  it("blocks before inserting a run when the daily character boundary is closed", async () => {
    const fake = fakeTransaction({ dailyCharacters: 99_999 });
    const accounting = createPostgresTtsAccounting(fake.transaction);
    await expect(accounting.reserve(input)).resolves.toMatchObject({
      status: "blocked",
      reasons: expect.arrayContaining(["daily_character_limit"]),
    });
    expect(fake.calls.some((call) => call.sql.startsWith("insert into tts_runs"))).toBe(false);
  });
});
