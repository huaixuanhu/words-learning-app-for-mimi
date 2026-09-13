import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { addVocabularyItem, createEmptyVocabularyData, updateVocabularyItem } from "@/lib/vocabulary/repository";
import { VOCABULARY_STORAGE_KEY } from "@/lib/vocabulary/local-storage-repository";
import { VocabularyDataProvider, type useVocabularyData } from "./use-vocabulary-data";

// A synchronous hook host exercises the provider's async storage transitions in
// Node. Browser lifecycle effects are excluded; refresh is requested explicitly.
const host = vi.hoisted(() => ({ cursor: 0, cells: [] as unknown[] }));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState(initial: unknown) {
      const index = host.cursor++;
      if (!(index in host.cells)) {
        host.cells[index] = typeof initial === "function" ? initial() : initial;
      }
      return [host.cells[index], (next: unknown) => {
        host.cells[index] = typeof next === "function" ? next(host.cells[index]) : next;
      }];
    },
    useRef(initial: unknown) {
      const index = host.cursor++;
      if (!(index in host.cells)) host.cells[index] = { current: initial };
      return host.cells[index];
    },
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    useEffect() {},
  };
});

type Workspace = ReturnType<typeof useVocabularyData>;
function render() {
  host.cursor = 0;
  const tree = VocabularyDataProvider({ children: "learning pages" }) as ReactElement<{
    value: Workspace;
    children: ReactNode[];
  }>;
  return { workspace: tree.props.value, visiblePages: tree.props.children[1] };
}

const selectedKey = "mimi-pte-selected-person-id";
const cloudPersonId = "00000000-0000-4000-8000-000000000023";
function cloudSnapshot() {
  const data = createEmptyVocabularyData("2026-09-13T08:00:00.000Z");
  data.selectedPersonId = cloudPersonId;
  data.people[0].id = cloudPersonId;
  return data;
}

function readyResponse(data = cloudSnapshot()) {
  return Response.json({
    ok: true, status: "ready", runtime: { mode: "postgres-production" },
    data,
  });
}

function localResponse() {
  return Response.json({
    ok: false, status: "disabled", reason: "postgres-runtime-not-enabled",
    runtime: { mode: "local", reason: "missing" },
  }, { status: 403 });
}

describe("workspace load recovery and storage preservation", () => {
  let storage: Map<string, string>;
  let getItem: ReturnType<typeof vi.fn>;
  let setItem: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    host.cells = [];
    storage = new Map([[selectedKey, cloudPersonId]]);
    getItem = vi.fn((key: string) => storage.get(key) ?? null);
    setItem = vi.fn((key: string, value: string) => storage.set(key, value));
    vi.stubGlobal("window", { localStorage: { getItem, setItem, removeItem: (key: string) => storage.delete(key) } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not expose empty learning pages, overwrite learner choice or write locally after a failed initial read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await render().workspace.revalidateAfterMutation();
    const { workspace, visiblePages } = render();

    expect(workspace.isLoaded).toBe(false);
    expect(workspace.loadError).toBeTruthy();
    expect(visiblePages).toBeNull();
    expect(storage.get(selectedKey)).toBe(cloudPersonId);
    expect(getItem).not.toHaveBeenCalledWith(VOCABULARY_STORAGE_KEY);
    await expect(workspace.commit(createEmptyVocabularyData())).rejects.toThrow("Load your saved words");
    expect(() => workspace.updateClientSnapshot(() => createEmptyVocabularyData())).toThrow("Load your saved words");
    expect(setItem).not.toHaveBeenCalled();
  });

  it("retries with the original cloud learner and reveals the accepted snapshot", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(readyResponse());
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    await render().workspace.revalidateAfterMutation();
    const { workspace, visiblePages } = render();

    expect(workspace.isLoaded).toBe(true);
    expect(workspace.loadError).toBeNull();
    expect(workspace.storageRuntime).toBe("postgres-production");
    expect(workspace.data.selectedPersonId).toBe(cloudPersonId);
    expect(visiblePages).toBe("learning pages");
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      `/api/storage/data?selectedPersonId=${cloudPersonId}`,
      `/api/storage/data?selectedPersonId=${cloudPersonId}`,
    ]);
    expect(getItem).not.toHaveBeenCalledWith(VOCABULARY_STORAGE_KEY);
  });

  it.each([true, false])("preserves a newer cross-tab learner selection while an older GET finishes (learner already in response: %s)", async (newLearnerAlreadyIncluded) => {
    const newerPersonId = "00000000-0000-4000-8000-000000000024";
    const bothLearners = cloudSnapshot();
    bothLearners.people.push({ ...bothLearners.people[0], id: newerPersonId, displayName: "Fixture second learner" });
    let finishFirst!: (response: Response) => void;
    const fetch = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishFirst = resolve; }))
      .mockResolvedValueOnce(Response.json({
        ok: true, runtime: { mode: "postgres-production" },
        data: { ...bothLearners, selectedPersonId: newerPersonId },
      }));
    vi.stubGlobal("fetch", fetch);
    const initialRead = render().workspace.revalidateAfterMutation();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    // This write and refresh are the other tab's selection and its storage event.
    storage.set(selectedKey, newerPersonId);
    const storageEventRead = render().workspace.revalidateAfterMutation();
    finishFirst(Response.json({
      ok: true, runtime: { mode: "postgres-production" },
      data: newLearnerAlreadyIncluded ? bothLearners : cloudSnapshot(),
    }));
    await Promise.all([initialRead, storageEventRead]);
    const { workspace } = render();

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      `/api/storage/data?selectedPersonId=${cloudPersonId}`,
      `/api/storage/data?selectedPersonId=${newerPersonId}`,
    ]);
    expect(storage.get(selectedKey)).toBe(newerPersonId);
    expect(workspace.data.selectedPersonId).toBe(newerPersonId);
    expect(workspace.loadError).toBeNull();
    expect(setItem.mock.calls.filter(([key]) => key === selectedKey).every(([, value]) => value === newerPersonId)).toBe(true);
  });

  it("shows recoverable failure for malformed nested cloud data without changing the saved learner", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      ok: true, runtime: { mode: "postgres-production" },
      data: { ...cloudSnapshot(), people: [null] },
    })));
    await render().workspace.revalidateAfterMutation();
    const { workspace, visiblePages } = render();

    expect(workspace.isLoaded).toBe(false);
    expect(workspace.loadError).toBeTruthy();
    expect(visiblePages).toBeNull();
    expect(storage.get(selectedKey)).toBe(cloudPersonId);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("keeps the accepted cloud snapshot visible after a failed refresh and reports stale data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(readyResponse()).mockRejectedValueOnce(new Error("offline")));
    await render().workspace.revalidateAfterMutation();
    const acceptedData = render().workspace.data;
    await render().workspace.revalidateAfterMutation();
    const { workspace, visiblePages } = render();

    expect(workspace.data).toBe(acceptedData);
    expect(workspace.storageRuntime).toBe("postgres-production");
    expect(workspace.isLoaded).toBe(true);
    expect(workspace.loadError).toBeTruthy();
    expect(visiblePages).toBe("learning pages");
    expect(storage.get(selectedKey)).toBe(cloudPersonId);
  });

  it("does not switch an already connected cloud workspace into local mode", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(readyResponse()).mockResolvedValueOnce(localResponse()));
    await render().workspace.revalidateAfterMutation();
    const acceptedData = render().workspace.data;
    await render().workspace.revalidateAfterMutation();
    const { workspace } = render();

    expect(workspace.data).toBe(acceptedData);
    expect(workspace.storageRuntime).toBe("postgres-production");
    expect(workspace.loadError).toBeTruthy();
    expect(getItem).not.toHaveBeenCalledWith(VOCABULARY_STORAGE_KEY);
  });

  it("loads and writes browser data when local mode is affirmatively selected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(localResponse()));
    await render().workspace.revalidateAfterMutation();
    const { workspace, visiblePages } = render();

    expect(workspace.isLoaded).toBe(true);
    expect(workspace.storageRuntime).toBe("local");
    expect(workspace.loadError).toBeNull();
    expect(visiblePages).toBe("learning pages");
    expect(getItem).toHaveBeenCalledWith(VOCABULARY_STORAGE_KEY);
    const nextData = createEmptyVocabularyData("2026-09-13T09:00:00.000Z");
    await expect(workspace.commit(nextData)).resolves.toBe(nextData);
    expect(storage.get(VOCABULARY_STORAGE_KEY)).toBe(JSON.stringify(nextData));
  });

  function editFixture() {
    const before = addVocabularyItem(cloudSnapshot(), {
      id: "00000000-0000-4000-8000-000000000025", surfaceText: "retain",
      meaningZh: "保留", source: "manual", timezone: "Australia/Melbourne",
    }, "2026-09-13T08:00:00.000Z").data;
    const input = { notes: "Updated note" };
    const now = "2026-09-13T09:00:00.000Z";
    const id = before.items[0].id;
    return {
      before,
      after: updateVocabularyItem(before, id, input, now).data,
      mutation: { type: "vocabulary.update" as const, vocabularyItemId: id, input, now, timezone: "Australia/Melbourne" },
    };
  }

  it("coalesces concurrent identical edits and skips a later already-saved edit without repeating effects", async () => {
    const fixture = editFixture();
    let finishWrite!: (response: Response) => void;
    const fetch = vi.fn().mockResolvedValueOnce(readyResponse(fixture.before))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishWrite = resolve; }));
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    const first = render().workspace.commit(fixture.after, fixture.mutation);
    const duplicate = render().workspace.commit(fixture.after, { ...fixture.mutation, now: "2026-09-13T09:00:01.000Z" });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    finishWrite(readyResponse(fixture.after));
    await Promise.all([first, duplicate]);
    await render().workspace.commit(fixture.after, { ...fixture.mutation, now: "2026-09-13T09:00:02.000Z" });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].headers["x-mimi-storage-request-id"]).toEqual(expect.any(String));
    expect(render().workspace.data.items[0].notes).toBe("Updated note");
  });

  it("confirms an uncertain edit with one GET and never repeats its POST", async () => {
    const fixture = editFixture();
    const fetch = vi.fn().mockResolvedValueOnce(readyResponse(fixture.before))
      .mockRejectedValueOnce(new TypeError("response lost"))
      .mockResolvedValueOnce(readyResponse(fixture.after));
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    await expect(render().workspace.commit(fixture.after, fixture.mutation)).resolves.toMatchObject({ items: [{ notes: "Updated note" }] });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(render().workspace.loadError).toBeNull();
  });

  it("keeps the selected learner when it changes during a queued cloud save", async () => {
    const fixture = editFixture();
    const otherPersonId = "00000000-0000-4000-8000-000000000026";
    const otherPerson = { ...fixture.before.people[0], id: otherPersonId, displayName: "Other fixture learner" };
    fixture.before.people.push(otherPerson);
    fixture.after.people = fixture.before.people;
    let finishWrite!: (response: Response) => void;
    const fetch = vi.fn().mockResolvedValueOnce(readyResponse(fixture.before))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishWrite = resolve; }));
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    const save = render().workspace.commit(fixture.after, fixture.mutation);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await render().workspace.commit(fixture.before, { type: "people.select", personId: otherPersonId });
    finishWrite(readyResponse(fixture.after));
    await save;
    expect(render().workspace.data.selectedPersonId).toBe(otherPersonId);
    expect(storage.get(selectedKey)).toBe(otherPersonId);
    expect(JSON.parse(fetch.mock.calls[1][1].body).selectedPersonId).toBe(cloudPersonId);
  });

  it("releases a rejected save so corrected content can be submitted with a new identity", async () => {
    const fixture = editFixture();
    const fetch = vi.fn().mockResolvedValueOnce(readyResponse(fixture.before))
      .mockResolvedValueOnce(Response.json({ ok: false, mutationOutcome: "rejected", error: "Validation rejected" }, { status: 400 }))
      .mockResolvedValueOnce(readyResponse(fixture.after));
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    await expect(render().workspace.commit(fixture.after, fixture.mutation)).rejects.toThrow("Validation rejected");
    await expect(render().workspace.commit(fixture.after, fixture.mutation)).resolves.toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1][1].headers["x-mimi-storage-request-id"]).not.toBe(fetch.mock.calls[2][1].headers["x-mimi-storage-request-id"]);
    expect(storage.has("mimi-pte-pending-storage-write-v1:postgres-production")).toBe(false);
  });

  it("keeps an unknown save visible, blocks queued and repeated writes, and resolves through read-only retry", async () => {
    const fixture = editFixture();
    const fetch = vi.fn().mockResolvedValueOnce(readyResponse(fixture.before))
      .mockRejectedValueOnce(new TypeError("response lost"))
      .mockResolvedValueOnce(readyResponse(fixture.before))
      .mockResolvedValueOnce(readyResponse(fixture.after));
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    const first = render().workspace.commit(fixture.after, fixture.mutation);
    const queued = render().workspace.commit(fixture.after, { ...fixture.mutation, input: { notes: "Other edit" } });
    const outcomes = await Promise.allSettled([first, queued]);
    expect(outcomes.every((entry) => entry.status === "rejected")).toBe(true);
    await expect(render().workspace.commit(fixture.after, fixture.mutation)).rejects.toThrow("could not be confirmed");
    expect(render().workspace.data.items[0].notes).toBe("");
    expect(render().workspace.loadError).toContain("could not be confirmed");
    await render().workspace.revalidateAfterMutation();
    expect(render().workspace.loadError).toBeNull();
    expect(render().workspace.data.items[0].notes).toBe("Updated note");
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("acknowledges a committed save even if readback stays offline and only refreshes on retry", async () => {
    const fixture = editFixture();
    const fetch = vi.fn().mockResolvedValueOnce(readyResponse(fixture.before))
      .mockResolvedValueOnce(Response.json({ ok: true, status: "committed-needs-refresh", mutationOutcome: "committed" }, { status: 202 }))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(readyResponse(fixture.after));
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    await expect(render().workspace.commit(fixture.after, fixture.mutation)).resolves.toBeDefined();
    expect(render().workspace.loadError).toContain("Your change was saved");
    await expect(render().workspace.commit(fixture.after, fixture.mutation)).rejects.toThrow("Your change was saved");
    await render().workspace.revalidateAfterMutation();
    expect(render().workspace.loadError).toBeNull();
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("bounds a hung save and releases the queue without resending it", async () => {
    vi.useFakeTimers();
    const fixture = editFixture();
    const fetch = vi.fn().mockResolvedValueOnce(readyResponse(fixture.before))
      .mockImplementationOnce((_url, init: RequestInit) => new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }))
      .mockResolvedValueOnce(readyResponse(fixture.before));
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    const result = render().workspace.commit(fixture.after, fixture.mutation).catch((error: Error) => error.message);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await result).toContain("could not be confirmed");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(render().workspace.isRefreshing).toBe(false);
  });

  it("preserves a later intentional rating even when its content matches a completed rating", async () => {
    const fixture = editFixture();
    const fetch = vi.fn().mockResolvedValueOnce(readyResponse(fixture.before))
      .mockResolvedValueOnce(readyResponse(fixture.before))
      .mockResolvedValueOnce(readyResponse(fixture.before));
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    const mutation = { type: "review.record" as const, input: { vocabularyItemId: fixture.before.items[0].id, rating: "remembered" as const }, now: "2026-09-13T09:00:00.000Z" };
    await render().workspace.commit(fixture.before, mutation);
    await render().workspace.commit(fixture.before, { ...mutation, now: "2026-09-13T09:01:00.000Z" });
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2);
  });

  it("retains only a digest and identifiers across reload and reconciles the same completed state without a second POST", async () => {
    const fixture = editFixture();
    const fetch = vi.fn().mockResolvedValueOnce(readyResponse(fixture.before))
      .mockRejectedValueOnce(new TypeError("response lost"))
      .mockResolvedValueOnce(readyResponse(fixture.before))
      .mockResolvedValueOnce(readyResponse(fixture.after));
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    await expect(render().workspace.commit(fixture.after, fixture.mutation)).rejects.toThrow("could not be confirmed");
    const fenceKey = "mimi-pte-pending-storage-write-v1:postgres-production";
    const savedFence = JSON.parse(storage.get(fenceKey)!);
    expect(savedFence).toEqual({
      requestId: expect.any(String), personId: cloudPersonId,
      fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/), committed: false,
    });
    expect(storage.get(fenceKey)).not.toContain("Updated note");

    host.cells = []; // Reload the provider while preserving browser storage.
    await render().workspace.revalidateAfterMutation();
    expect(render().workspace.loadError).toContain("could not be confirmed");
    await expect(render().workspace.commit(fixture.after, { ...fixture.mutation, input: { notes: "Unrelated edit" } })).rejects.toThrow("could not be confirmed");
    await expect(render().workspace.commit(fixture.after, fixture.mutation)).resolves.toBeDefined();
    expect(storage.has(fenceKey)).toBe(false);
    expect(render().workspace.loadError).toBeNull();
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("allows confirmed local recovery after a corrupt local read and never enables it for cloud failure", async () => {
    storage.set(VOCABULARY_STORAGE_KEY, "{broken backup");
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(localResponse());
    vi.stubGlobal("fetch", fetch);
    await render().workspace.revalidateAfterMutation();
    await expect(render().workspace.restoreLocalBackup(createEmptyVocabularyData())).rejects.toThrow("only for this browser");
    expect(render().workspace.localRecoveryRequired).toBe(false);
    await render().workspace.revalidateAfterMutation();
    expect(render().workspace.localRecoveryRequired).toBe(true);
    expect(render().workspace.isLoaded).toBe(false);
    const restored = await render().workspace.restoreLocalBackup(createEmptyVocabularyData());
    expect(restored.recoveryStorageKey).toBeTruthy();
    expect(storage.get(restored.recoveryStorageKey!)).toBe("{broken backup");
    expect(render().workspace.localRecoveryRequired).toBe(false);
    expect(render().workspace.isLoaded).toBe(true);
  });
});
