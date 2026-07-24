-- V2.1 duplicate-import repair.
-- Apply only after db/migrations/0001_initial.sql through
-- db/migrations/0005_v2_standard_tts_accounting.sql.
-- This migration deliberately refuses to choose or delete duplicate records.
-- Run the reviewed V2.1 cleanup first, confirm zero duplicate groups, then apply.

begin;

do $$
begin
  if exists (
    select 1
    from vocabulary_items
    group by person_id, normalized_text
    having count(*) > 1
  ) then
    raise exception
      'V2.1 uniqueness migration refused: duplicate vocabulary identities still exist';
  end if;
end;
$$;

create unique index vocabulary_items_person_normalized_text_unique
  on vocabulary_items(person_id, normalized_text);

drop index if exists vocabulary_items_person_normalized_text_idx;

commit;
