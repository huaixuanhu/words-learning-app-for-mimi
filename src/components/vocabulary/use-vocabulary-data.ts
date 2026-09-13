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
import { v2ClientContractHeaders } from "@/lib/security/v2-client-contract";
import type { VocabularyDeduplicationConfirmation } from "@/lib/vocabulary/deduplication";
import { VocabularyDataStatus } from "./vocabulary-data-status";

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
      type: "vocabulary.deduplicate";
      confirmation: VocabularyDeduplicationConfirmation;
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
  loadError: string | null;
  isRefreshing: boolean;
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

type WorkspaceReadResult =
  | {
      status: "ready";
      data: VocabularyData;
      runtime: "postgres-production" | "postgres-preview";
      serverNow: string;
    }
  | { status: "local" }
  | { status: "error"; message: string };

const WORKSPACE_READ_ERROR = "Check your connection, then retry to load your saved words.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWorkspaceSnapshot(value: unknown): value is VocabularyData {
  if (!isRecord(value) || value.schemaVersion !== 6 ||
    typeof value.selectedPersonId !== "string" ||
    typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) {
    return false;
  }

  return [
    "people", "items", "importBatches", "reviewStates", "reviewEvents",
    "settingsByPerson", "dailyStudyDefaults", "dailyStudyPlans",
    "vocabularyCreationFacts", "vocabularyCreationReversals", "aiRuns",
    "aiEnrichmentDrafts", "vocabularyRelations",
  ].every((key) => Array.isArray(value[key]));
}

export async function readPostgresData(selectedPersonId: string | null): Promise<WorkspaceReadResult> {
  const params = new URLSearchParams();

  if (selectedPersonId) {
    params.set("selectedPersonId", selectedPersonId);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`/api/storage/data?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status === 401) {
      return {
        status: "error",
        message: "Refresh this page to sign in again, then retry to load your words.",
      };
    }

    const payload: unknown = await response.json();

    if (!isRecord(payload) || !isRecord(payload.runtime)) {
      return { status: "error", message: WORKSPACE_READ_ERROR };
    }

    // Only this affirmative non-Production response enables browser-local data.
    // A cloud outage, auth failure or disabled Production runtime never does.
    if (response.status === 403 && payload.ok === false &&
      payload.status === "disabled" && payload.reason === "postgres-runtime-not-enabled" &&
      payload.runtime.mode === "local" &&
      (payload.runtime.reason === "missing" || payload.runtime.reason === "valid")) {
      return { status: "local" };
    }

    if (!response.ok || payload.ok !== true || !isWorkspaceSnapshot(payload.data) ||
      (payload.runtime.mode !== "postgres-production" && payload.runtime.mode !== "postgres-preview")) {
      return { status: "error", message: WORKSPACE_READ_ERROR };
    }

    return {
      status: "ready",
      data: payload.data,
      runtime: payload.runtime.mode,
      serverNow: typeof payload.serverNow === "string" && Number.isFinite(Date.parse(payload.serverNow))
        ? payload.serverNow
        : payload.data.updatedAt,
    };
  } catch {
    return { status: "error", message: WORKSPACE_READ_ERROR };
  } finally {
    clearTimeout(timeout);
  }
}

async function writePostgresMutation(selectedPersonId: string, mutation: VocabularyStorageMutation) {
  const response = await fetch("/api/storage/data", {
    method: WRITE_HTTP_METHOD,
    headers: {
      "content-type": "application/json",
      [UI_WRITE_CONFIRMATION_HEADER]: UI_WRITE_CONFIRMATION_VALUE,
      ...v2ClientContractHeaders(),
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    setIsRefreshing(true);
    const request = (async () => {
      const postgresData = await readPostgresData(getStoredSelectedPersonId());

      if (postgresData.status === "ready") {
        if (clientRevisionRef.current === revisionAtStart) {
          installSnapshot(
            postgresData.data,
            postgresData.runtime,
            postgresData.serverNow,
          );
          setLoadError(null);
          if (activeMutationRevisionRef.current === null) {
            clientSnapshotPatchesRef.current = [];
          }
        }

        return;
      }

      if (clientRevisionRef.current !== revisionAtStart) {
        return;
      }

      if (postgresData.status === "error" ||
        isPostgresClientStorageRuntime(storageRuntimeRef.current)) {
        setLoadError(postgresData.status === "error"
          ? postgresData.message
          : "The saved workspace is temporarily unavailable. Retry to reconnect.");
        return;
      }

      try {
        installSnapshot(readLocalData(), "local");
        setLoadError(null);
      } catch {
        setLoadError("This browser could not open its saved words. Check browser storage access, then retry.");
      }
    })().finally(() => {
      if (refreshInFlightRef.current === request) {
        refreshInFlightRef.current = null;
        setIsRefreshing(false);
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
    const handleOnline = () => {
      void revalidateAfterMutation();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("online", handleOnline);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("online", handleOnline);
    };
  }, [refresh, revalidateAfterMutation]);

  const commit = useCallback(
    async (nextData: VocabularyData, mutation?: VocabularyStorageMutation) => {
      if (!isLoadedRef.current || storageRuntimeRef.current === "loading") {
        throw new Error("Load your saved words before making changes.");
      }

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
            setLoadError(null);
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
      if (!isLoadedRef.current || storageRuntimeRef.current === "loading") {
        throw new Error("Load your saved words before making changes.");
      }

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
      loadError,
      isRefreshing,
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
      loadError,
      isRefreshing,
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
    createElement(VocabularyDataStatus, {
      isLoaded: value.isLoaded,
      loadError: value.loadError,
      isRefreshing: value.isRefreshing,
      onRetry: () => { void value.revalidateAfterMutation(); },
    }),
    value.isLoaded ? children : null,
  );
}

export function useVocabularyData() {
  const value = useContext(VocabularyDataContext);

  if (!value) {
    throw new Error("useVocabularyData must be used inside VocabularyDataProvider");
  }

  return value;
}
