import { NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/storage/postgres/client";
import {
  isProductionVercelEnvironment,
  resolveStorageRuntimeMode,
} from "@/lib/storage/runtime-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StorageHealthRow = {
  people_count: number;
  vocabulary_count: number;
  review_event_count: number;
};

function runtimePayload() {
  const resolution = resolveStorageRuntimeMode();

  return {
    mode: resolution.mode,
    source: resolution.source,
    reason: resolution.reason,
  };
}

export async function GET() {
  if (isProductionVercelEnvironment()) {
    return NextResponse.json(
      {
        ok: false,
        status: "disabled",
        runtime: runtimePayload(),
        reason: "production-disabled",
      },
      { status: 404 },
    );
  }

  const resolution = resolveStorageRuntimeMode();

  if (resolution.mode !== "postgres-preview") {
    return NextResponse.json({
      ok: true,
      status: "disabled",
      runtime: runtimePayload(),
    });
  }

  try {
    const result = await getPostgresPool().query<StorageHealthRow>(
      `
        select
          (select count(*)::int from people) as people_count,
          (select count(*)::int from vocabulary_items) as vocabulary_count,
          (select count(*)::int from review_events) as review_event_count
      `,
    );
    const row = result.rows[0];

    return NextResponse.json({
      ok: true,
      status: "ready",
      runtime: runtimePayload(),
      counts: {
        people: row.people_count,
        vocabularyItems: row.vocabulary_count,
        reviewEvents: row.review_event_count,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        runtime: runtimePayload(),
        error: error instanceof Error ? error.message : "Unknown storage health error",
      },
      { status: 503 },
    );
  }
}
