import { NextRequest, NextResponse } from "next/server";
import {
  createPostgresRepository,
  ensurePostgresSmokePerson,
} from "@/lib/storage/postgres/repository";
import {
  isProductionVercelEnvironment,
  isStorageSmokeWriteEnabled,
  resolveStorageRuntimeMode,
} from "@/lib/storage/runtime-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SMOKE_WRITE_CONFIRMATION_HEADER = "x-mimi-storage-smoke";
const SMOKE_WRITE_CONFIRMATION_VALUE = "allow-dev-preview-write";

function runtimePayload() {
  const resolution = resolveStorageRuntimeMode();

  return {
    mode: resolution.mode,
    source: resolution.source,
    reason: resolution.reason,
  };
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json(
      {
        ok: false,
        status: "disabled",
        runtime: runtimePayload(),
        reason: "postgres-runtime-not-enabled",
      },
      { status: 403 },
    );
  }

  if (!isStorageSmokeWriteEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        status: "disabled",
        runtime: runtimePayload(),
        reason: "smoke-writes-not-enabled",
      },
      { status: 403 },
    );
  }

  if (request.headers.get(SMOKE_WRITE_CONFIRMATION_HEADER) !== SMOKE_WRITE_CONFIRMATION_VALUE) {
    return NextResponse.json(
      {
        ok: false,
        status: "blocked",
        runtime: runtimePayload(),
        reason: "missing-smoke-confirmation-header",
      },
      { status: 428 },
    );
  }

  try {
    const now = new Date().toISOString();
    const timezone = "Australia/Melbourne";
    const person = await ensurePostgresSmokePerson(now);
    const repository = createPostgresRepository();
    const timestampedContext = {
      personId: person.id,
      now,
      timezone,
    };
    const settings = await repository.reviewSettings.updateSettings(timestampedContext, {
      sessionLimit: 3,
      recognitionSessionLimit: 3,
      activeSessionLimit: 3,
      timezone,
    });
    const item = await repository.vocabulary.addItem(timestampedContext, {
      surfaceText: `storage smoke ${now}`,
      meaningZh: "storage smoke",
      example: "This row was created by the development or preview storage smoke route.",
      notes: "",
      rarityScore: null,
      learningTrack: "recognition",
      tags: null,
      source: "manual",
      timezone,
    });
    const review = await repository.review.recordReview({
      personId: person.id,
      vocabularyItemId: item.id,
      rating: "remembered",
      elapsedMs: 0,
      reviewedAt: now,
    });
    const queue = await repository.review.getReviewQueue({
      personId: person.id,
      now,
      sessionLimit: settings.sessionLimit,
    });

    return NextResponse.json({
      ok: true,
      status: "ready",
      runtime: runtimePayload(),
      person: {
        id: person.id,
        slug: person.slug,
      },
      item: {
        id: item.id,
        normalizedText: item.normalizedText,
      },
      review: {
        eventId: review.event.id,
        stateId: review.state.id,
        nextDueAt: review.state.dueAt,
      },
      queueCount: queue.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        runtime: runtimePayload(),
        error: error instanceof Error ? error.message : "Unknown storage smoke error",
      },
      { status: 500 },
    );
  }
}
