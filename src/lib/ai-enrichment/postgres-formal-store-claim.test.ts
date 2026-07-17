import { describe, expect, it } from "vitest";
import {
  AI_REQUEST_OWNERSHIP_LEASE_MS,
  claimPostgresFormalAiRequest,
} from "./postgres-formal-store";
import type { FormalAiRequestIdentity } from "./formal-orchestration";
import type { PostgresQueryable } from "@/lib/storage/postgres/client";

type Row = {
  personId: string;
  idempotencyKeyHash: string;
  requestHash: string;
  cacheKeyHash: string;
  status: "processing" | "succeeded" | "failed";
  resultAiRunId: string | null;
  terminalCategory: string | null;
  leaseExpiresAt: string | null;
};

function result<T extends object>(rows: T[]) {
  return { rows, rowCount: rows.length, command: "", oid: 0, fields: [] };
}

class ClaimFake {
  rows: Row[] = [];

  transaction = async <T>(callback: (queryable: PostgresQueryable) => Promise<T>) =>
    callback(this.queryable);

  queryable: PostgresQueryable = {
    query: async <T extends object = Record<string, unknown>>(
      queryText: string,
      values: unknown[] = [],
    ) => {
      const sql = queryText.replace(/\s+/gu, " ").trim().toLocaleLowerCase("en-US");
      if (sql.startsWith("select pg_advisory_xact_lock")) return result([]) as never;
      if (sql.startsWith("update ai_request_idempotency") && sql.includes("request_lease_expired")) {
        const now = Date.parse(String(values[2]));
        for (const row of this.rows) {
          if (
            row.personId === values[0] &&
            row.cacheKeyHash === values[1] &&
            row.status === "processing" &&
            row.leaseExpiresAt &&
            Date.parse(row.leaseExpiresAt) <= now
          ) {
            row.status = "failed";
            row.terminalCategory = "request_lease_expired";
            row.leaseExpiresAt = null;
          }
        }
        return result([]) as never;
      }
      if (sql.includes("from ai_request_idempotency") && sql.includes("idempotency_key_hash = $2")) {
        const row = this.rows.find(
          (candidate) => candidate.personId === values[0] && candidate.idempotencyKeyHash === values[1],
        );
        return result(row ? [{
          request_hash: row.requestHash,
          status: row.status,
          result_ai_run_id: row.resultAiRunId,
          terminal_category: row.terminalCategory,
          lease_expires_at: row.leaseExpiresAt,
        }] : []) as never;
      }
      if (sql.includes("from ai_runs") && sql.includes("cache_key_hash = $2")) {
        return result([]) as never;
      }
      if (sql.startsWith("insert into ai_request_idempotency")) {
        const conflict = this.rows.some((row) =>
          (row.personId === values[0] && row.idempotencyKeyHash === values[1]) ||
          (row.personId === values[0] && row.cacheKeyHash === values[3] && row.status === "processing"));
        if (conflict) return result([]) as never;
        this.rows.push({
          personId: String(values[0]),
          idempotencyKeyHash: String(values[1]),
          requestHash: String(values[2]),
          cacheKeyHash: String(values[3]),
          status: "processing",
          resultAiRunId: null,
          terminalCategory: null,
          leaseExpiresAt: String(values[7]),
        });
        return result([{ person_id: String(values[0]) }] as unknown as T[]) as never;
      }
      throw new Error(`Unhandled claim SQL: ${sql}`);
    },
  };
}

function identity(overrides: Partial<FormalAiRequestIdentity> = {}): FormalAiRequestIdentity {
  return {
    personId: "00000000-0000-4000-8000-000000007b41",
    vocabularyEntryId: "00000000-0000-4000-8000-000000007b42",
    feature: "enrichment_v1",
    sourceHash: "source-hash",
    requestHash: "request-hash",
    idempotencyKeyHash: "idempotency-one",
    cacheKeyHash: "cache-one",
    disclosureVersion: "ai-disclosure-v2",
    disclosureDigest: "disclosure-digest",
    now: "2026-07-17T00:00:00.000Z",
    ...overrides,
  };
}

const payload = { term: "adapt", meaningsZh: ["适应"], examples: [] };

describe("V2-7B-1 Postgres request ownership", () => {
  it("gives one request ownership and suppresses a different key for the same Cache", async () => {
    const fake = new ClaimFake();
    expect(await claimPostgresFormalAiRequest(identity(), payload, { transaction: fake.transaction }))
      .toEqual({ status: "owner" });
    expect(await claimPostgresFormalAiRequest(identity({
      idempotencyKeyHash: "idempotency-two",
    }), payload, { transaction: fake.transaction })).toEqual({ status: "processing" });
    expect(fake.rows).toHaveLength(1);
  });

  it("returns stable processing and conflict results for an existing key", async () => {
    const fake = new ClaimFake();
    await claimPostgresFormalAiRequest(identity(), payload, { transaction: fake.transaction });
    expect(await claimPostgresFormalAiRequest(identity(), payload, { transaction: fake.transaction }))
      .toEqual({ status: "processing" });
    await expect(claimPostgresFormalAiRequest(identity({ requestHash: "different" }), payload, {
      transaction: fake.transaction,
    })).rejects.toThrow("conflicts");
  });

  it("closes an expired owner without refund and permits a new key to own the Cache", async () => {
    const fake = new ClaimFake();
    await claimPostgresFormalAiRequest(identity(), payload, { transaction: fake.transaction });
    const afterLease = new Date(
      Date.parse(identity().now) + AI_REQUEST_OWNERSHIP_LEASE_MS + 1,
    ).toISOString();
    expect(await claimPostgresFormalAiRequest(identity({ now: afterLease }), payload, {
      transaction: fake.transaction,
    })).toEqual({ status: "failed", terminalCategory: "request_lease_expired" });
    expect(await claimPostgresFormalAiRequest(identity({
      now: afterLease,
      idempotencyKeyHash: "idempotency-two",
    }), payload, { transaction: fake.transaction })).toEqual({ status: "owner" });
    expect(fake.rows.map((row) => row.status)).toEqual(["failed", "processing"]);
  });
});
