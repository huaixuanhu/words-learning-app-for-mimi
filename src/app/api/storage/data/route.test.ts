import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { VocabularyData } from "@/lib/vocabulary/types";

const repositoryMocks = vi.hoisted(() => ({
  createPostgresPerson: vi.fn(),
  createPostgresRepository: vi.fn(),
  getPostgresVocabularyDataSnapshot: vi.fn(),
}));
const repositoryMethodMocks = vi.hoisted(() => ({
  deleteItem: vi.fn(),
  rollbackImportBatch: vi.fn(),
  startFreshInTrack: vi.fn(),
  resetToday: vi.fn(),
  rollbackEvent: vi.fn(),
}));

vi.mock("@/lib/storage/postgres/repository", () => repositoryMocks);

const originalEnv = { ...process.env };
const runtimeEnvKeys = [
  "MIMI_STORAGE_RUNTIME",
  "MIMI_ENABLE_STORAGE_UI_WRITES",
  "MIMI_BASIC_AUTH_USER",
  "MIMI_BASIC_AUTH_PASSWORD",
  "VERCEL_ENV",
  "NODE_ENV",
  "STAGE5F_DATABASE_TARGET",
] as const;

const basicAuthUser = "mimi";
const basicAuthPassphrase = "test-production-password";
const basicAuthorization = `Basic ${Buffer.from(`${basicAuthUser}:${basicAuthPassphrase}`).toString("base64")}`;

const personId = "11111111-1111-4111-8111-111111111111";
const fakeData: VocabularyData = {
  schemaVersion: 6,
  people: [],
  selectedPersonId: personId,
  items: [],
  importBatches: [],
  reviewStates: [],
  reviewEvents: [],
  settingsByPerson: [],
  dailyStudyDefaults: [],
  dailyStudyPlans: [],
  vocabularyCreationFacts: [],
  vocabularyCreationReversals: [],
  aiRuns: [],
  aiEnrichmentDrafts: [],
  vocabularyRelations: [],
  updatedAt: "2026-07-09T00:00:00.000Z",
};

function setRuntimeEnv(
  overrides: Record<string, string | undefined>,
  options: { withProductionAuth?: boolean } = {},
) {
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

  if (mutableEnv.VERCEL_ENV === "production" && options.withProductionAuth !== false) {
    mutableEnv.MIMI_BASIC_AUTH_USER = basicAuthUser;
    Reflect.set(mutableEnv, "MIMI_BASIC_AUTH_PASSWORD", basicAuthPassphrase);
  }
}

function dataGetRequest(
  url = `https://mimi.example/api/storage/data?selectedPersonId=${personId}`,
  headers: Record<string, string> = { authorization: basicAuthorization },
) {
  return {
    nextUrl: new URL(url),
    headers: new Headers(headers),
  } as NextRequest;
}

function dataPostRequest(
  body: unknown,
  headers: Record<string, string> = { authorization: basicAuthorization },
) {
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
    repositoryMethodMocks.deleteItem.mockReset();
    repositoryMethodMocks.rollbackImportBatch.mockReset();
    repositoryMethodMocks.startFreshInTrack.mockReset();
    repositoryMethodMocks.resetToday.mockReset();
    repositoryMethodMocks.rollbackEvent.mockReset();
    repositoryMocks.createPostgresRepository.mockReturnValue({
      people: {
        listPeople: vi.fn(),
      },
      vocabulary: {
        deleteItem: repositoryMethodMocks.deleteItem,
        rollbackImportBatch: repositoryMethodMocks.rollbackImportBatch,
        startFreshInTrack: repositoryMethodMocks.startFreshInTrack,
      },
      review: {
        resetToday: repositoryMethodMocks.resetToday,
        rollbackEvent: repositoryMethodMocks.rollbackEvent,
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

  it("fails closed before Production runtime inspection when Basic Auth is missing", async () => {
    setRuntimeEnv(
      {
        MIMI_STORAGE_RUNTIME: "postgres-production",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      },
      { withProductionAuth: true },
    );
    const { GET } = await import("./route");
    const response = await GET(dataGetRequest(undefined, {}));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Mimi Vocabulary");
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

  it("routes an explicit start-fresh Track change", async () => {
    setRuntimeEnv({
      MIMI_STORAGE_RUNTIME: "postgres-production",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });
    const { POST } = await import("./route");
    const response = await POST(
      dataPostRequest({
        selectedPersonId: personId,
        mutation: {
          type: "vocabulary.startFreshInTrack",
          vocabularyItemId: "22222222-2222-4222-8222-222222222222",
          targetTrack: "active",
          now: "2026-07-15T08:00:00.000Z",
          timezone: "Australia/Melbourne",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(repositoryMethodMocks.startFreshInTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        personId,
        now: "2026-07-15T08:00:00.000Z",
        timezone: "Australia/Melbourne",
      }),
      "22222222-2222-4222-8222-222222222222",
      "active",
    );
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

  it("routes hard delete mutations through the Postgres repository parity method", async () => {
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

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      status: "ready",
      runtime: {
        mode: "postgres-production",
      },
      data: fakeData,
    });
    expect(repositoryMethodMocks.deleteItem).toHaveBeenCalledWith(
      {
        personId,
        now: "2026-07-09T00:00:00.000Z",
        timezone: "Australia/Melbourne",
      },
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("routes rollback and review repair mutations through repository parity methods", async () => {
    setRuntimeEnv({
      MIMI_STORAGE_RUNTIME: "postgres-production",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });
    const { POST } = await import("./route");
    const common = {
      selectedPersonId: personId,
    };
    const now = "2026-07-09T00:00:00.000Z";
    const timezone = "Australia/Melbourne";

    await POST(dataPostRequest({
      ...common,
      mutation: {
        type: "import.rollbackBatch",
        importBatchId: "33333333-3333-4333-8333-333333333333",
        now,
        timezone,
      },
    }));
    await POST(dataPostRequest({
      ...common,
      mutation: {
        type: "review.resetToday",
        now,
        timezone,
      },
    }));
    await POST(dataPostRequest({
      ...common,
      mutation: {
        type: "review.rollbackEvent",
        reviewEventId: "44444444-4444-4444-8444-444444444444",
        now,
        timezone,
      },
    }));

    expect(repositoryMethodMocks.rollbackImportBatch).toHaveBeenCalledWith(
      {
        personId,
        now,
        timezone,
      },
      "33333333-3333-4333-8333-333333333333",
    );
    expect(repositoryMethodMocks.resetToday).toHaveBeenCalledWith({
      personId,
      now,
      timezone,
    });
    expect(repositoryMethodMocks.rollbackEvent).toHaveBeenCalledWith(
      {
        personId,
        now,
        timezone,
      },
      "44444444-4444-4444-8444-444444444444",
    );
  });
});
