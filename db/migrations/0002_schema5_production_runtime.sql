-- Stage 6B-P1-B schema version 5 Production runtime draft.
-- Apply only after db/migrations/0001_initial.sql.
-- Local/static validation is allowed in Stage 6B-P1-B.
-- Remote database execution still requires separate Tier 3 approval, confirmed
-- non-production target first, explicit backup/import planning, and no
-- credential printing.

begin;

alter table import_batches
  drop constraint import_batches_source_type_valid;

alter table import_batches
  add constraint import_batches_source_type_valid
  check (source_type in ('txt_file', 'pasted_text', 'json_file', 'json_paste'));

alter table vocabulary_items
  add column learning_track text not null default 'recognition',
  add column tags jsonb null,
  add column meanings_zh jsonb not null default '[]'::jsonb,
  add column examples jsonb not null default '[]'::jsonb;

update vocabulary_items
set meanings_zh = case
  when length(trim(meaning_zh)) > 0 then jsonb_build_array(meaning_zh)
  else '[]'::jsonb
end
where meanings_zh = '[]'::jsonb;

update vocabulary_items
set examples = case
  when length(trim(example)) > 0 then jsonb_build_array(example)
  else '[]'::jsonb
end
where examples = '[]'::jsonb;

alter table vocabulary_items
  drop constraint vocabulary_items_source_valid;

alter table vocabulary_items
  add constraint vocabulary_items_learning_track_valid
  check (learning_track in ('recognition', 'active')),
  add constraint vocabulary_items_tags_array_or_null
  check (tags is null or jsonb_typeof(tags) = 'array'),
  add constraint vocabulary_items_meanings_zh_array
  check (jsonb_typeof(meanings_zh) = 'array'),
  add constraint vocabulary_items_examples_array
  check (jsonb_typeof(examples) = 'array'),
  add constraint vocabulary_items_source_valid
  check (source in ('manual', 'txt_file', 'pasted_text', 'json_file', 'json_paste'));

alter table review_settings
  add column recognition_session_limit integer null,
  add column active_session_limit integer null;

update review_settings
set
  recognition_session_limit = session_limit,
  active_session_limit = 8
where recognition_session_limit is null
  or active_session_limit is null;

alter table review_settings
  alter column recognition_session_limit set not null,
  alter column active_session_limit set not null,
  add constraint review_settings_recognition_session_limit_range
  check (recognition_session_limit between 1 and 80),
  add constraint review_settings_active_session_limit_range
  check (active_session_limit between 1 and 80);

alter table backup_imports
  drop constraint backup_imports_schema_version_supported;

alter table backup_imports
  add constraint backup_imports_schema_version_supported
  check (schema_version in (2, 3, 4, 5));

create index vocabulary_items_person_learning_track_idx
  on vocabulary_items(person_id, learning_track);

create or replace function ensure_v1_recognition_review_target()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from vocabulary_items
    where vocabulary_items.person_id = new.person_id
      and vocabulary_items.id = new.vocabulary_item_id
      and vocabulary_items.learning_track <> 'recognition'
  ) then
    raise exception 'V1 review records can target only Recognition vocabulary items';
  end if;

  return new;
end;
$$;

create trigger review_states_recognition_only
before insert or update of person_id, vocabulary_item_id
on review_states
for each row
execute function ensure_v1_recognition_review_target();

create trigger review_events_recognition_only
before insert or update of person_id, vocabulary_item_id
on review_events
for each row
execute function ensure_v1_recognition_review_target();

commit;
