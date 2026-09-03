-- V2.2 versioned FSRS parameter sets.
-- Apply only after db/migrations/0001_initial.sql through
-- db/migrations/0006_v2_1_vocabulary_unique_normalized_text.sql.
-- This migration changes constraints only. It does not rewrite review history
-- or existing due timestamps. Remote execution requires a separate approval.

begin;

do $$
begin
  if exists (
    select 1
    from review_states
    where
      (review_profile = 'recognition' and parameter_set_id not in (
        'recognition-fsrs-v1',
        'recognition-fsrs-v2'
      ))
      or
      (review_profile = 'active' and parameter_set_id not in (
        'active-fsrs-v1',
        'active-fsrs-v2'
      ))
  ) then
    raise exception
      'V2.2 FSRS migration refused: review_states contain an unsupported parameter set';
  end if;

  if exists (
    select 1
    from review_events
    where
      (review_profile = 'recognition' and parameter_set_id not in (
        'recognition-fsrs-v1',
        'recognition-fsrs-v2'
      ))
      or
      (review_profile = 'active' and parameter_set_id not in (
        'active-fsrs-v1',
        'active-fsrs-v2'
      ))
  ) then
    raise exception
      'V2.2 FSRS migration refused: review_events contain an unsupported parameter set';
  end if;
end;
$$;

alter table review_states
  drop constraint review_states_parameter_set_profile_valid,
  add constraint review_states_parameter_set_profile_valid
    check (
      (
        review_profile = 'recognition'
        and parameter_set_id in ('recognition-fsrs-v1', 'recognition-fsrs-v2')
      )
      or
      (
        review_profile = 'active'
        and parameter_set_id in ('active-fsrs-v1', 'active-fsrs-v2')
      )
    );

alter table review_events
  drop constraint review_events_profile_evidence_consistent,
  add constraint review_events_profile_evidence_consistent
    check (
      (
        review_profile = 'recognition'
        and activity_type = 'recognition_card'
        and answer_outcome = 'self_rated'
        and answer_normalization_version is null
        and target_revision is null
        and parameter_set_id in ('recognition-fsrs-v1', 'recognition-fsrs-v2')
      )
      or
      (
        review_profile = 'active'
        and activity_type = 'say'
        and answer_outcome = 'self_rated'
        and answer_normalization_version is null
        and target_revision is not null
        and length(trim(target_revision)) > 0
        and parameter_set_id in ('active-fsrs-v1', 'active-fsrs-v2')
      )
      or
      (
        review_profile = 'active'
        and activity_type in ('spell', 'dictation')
        and answer_outcome in (
          'exact',
          'normalized_match',
          'different',
          'revealed_without_answer'
        )
        and answer_normalization_version = 'active-answer-v1'
        and target_revision is not null
        and length(trim(target_revision)) > 0
        and parameter_set_id in ('active-fsrs-v1', 'active-fsrs-v2')
      )
    );

commit;
