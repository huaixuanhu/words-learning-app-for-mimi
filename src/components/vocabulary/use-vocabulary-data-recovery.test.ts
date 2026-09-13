import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { createEmptyVocabularyData } from "@/lib/vocabulary/repository";
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

function readyResponse() {
  return Response.json({
    ok: true, status: "ready", runtime: { mode: "postgres-production" },
    data: cloudSnapshot(),
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
    vi.stubGlobal("window", { localStorage: { getItem, setItem } });
  });

  afterEach(() => {
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
});
