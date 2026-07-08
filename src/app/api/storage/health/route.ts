import { NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/storage/postgres/client";
import {
  assertPostgresRuntime,
  isProductionVercelEnvironment,
  isPostgresRuntimeMode,
  resolveStorageRuntimeMode,
} from "@/lib/storage/runtime-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StorageHealthRow = {
  people_count: number;
  vocabulary_count: number;
  review_event_count: number;
};

type StorageReadyRow = {
  ready: number;
};

function runtimePayload() {
  const resolution = resolveStorageRuntimeMode();

  return {
    mode: resolution.mode,
    source: resolution.source,
    reason: resolution.reason,
  };
}

function disabledResponse(status: number, reason?: string) {
  return NextResponse.json(
    {
      ok: status < 400,
      status: "disabled",
      runtime: runtimePayload(),
      ...(reason ? { reason } : {}),
    },
    { status },
  );
}

function runtimeDisabledResponse() {
  const resolution = resolveStorageRuntimeMode();
  const isProduction = isProductionVercelEnvironment();

  if (isProduction && resolution.mode !== "postgres-production") {
    return disabledResponse(404, "production-postgres-runtime-not-enabled");
  }

  if (!isProduction && resolution.mode === "postgres-production") {
    return disabledResponse(403, "postgres-production-runtime-not-allowed");
  }

  if (!isPostgresRuntimeMode(resolution.mode)) {
    return disabledResponse(200);
  }

  return null;
}

async function productionHealthResponse() {
  await getPostgresPool().query<StorageReadyRow>("select 1::int as ready");

  return NextResponse.json({
    ok: true,
    status: "ready",
    runtime: runtimePayload(),
  });
}

async function previewHealthResponse() {
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
}

export async function GET() {
  const disabled = runtimeDisabledResponse();

  if (disabled) {
    return disabled;
  }

  try {
    const resolution = assertPostgresRuntime();

    if (resolution.mode === "postgres-production") {
      return await productionHealthResponse();
    }

    return await previewHealthResponse();
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
