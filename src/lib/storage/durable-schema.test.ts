import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "db", "migrations", "0001_initial.sql"),
  "utf8",
);
const productionMigrationSql = readFileSync(
  join(process.cwd(), "db", "migrations", "0002_schema5_production_runtime.sql"),
  "utf8",
);

function tableBlock(tableName: string) {
  const match = migrationSql.match(
    new RegExp(`create table ${tableName} \\([\\s\\S]*?\\n\\);`, "i"),
  );

  if (!match) {
    throw new Error(`Missing table: ${tableName}`);
  }

  return match[0];
}

describe("durable storage schema", () => {
  it("declares all durable storage tables", () => {
    const expectedTables = [
      "people",
      "import_batches",
      "vocabulary_items",
      "review_states",
      "review_events",
      "review_settings",
      "backup_imports",
      "backup_import_mappings",
    ];

    for (const table of expectedTables) {
      expect(tableBlock(table)).toContain(`create table ${table}`);
    }
  });

  it("keeps all durable learning data scoped by person_id", () => {
    const personScopedTables = [
      "import_batches",
      "vocabulary_items",
      "review_states",
      "review_events",
      "review_settings",
      "backup_imports",
      "backup_import_mappings",
    ];

    for (const table of personScopedTables) {
      expect(tableBlock(table)).toMatch(/\bperson_id uuid not null\b/i);
    }
  });

  it("enforces person-scoped relationships and review uniqueness", () => {
    expect(tableBlock("vocabulary_items")).toContain(
      "constraint vocabulary_items_import_batch_person_fk foreign key (person_id, import_batch_id)",
    );
    expect(tableBlock("review_states")).toContain(
      "constraint review_states_vocabulary_person_fk foreign key (person_id, vocabulary_item_id)",
    );
    expect(tableBlock("review_events")).toContain(
      "constraint review_events_vocabulary_person_fk foreign key (person_id, vocabulary_item_id)",
    );
    expect(tableBlock("review_states")).toContain(
      "constraint review_states_person_item_unique unique (person_id, vocabulary_item_id)",
    );
    expect(tableBlock("backup_import_mappings")).toContain(
      "constraint backup_import_mappings_import_person_fk foreign key (person_id, backup_import_id)",
    );
  });

  it("keeps review state fields neutral for the Stage 8 FSRS handoff", () => {
    const reviewStates = tableBlock("review_states");
    const reviewEvents = tableBlock("review_events");

    expect(reviewStates).toMatch(/\bdue_at timestamptz not null\b/i);
    expect(reviewStates).toMatch(/\bdifficulty double precision null\b/i);
    expect(reviewStates).toMatch(/\bstability double precision null\b/i);
    expect(reviewStates).toMatch(/\binterval_minutes integer not null\b/i);
    expect(reviewStates).toContain("constraint review_states_person_item_unique unique (person_id, vocabulary_item_id)");
    expect(reviewStates).toContain("interval_minutes > 0");
    expect(reviewStates).not.toMatch(/recognition_(difficulty|stability)|active_(difficulty|stability)/i);

    expect(reviewEvents).toMatch(/\bnext_due_at timestamptz not null\b/i);
    expect(reviewEvents).toMatch(/\bnext_interval_minutes integer not null\b/i);
    expect(reviewEvents).toContain("rating in ('forgot', 'hard', 'vague', 'remembered')");
    expect(reviewEvents).not.toMatch(/recognition_|active_/i);
  });

  it("adds person-scoped indexes needed by the future adapter", () => {
    const expectedIndexes = [
      "create index import_batches_person_created_at_idx",
      "create index vocabulary_items_person_normalized_text_idx",
      "create index vocabulary_items_person_status_idx",
      "create index review_states_person_due_at_idx",
      "create index review_events_person_reviewed_at_idx",
      "create index review_events_person_vocabulary_reviewed_at_idx",
      "create index backup_imports_person_imported_at_idx",
      "create index backup_import_mappings_person_backup_idx",
    ];

    for (const index of expectedIndexes) {
      expect(migrationSql).toContain(index);
    }
  });

  it("keeps migration SQL free of credentials and production execution assumptions", () => {
    expect(migrationSql).not.toMatch(/database_url|postgres_url|@vercel\/postgres/i);
    expect(migrationSql).toContain("non-production Neon development/preview database");
    expect(migrationSql).toContain("Production execution still requires separate human confirmation");
  });

  it("adds schema version 5 vocabulary fields in the Production runtime migration", () => {
    expect(productionMigrationSql).toContain("add column learning_track text not null default 'recognition'");
    expect(productionMigrationSql).toContain("add column tags jsonb null");
    expect(productionMigrationSql).toContain("add column meanings_zh jsonb not null default '[]'::jsonb");
    expect(productionMigrationSql).toContain("add column examples jsonb not null default '[]'::jsonb");
    expect(productionMigrationSql).toContain("vocabulary_items_learning_track_valid");
    expect(productionMigrationSql).toContain("learning_track in ('recognition', 'active')");
    expect(productionMigrationSql).toContain("vocabulary_items_tags_array_or_null");
    expect(productionMigrationSql).toContain("vocabulary_items_meanings_zh_array");
    expect(productionMigrationSql).toContain("vocabulary_items_examples_array");
    expect(productionMigrationSql).toContain("vocabulary_items_person_learning_track_idx");
  });

  it("allows schema version 5 import sources and backup imports in the Production runtime migration", () => {
    expect(productionMigrationSql).toContain("source_type in ('txt_file', 'pasted_text', 'json_file', 'json_paste')");
    expect(productionMigrationSql).toContain("source in ('manual', 'txt_file', 'pasted_text', 'json_file', 'json_paste')");
    expect(productionMigrationSql).toContain("schema_version in (2, 3, 4, 5)");
  });

  it("adds separate Recognition and Active review limits in the Production runtime migration", () => {
    expect(productionMigrationSql).toContain("add column recognition_session_limit integer null");
    expect(productionMigrationSql).toContain("add column active_session_limit integer null");
    expect(productionMigrationSql).toContain("recognition_session_limit = session_limit");
    expect(productionMigrationSql).toContain("active_session_limit = 8");
    expect(productionMigrationSql).toContain("review_settings_recognition_session_limit_range");
    expect(productionMigrationSql).toContain("review_settings_active_session_limit_range");
  });

  it("keeps the Stage 8 review state shape neutral in the Production runtime migration", () => {
    expect(productionMigrationSql).not.toMatch(
      /scheduled_days|scheduler_version|recognition_difficulty|recognition_stability|active_difficulty|active_stability/i,
    );
    expect(productionMigrationSql).not.toMatch(/\badd column difficulty\b/i);
    expect(productionMigrationSql).not.toMatch(/\badd column stability\b/i);
  });

  it("adds database-level guards against Active review rows in the Production runtime migration", () => {
    expect(productionMigrationSql).toContain("create or replace function ensure_v1_recognition_review_target()");
    expect(productionMigrationSql).toContain("vocabulary_items.learning_track <> 'recognition'");
    expect(productionMigrationSql).toContain("create trigger review_states_recognition_only");
    expect(productionMigrationSql).toContain("on review_states");
    expect(productionMigrationSql).toContain("create trigger review_events_recognition_only");
    expect(productionMigrationSql).toContain("on review_events");
  });

  it("keeps the Production runtime migration local and credential-free", () => {
    expect(productionMigrationSql).toContain("Apply only after db/migrations/0001_initial.sql");
    expect(productionMigrationSql).toContain("Remote database execution still requires separate Tier 3 approval");
    expect(productionMigrationSql).not.toMatch(/database_url|postgres_url|neon_.*key|password|secret|@vercel\/postgres/i);
  });
});
