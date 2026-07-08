import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { VocabularyData } from "@/lib/vocabulary/types";

const repositoryMocks = vi.hoisted(() => ({
  createPostgresPerson: vi.fn(),
  createPostgresRepository: vi.fn(),
  getPostgresVocabularyDataSnapshot: vi.fn(),
}));

vi.mock("@/lib/storage/postgres/repository", () => repositoryMocks);

const originalEnv = { ...process.env };
const runtimeEnvKeys = [
  "MIMI_STORAGE_RUNTIME",
  "MIMI_ENABLE_STORAGE_UI_WRITES",
  "VERCEL_ENV",
  "NODE_ENV",
  "STAGE5F_DATABASE_TARGET",
] as const;

const personId = "11111111-1111-4111-8111-111111111111";
const fakeData: VocabularyData = {
  schemaVersion: 5,
  people: [],
  selectedPersonId: personId,
  items: [],
  importBatches: [],
  reviewStates: [],
  reviewEvents: [],
  settingsByPerson: [],
  updatedAt: "2026-07-09T00:00:00.000Z",
};

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
}

function dataGetRequest(url = `https://mimi.example/api/storage/data?selectedPersonId=${personId}`) {
  return {
    nextUrl: new URL(url),
  } as NextRequest;
}

function dataPostRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://mimi.example/api/storage/data", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("/api/storage/data runtime contract", () => {
  beforeEach(() => {
    repositoryMocks.createPostgresPerson.mockReset();
    repositoryMocks.createPostgresRepository.mockReset();
    repositoryMocks.getPostgresVocabularyDataSnapshot.mockReset();
    repositoryMocks.createPostgresRepository.mockReturnValue({
      people: {
        listPeople: vi.fn(),
      },
    });
    repositoryMocks.getPostgresVocabularyDataSnapshot.mockResolvedValue(fakeData);
    setRuntimeEnv({});
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  it("rejects Production data reads unless postgres-production is configured", async () => {
    setRuntimeEnv({
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });
    const { GET } = await import("./route");
    const response = await GET(dataGetRequest());
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
    expect(repositoryMocks.getPostgresVocabularyDataSnapshot).not.toHaveBeenCalled();
  });

  it("rejects postgres-production outside Production", async () => {
    setRuntimeEnv({
      MIMI_STORAGE_RUNTIME: "postgres-production",
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
    });
    const { GET } = await import("./route");
    const response = await GET(dataGetRequest());
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      status: "disabled",
      reason: "postgres-production-runtime-not-allowed",
      runtime: {
        mode: "postgres-production",
      },
    });
    expect(repositoryMocks.getPostgresVocabularyDataSnapshot).not.toHaveBeenCalled();
  });

  it("allows Production reads through postgres-production", async () => {
    setRuntimeEnv({
      MIMI_STORAGE_RUNTIME: "postgres-production",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });
    const { GET } = await import("./route");
    const response = await GET(dataGetRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      status: "ready",
      runtime: {
        mode: "postgres-production",
      },
      data: fakeData,
    });
    expect(repositoryMocks.getPostgresVocabularyDataSnapshot).toHaveBeenCalledWith(personId);
  });

  it("keeps Preview writes behind the preview-only UI write gate", async () => {
    setRuntimeEnv({
      MIMI_STORAGE_RUNTIME: "postgres-preview",
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
    });
    const { POST } = await import("./route");
    const response = await POST(dataPostRequest({
      selectedPersonId: personId,
      mutation: {
        type: "people.select",
        personId,
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      status: "disabled",
      reason: "ui-writes-not-enabled",
      runtime: {
        mode: "postgres-preview",
      },
    });
  });

  it("does not require the preview write flag or header for postgres-production mutations", async () => {
    setRuntimeEnv({
      MIMI_STORAGE_RUNTIME: "postgres-production",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });
    const { POST } = await import("./route");
    const response = await POST(dataPostRequest({
      selectedPersonId: personId,
      mutation: {
        type: "people.select",
        personId,
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      status: "ready",
      runtime: {
        mode: "postgres-production",
      },
      data: fakeData,
    });
  });

  it("continues to reject destructive mutations until Postgres parity is implemented", async () => {
    setRuntimeEnv({
      MIMI_STORAGE_RUNTIME: "postgres-production",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });
    const { POST } = await import("./route");
    const response = await POST(dataPostRequest({
      selectedPersonId: personId,
      mutation: {
        type: "vocabulary.delete",
        vocabularyItemId: "22222222-2222-4222-8222-222222222222",
        now: "2026-07-09T00:00:00.000Z",
        timezone: "Australia/Melbourne",
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      status: "error",
      runtime: {
        mode: "postgres-production",
      },
      error: "Unsupported storage mutation: vocabulary.delete",
    });
  });
});
