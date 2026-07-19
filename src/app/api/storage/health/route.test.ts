import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage/postgres/client", () => ({
  getPostgresPool: () => ({
    query: queryMock,
  }),
}));

const originalEnv = { ...process.env };
const runtimeEnvKeys = [
  "MIMI_STORAGE_RUNTIME",
  "MIMI_BASIC_AUTH_USER",
  "MIMI_BASIC_AUTH_PASSWORD",
  "MIMI_PRODUCTION_CUTOVER_MODE",
  "VERCEL_ENV",
  "NODE_ENV",
  "STAGE5F_DATABASE_TARGET",
] as const;

const basicAuthUser = "mimi";
const basicAuthPassphrase = "test-production-password";
const basicAuthorization = `Basic ${Buffer.from(`${basicAuthUser}:${basicAuthPassphrase}`).toString("base64")}`;

function setRuntimeEnv(overrides: Record<string, string | undefined>) {
  const mutableEnv = process.env as Record<string, string | undefined>;

  for (const key of runtimeEnvKeys) {
    delete mutableEnv[key];
  }

  mutableEnv.NODE_ENV = "test";

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete mutableEnv[key];
    } else {
      mutableEnv[key] = value;
    }
  }

  if (mutableEnv.VERCEL_ENV === "production") {
    mutableEnv.MIMI_BASIC_AUTH_USER = basicAuthUser;
    Reflect.set(mutableEnv, "MIMI_BASIC_AUTH_PASSWORD", basicAuthPassphrase);
    mutableEnv.MIMI_PRODUCTION_CUTOVER_MODE ??= "schema6-readiness";
  }
}

function healthRequest(headers: Record<string, string> = { authorization: basicAuthorization }) {
  return new NextRequest("https://mimi.example/api/storage/health", { headers });
}

describe("/api/storage/health runtime contract", () => {
  beforeEach(() => {
    queryMock.mockReset();
    setRuntimeEnv({});
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  it("keeps local runtime disabled without touching Postgres", async () => {
    const { GET } = await import("./route");
    const response = await GET(healthRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      status: "disabled",
      runtime: {
        mode: "local",
        reason: "missing",
      },
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects Production health unless postgres-production is configured", async () => {
    setRuntimeEnv({
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });
    const { GET } = await import("./route");
    const response = await GET(healthRequest());
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      status: "disabled",
      reason: "production-postgres-runtime-not-enabled",
      runtime: {
        mode: "local",
      },
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("accepts postgres-production only as a readiness probe without public counts", async () => {
    setRuntimeEnv({
      MIMI_STORAGE_RUNTIME: "postgres-production",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });
    queryMock.mockResolvedValueOnce({ rows: [{ ready: 1 }] });
    const { GET } = await import("./route");
    const response = await GET(healthRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      status: "ready",
      runtime: {
        mode: "postgres-production",
      },
    });
    expect(payload.counts).toBeUndefined();
    expect(queryMock).toHaveBeenCalledWith("select 1::int as ready");
  });

  it("keeps Preview health counts for postgres-preview", async () => {
    setRuntimeEnv({
      MIMI_STORAGE_RUNTIME: "postgres-preview",
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
    });
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          people_count: 1,
          vocabulary_count: 2,
          review_event_count: 3,
        },
      ],
    });
    const { GET } = await import("./route");
    const response = await GET(healthRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      status: "ready",
      runtime: {
        mode: "postgres-preview",
      },
      counts: {
        people: 1,
        vocabularyItems: 2,
        reviewEvents: 3,
      },
    });
  });

  it("blocks unauthenticated Production health probes", async () => {
    setRuntimeEnv({
      MIMI_STORAGE_RUNTIME: "postgres-production",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });
    const { GET } = await import("./route");
    const response = await GET(healthRequest({}));

    expect(response.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
