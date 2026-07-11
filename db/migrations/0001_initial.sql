-- Stage 5D durable storage readiness draft, promoted for Stage 5F dev/preview bootstrap.
-- Execution is allowed only for the non-production Neon development/preview database after human approval.
-- Production execution still requires separate human confirmation and a Tier 3 gate.

begin;

create table people (
  id uuid primary key,
  display_name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint people_slug_not_blank check (length(trim(slug)) > 0),
  constraint people_display_name_not_blank check (length(trim(display_name)) > 0)
);

create table import_batches (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  source_type text not null,
  file_name text null,
  created_at timestamptz not null,
  total_rows integer not null,
  accepted_rows integer not null,
  duplicate_rows integer not null,
  invalid_rows integer not null,
  constraint import_batches_person_id_id_unique unique (person_id, id),
  constraint import_batches_source_type_valid check (source_type in ('txt_file', 'pasted_text')),
  constraint import_batches_counts_non_negative check (
    total_rows >= 0
    and accepted_rows >= 0
    and duplicate_rows >= 0
    and invalid_rows >= 0
  )
);

create table vocabulary_items (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  surface_text text not null,
  normalized_text text not null,
  meaning_zh text not null default '',
  example text not null default '',
  notes text not null default '',
  rarity_score integer null,
  source text not null,
  import_batch_id uuid null,
  status text not null,
  created_at timestamptz not null,
  system_created_at timestamptz not null,
  updated_at timestamptz not null,
  timezone text not null,
  archived_at timestamptz null,
  constraint vocabulary_items_person_id_id_unique unique (person_id, id),
  constraint vocabulary_items_import_batch_person_fk foreign key (person_id, import_batch_id)
    references import_batches(person_id, id)
    on delete restrict,
  constraint vocabulary_items_surface_text_not_blank check (length(trim(surface_text)) > 0),
  constraint vocabulary_items_normalized_text_not_blank check (length(trim(normalized_text)) > 0),
  constraint vocabulary_items_rarity_score_range check (
    rarity_score is null or rarity_score between 1 and 5
  ),
  constraint vocabulary_items_source_valid check (source in ('manual', 'txt_file', 'pasted_text')),
  constraint vocabulary_items_status_valid check (status in ('new', 'archived')),
  constraint vocabulary_items_archived_status_consistent check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create table review_states (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  vocabulary_item_id uuid not null,
  status text not null,
  due_at timestamptz not null,
  last_reviewed_at timestamptz null,
  review_count integer not null,
  lapse_count integer not null,
  interval_minutes integer not null,
  difficulty double precision null,
  stability double precision null,
  updated_at timestamptz not null,
  constraint review_states_vocabulary_person_fk foreign key (person_id, vocabulary_item_id)
    references vocabulary_items(person_id, id)
    on delete cascade,
  constraint review_states_person_item_unique unique (person_id, vocabulary_item_id),
  constraint review_states_status_valid check (status in ('learning', 'review')),
  constraint review_states_counts_non_negative check (
    review_count >= 0
    and lapse_count >= 0
    and interval_minutes > 0
  )
);

create table review_events (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  vocabulary_item_id uuid not null,
  reviewed_at timestamptz not null,
  rating text not null,
  previous_due_at timestamptz null,
  next_due_at timestamptz not null,
  previous_interval_minutes integer null,
  next_interval_minutes integer not null,
  elapsed_ms integer not null,
  constraint review_events_vocabulary_person_fk foreign key (person_id, vocabulary_item_id)
    references vocabulary_items(person_id, id)
    on delete cascade,
  constraint review_events_rating_valid check (rating in ('forgot', 'hard', 'vague', 'remembered')),
  constraint review_events_intervals_valid check (
    next_interval_minutes > 0
    and (previous_interval_minutes is null or previous_interval_minutes > 0)
  ),
  constraint review_events_elapsed_ms_non_negative check (elapsed_ms >= 0)
);

create table review_settings (
  person_id uuid not null primary key references people(id) on delete restrict,
  session_limit integer not null,
  timezone text not null,
  updated_at timestamptz not null,
  constraint review_settings_session_limit_range check (session_limit between 1 and 80),
  constraint review_settings_timezone_not_blank check (length(trim(timezone)) > 0)
);

create table backup_imports (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  source_file_name text null,
  source_exported_at timestamptz null,
  imported_at timestamptz not null,
  schema_version integer not null,
  item_count integer not null,
  review_event_count integer not null,
  notes text not null default '',
  constraint backup_imports_person_id_id_unique unique (person_id, id),
  constraint backup_imports_schema_version_supported check (schema_version in (2, 3)),
  constraint backup_imports_counts_non_negative check (
    item_count >= 0
    and review_event_count >= 0
  )
);

create table backup_import_mappings (
  id uuid primary key,
  person_id uuid not null references people(id) on delete restrict,
  backup_import_id uuid not null,
  entity_type text not null,
  source_id text not null,
  target_id uuid not null,
  created_at timestamptz not null,
  constraint backup_import_mappings_import_person_fk foreign key (person_id, backup_import_id)
    references backup_imports(person_id, id)
    on delete cascade,
  constraint backup_import_mappings_entity_type_valid check (
    entity_type in (
      'person',
      'vocabulary_item',
      'import_batch',
      'review_state',
      'review_event',
      'review_settings'
    )
  ),
  constraint backup_import_mappings_source_not_blank check (length(trim(source_id)) > 0),
  constraint backup_import_mappings_unique_source unique (backup_import_id, entity_type, source_id)
);

create index people_active_slug_idx on people(is_active, slug);
create index import_batches_person_created_at_idx on import_batches(person_id, created_at desc);
create index vocabulary_items_person_normalized_text_idx on vocabulary_items(person_id, normalized_text);
create index vocabulary_items_person_status_idx on vocabulary_items(person_id, status);
create index vocabulary_items_person_created_at_idx on vocabulary_items(person_id, created_at desc);
create index review_states_person_due_at_idx on review_states(person_id, due_at);
create index review_states_person_status_idx on review_states(person_id, status);
create index review_events_person_reviewed_at_idx on review_events(person_id, reviewed_at desc);
create index review_events_person_vocabulary_reviewed_at_idx
  on review_events(person_id, vocabulary_item_id, reviewed_at desc);
create index backup_imports_person_imported_at_idx on backup_imports(person_id, imported_at desc);
create index backup_import_mappings_person_backup_idx
  on backup_import_mappings(person_id, backup_import_id);

commit;
