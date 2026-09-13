import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VocabularyData } from "@/lib/vocabulary/types";
import { createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import { resolveDailyStudyToday } from "@/lib/daily-study/runtime-engine";

// Keep hook state across synthetic renders while exercising real async resolution.
const host = vi.hoisted(() => ({ cursor: 0, cells: [] as unknown[], vocabulary: {} as Record<string, unknown> }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState(initial: unknown) {
    const index = host.cursor++;
    if (!(index in host.cells)) host.cells[index] = typeof initial === "function" ? initial() : initial;
    return [host.cells[index], (next: unknown) => { host.cells[index] = next; }];
  },
  useRef(initial: unknown) {
    const index = host.cursor++;
    if (!(index in host.cells)) host.cells[index] = { current: initial };
    return host.cells[index];
  },
  useCallback: (callback: unknown) => callback,
  useEffect() {},
}));
vi.mock("@/components/vocabulary/use-vocabulary-data", () => ({
  useVocabularyData: () => host.vocabulary,
  isPostgresClientStorageRuntime: (runtime: string) => runtime === "postgres-production",
}));
import { useDailyStudy } from "./use-daily-study";

const NOW = "2026-07-14T15:00:00.000Z";
function StudyHarness() { return useDailyStudy(); }
function renderStudy() { host.cursor = 0; return StudyHarness(); }
function installWorkspace() {
  let data = createEmptyVocabularyData(NOW);
  let runtimeNow: string | null = null;
  host.vocabulary = {
    data, isLoaded: true, storageRuntime: "postgres-production", commit: vi.fn(),
    revalidateAfterMutation: vi.fn(), getRuntimeNow: () => runtimeNow,
    updateServerClock: (now: string) => { runtimeNow = now; },
    updateClientSnapshot: (updater: (current: VocabularyData) => VocabularyData) => {
      data = updater(data); host.vocabulary.data = data; return data;
    },
  };
  return resolveDailyStudyToday(data, NOW).today;
}

beforeEach(() => { host.cells = []; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Study resolution request coalescing", () => {
  it("shares one pending server read across repeated renders, then uses the installed plan locally", async () => {
    const today = installWorkspace();
    let finish!: (response: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetch);
    const requests = Array.from({ length: 50 }, () => renderStudy().resolveToday());
    expect(fetch).toHaveBeenCalledTimes(1);
    finish(Response.json({ ok: true, result: today, serverNow: NOW }));
    const results = await Promise.all(requests);
    expect(results.every((result) => result.personId === today.personId)).toBe(true);
    await renderStudy().resolveToday();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(renderStudy().isTodayLoading).toBe(false);
  });

  it("releases a failed shared read so a later explicit retry can recover", async () => {
    const today = installWorkspace();
    const fetch = vi.fn().mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce(Response.json({ ok: true, result: today, serverNow: NOW }));
    vi.stubGlobal("fetch", fetch);
    await expect(Promise.all(Array.from({ length: 50 }, () => renderStudy().resolveToday())))
      .rejects.toThrow("Offline");
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(renderStudy().resolveToday()).resolves.toMatchObject({ personId: today.personId });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("aborts a hung Study request after fifteen seconds without retrying it", async () => {
    vi.useFakeTimers();
    installWorkspace();
    const fetch = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    vi.stubGlobal("fetch", fetch);
    const rejected = expect(renderStudy().resolveToday()).rejects.toThrow("Aborted");
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(renderStudy().isTodayLoading).toBe(false);
  });
});
