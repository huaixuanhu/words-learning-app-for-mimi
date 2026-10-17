// Explicitly authorized, synthetic-only staging check. Ordinary `npm test` skips it.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { getPostgresPool, withPostgresTransaction } from "../src/lib/storage/postgres/client";
import { createPostgresRepository } from "../src/lib/storage/postgres/repository";
import { confirmGuardedTargetReady, retrieveGuardedTarget } from "./v2-1-neon-target.mjs";

const enabled = process.env.MIMI_BULK_DELETE_STAGING_VERIFY === "1";
const tables = [
  "vocabulary_relations", "ai_enrichment_drafts", "review_events", "review_states",
  "vocabulary_items", "ai_runs", "vocabulary_creation_reversals",
  "vocabulary_creation_facts", "import_batches",
] as const;

it.skipIf(!enabled)("deletes only selected staging fixtures and cleans their related records", async () => {
  const runId = randomUUID();
  const people = [randomUUID(), randomUUID()];
  const slugs = people.map((_, i) => `bulk-delete-${runId}-${i}`);
  const batches = [randomUUID(), randomUUID()];
  const items: string[] = Array.from({ length: 5 }, () => randomUUID());
  const selected = items.slice(0, 2);
  const now = new Date().toISOString();
  const evidence: Record<string, unknown> = {
    runId, startedAt: now, candidate: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    ownedPeople: people, ownedSlugs: slugs, ownedItems: items, ownedBatches: batches,
    passed: false, cleanup: "not-needed", checks: [],
  };
  const evidencePath = resolve("local_artifacts/bulk-delete-verification", `staging-${runId}.json`);
  mkdirSync(resolve("local_artifacts/bulk-delete-verification"), { recursive: true });
  const save = () => writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  const check = (label: string) => { (evidence.checks as string[]).push(label); save(); };
  let phase = "target";
  let connected = false;
  const originalEnv = { DATABASE_URL: process.env.DATABASE_URL, MIMI_STORAGE_RUNTIME: process.env.MIMI_STORAGE_RUNTIME, VERCEL_ENV: process.env.VERCEL_ENV };
  save();

  try {
    const target = await retrieveGuardedTarget("staging", { allowArchivedStaging: true });
    expect(target.safeIdentity.branchName).toBe("staging");
    evidence.identity = target.safeIdentity;
    evidence.initialBranchState = target.branchState;
    process.env.DATABASE_URL = target.connectionString;
    process.env.MIMI_STORAGE_RUNTIME = "postgres-preview";
    process.env.VERCEL_ENV = "development";
    connected = true;
    const pool = getPostgresPool();
    phase = "read-only-identity-and-schema";
    const identity = await pool.query("select current_database() as database, current_user as role");
    expect(identity.rows[0]).toEqual({ database: target.expectedDatabase, role: target.expectedRole });
    await confirmGuardedTargetReady("staging", target.safeIdentity.identityDigest);
    const schema = await pool.query(`select count(*)::integer as count from information_schema.columns
      where table_schema = 'public' and ((table_name = 'vocabulary_items' and column_name = 'example_translations_zh')
        or (table_name = 'review_states' and column_name = 'review_profile')
        or (table_name = 'review_events' and column_name = 'parameter_set_id'))`);
    expect(schema.rows[0].count).toBe(3);
    for (const table of tables) {
      const found = await pool.query("select to_regclass($1) is not null as found", [`public.${table}`]);
      expect(found.rows[0].found).toBe(true);
    }
    check("Pinned staging identity, ready branch, database/role and Schema 6 surfaces verified before writes");
    phase = "synthetic-seed";
    evidence.cleanup = "required";
    save();
    await withPostgresTransaction(async (client) => {
      await client.query("set local statement_timeout = '15s'");
      for (let i = 0; i < people.length; i++) {
        await client.query(`insert into people (id, display_name, slug, created_at, updated_at)
          values ($1, 'Synthetic bulk-delete verification', $2, $3, $3)`, [people[i], slugs[i], now]);
      }
      for (let i = 0; i < batches.length; i++) {
        await client.query(`insert into import_batches
          (id, person_id, source_type, created_at, total_rows, accepted_rows, duplicate_rows, invalid_rows)
          values ($1, $2, 'json_paste', $3, $4, $4, 0, 0)`, [batches[i], people[0], now, i === 0 ? 3 : 1]);
      }
      for (let i = 0; i < items.length; i++) {
        const person = people[i === 4 ? 1 : 0];
        const track = i === 1 ? "active" : "recognition";
        const batch = i === 4 ? null : batches[i === 1 ? 1 : 0];
        const run = randomUUID();
        await client.query(`insert into vocabulary_items
          (id, person_id, surface_text, normalized_text, source, import_batch_id, status,
           learning_track, created_at, system_created_at, updated_at, timezone)
          values ($1, $2, $3, $3, $4, $5, 'new', $6, $7, $7, $7, 'Australia/Melbourne')`,
        [items[i], person, `synthetic bulk word ${i}`, batch ? "json_paste" : "manual", batch, track, now]);
        await client.query(`insert into vocabulary_creation_facts
          (id, person_id, original_vocabulary_item_id, source_action_id, track_at_creation, source_kind, history_origin, system_created_at)
          values ($1, $2, $3, $4, $5, $6, 'recorded', $7)`,
        [randomUUID(), person, items[i], batch ?? randomUUID(), track, batch ? "batch" : "single", now]);
        await client.query(`insert into review_states
          (id, person_id, vocabulary_item_id, status, due_at, last_reviewed_at, review_count, lapse_count,
           interval_minutes, updated_at, review_profile, parameter_set_id, first_rated_at, history_origin)
          values ($1, $2, $3, 'review', $4, $4, 1, 0, 1440, $4, $5, $6, $4, 'recorded')`,
        [randomUUID(), person, items[i], now, track, `${track}-fsrs-v1`]);
        await client.query(`insert into review_events
          (id, person_id, vocabulary_item_id, reviewed_at, rating, next_due_at, next_interval_minutes,
           elapsed_ms, review_profile, activity_type, answer_outcome, target_revision, parameter_set_id)
          values ($1, $2, $3, $4, 'remembered', $4, 1440, 1000, $5, $6, 'self_rated', $7, $8)`,
        [randomUUID(), person, items[i], now, track, track === "active" ? "say" : "recognition_card",
          track === "active" ? "synthetic-revision" : null, `${track}-fsrs-v1`]);
        await client.query(`insert into ai_runs
          (id, person_id, source_vocabulary_item_id, feature, provider, model, model_label, prompt_version,
           source_hash, output_schema_version, disclosure_version, idempotency_key_hash, cache_key_hash,
           status, structure_validation_status, created_at, completed_at)
          values ($1, $2, $3, 'enrichment_v1', 'local-fixture', 'fixture-v1', 'Local preview', 'local-fixture-v1',
            $4, 'synthetic-v1', 'local-fixture-no-network-v1', $4, $4, 'succeeded', 'valid', $5, $5)`,
        [run, person, items[i], run, now]);
        await client.query(`insert into ai_enrichment_drafts
          (id, person_id, source_vocabulary_item_id, ai_run_id, status, draft_json, created_at, updated_at)
          values ($1, $2, $3, $4, 'draft', '{}', $5, $5)`, [randomUUID(), person, items[i], run, now]);
      }
      for (const [source, destination] of [[0, 2], [2, 1], [0, 1], [2, 3]]) {
        await client.query(`insert into vocabulary_relations
          (id, person_id, source_vocabulary_item_id, target_vocabulary_item_id, relation_type, difference_zh, ai_run_id, created_at)
          select $1, $2, $3, $4, 'similar', '合成验证', id, $5 from ai_runs where source_vocabulary_item_id = $3`,
        [randomUUID(), people[0], items[source], items[destination], now]);
      }
    });
    const snapshot = async () => {
      const rows: Record<string, Record<string, unknown>[]> = {};
      for (const table of tables) {
        rows[table] = (await pool.query(`select * from ${table} where person_id = any($1::uuid[]) order by id`, [people])).rows;
      }
      return rows;
    };
    const before = await snapshot();
    expect(Object.fromEntries(Object.entries(before).map(([table, rows]) => [table, rows.length]))).toEqual({
      vocabulary_relations: 4, ai_enrichment_drafts: 5, review_events: 5, review_states: 5, vocabulary_items: 5,
      ai_runs: 5, vocabulary_creation_reversals: 0, vocabulary_creation_facts: 5, import_batches: 2,
    });
    const repository = createPostgresRepository();
    const context = { personId: people[0], now, timezone: "Australia/Melbourne" };
    phase = "whole-request-rejection";
    for (const invalid of [[], [items[0], items[0]], [items[0], "invalid"], [items[0], randomUUID()], [items[0], items[4]]]) {
      await expect(repository.vocabulary.deleteItems(context, invalid)).rejects.toThrow();
      expect(await snapshot()).toEqual(before);
    }
    check("Empty, duplicate, invalid, missing and other-person IDs reject without partial deletion");
    phase = "real-bulk-delete";
    expect(await repository.vocabulary.deleteItems(context, selected)).toEqual({ deletedItemsCount: 2 });
    const after = await snapshot();
    for (const table of tables) {
      const expected = before[table].flatMap((row) => {
        if (table === "vocabulary_items" && selected.includes(String(row.id))) return [];
        if (["review_states", "review_events"].includes(table) && selected.includes(String(row.vocabulary_item_id))) return [];
        if (["ai_enrichment_drafts", "vocabulary_relations"].includes(table) &&
          (selected.includes(String(row.source_vocabulary_item_id)) || selected.includes(String(row.target_vocabulary_item_id)))) return [];
        if (table === "ai_runs" && selected.includes(String(row.source_vocabulary_item_id))) return [{ ...row, source_vocabulary_item_id: null }];
        return [row];
      });
      expect(after[table], table).toEqual(expected);
    }
    evidence.beforeCounts = Object.fromEntries(Object.entries(before).map(([table, rows]) => [table, rows.length]));
    evidence.afterCounts = Object.fromEntries(Object.entries(after).map(([table, rows]) => [table, rows.length]));
    check("Two words across batches deleted; Recognition/Active states/events, drafts and both relation directions cascaded");
    check("AI runs retained with null sources; batches and creation facts retained, including fully emptied batch");
    check("Unselected records and second synthetic learner unchanged field-for-field");
    evidence.passed = true;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "CHECK_FAILED";
    evidence.failure = { phase, code };
    // Do not let a driver error expose a connection string or credentials.
    throw new Error(`Staging bulk-delete verification failed at ${phase} (${code}); see ${evidencePath}`);
  } finally {
    try {
      if (connected) {
        const pool = getPostgresPool();
        if (evidence.cleanup === "required") {
          await withPostgresTransaction(async (client) => {
            const owned = await client.query("select id, slug from people where id = any($1::uuid[]) order by id for update", [people]);
            for (const row of owned.rows) expect(row.slug).toBe(slugs[people.indexOf(row.id)]);
            for (const table of tables) await client.query(`delete from ${table} where person_id = any($1::uuid[])`, [owned.rows.map((row) => row.id)]);
            await client.query("delete from people where id = any($1::uuid[]) and slug = any($2::text[])", [people, slugs]);
          });
          for (const table of tables) {
            const count = await pool.query(`select count(*)::integer as count from ${table} where person_id = any($1::uuid[])`, [people]);
            expect(count.rows[0].count).toBe(0);
          }
          expect((await pool.query("select id from people where id = any($1::uuid[])", [people])).rows).toEqual([]);
          evidence.cleanup = "verified-zero-owned-rows";
        }
        await pool.end();
      }
    } catch {
      evidence.passed = false;
      evidence.cleanup = "failed-needs-owned-fixture-cleanup";
      throw new Error(`Staging fixture cleanup could not be verified; see ${evidencePath}`);
    } finally {
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      evidence.finishedAt = new Date().toISOString();
      save();
      console.log(JSON.stringify({ evidencePath, passed: evidence.passed, cleanup: evidence.cleanup }));
    }
  }
}, 120_000);
