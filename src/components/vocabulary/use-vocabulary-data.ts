"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ImportBatchInput,
  ImportCandidate,
  NewVocabularyInput,
  UpdateVocabularyInput,
  VocabularyData,
} from "@/lib/vocabulary/types";
import { getSelectedPersonId } from "@/lib/people/repository";
import type { ReviewRating } from "@/lib/review/types";
import type { StorageRuntimeMode } from "@/lib/storage/runtime-mode";
import {
  createServerClockAnchor,
  estimateServerNow,
  type ServerClockAnchor,
} from "@/lib/performance/server-clock";
import { waitForStableQueue } from "@/lib/performance/async-queue";
import { createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import {
  readVocabularyData,
  VOCABULARY_STORAGE_KEY,
  writeVocabularyData,
} from "@/lib/vocabulary/local-storage-repository";

export type ClientStorageRuntime = "loading" | StorageRuntimeMode;

export type VocabularyStorageMutation =
  | {
      type: "people.select";
      personId: string;
    }
  | {
      type: "people.add";
      input: {
        displayName: string;
      };
    }
  | {
      type: "vocabulary.add";
      input: NewVocabularyInput;
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.update";
      vocabularyItemId: string;
      input: UpdateVocabularyInput;
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.startFreshInTrack";
      vocabularyItemId: string;
      targetTrack: "recognition" | "active";
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.archive";
      vocabularyItemId: string;
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.restore";
      vocabularyItemId: string;
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.delete";
      vocabularyItemId: string;
      now: string;
      timezone: string;
    }
  | {
      type: "import.commitCandidates";
      batchInput: ImportBatchInput;
      candidates: ImportCandidate[];
      acceptedTempIds: string[];
      now: string;
      timezone: string;
    }
  | {
      type: "import.rollbackBatch";
      importBatchId: string;
      now: string;
      timezone: string;
    }
  | {
      type: "review.record";
      input: {
        vocabularyItemId: string;
        rating: ReviewRating;
        elapsedMs?: number | null;
      };
      now: string;
    }
  | {
      type: "review.resetToday";
      now: string;
      timezone: string;
    }
  | {
      type: "review.rollbackEvent";
      reviewEventId: string;
      now: string;
      timezone: string;
    }
  | {
      type: "reviewSettings.update";
      input: {
        sessionLimit: number;
        recognitionSessionLimit: number;
        activeSessionLimit: number;
        timezone: string;
      };
      now: string;
      timezone: string;
    };

type StorageDataResponse = {
  ok: boolean;
  status: string;
  runtime?: {
    mode: StorageRuntimeMode;
  };
  serverNow?: string;
  data?: VocabularyData;
  error?: string;
  reason?: string;
};

const SELECTED_PERSON_STORAGE_KEY = "mimi-pte-selected-person-id";
const VOCABULARY_SYNC_STORAGE_KEY = "mimi-pte-vocabulary-sync-v2";
const UI_WRITE_CONFIRMATION_HEADER = "x-mimi-ui-storage-write";
const UI_WRITE_CONFIRMATION_VALUE = "allow-dev-preview-ui-write";
const WRITE_HTTP_METHOD = "P" + "OST";

type VocabularyDataContextValue = Readonly<{
  data: VocabularyData;
  isLoaded: boolean;
  storageRuntime: ClientStorageRuntime;
  commit(
    nextData: VocabularyData,
    mutation?: VocabularyStorageMutation,
  ): Promise<VocabularyData>;
  revalidateAfterMutation(
    options?: Readonly<{ broadcast?: boolean }>,
  ): Promise<void>;
  getRuntimeNow(): string | null;
  updateServerClock(serverNow: string): void;
  updateClientSnapshot(
    updater: (current: VocabularyData) => VocabularyData,
    options?: Readonly<{ broadcast?: boolean }>,
  ): VocabularyData;
}>;

const VocabularyDataContext = createContext<VocabularyDataContextValue | null>(null);

function getStoredSelectedPersonId() {
  try {
    return window.localStorage.getItem(SELECTED_PERSON_STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberSelectedPersonId(personId: string) {
  try {
    window.localStorage.setItem(SELECTED_PERSON_STORAGE_KEY, personId);
  } catch {
    // Local preference persistence is best-effort.
  }
}

function signalPostgresDataChange() {
  try {
    window.localStorage.setItem(
      VOCABULARY_SYNC_STORAGE_KEY,
      `${Date.now()}:${Math.random().toString(36).slice(2)}`,
    );
  } catch {
    // Cross-tab refresh is best-effort; the accepted mutation remains authoritative here.
  }
}

export function isPostgresClientStorageRuntime(runtime: ClientStorageRuntime) {
  return runtime === "postgres-preview" || runtime === "postgres-production";
}

function readLocalData() {
  return readVocabularyData();
}

export async function readPostgresData(selectedPersonId: string | null) {
  const params = new URLSearchParams();

  if (selectedPersonId) {
    params.set("selectedPersonId", selectedPersonId);
  }

  try {
    const response = await fetch(`/api/storage/data?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as StorageDataResponse;

    if (!payload.ok || !payload.data) {
      return null;
    }

    return {
      data: payload.data,
      runtime: payload.runtime?.mode === "postgres-production" ? "postgres-production" : "postgres-preview",
      serverNow: payload.serverNow ?? payload.data.updatedAt,
    } satisfies {
      data: VocabularyData;
      runtime: ClientStorageRuntime;
      serverNow: string;
    };
  } catch {
    return null;
  }
}

async function writePostgresMutation(selectedPersonId: string, mutation: VocabularyStorageMutation) {
  const response = await fetch("/api/storage/data", {
    method: WRITE_HTTP_METHOD,
    headers: {
      "content-type": "application/json",
      [UI_WRITE_CONFIRMATION_HEADER]: UI_WRITE_CONFIRMATION_VALUE,
    },
    body: JSON.stringify({
      selectedPersonId,
      mutation,
    }),
  });
  const payload = (await response.json()) as StorageDataResponse;

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? payload.reason ?? "Postgres storage write failed");
  }

  return {
    data: payload.data,
    serverNow: payload.serverNow ?? payload.data.updatedAt,
  };
}

function useVocabularyDataStore(): VocabularyDataContextValue {
  const [data, setData] = useState<VocabularyData>(() => createEmptyVocabularyData());
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageRuntime, setStorageRuntime] = useState<ClientStorageRuntime>("loading");
  const dataRef = useRef(data);
  const isLoadedRef = useRef(isLoaded);
  const storageRuntimeRef = useRef<ClientStorageRuntime>(storageRuntime);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const clientRevisionRef = useRef(0);
  const clientSnapshotPatchesRef = useRef<
    Array<{
      revision: number;
      updater: (current: VocabularyData) => VocabularyData;
    }>
  >([]);
  const activeMutationRevisionRef = useRef<number | null>(null);
  const serverClockRef = useRef<ServerClockAnchor | null>(null);

  const updateServerClock = useCallback((serverNow: string) => {
    serverClockRef.current = createServerClockAnchor(
      serverNow,
      performance.now(),
      Date.now(),
    );
  }, []);

  const installSnapshot = useCallback(
    (
      nextData: VocabularyData,
      nextRuntime: ClientStorageRuntime,
      serverNow?: string,
    ) => {
      if (isPostgresClientStorageRuntime(nextRuntime) && serverNow) {
        updateServerClock(serverNow);
      }

      rememberSelectedPersonId(getSelectedPersonId(nextData));
      dataRef.current = nextData;
      storageRuntimeRef.current = nextRuntime;
      isLoadedRef.current = true;
      setData(nextData);
      setStorageRuntime(nextRuntime);
      setIsLoaded(true);
    },
    [updateServerClock],
  );

  const refresh = useCallback(() => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const revisionAtStart = clientRevisionRef.current;
    const request = (async () => {
      const postgresData = await readPostgresData(getStoredSelectedPersonId());

      if (postgresData) {
        if (clientRevisionRef.current === revisionAtStart) {
          installSnapshot(
            postgresData.data,
            postgresData.runtime,
            postgresData.serverNow,
          );
          if (activeMutationRevisionRef.current === null) {
            clientSnapshotPatchesRef.current = [];
          }
        }

        return;
      }

      if (
        isLoadedRef.current &&
        isPostgresClientStorageRuntime(storageRuntimeRef.current)
      ) {
        return;
      }

      const localData = readLocalData();

      if (clientRevisionRef.current === revisionAtStart) {
        installSnapshot(localData, "local");
      }

      return;
    })().finally(() => {
      if (refreshInFlightRef.current === request) {
        refreshInFlightRef.current = null;
      }
    });

    refreshInFlightRef.current = request;
    return request;
  }, [installSnapshot]);

  const revalidateAfterMutation = useCallback(
    async (options: Readonly<{ broadcast?: boolean }> = {}) => {
      await waitForStableQueue(() => mutationQueueRef.current);
      const inFlight = refreshInFlightRef.current;

      if (inFlight) {
        await inFlight;
      }

      await refresh();

      if (options.broadcast) {
        signalPostgresDataChange();
      }
    },
    [refresh],
  );

  const getRuntimeNow = useCallback(() => {
    if (isPostgresClientStorageRuntime(storageRuntimeRef.current)) {
      return serverClockRef.current
        ? estimateServerNow(
            serverClockRef.current,
            performance.now(),
            Date.now(),
          )
        : null;
    }

    return new Date().toISOString();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === VOCABULARY_STORAGE_KEY ||
        event.key === SELECTED_PERSON_STORAGE_KEY ||
        event.key === VOCABULARY_SYNC_STORAGE_KEY
      ) {
        void revalidateAfterMutation();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refresh, revalidateAfterMutation]);

  const commit = useCallback(
    async (nextData: VocabularyData, mutation?: VocabularyStorageMutation) => {
      if (isPostgresClientStorageRuntime(storageRuntimeRef.current)) {
        if (!mutation) {
          throw new Error("Postgres storage commit requires mutation metadata");
        }

        if (mutation.type === "people.select") {
          const selectedData = {
            ...dataRef.current,
            selectedPersonId: mutation.personId,
            updatedAt: new Date().toISOString(),
          };

          clientRevisionRef.current += 1;
          installSnapshot(selectedData, storageRuntimeRef.current);

          return selectedData;
        }

        let resolveMutation!: (value: VocabularyData) => void;
        let rejectMutation!: (reason?: unknown) => void;
        const intendedPersonId = getSelectedPersonId(dataRef.current);
        const result = new Promise<VocabularyData>((resolve, reject) => {
          resolveMutation = resolve;
          rejectMutation = reject;
        });
        const runMutation = async () => {
          try {
            const revisionAtStart = clientRevisionRef.current;
            activeMutationRevisionRef.current = revisionAtStart;
            const persisted = await writePostgresMutation(
              intendedPersonId,
              mutation,
            );
            const persistedData = clientSnapshotPatchesRef.current
              .filter((patch) => patch.revision > revisionAtStart)
              .reduce(
                (current, patch) => patch.updater(current),
                persisted.data,
              );
            const currentSelectedPersonId = getSelectedPersonId(dataRef.current);
            const selectionChangedDuringMutation =
              clientRevisionRef.current !== revisionAtStart &&
              currentSelectedPersonId !== intendedPersonId;
            const currentSelectionStillExists = persistedData.people.some(
              (person) => person.id === currentSelectedPersonId,
            );
            const installedData =
              selectionChangedDuringMutation && currentSelectionStillExists
              ? { ...persistedData, selectedPersonId: currentSelectedPersonId }
              : persistedData;

            clientRevisionRef.current += 1;
            installSnapshot(
              installedData,
              storageRuntimeRef.current,
              persisted.serverNow,
            );
            clientSnapshotPatchesRef.current = [];
            signalPostgresDataChange();
            resolveMutation(installedData);
          } catch (error) {
            rejectMutation(error);
          } finally {
            activeMutationRevisionRef.current = null;
            clientSnapshotPatchesRef.current = [];
          }
        };

        mutationQueueRef.current = mutationQueueRef.current.then(
          runMutation,
          runMutation,
        );

        return result;
      }

      writeVocabularyData(nextData);
      clientRevisionRef.current += 1;
      installSnapshot(nextData, "local");

      return nextData;
    },
    [installSnapshot],
  );

  const updateClientSnapshot = useCallback(
    (
      updater: (current: VocabularyData) => VocabularyData,
      options: Readonly<{ broadcast?: boolean }> = {},
    ) => {
      const currentData = dataRef.current;
      const nextData = updater(currentData);

      if (nextData === currentData) {
        return currentData;
      }

      clientRevisionRef.current += 1;
      if (activeMutationRevisionRef.current !== null) {
        clientSnapshotPatchesRef.current.push({
          revision: clientRevisionRef.current,
          updater,
        });
      }
      installSnapshot(nextData, storageRuntimeRef.current);

      if (
        options.broadcast &&
        isPostgresClientStorageRuntime(storageRuntimeRef.current)
      ) {
        signalPostgresDataChange();
      }

      return nextData;
    },
    [installSnapshot],
  );

  return useMemo(
    () => ({
      data,
      isLoaded,
      storageRuntime,
      commit,
      revalidateAfterMutation,
      getRuntimeNow,
      updateServerClock,
      updateClientSnapshot,
    }),
    [
      commit,
      data,
      getRuntimeNow,
      isLoaded,
      revalidateAfterMutation,
      storageRuntime,
      updateServerClock,
      updateClientSnapshot,
    ],
  );
}

export function VocabularyDataProvider({ children }: { children: ReactNode }) {
  const value = useVocabularyDataStore();

  return createElement(
    VocabularyDataContext.Provider,
    { value },
    children,
  );
}

export function useVocabularyData() {
  const value = useContext(VocabularyDataContext);

  if (!value) {
    throw new Error("useVocabularyData must be used inside VocabularyDataProvider");
  }

  return value;
}
