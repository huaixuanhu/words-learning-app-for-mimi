import {
  assertNonProductionDatabaseTarget,
  createPool,
} from "./db-connection.mjs";

const personId = "00000000-0000-4000-8000-000000006b5f";
const activeItemId = "00000000-0000-4000-8000-000000006b51";
const reviewStateId = "00000000-0000-4000-8000-000000006b52";
const reviewEventId = "00000000-0000-4000-8000-000000006b53";
const now = "2026-07-09T13:30:00.000Z";

function isExpectedGuardError(error) {
  return error instanceof Error &&
    error.message.includes("V1 review records can target only Recognition vocabulary items");
}

async function expectRejectedByGuard(client, savepointName, statement, values) {
  await client.query(`savepoint ${savepointName}`);

  try {
    await client.query(statement, values);
    throw new Error("Expected Active review guard to reject the write");
  } catch (error) {
    await client.query(`rollback to savepoint ${savepointName}`);

    if (!isExpectedGuardError(error)) {
      throw error;
    }

    return "rejected";
  }
}

assertNonProductionDatabaseTarget();

const pool = createPool();
const client = await pool.connect();

try {
  await client.query("begin");

  try {
    await client.query(
      `
        insert into people (id, display_name, slug, is_active, created_at, updated_at)
        values ($1, $2, $3, true, $4, $4)
      `,
      [personId, "Stage 6B P1-F Active Guard", "stage6b-p1f-active-guard", now],
    );
    await client.query(
      `
        insert into review_settings (
          person_id,
          session_limit,
          recognition_session_limit,
          active_session_limit,
          timezone,
          updated_at
        )
        values ($1, 12, 12, 6, $2, $3)
      `,
      [personId, "Australia/Melbourne", now],
    );
    await client.query(
      `
        insert into vocabulary_items (
          id,
          person_id,
          surface_text,
          normalized_text,
          meaning_zh,
          meanings_zh,
          example,
          examples,
          notes,
          rarity_score,
          learning_track,
          tags,
          source,
          import_batch_id,
          status,
          created_at,
          system_created_at,
          updated_at,
          timezone,
          archived_at
        )
        values (
          $1, $2, 'active guard', 'active guard', '主动词保护',
          $3::jsonb, 'Use this active guard item.', $4::jsonb,
          'Stage 6B P1-F guard verification', null, 'active', null,
          'manual', null, 'new', $5, $5, $5, 'Australia/Melbourne', null
        )
      `,
      [
        activeItemId,
        personId,
        JSON.stringify(["主动词保护"]),
        JSON.stringify(["Use this active guard item."]),
        now,
      ],
    );

    const reviewStateResult = await expectRejectedByGuard(
      client,
      "active_review_state_guard",
      `
        insert into review_states (
          id,
          person_id,
          vocabulary_item_id,
          status,
          due_at,
          last_reviewed_at,
          review_count,
          lapse_count,
          interval_minutes,
          difficulty,
          stability,
          updated_at
        )
        values ($1, $2, $3, 'learning', $4, null, 0, 0, 1440, null, null, $4)
      `,
      [reviewStateId, personId, activeItemId, now],
    );
    const reviewEventResult = await expectRejectedByGuard(
      client,
      "active_review_event_guard",
      `
        insert into review_events (
          id,
          person_id,
          vocabulary_item_id,
          reviewed_at,
          rating,
          previous_due_at,
          next_due_at,
          previous_interval_minutes,
          next_interval_minutes,
          elapsed_ms
        )
        values ($1, $2, $3, $4, 'remembered', null, $4, null, 1440, 0)
      `,
      [reviewEventId, personId, activeItemId, now],
    );

    await client.query("rollback");

    console.log(
      JSON.stringify(
        {
          ok: true,
          activeReviewGuard: {
            reviewStates: reviewStateResult,
            reviewEvents: reviewEventResult,
          },
          persistedRows: 0,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
} finally {
  client.release();
  await pool.end();
}
