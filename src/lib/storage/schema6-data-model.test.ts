import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "db", "migrations", "0003_v2_schema6_data_model.sql"),
  "utf8",
);
const bilingualMigrationSql = readFileSync(
  join(process.cwd(), "db", "migrations", "0004_v2_bilingual_examples.sql"),
  "utf8",
);
const backupSource = readFileSync(
  join(process.cwd(), "src", "lib", "backup", "json-backup.ts"),
  "utf8",
);

describe("V2 Schema Version 6 data model", () => {
  it("adds bilingual example slots without rewriting the Schema 6 migration", () => {
    expect(bilingualMigrationSql).toContain(
      "Apply only after db/migrations/0003_v2_schema6_data_model.sql",
    );
    expect(bilingualMigrationSql).toContain(
      "add column example_translations_zh jsonb not null",
    );
    expect(bilingualMigrationSql).toContain(
      "vocabulary_items_example_translation_count_matches",
    );
    expect(bilingualMigrationSql).toContain("jsonb_array_length(examples)");
    expect(bilingualMigrationSql.trimEnd()).toMatch(/commit;$/u);
    expect(bilingualMigrationSql).not.toMatch(
      /database_url\s*=|postgres_url\s*=|AIza|AQ\.|password\s*=|secret\s*=/iu,
    );
  });
  it("is forward-only, transaction-wrapped, and credential-free", () => {
    expect(migrationSql.trimStart()).toMatch(/^-- V2 Stage 3/);
    expect(migrationSql).toContain("begin;");
    expect(migrationSql.trimEnd()).toMatch(/commit;$/);
    expect(migrationSql).toContain("Apply only after db/migrations/0001_initial.sql");
    expect(migrationSql).toContain("db/migrations/0002_schema5_production_runtime.sql");
    expect(migrationSql).not.toMatch(
      /database_url\s*=|postgres_url\s*=|AIza|AQ\.|password\s*=|secret\s*=/i,
    );
  });

  it("adds both profile-aware review state and bounded activity evidence", () => {
    expect(migrationSql).toContain("add column review_profile text null");
    expect(migrationSql).toContain("add column parameter_set_id text null");
    expect(migrationSql).toContain("add column first_rated_at timestamptz null");
    expect(migrationSql).toContain("add column history_origin text null");
    expect(migrationSql).toContain(
      "unique (person_id, vocabulary_item_id, review_profile)",
    );
    expect(migrationSql).toContain("activity_type in ('recognition_card', 'say', 'spell', 'dictation')");
    expect(migrationSql).toContain("elapsed_ms between 0 and 90000000");
    expect(migrationSql).toContain("target_revision is not null");
    expect(migrationSql).toContain("parameter_set_id = 'recognition-fsrs-v1'");
  });

  it("migrates retained V1 history only into Recognition", () => {
    expect(migrationSql).toContain("review_profile = 'recognition'");
    expect(migrationSql).toContain("select min(review_events.reviewed_at)");
    expect(migrationSql).toContain("when first_rated_at is null then 'legacy_unknown'");
    expect(migrationSql).toContain("drop trigger if exists review_states_recognition_only");
    expect(migrationSql).toContain("drop trigger if exists review_events_recognition_only");
  });

  it("declares daily plans and immutable creation/reversal evidence", () => {
    for (const table of [
      "daily_study_defaults",
      "daily_study_plans",
      "vocabulary_creation_facts",
      "vocabulary_creation_reversals",
    ]) {
      expect(migrationSql).toContain(`create table ${table}`);
    }
    expect(migrationSql).toContain(
      "unique (person_id, review_profile, local_date)",
    );
    expect(migrationSql).toContain(
      "unique (person_id, source_action_id, original_vocabulary_item_id)",
    );
    expect(migrationSql).toContain("'legacy_backfill'");
    expect(migrationSql).toContain("vocabulary_items.system_created_at");
    expect(migrationSql).toContain("ensure_creation_reversal_targets_batch");
    expect(migrationSql).toContain("protect_daily_study_plan_history");
    expect(migrationSql).toContain("A daily-plan goal edit must increment plan_version by one");
  });

  it("separates formal AI lineage from operational quota and replay state", () => {
    for (const table of [
      "ai_runs",
      "ai_enrichment_drafts",
      "ai_context_explanation_cache",
      "vocabulary_relations",
      "ai_usage_buckets",
      "ai_disclosure_confirmations",
      "ai_request_idempotency",
      "study_command_idempotency",
    ]) {
      expect(migrationSql).toContain(`create table ${table}`);
    }
    expect(migrationSql).toContain("ensure_ai_run_source_person");
    expect(migrationSql).toContain("provider text not null");
    expect(migrationSql).toContain("'google-gemini-api', 'local-fixture'");
    expect(migrationSql).toContain("feature in ('enrichment_v1', 'context_explain_v1')");
    expect(migrationSql).toContain("ai_runs_lifecycle_consistent");
    expect(migrationSql).toContain("ai_runs_provider_lineage_consistent");
    expect(migrationSql).toContain("ai_runs_success_usage_present");
    expect(migrationSql).toContain("terminal_category text null");
    expect(migrationSql).toContain("ai_request_idempotency_processing_cache_unique");
    expect(migrationSql).toContain("ai-disclosure-v3");
    expect(migrationSql).toContain("model = 'fixture-v1'");
    expect(migrationSql).toContain("model_label = 'Local preview'");
    expect(migrationSql).toContain("disclosure_version = 'local-fixture-no-network-v1'");
    expect(migrationSql).toContain(
      "total_tokens::bigint >=",
    );
    expect(backupSource).toContain("selectFormalBackupData");
    expect(backupSource).not.toContain("aiUsageBuckets:");
    expect(backupSource).not.toContain("studyCommandIdempotency:");
    expect(backupSource).not.toContain("aiContextExplanationCache:");
    expect(backupSource).not.toContain("aiDisclosureConfirmations:");
    expect(backupSource).not.toContain("aiRequestIdempotency:");
  });

  it("keeps context explanations temporary and tied to one trusted source span", () => {
    const backupMappingSection = migrationSql.slice(
      migrationSql.indexOf("alter table backup_import_mappings"),
      migrationSql.indexOf("create index daily_study_plans_person_date_idx"),
    );

    expect(migrationSql).toContain("ai_context_cache_span_bounded");
    expect(migrationSql).toContain("selected_end - selected_start <= 120");
    expect(migrationSql).toContain("explanation_json ?& array[");
    expect(migrationSql).toContain(") = '{}'::jsonb");
    expect(migrationSql).toContain(
      "char_length(explanation_json ->> 'contextExplanationZh') <= 400",
    );
    expect(migrationSql).toContain("ensure_context_cache_run_valid");
    expect(migrationSql).toContain("source_vocabulary_item_id = new.source_vocabulary_item_id");
    expect(migrationSql).toContain("feature = 'context_explain_v1'");
    expect(migrationSql).toContain("status = 'succeeded'");
    expect(migrationSql).toContain("structure_validation_status = 'valid'");
    expect(migrationSql).toContain("ai_context_explanation_cache_expiry_idx");
    expect(migrationSql).toContain("ensure_enrichment_lineage_run_valid");
    expect(migrationSql).toContain("ai_enrichment_drafts_run_feature_guard");
    expect(migrationSql).toContain(
      "before insert or update of person_id, source_vocabulary_item_id, ai_run_id",
    );
    expect(migrationSql).not.toContain("person_day");
    expect(migrationSql).toContain("vocabulary_relations_run_feature_guard");
    expect(backupMappingSection).not.toContain("'ai_context_explanation_cache'");
  });

  it("allows Schema Version 6 backup mappings for every formal domain", () => {
    expect(migrationSql).toContain("schema_version in (2, 3, 4, 5, 6)");
    for (const entityType of [
      "daily_study_default",
      "daily_study_plan",
      "vocabulary_creation_fact",
      "vocabulary_creation_reversal",
      "ai_run",
      "ai_enrichment_draft",
      "vocabulary_relation",
    ]) {
      expect(migrationSql).toContain(`'${entityType}'`);
    }
  });
});
