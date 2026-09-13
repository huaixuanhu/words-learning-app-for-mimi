import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import { readPostgresData } from "./use-vocabulary-data";

const data = createEmptyVocabularyData("2026-09-13T08:00:00.000Z");

function respond(body: unknown, status = 200) {
  const fetch = vi.fn().mockResolvedValue(Response.json(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("workspace read runtime boundary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["postgres-production", "postgres-preview"])("accepts a ready %s snapshot", async (mode) => {
    const fetch = respond({ ok: true, status: "ready", runtime: { mode }, data });

    await expect(readPostgresData("selected-learner")).resolves.toMatchObject({
      status: "ready", runtime: mode, data, serverNow: data.updatedAt,
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/storage/data?selectedPersonId=selected-learner",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  it("permits browser storage only when the server explicitly reports local mode", async () => {
    respond({
      ok: false, status: "disabled", reason: "postgres-runtime-not-enabled",
      runtime: { mode: "local", reason: "valid" },
    }, 403);

    await expect(readPostgresData(null)).resolves.toEqual({ status: "local" });
  });

  it.each([
    [500, "storage-failed", "postgres-production", "valid"],
    [404, "production-postgres-runtime-not-enabled", "local", "missing"],
    [403, "postgres-production-runtime-not-allowed", "postgres-production", "valid"],
    [403, "postgres-runtime-not-enabled", "local", "invalid"],
  ])("keeps HTTP %s / %s as a read failure", async (status, reason, mode, runtimeReason) => {
    respond({ ok: false, status: "disabled", reason, runtime: { mode, reason: runtimeReason } }, status as number);
    await expect(readPostgresData("cloud-learner")).resolves.toMatchObject({ status: "error" });
  });

  it("reports expired authentication without parsing or displaying the server body", async () => {
    const json = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 401, json }));
    const result = await readPostgresData("cloud-learner");

    expect(result).toMatchObject({ status: "error", message: expect.stringContaining("sign in") });
    expect(json).not.toHaveBeenCalled();
  });

  it("treats a network outage as a load error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(readPostgresData("cloud-learner")).resolves.toMatchObject({ status: "error" });
  });

  it("treats truncated successful JSON as a load error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError("truncated JSON")),
    }));
    await expect(readPostgresData("cloud-learner")).resolves.toMatchObject({ status: "error" });
  });

  it.each([
    { ok: true, data },
    { ok: true, runtime: { mode: "local" }, data },
    { ok: true, runtime: { mode: "postgres-production" }, data: { items: [] } },
    { ok: true, runtime: { mode: "postgres-production" }, data: { ...data, people: [null] } },
    { ok: true, runtime: { mode: "postgres-production" }, data: { ...data, people: [{}] } },
    { ok: true, runtime: { mode: "postgres-production" }, data: { ...data, selectedPersonId: "missing-learner" } },
    { ok: true, runtime: { mode: "postgres-production" }, data: { ...data, items: [null] } },
    { ok: true, runtime: { mode: "postgres-production" }, data: { ...data, items: [{ id: "incomplete-word" }] } },
    { ok: true, runtime: { mode: "postgres-production" }, data: { ...data, reviewEvents: [null] } },
  ])("rejects a successful HTTP response with incomplete runtime or snapshot data", async (body) => {
    respond(body);
    await expect(readPostgresData(null)).resolves.toMatchObject({ status: "error" });
  });

  it("ends a stalled request with a recoverable load error", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
      ));
      const request = readPostgresData(null);
      await vi.advanceTimersByTimeAsync(15_000);
      await expect(request).resolves.toMatchObject({ status: "error" });
    } finally {
      vi.useRealTimers();
    }
  });
});
