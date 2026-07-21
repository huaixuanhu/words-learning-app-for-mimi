import { describe, expect, it } from "vitest";

import { EXPECTED_SCHEMA5_TABLES } from "./schema5-inspection.mjs";
import {
  inspectSchema6Structure,
  assertFreshSchema5To6MigrationShape,
  V2_STAGE8_3_SCHEMA6_COLUMNS,
  V2_STAGE8_3_SCHEMA6_CONSTRAINTS,
  V2_STAGE8_3_SCHEMA6_INDEXES,
  V2_STAGE8_3_SCHEMA6_TABLES,
  V2_STAGE8_3_SCHEMA6_TRIGGERS,
  withReadOnlySnapshot,
} from "./v2-stage8-3-db-core.mjs";

function structureClient(options = {}) {
  const missingIndex = options.missingIndex;
  return {
    async query(sql) {
      if (sql.includes("information_schema.tables")) {
        return {
          rows: [...EXPECTED_SCHEMA5_TABLES, ...V2_STAGE8_3_SCHEMA6_TABLES]
            .sort()
            .map((table_name) => ({ table_name })),
        };
      }
      if (sql.includes("information_schema.table_constraints")) {
        return {
          rows: V2_STAGE8_3_SCHEMA6_CONSTRAINTS.map((constraint_name) => ({
            constraint_name,
          })),
        };
      }
      if (sql.includes("information_schema.columns")) {
        return {
          rows: V2_STAGE8_3_SCHEMA6_COLUMNS.map(
            ([table_name, column_name, data_type, is_nullable]) => ({
              table_name,
              column_name,
              data_type,
              is_nullable,
            }),
          ),
        };
      }
      if (sql.includes("from pg_indexes")) {
        return {
          rows: V2_STAGE8_3_SCHEMA6_INDEXES.filter(
            (index) => index !== missingIndex,
          ).map((indexname) => ({ indexname })),
        };
      }
      if (sql.includes("information_schema.triggers")) {
        return {
          rows: V2_STAGE8_3_SCHEMA6_TRIGGERS.map(
            ([event_object_table, trigger_name]) => ({
              event_object_table,
              trigger_name,
            }),
          ),
        };
      }
      throw new Error(`Unexpected inspection query: ${sql}`);
    },
  };
}

describe("V2-8-3 Schema 6 structure inspection", () => {
  it("accepts the locked table, column, constraint, index, and trigger inventory", async () => {
    await expect(inspectSchema6Structure(structureClient())).resolves.toEqual({
      columns: V2_STAGE8_3_SCHEMA6_COLUMNS.length,
      constraints: V2_STAGE8_3_SCHEMA6_CONSTRAINTS.length,
      indexes: V2_STAGE8_3_SCHEMA6_INDEXES.length,
      tables: EXPECTED_SCHEMA5_TABLES.length + V2_STAGE8_3_SCHEMA6_TABLES.length,
      triggers: V2_STAGE8_3_SCHEMA6_TRIGGERS.length,
    });
  });

  it("fails closed when one required migration index is absent", async () => {
    await expect(
      inspectSchema6Structure(
        structureClient({ missingIndex: V2_STAGE8_3_SCHEMA6_INDEXES[0] }),
      ),
    ).rejects.toThrow(/index inventory is incomplete/u);
  });
});

describe("V2-8-3 consistent read-only inventory", () => {
  it("commits one repeatable-read snapshot after success", async () => {
    const queries = [];
    const client = {
      async query(sql) {
        queries.push(sql);
      },
    };

    await expect(
      withReadOnlySnapshot(client, async () => "inventory"),
    ).resolves.toBe("inventory");
    expect(queries).toEqual([
      "begin transaction isolation level repeatable read read only",
      "commit",
    ]);
  });

  it("rolls the read-only snapshot back after inspection failure", async () => {
    const queries = [];
    const client = {
      async query(sql) {
        queries.push(sql);
      },
    };

    await expect(
      withReadOnlySnapshot(client, async () => {
        throw new Error("inspection failed");
      }),
    ).rejects.toThrow(/inspection failed/u);
    expect(queries).toEqual([
      "begin transaction isolation level repeatable read read only",
      "rollback",
    ]);
  });
});

describe("V2-8-3 fresh migration shape", () => {
  const counts = {
    review_settings: 2,
    review_states: 3,
    review_events: 4,
    recognition_review_states: 3,
    active_review_states: 0,
    recognition_review_events: 4,
    active_review_events: 0,
    daily_study_defaults: 4,
    daily_study_plans: 0,
    vocabulary_items: 5,
    vocabulary_creation_facts: 5,
    vocabulary_creation_reversals: 0,
    ai_runs: 0,
    ai_disclosure_confirmations: 0,
    ai_request_idempotency: 0,
    ai_enrichment_drafts: 0,
    ai_context_explanation_cache: 0,
    vocabulary_relations: 0,
    ai_usage_buckets: 0,
    study_command_idempotency: 0,
    tts_runs: 0,
    tts_usage_buckets: 0,
  };

  it("accepts Recognition-only history, two defaults per person setting, and no invented V2 activity", () => {
    expect(assertFreshSchema5To6MigrationShape(counts)).toBe(true);
  });

  it("rejects invented Active history or an incomplete legacy creation backfill", () => {
    expect(() =>
      assertFreshSchema5To6MigrationShape({
        ...counts,
        active_review_events: 1,
      }),
    ).toThrow(/active_review_events/u);
    expect(() =>
      assertFreshSchema5To6MigrationShape({
        ...counts,
        vocabulary_creation_facts: 4,
      }),
    ).toThrow(/vocabulary_creation_facts/u);
  });
});
