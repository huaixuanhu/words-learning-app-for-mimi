-- V2-8-2.3-1 additive Google Cloud Standard TTS accounting migration.
-- Apply only after 0003_v2_schema6_data_model.sql and
-- 0004_v2_bilingual_examples.sql. This ledger stores no raw text, audio,
-- person id, vocabulary id, review event, or learning history.

begin;

create table tts_usage_buckets (
  bucket_key text primary key,
  execution_scope text not null,
  scope text not null,
  period_starts_at timestamptz not null,
  period_ends_at timestamptz not null,
  attempts_reserved integer not null default 0,
  characters_reserved integer not null default 0,
  estimated_cost_usd_reserved numeric(18, 8) not null default 0,
  active_provider_calls integer not null default 0,
  updated_at timestamptz not null,
  constraint tts_usage_buckets_scope_valid
    check (scope in ('global_day', 'global_month', 'global_concurrency')),
  constraint tts_usage_buckets_execution_scope_not_blank
    check (length(trim(execution_scope)) > 0),
  constraint tts_usage_buckets_period_valid
    check (period_ends_at > period_starts_at),
  constraint tts_usage_buckets_counters_non_negative
    check (
      attempts_reserved >= 0
      and characters_reserved >= 0
      and estimated_cost_usd_reserved >= 0
      and active_provider_calls >= 0
    )
);

create table tts_runs (
  execution_scope text not null,
  request_id_hash char(64) not null,
  cache_key_hash char(64) not null,
  voice_contract_id text not null,
  character_count integer not null,
  estimated_cost_usd numeric(18, 8) not null,
  status text not null,
  terminal_category text null,
  latency_ms integer null,
  provider_request_id_hash char(64) null,
  created_at timestamptz not null,
  completed_at timestamptz null,
  primary key (execution_scope, request_id_hash),
  constraint tts_runs_execution_scope_not_blank
    check (length(trim(execution_scope)) > 0),
  constraint tts_runs_hashes_valid
    check (
      request_id_hash ~ '^[a-f0-9]{64}$'
      and cache_key_hash ~ '^[a-f0-9]{64}$'
      and (
        provider_request_id_hash is null
        or provider_request_id_hash ~ '^[a-f0-9]{64}$'
      )
    ),
  constraint tts_runs_voice_contract_not_blank
    check (length(trim(voice_contract_id)) > 0),
  constraint tts_runs_usage_non_negative
    check (character_count > 0 and estimated_cost_usd >= 0),
  constraint tts_runs_status_valid
    check (status in ('submitted', 'succeeded', 'failed')),
  constraint tts_runs_completion_consistent
    check (
      (
        status = 'submitted'
        and terminal_category is null
        and latency_ms is null
        and completed_at is null
      )
      or
      (
        status in ('succeeded', 'failed')
        and latency_ms is not null
        and latency_ms >= 0
        and completed_at is not null
        and completed_at >= created_at
        and (status = 'succeeded' or terminal_category is not null)
      )
    )
);

create index tts_usage_buckets_scope_period_idx
  on tts_usage_buckets(execution_scope, scope, period_starts_at desc);

create index tts_runs_scope_status_created_idx
  on tts_runs(execution_scope, status, created_at);

create index tts_runs_cache_key_idx
  on tts_runs(execution_scope, cache_key_hash, created_at desc);

commit;

