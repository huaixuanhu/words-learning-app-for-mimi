-- V2 Stage 3 Schema Version 6 data-model draft, amended by V2 Stage 3.1.
-- Apply only after db/migrations/0001_initial.sql and
-- db/migrations/0002_schema5_production_runtime.sql.
-- Local/static validation is allowed in V2 Stage 3. Any Development / Staging
-- or Production execution requires a separate Tier 3 approval, an exact target
-- check, and the accepted backup/rehearsal gate. This file contains no credential.

begin;

alter table vocabulary_items
  drop constraint vocabulary_items_source_valid;

alter table vocabulary_items
  add constraint vocabulary_items_source_valid
  check (
    source in (
      'manual',
      'txt_file',
      'pasted_text',
      'json_file',
      'json_paste',
      'ai_generated'
    )
  );

drop trigger if exists review_states_recognition_only on review_states;
drop trigger if exists review_events_recognition_only on review_events;
drop function if exists ensure_v1_recognition_review_target();

alter table review_states
  add column review_profile text null,
  add column parameter_set_id text null,
  add column first_rated_at timestamptz null,
  add column history_origin text null;

update review_states
set
  review_profile = 'recognition',
  parameter_set_id = 'recognition-fsrs-v1',
  first_rated_at = (
    select min(review_events.reviewed_at)
    from review_events
    where review_events.person_id = review_states.person_id
      and review_events.vocabulary_item_id = review_states.vocabulary_item_id
  );

update review_states
set history_origin = case
  when first_rated_at is null then 'legacy_unknown'
  else 'recorded'
end;

alter table review_states
  alter column review_profile set not null,
  alter column parameter_set_id set not null,
  alter column history_origin set not null,
  drop constraint review_states_person_item_unique,
  add constraint review_states_person_item_profile_unique
    unique (person_id, vocabulary_item_id, review_profile),
  add constraint review_states_review_profile_valid
    check (review_profile in ('recognition', 'active')),
  add constraint review_states_parameter_set_not_blank
    check (length(trim(parameter_set_id)) > 0),
  add constraint review_states_parameter_set_profile_valid
    check (
      (review_profile = 'recognition' and parameter_set_id = 'recognition-fsrs-v1')
      or
      (review_profile = 'active' and parameter_set_id <> 'recognition-fsrs-v1')
    ),
  add constraint review_states_history_origin_valid
    check (history_origin in ('recorded', 'legacy_unknown')),
  add constraint review_states_first_rating_origin_consistent
    check (
      (history_origin = 'recorded' and first_rated_at is not null)
      or
      (history_origin = 'legacy_unknown' and first_rated_at is null)
    );

alter table review_events
  add column prompt_id uuid null,
  add column review_profile text null,
  add column activity_type text null,
  add column answer_outcome text null,
  add column answer_normalization_version text null,
  add column target_revision text null,
  add column parameter_set_id text null;

update review_events
set
  review_profile = 'recognition',
  activity_type = 'recognition_card',
  answer_outcome = 'self_rated',
  answer_normalization_version = null,
  target_revision = null,
  parameter_set_id = 'recognition-fsrs-v1';

alter table review_events
  alter column review_profile set not null,
  alter column activity_type set not null,
  alter column answer_outcome set not null,
  alter column parameter_set_id set not null,
  drop constraint review_events_elapsed_ms_non_negative,
  add constraint review_events_elapsed_ms_range
    check (elapsed_ms between 0 and 90000000),
  add constraint review_events_review_profile_valid
    check (review_profile in ('recognition', 'active')),
  add constraint review_events_activity_type_valid
    check (activity_type in ('recognition_card', 'say', 'spell', 'dictation')),
  add constraint review_events_answer_outcome_valid
    check (
      answer_outcome in (
        'self_rated',
        'exact',
        'normalized_match',
        'different',
        'revealed_without_answer'
      )
    ),
  add constraint review_events_parameter_set_not_blank
    check (length(trim(parameter_set_id)) > 0),
  add constraint review_events_profile_evidence_consistent
    check (
      (
        review_profile = 'recognition'
        and activity_type = 'recognition_card'
        and answer_outcome = 'self_rated'
        and answer_normalization_version is null
        and target_revision is null
        and parameter_set_id = 'recognition-fsrs-v1'
      )
      or
      (
        review_profile = 'active'
        and activity_type = 'say'
        and answer_outcome = 'self_rated'
        and answer_normalization_version is null
        and target_revision is not null
        and length(trim(target_revision)) > 0
        and parameter_set_id <> 'recognition-fsrs-v1'
      )
      or
      (
        review_profile = 'active'
        and activity_type in ('spell', 'dictation')
        and answer_outcome in ('exact', 'normalized_match', 'different', 'revealed_without_answer')
        and answer_normalization_version = 'active-answer-v1'
        and target_revision is not null
        and length(trim(target_revision)) > 0
        and parameter_set_id <> 'recognition-fsrs-v1'
      )
    );

create unique index review_events_person_prompt_unique
  on review_events(person_id, prompt_id)
  where prompt_id is not null;

create index review_states_person_profile_due_at_idx
  on review_states(person_id, review_profile, due_at);

create index review_events_person_profile_reviewed_at_idx
  on review_events(person_id, review_profile, reviewed_at desc);

create table daily_study_defaults (
  person_id uuid not null references people(id) on delete restrict,
  review_profile text not null,
  review_goal integer not null,
  new_word_goal integer not null,
  timezone text not null,
  updated_at timestamptz not null,
  primary key (person_id, review_profile),
  constraint daily_study_defaults_review_profile_valid
    check (review_profile in ('recognition', 'active')),
  constraint daily_study_defaults_goal_range
    check (
      review_goal between 0 and 2147483647
      and new_word_goal between 0 and 2147483647
    ),
  constraint daily_study_defaults_timezone_not_blank
    check (length(trim(timezone)) > 0)
);

insert into daily_study_defaults (
  person_id,
  review_profile,
  review_goal,
  new_word_goal,
  timezone,
  updated_at
)
select
  person_id,
  profile.review_profile,
  case
    when profile.review_profile = 'recognition' then recognition_session_limit
    else active_session_limit
  end,
  0,
  timezone,
  updated_at
from review_settings
cross join (
  values ('recognition'::text), ('active'::text)
) as profile(review_profile);

create table daily_study_plans (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  review_profile text not null,
  local_date date not null,
  timezone text not null,
  day_starts_at timestamptz not null,
  day_ends_at timestamptz not null,
  suggested_review integer not null,
  review_goal integer not null,
  new_word_goal integer not null,
  plan_version integer not null default 1,
  recommendation_version text not null,
  calculated_at timestamptz not null,
  updated_at timestamptz not null,
  constraint daily_study_plans_person_id_id_unique unique (person_id, id),
  constraint daily_study_plans_person_profile_date_unique
    unique (person_id, review_profile, local_date),
  constraint daily_study_plans_review_profile_valid
    check (review_profile in ('recognition', 'active')),
  constraint daily_study_plans_window_valid
    check (day_ends_at > day_starts_at),
  constraint daily_study_plans_goal_range
    check (
      suggested_review between 0 and 2147483647
      and review_goal between 0 and 2147483647
      and new_word_goal between 0 and 2147483647
    ),
  constraint daily_study_plans_version_positive
    check (plan_version > 0),
  constraint daily_study_plans_text_not_blank
    check (
      length(trim(timezone)) > 0
      and length(trim(recommendation_version)) > 0
  )
);

create or replace function protect_daily_study_plan_history()
returns trigger
language plpgsql
as $$
begin
  if row(
    new.id,
    new.person_id,
    new.review_profile,
    new.local_date,
    new.timezone,
    new.day_starts_at,
    new.day_ends_at,
    new.suggested_review,
    new.recommendation_version,
    new.calculated_at
  ) is distinct from row(
    old.id,
    old.person_id,
    old.review_profile,
    old.local_date,
    old.timezone,
    old.day_starts_at,
    old.day_ends_at,
    old.suggested_review,
    old.recommendation_version,
    old.calculated_at
  ) then
    raise exception 'Frozen daily-plan fields cannot be edited';
  end if;

  if row(new.review_goal, new.new_word_goal) is distinct from row(old.review_goal, old.new_word_goal) then
    if new.plan_version <> old.plan_version + 1 then
      raise exception 'A daily-plan goal edit must increment plan_version by one';
    end if;
  elsif new.plan_version <> old.plan_version then
    raise exception 'plan_version cannot change without a goal edit';
  end if;

  return new;
end;
$$;

create trigger daily_study_plans_history_guard
before update
on daily_study_plans
for each row
execute function protect_daily_study_plan_history();

create table vocabulary_creation_facts (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  original_vocabulary_item_id uuid not null,
  source_action_id uuid not null,
  track_at_creation text not null,
  source_kind text not null,
  history_origin text not null,
  system_created_at timestamptz not null,
  constraint vocabulary_creation_facts_stable_unique
    unique (person_id, source_action_id, original_vocabulary_item_id),
  constraint vocabulary_creation_facts_track_valid
    check (track_at_creation in ('recognition', 'active')),
  constraint vocabulary_creation_facts_source_kind_valid
    check (source_kind in ('single', 'batch', 'ai_add_to_learning')),
  constraint vocabulary_creation_facts_history_origin_valid
    check (history_origin in ('recorded', 'legacy_backfill'))
);

insert into vocabulary_creation_facts (
  id,
  person_id,
  original_vocabulary_item_id,
  source_action_id,
  track_at_creation,
  source_kind,
  history_origin,
  system_created_at
)
select
  vocabulary_items.id,
  vocabulary_items.person_id,
  vocabulary_items.id,
  coalesce(vocabulary_items.import_batch_id, vocabulary_items.id),
  vocabulary_items.learning_track,
  case when vocabulary_items.import_batch_id is null then 'single' else 'batch' end,
  'legacy_backfill',
  vocabulary_items.system_created_at
from vocabulary_items;

create or replace function ensure_creation_source_kind_consistent()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from vocabulary_creation_facts
    where person_id = new.person_id
      and source_action_id = new.source_action_id
      and source_kind <> new.source_kind
      and id <> new.id
  ) then
    raise exception 'A vocabulary creation action cannot mix source kinds';
  end if;

  return new;
end;
$$;

create trigger vocabulary_creation_facts_source_kind_guard
before insert or update of person_id, source_action_id, source_kind
on vocabulary_creation_facts
for each row
execute function ensure_creation_source_kind_consistent();

create table vocabulary_creation_reversals (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  source_action_id uuid not null,
  reason text not null,
  reversed_at timestamptz not null,
  constraint vocabulary_creation_reversals_action_unique
    unique (person_id, source_action_id, reason),
  constraint vocabulary_creation_reversals_reason_valid
    check (reason = 'batch_rollback')
);

create or replace function ensure_creation_reversal_targets_batch()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from vocabulary_creation_facts
    where person_id = new.person_id
      and source_action_id = new.source_action_id
      and source_kind = 'batch'
  ) or exists (
    select 1
    from vocabulary_creation_facts
    where person_id = new.person_id
      and source_action_id = new.source_action_id
      and source_kind <> 'batch'
  ) then
    raise exception 'A Batch imported reversal must target one known batch action';
  end if;

  return new;
end;
$$;

create trigger vocabulary_creation_reversals_batch_guard
before insert or update of person_id, source_action_id, reason
on vocabulary_creation_reversals
for each row
execute function ensure_creation_reversal_targets_batch();

create table ai_runs (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  source_vocabulary_item_id uuid null references vocabulary_items(id) on delete set null,
  feature text not null,
  provider text not null,
  model text not null,
  model_label text not null,
  prompt_version text not null,
  source_hash text not null,
  output_schema_version text not null,
  disclosure_version text not null,
  idempotency_key_hash text not null,
  cache_key_hash text not null,
  status text not null,
  structure_validation_status text not null,
  provider_response_id text null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  thinking_tokens integer not null default 0,
  total_tokens integer not null default 0,
  latency_ms integer not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null,
  completed_at timestamptz null,
  constraint ai_runs_person_id_id_unique unique (person_id, id),
  constraint ai_runs_person_idempotency_unique unique (person_id, idempotency_key_hash),
  constraint ai_runs_feature_valid
    check (feature in ('enrichment_v1', 'context_explain_v1')),
  constraint ai_runs_provider_valid check (provider = 'google-gemini-api'),
  constraint ai_runs_status_valid check (status in ('submitted', 'succeeded', 'rejected', 'failed')),
  constraint ai_runs_structure_status_valid
    check (structure_validation_status in ('pending', 'valid', 'invalid', 'unavailable')),
  constraint ai_runs_lifecycle_consistent check (
    (
      status = 'submitted'
      and structure_validation_status = 'pending'
      and completed_at is null
    )
    or
    (
      status = 'succeeded'
      and structure_validation_status = 'valid'
      and completed_at is not null
    )
    or
    (
      status = 'rejected'
      and structure_validation_status = 'invalid'
      and completed_at is not null
    )
    or
    (
      status = 'failed'
      and structure_validation_status in ('invalid', 'unavailable')
      and completed_at is not null
    )
  ),
  constraint ai_runs_text_not_blank check (
    length(trim(model)) > 0
    and length(trim(model_label)) > 0
    and length(trim(prompt_version)) > 0
    and length(trim(source_hash)) > 0
    and length(trim(output_schema_version)) > 0
    and length(trim(disclosure_version)) > 0
    and length(trim(idempotency_key_hash)) > 0
    and length(trim(cache_key_hash)) > 0
  ),
  constraint ai_runs_usage_non_negative check (
    input_tokens >= 0
    and output_tokens >= 0
    and thinking_tokens >= 0
    and total_tokens >= 0
    and total_tokens::bigint >=
      input_tokens::bigint + output_tokens::bigint + thinking_tokens::bigint
    and latency_ms >= 0
    and estimated_cost_usd >= 0
  )
);

create or replace function ensure_ai_run_source_person()
returns trigger
language plpgsql
as $$
begin
  if new.source_vocabulary_item_id is not null and not exists (
    select 1
    from vocabulary_items
    where person_id = new.person_id
      and id = new.source_vocabulary_item_id
  ) then
    raise exception 'An AI run source item must belong to the same person';
  end if;

  return new;
end;
$$;

create trigger ai_runs_source_person_guard
before insert or update of person_id, source_vocabulary_item_id
on ai_runs
for each row
execute function ensure_ai_run_source_person();

create table ai_enrichment_drafts (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  source_vocabulary_item_id uuid not null,
  ai_run_id uuid not null,
  status text not null,
  draft_json jsonb not null,
  accepted_content_json jsonb null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  decided_at timestamptz null,
  constraint ai_enrichment_drafts_source_person_fk
    foreign key (person_id, source_vocabulary_item_id)
    references vocabulary_items(person_id, id)
    on delete cascade,
  constraint ai_enrichment_drafts_run_person_fk
    foreign key (person_id, ai_run_id)
    references ai_runs(person_id, id)
    on delete restrict,
  constraint ai_enrichment_drafts_status_valid
    check (status in ('draft', 'accepted', 'rejected')),
  constraint ai_enrichment_drafts_json_objects
    check (
      jsonb_typeof(draft_json) = 'object'
      and (
        accepted_content_json is null
        or jsonb_typeof(accepted_content_json) = 'object'
      )
    ),
  constraint ai_enrichment_drafts_decision_consistent
    check (
      (status = 'draft' and accepted_content_json is null and decided_at is null)
      or
      (status = 'accepted' and accepted_content_json is not null and decided_at is not null)
      or
      (status = 'rejected' and accepted_content_json is null and decided_at is not null)
    )
);

-- Operational context explanations are deliberately temporary. They are not a
-- formal backup domain and must be regenerated from the stored source example.
create table ai_context_explanation_cache (
  cache_key_hash text primary key,
  person_id uuid not null references people(id) on delete restrict,
  source_vocabulary_item_id uuid not null,
  ai_run_id uuid not null,
  source_hash text not null,
  example_index integer not null,
  selected_start integer not null,
  selected_end integer not null,
  explanation_json jsonb not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  constraint ai_context_cache_source_person_fk
    foreign key (person_id, source_vocabulary_item_id)
    references vocabulary_items(person_id, id)
    on delete cascade,
  constraint ai_context_cache_run_person_fk
    foreign key (person_id, ai_run_id)
    references ai_runs(person_id, id)
    on delete cascade,
  constraint ai_context_cache_hashes_not_blank
    check (
      length(trim(cache_key_hash)) > 0
      and length(trim(source_hash)) > 0
    ),
  constraint ai_context_cache_span_bounded
    check (
      example_index between 0 and 127
      and selected_start >= 0
      and selected_end > selected_start
      and selected_end - selected_start <= 120
    ),
  constraint ai_context_cache_explanation_shape
    check (
      jsonb_typeof(explanation_json) = 'object'
      and explanation_json ?& array[
        'suggestedHeadword',
        'meaningInContextZh',
        'grammarRoleZh',
        'contextExplanationZh',
        'phraseInContext'
      ]
      and (
        explanation_json - array[
          'suggestedHeadword',
          'meaningInContextZh',
          'grammarRoleZh',
          'contextExplanationZh',
          'phraseInContext'
        ]::text[]
      ) = '{}'::jsonb
      and jsonb_typeof(explanation_json -> 'suggestedHeadword') = 'string'
      and length(trim(explanation_json ->> 'suggestedHeadword')) > 0
      and char_length(explanation_json ->> 'suggestedHeadword') <= 80
      and jsonb_typeof(explanation_json -> 'meaningInContextZh') = 'string'
      and length(trim(explanation_json ->> 'meaningInContextZh')) > 0
      and char_length(explanation_json ->> 'meaningInContextZh') <= 160
      and jsonb_typeof(explanation_json -> 'grammarRoleZh') = 'string'
      and length(trim(explanation_json ->> 'grammarRoleZh')) > 0
      and char_length(explanation_json ->> 'grammarRoleZh') <= 80
      and jsonb_typeof(explanation_json -> 'contextExplanationZh') = 'string'
      and length(trim(explanation_json ->> 'contextExplanationZh')) > 0
      and char_length(explanation_json ->> 'contextExplanationZh') <= 400
      and (
        jsonb_typeof(explanation_json -> 'phraseInContext') = 'null'
        or (
          jsonb_typeof(explanation_json -> 'phraseInContext') = 'string'
          and length(trim(explanation_json ->> 'phraseInContext')) > 0
          and char_length(explanation_json ->> 'phraseInContext') <= 120
        )
      )
    ),
  constraint ai_context_cache_expiry_valid
    check (expires_at > created_at)
);

create or replace function ensure_context_cache_run_valid()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from ai_runs
    where person_id = new.person_id
      and id = new.ai_run_id
      and source_vocabulary_item_id = new.source_vocabulary_item_id
      and source_hash = new.source_hash
      and feature = 'context_explain_v1'
      and status = 'succeeded'
      and structure_validation_status = 'valid'
  ) then
    raise exception 'A context cache record requires one matching successful context AI run';
  end if;

  return new;
end;
$$;

create trigger ai_context_explanation_cache_run_guard
before insert or update of person_id, source_vocabulary_item_id, ai_run_id, source_hash
on ai_context_explanation_cache
for each row
execute function ensure_context_cache_run_valid();

create table vocabulary_relations (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  source_vocabulary_item_id uuid not null,
  target_vocabulary_item_id uuid not null,
  relation_type text not null,
  difference_zh text not null,
  example_pair jsonb not null default '[]'::jsonb,
  ai_run_id uuid not null,
  created_at timestamptz not null,
  constraint vocabulary_relations_source_person_fk
    foreign key (person_id, source_vocabulary_item_id)
    references vocabulary_items(person_id, id)
    on delete cascade,
  constraint vocabulary_relations_target_person_fk
    foreign key (person_id, target_vocabulary_item_id)
    references vocabulary_items(person_id, id)
    on delete cascade,
  constraint vocabulary_relations_run_person_fk
    foreign key (person_id, ai_run_id)
    references ai_runs(person_id, id)
    on delete restrict,
  constraint vocabulary_relations_unique
    unique (person_id, source_vocabulary_item_id, target_vocabulary_item_id, relation_type),
  constraint vocabulary_relations_distinct_items
    check (source_vocabulary_item_id <> target_vocabulary_item_id),
  constraint vocabulary_relations_type_valid
    check (relation_type in ('similar', 'spelling', 'sound', 'usage')),
  constraint vocabulary_relations_example_pair_array
    check (
      jsonb_typeof(example_pair) = 'array'
      and jsonb_array_length(example_pair) in (0, 2)
  )
);

create or replace function ensure_enrichment_lineage_run_valid()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from ai_runs
    where person_id = new.person_id
      and id = new.ai_run_id
      and source_vocabulary_item_id = new.source_vocabulary_item_id
      and feature = 'enrichment_v1'
      and status = 'succeeded'
      and structure_validation_status = 'valid'
  ) then
    raise exception 'Enrichment data requires one matching successful enrichment AI run';
  end if;

  return new;
end;
$$;

create trigger ai_enrichment_drafts_run_feature_guard
before insert or update of person_id, ai_run_id
on ai_enrichment_drafts
for each row
execute function ensure_enrichment_lineage_run_valid();

create trigger vocabulary_relations_run_feature_guard
before insert or update of person_id, ai_run_id
on vocabulary_relations
for each row
execute function ensure_enrichment_lineage_run_valid();

create table ai_usage_buckets (
  bucket_key text primary key,
  scope text not null,
  person_id uuid null references people(id) on delete restrict,
  period_starts_at timestamptz not null,
  period_ends_at timestamptz not null,
  attempts_reserved integer not null default 0,
  input_tokens_reserved bigint not null default 0,
  output_tokens_reserved bigint not null default 0,
  estimated_cost_usd_reserved numeric(12, 6) not null default 0,
  active_provider_calls integer not null default 0,
  updated_at timestamptz not null,
  constraint ai_usage_buckets_scope_valid
    check (scope in ('global_day', 'global_month', 'person_day', 'global_concurrency')),
  constraint ai_usage_buckets_person_scope_consistent
    check (
      (scope = 'person_day' and person_id is not null)
      or
      (scope <> 'person_day' and person_id is null)
    ),
  constraint ai_usage_buckets_window_valid check (period_ends_at > period_starts_at),
  constraint ai_usage_buckets_values_non_negative check (
    attempts_reserved >= 0
    and input_tokens_reserved >= 0
    and output_tokens_reserved >= 0
    and estimated_cost_usd_reserved >= 0
    and active_provider_calls >= 0
  )
);

create table study_command_idempotency (
  person_id uuid not null references people(id) on delete restrict,
  local_date date not null,
  command_type text not null,
  idempotency_key text not null,
  canonical_request_hash text not null,
  status text not null,
  result_json jsonb null,
  error_code text null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  primary key (person_id, command_type, idempotency_key),
  constraint study_command_idempotency_command_valid
    check (command_type in ('record_rating', 'reset_today', 'rollback_event')),
  constraint study_command_idempotency_status_valid
    check (status in ('in_progress', 'succeeded', 'failed')),
  constraint study_command_idempotency_expiry_valid
    check (expires_at > created_at),
  constraint study_command_idempotency_result_consistent
    check (
      (status = 'in_progress' and result_json is null and error_code is null)
      or
      (status = 'succeeded' and result_json is not null and error_code is null)
      or
      (
        status = 'failed'
        and result_json is null
        and error_code is not null
        and length(trim(error_code)) > 0
      )
    ),
  constraint study_command_idempotency_text_not_blank
    check (
      length(trim(idempotency_key)) > 0
      and length(trim(canonical_request_hash)) > 0
    )
);

alter table backup_imports
  drop constraint backup_imports_schema_version_supported;

alter table backup_imports
  add constraint backup_imports_schema_version_supported
  check (schema_version in (2, 3, 4, 5, 6));

alter table backup_import_mappings
  drop constraint backup_import_mappings_entity_type_valid;

alter table backup_import_mappings
  add constraint backup_import_mappings_entity_type_valid
  check (
    entity_type in (
      'person',
      'vocabulary_item',
      'import_batch',
      'review_state',
      'review_event',
      'review_settings',
      'daily_study_default',
      'daily_study_plan',
      'vocabulary_creation_fact',
      'vocabulary_creation_reversal',
      'ai_run',
      'ai_enrichment_draft',
      'vocabulary_relation'
    )
  );

create index daily_study_plans_person_date_idx
  on daily_study_plans(person_id, local_date desc);

create index vocabulary_creation_facts_person_created_at_idx
  on vocabulary_creation_facts(person_id, system_created_at desc);

create index vocabulary_creation_facts_person_action_idx
  on vocabulary_creation_facts(person_id, source_action_id);

create index ai_runs_person_created_at_idx
  on ai_runs(person_id, created_at desc);

create index ai_runs_cache_key_idx
  on ai_runs(cache_key_hash, created_at desc);

create index ai_enrichment_drafts_person_source_idx
  on ai_enrichment_drafts(person_id, source_vocabulary_item_id, updated_at desc);

create index ai_context_explanation_cache_expiry_idx
  on ai_context_explanation_cache(expires_at);

create index ai_context_explanation_cache_person_source_idx
  on ai_context_explanation_cache(person_id, source_vocabulary_item_id, created_at desc);

create index vocabulary_relations_person_source_idx
  on vocabulary_relations(person_id, source_vocabulary_item_id, created_at desc);

create index ai_usage_buckets_scope_period_idx
  on ai_usage_buckets(scope, period_starts_at, period_ends_at);

create index study_command_idempotency_expiry_idx
  on study_command_idempotency(expires_at);

commit;
