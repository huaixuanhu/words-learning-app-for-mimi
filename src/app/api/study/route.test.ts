import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { StudyPromptError } from "@/lib/daily-study/prompt-errors";

const serviceMocks = vi.hoisted(() => ({
  readPostgresDailyStudyQueue: vi.fn(),
  recordPostgresDailyStudyRating: vi.fn(),
  refreshPostgresDailyStudyPrompt: vi.fn(),
  rollbackPostgresDailyStudyRating: vi.fn(),
  resetPostgresDailyStudyToday: vi.fn(),
  resolvePostgresDailyStudyToday: vi.fn(),
  updatePostgresDailyStudyDefaults: vi.fn(),
  updatePostgresDailyStudyTodayGoals: vi.fn(),
}));

vi.mock("@/lib/storage/postgres/repository", () => serviceMocks);

const originalEnv = { ...process.env };
const personId = "11111111-1111-4111-8111-111111111111";
const basicUser = "mimi";
const basicPassword = "test-password";
const authorization = `Basic ${Buffer.from(`${basicUser}:${basicPassword}`).toString("base64")}`;

function setRuntime(overrides: Record<string, string | undefined>) {
  const env = process.env as Record<string, string | undefined>;

  for (const key of [
    "MIMI_STORAGE_RUNTIME",
    "MIMI_ENABLE_STORAGE_UI_WRITES",
    "MIMI_BASIC_AUTH_USER",
    "MIMI_BASIC_AUTH_PASSWORD",
    "MIMI_PRODUCTION_CUTOVER_MODE",
    "VERCEL_ENV",
    "NODE_ENV",
  ]) {
    delete env[key];
  }

  env.NODE_ENV = "test";
  Object.assign(env, overrides);

  if (env.VERCEL_ENV === "production") {
    env.MIMI_BASIC_AUTH_USER = basicUser;
    Reflect.set(env, "MIMI_BASIC_AUTH_PASSWORD", basicPassword);
    env.MIMI_PRODUCTION_CUTOVER_MODE ??= "live";
  }
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://mimi.example/api/study", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization,
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("/api/study", () => {
  beforeEach(() => {
    for (const mock of Object.values(serviceMocks)) {
      mock.mockReset();
    }

    serviceMocks.resolvePostgresDailyStudyToday.mockResolvedValue({
      today: { personId, localDate: "2026-07-14" },
    });
    setRuntime({
      MIMI_STORAGE_RUNTIME: "postgres-production",
      VERCEL_ENV: "production",
    });
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  it("rechecks Production Basic Auth before resolving a plan", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request(
        { selectedPersonId: personId, operation: { type: "resolveToday" } },
        { authorization: "" },
      ),
    );

    expect(response.status).toBe(401);
    expect(serviceMocks.resolvePostgresDailyStudyToday).not.toHaveBeenCalled();
  });

  it("routes a strict Today resolution with server-owned time", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({ selectedPersonId: personId, operation: { type: "resolveToday" } }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("server-timing")).toMatch(
      /^mimi_study;dur=\d+$/,
    );
    expect(payload).toMatchObject({
      ok: true,
      status: "ready",
      serverNow: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      result: { personId, localDate: "2026-07-14" },
    });
    expect(serviceMocks.resolvePostgresDailyStudyToday).toHaveBeenCalledWith(
      personId,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
  });

  it("rejects unknown request and operation fields", async () => {
    const { POST } = await import("./route");
    const topLevel = await POST(
      request({
        selectedPersonId: personId,
        operation: { type: "resolveToday" },
        clientNow: "untrusted",
      }),
    );
    const operation = await POST(
      request({
        selectedPersonId: personId,
        operation: { type: "resolveToday", personId },
      }),
    );

    expect(topLevel.status).toBe(400);
    expect(operation.status).toBe(400);
    expect(serviceMocks.resolvePostgresDailyStudyToday).not.toHaveBeenCalled();
  });

  it("rejects a command for another selected learner", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({
        selectedPersonId: personId,
        operation: {
          type: "resetToday",
          command: {
            personId: "22222222-2222-4222-8222-222222222222",
          },
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(serviceMocks.resetPostgresDailyStudyToday).not.toHaveBeenCalled();
  });

  it("keeps Preview study operations behind the existing UI write gate", async () => {
    setRuntime({
      MIMI_STORAGE_RUNTIME: "postgres-preview",
      VERCEL_ENV: "preview",
    });
    const { POST } = await import("./route");
    const response = await POST(
      request({ selectedPersonId: personId, operation: { type: "resolveToday" } }),
    );

    expect(response.status).toBe(403);
    expect(serviceMocks.resolvePostgresDailyStudyToday).not.toHaveBeenCalled();
  });

  it("accepts a bounded Recognition queue request", async () => {
    serviceMocks.readPostgresDailyStudyQueue.mockResolvedValue({
      zone: "new",
      entries: [],
      nextCursorToken: null,
    });
    const { POST } = await import("./route");
    const queueRequest = {
      personId,
      planId: "33333333-3333-4333-8333-333333333333",
      localDate: "2026-07-14",
      reviewProfile: "recognition",
      activityType: "recognition_card",
      expectedPlanVersion: 1,
      requestedPageSize: 100,
      zone: "new",
      cursorToken: null,
    };
    const response = await POST(
      request({
        selectedPersonId: personId,
        operation: { type: "readQueue", request: queueRequest },
      }),
    );

    expect(response.status).toBe(200);
    expect(serviceMocks.readPostgresDailyStudyQueue).toHaveBeenCalledWith(
      queueRequest,
      expect.any(String),
    );
  });

  it("rejects an Active queue with a Recognition activity", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({
        selectedPersonId: personId,
        operation: {
          type: "readQueue",
          request: {
            personId,
            planId: "33333333-3333-4333-8333-333333333333",
            localDate: "2026-07-14",
            reviewProfile: "active",
            activityType: "recognition_card",
            expectedPlanVersion: 1,
            requestedPageSize: 100,
            zone: "new",
            cursorToken: null,
          },
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(serviceMocks.readPostgresDailyStudyQueue).not.toHaveBeenCalled();
  });

  it("routes a strict current-card prompt refresh", async () => {
    serviceMocks.refreshPostgresDailyStudyPrompt.mockResolvedValue({
      promptToken: "refreshed-token",
      refreshedFromExpired: true,
    });
    const { POST } = await import("./route");
    const command = { personId, promptToken: "expired-token" };
    const response = await POST(
      request({
        selectedPersonId: personId,
        operation: { type: "refreshPrompt", command },
      }),
    );

    expect(response.status).toBe(200);
    expect(serviceMocks.refreshPostgresDailyStudyPrompt).toHaveBeenCalledWith(
      command,
      expect.any(String),
    );
  });

  it("returns the bounded prompt error category without changing auth state", async () => {
    serviceMocks.recordPostgresDailyStudyRating.mockRejectedValue(
      new StudyPromptError("prompt_expired", "Study token has expired"),
    );
    const { POST } = await import("./route");
    const response = await POST(
      request({
        selectedPersonId: personId,
        operation: { type: "recordRating", command: { personId } },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      status: "error",
      errorCode: "prompt_expired",
    });
  });

  it("routes a strictly scoped one-entry rollback", async () => {
    serviceMocks.rollbackPostgresDailyStudyRating.mockResolvedValue({
      event: { id: "44444444-4444-4444-8444-444444444444" },
      state: null,
      promptToken: "replacement-token",
    });
    const { POST } = await import("./route");
    const command = {
      personId,
      planId: "33333333-3333-4333-8333-333333333333",
      localDate: "2026-07-14",
      expectedPlanVersion: 1,
      eventId: "44444444-4444-4444-8444-444444444444",
      vocabularyItemId: "55555555-5555-4555-8555-555555555555",
    };
    const response = await POST(
      request({
        selectedPersonId: personId,
        operation: { type: "rollbackRating", command },
      }),
    );

    expect(response.status).toBe(200);
    expect(serviceMocks.rollbackPostgresDailyStudyRating).toHaveBeenCalledWith(
      command,
      expect.any(String),
    );
  });
});
