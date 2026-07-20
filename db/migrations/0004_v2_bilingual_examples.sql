-- V2-8-2.2 additive bilingual-example migration.
-- Apply only after db/migrations/0003_v2_schema6_data_model.sql.
-- Existing English examples remain unchanged. Legacy rows receive one empty,
-- auditable Chinese slot per English example for a later reviewed backfill.

begin;

alter table vocabulary_items
  add column example_translations_zh jsonb not null default '[]'::jsonb;

update vocabulary_items
set example_translations_zh = coalesce(
  (
    select jsonb_agg(to_jsonb(''::text) order by example_row.ordinality)
    from jsonb_array_elements(examples) with ordinality as example_row(value, ordinality)
  ),
  '[]'::jsonb
);

alter table vocabulary_items
  add constraint vocabulary_items_example_translations_zh_array
    check (jsonb_typeof(example_translations_zh) = 'array'),
  add constraint vocabulary_items_example_translation_count_matches
    check (
      jsonb_array_length(example_translations_zh) = jsonb_array_length(examples)
    );

commit;
