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
import { createAutomaticRevalidator } from "@/lib/performance/automatic-revalidation";
import { createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import {
  readVocabularyData,
  LocalVocabularyReadError,
  restoreVocabularyData,
  VOCABULARY_STORAGE_KEY,
  writeVocabularyData,
} from "@/lib/vocabulary/local-storage-repository";
import { v2ClientContractHeaders } from "@/lib/security/v2-client-contract";
import type { VocabularyDeduplicationConfirmation } from "@/lib/vocabulary/deduplication";
import { VocabularyDataStatus } from "./vocabulary-data-status";
import { LocalBackupRecovery } from "./local-backup-recovery";

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
  mutationOutcome?: "committed" | "rejected" | "unknown";
  selectedPersonId?: string;
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
  localRecoveryRequired: boolean;
  storageRuntime: ClientStorageRuntime;
  commit(
    nextData: VocabularyData,
    mutation?: VocabularyStorageMutation,
  ): Promise<VocabularyData>;
  restoreLocalBackup(data: VocabularyData): Promise<{ recoveryStorageKey: string | null }>;
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

  const collections = [
    "people", "items", "importBatches", "reviewStates", "reviewEvents",
    "settingsByPerson", "dailyStudyDefaults", "dailyStudyPlans",
    "vocabularyCreationFacts", "vocabularyCreationReversals", "aiRuns",
    "aiEnrichmentDrafts", "vocabularyRelations",
  ];
  if (!collections.every((key) => Array.isArray(value[key]) && value[key].every(isRecord))) {
    return false;
  }

  const people = value.people as Record<string, unknown>[];
  if (!people.every((person) =>
    typeof person.id === "string" && person.id.length > 0 &&
    typeof person.displayName === "string" && typeof person.isActive === "boolean") ||
    !people.some((person) => person.id === value.selectedPersonId && person.isActive === true)) {
    return false;
  }

  return (value.items as Record<string, unknown>[]).every((item) =>
    ["id", "personId", "surfaceText", "normalizedText", "meaningZh", "example", "notes", "createdAt", "timezone"]
      .every((key) => typeof item[key] === "string") &&
    ["meaningsZh", "examples"].every((key) =>
      Array.isArray(item[key]) && item[key].every((entry) => typeof entry === "string")) &&
    (item.exampleTranslationsZh === undefined ||
      (Array.isArray(item.exampleTranslationsZh) &&
        item.exampleTranslationsZh.every((entry) => typeof entry === "string"))));
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

const SAVE_REFRESH_ERROR = "Your change was saved. Retry to load the updated workspace before making another change.";
const SAVE_UNKNOWN_ERROR = "The save could not be confirmed. Retry to check your saved data before making another change.";
const MUTATION_FENCE_PREFIX = "mimi-pte-pending-storage-write-v1:";
type MutationFence = {
  requestId: string;
  personId: string;
  fingerprint: string;
  committed: boolean;
  mutation?: VocabularyStorageMutation;
  expected?: VocabularyData;
};

function readMutationFence(runtime: ClientStorageRuntime): MutationFence | null {
  const raw = window.localStorage.getItem(`${MUTATION_FENCE_PREFIX}${runtime}`);
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || typeof value.requestId !== "string" || typeof value.personId !== "string" ||
    typeof value.fingerprint !== "string" || typeof value.committed !== "boolean") {
    throw new Error("The pending save status could not be read. Keep this browser's saved data while checking the last save.");
  }
  return value as MutationFence;
}

function persistMutationFence(runtime: ClientStorageRuntime, fence: MutationFence) {
  window.localStorage.setItem(`${MUTATION_FENCE_PREFIX}${runtime}`, JSON.stringify({
    requestId: fence.requestId, personId: fence.personId,
    fingerprint: fence.fingerprint, committed: fence.committed,
  }));
}

function clearMutationFence(runtime: ClientStorageRuntime, fence: MutationFence) {
  if (readMutationFence(runtime)?.requestId === fence.requestId) {
    window.localStorage.removeItem(`${MUTATION_FENCE_PREFIX}${runtime}`);
  }
}

async function mutationFingerprint(key: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

class StorageMutationError extends Error {
  constructor(message: string, readonly outcome: "rejected" | "unknown") {
    super(message);
  }
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => isRecord(entry)
    ? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, entry[key]]))
    : entry);
}

function mutationKey(personId: string, mutation: VocabularyStorageMutation) {
  // Repeated ratings are separate events. Content saves clicked twice while
  // pending share a flight even if their incidental click timestamps differ.
  const content = mutation.type === "review.record" ? mutation : { ...mutation, now: undefined };
  return canonicalJson({ personId, mutation: content });
}

function mutationStateMatches(
  actual: VocabularyData,
  expected: VocabularyData,
  personId: string,
  mutation: VocabularyStorageMutation,
) {
  if (mutation.type === "vocabulary.update") {
    const current = actual.items.find((item) => item.id === mutation.vocabularyItemId && item.personId === personId);
    const desired = expected.items.find((item) => item.id === mutation.vocabularyItemId && item.personId === personId);
    if (!current || !desired) return false;
    const keys = new Set<keyof UpdateVocabularyInput>(Object.keys(mutation.input) as (keyof UpdateVocabularyInput)[]);
    if (keys.has("meaningZh") || keys.has("meaningsZh")) { keys.add("meaningZh"); keys.add("meaningsZh"); }
    if (keys.has("example") || keys.has("examples") || keys.has("exampleTranslationsZh")) {
      keys.add("example"); keys.add("examples"); keys.add("exampleTranslationsZh");
    }
    return [...keys].every((key) => canonicalJson(current[key]) === canonicalJson(desired[key]));
  }
  if (mutation.type === "reviewSettings.update") {
    const current = actual.settingsByPerson.find((entry) => entry.personId === personId);
    const desired = expected.settingsByPerson.find((entry) => entry.personId === personId);
    return !!current && !!desired && Object.keys(mutation.input).every((key) =>
      canonicalJson(current[key as keyof typeof current]) === canonicalJson(desired[key as keyof typeof desired]));
  }
  if (mutation.type === "vocabulary.archive" || mutation.type === "vocabulary.restore") {
    const item = actual.items.find((entry) => entry.id === mutation.vocabularyItemId && entry.personId === personId);
    return !!item && Boolean(item.archivedAt) === (mutation.type === "vocabulary.archive");
  }
  if (mutation.type === "vocabulary.delete") {
    return !actual.items.some((entry) => entry.id === mutation.vocabularyItemId && entry.personId === personId);
  }
  return false;
}

async function writePostgresMutation(selectedPersonId: string, mutation: VocabularyStorageMutation, requestId: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("/api/storage/data", {
      method: WRITE_HTTP_METHOD,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-mimi-storage-request-id": requestId,
        [UI_WRITE_CONFIRMATION_HEADER]: UI_WRITE_CONFIRMATION_VALUE,
        ...v2ClientContractHeaders(),
      },
      body: JSON.stringify({ selectedPersonId, mutation }),
    });
    const payload = (await response.json()) as StorageDataResponse;
    if (!isRecord(payload)) throw new StorageMutationError(SAVE_UNKNOWN_ERROR, "unknown");
    if (response.ok && payload.ok === true && payload.mutationOutcome === "committed" &&
      (payload.status === "committed-needs-refresh" || !isWorkspaceSnapshot(payload.data))) {
      return { status: "committed" as const, selectedPersonId: payload.selectedPersonId };
    }
    if (!response.ok || payload.ok !== true) {
      throw new StorageMutationError(payload.error ?? payload.reason ?? "Postgres storage write failed",
        payload.mutationOutcome === "rejected" || [401, 403, 404, 428].includes(response.status) ? "rejected" : "unknown");
    }
    if (!isWorkspaceSnapshot(payload.data)) throw new StorageMutationError(SAVE_UNKNOWN_ERROR, "unknown");
    return { status: "ready" as const, data: payload.data, serverNow: payload.serverNow ?? payload.data.updatedAt };
  } catch (error) {
    if (error instanceof StorageMutationError) throw error;
    throw new StorageMutationError(SAVE_UNKNOWN_ERROR, "unknown");
  } finally {
    clearTimeout(timeout);
  }
}

function useVocabularyDataStore(): VocabularyDataContextValue {
  const [data, setData] = useState<VocabularyData>(() => createEmptyVocabularyData());
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localRecoveryRequired, setLocalRecoveryRequired] = useState(false);
  const [storageRuntime, setStorageRuntime] = useState<ClientStorageRuntime>("loading");
  const dataRef = useRef(data);
  const isLoadedRef = useRef(isLoaded);
  const storageRuntimeRef = useRef<ClientStorageRuntime>(storageRuntime);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const lastRefreshSucceededRef = useRef(false);
  const automaticRevalidatorRef = useRef<ReturnType<typeof createAutomaticRevalidator> | null>(null);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mutationFlightsRef = useRef(new Map<string, Promise<VocabularyData>>());
  const pendingMutationRef = useRef<MutationFence | null>(null);
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
    lastRefreshSucceededRef.current = false;
    setIsRefreshing(true);
    const request = (async () => {
      const requestedPersonId = getStoredSelectedPersonId();
      const postgresData = await readPostgresData(requestedPersonId);

      if (postgresData.status === "ready") {
        if (clientRevisionRef.current === revisionAtStart) {
          const latestStoredPersonId = getStoredSelectedPersonId();
          const selectionChanged = latestStoredPersonId !== requestedPersonId;
          if (selectionChanged && latestStoredPersonId &&
            !postgresData.data.people.some((person) => person.id === latestStoredPersonId && person.isActive)) {
            // A newer learner may have been added after this snapshot was read.
            // Keep its preference until the pending storage-event refresh runs.
            setLoadError("The selected learner changed while loading. Retry to open their saved words.");
            return;
          }

          try {
            const storedFence = readMutationFence(postgresData.runtime);
            if (storedFence?.requestId !== pendingMutationRef.current?.requestId) {
              pendingMutationRef.current = storedFence;
            }
            installSnapshot(
              selectionChanged && latestStoredPersonId
                ? { ...postgresData.data, selectedPersonId: latestStoredPersonId }
                : postgresData.data,
              postgresData.runtime,
              postgresData.serverNow,
            );
            lastRefreshSucceededRef.current = true;
            setLocalRecoveryRequired(false);
            const pending = pendingMutationRef.current;
            if (pending && !pending.committed &&
              (!pending.expected || !pending.mutation ||
                !mutationStateMatches(postgresData.data, pending.expected, pending.personId, pending.mutation))) {
              setLoadError(SAVE_UNKNOWN_ERROR);
            } else {
              if (pending) clearMutationFence(postgresData.runtime, pending);
              pendingMutationRef.current = null;
              setLoadError(null);
            }
            if (activeMutationRevisionRef.current === null) {
              clientSnapshotPatchesRef.current = [];
            }
          } catch {
            setLoadError(WORKSPACE_READ_ERROR);
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

      // A positively selected local runtime may recover its own corrupt backup.
      storageRuntimeRef.current = "local";
      setStorageRuntime("local");
      try {
        installSnapshot(readLocalData(), "local");
        lastRefreshSucceededRef.current = true;
        setLocalRecoveryRequired(false);
        setLoadError(null);
      } catch (error) {
        setLocalRecoveryRequired(error instanceof LocalVocabularyReadError);
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
    async (options: Readonly<{ broadcast?: boolean; automatic?: boolean }> = {}) => {
      if (!options.automatic) automaticRevalidatorRef.current?.reset();
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
    const automatic = createAutomaticRevalidator({
      run: async () => {
        await revalidateAfterMutation({ automatic: true });
        return lastRefreshSucceededRef.current;
      },
      isVisible: () => typeof document === "undefined" || document.visibilityState === "visible",
    });
    automaticRevalidatorRef.current = automatic;
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === VOCABULARY_STORAGE_KEY ||
        event.key === SELECTED_PERSON_STORAGE_KEY ||
        event.key === VOCABULARY_SYNC_STORAGE_KEY
      ) {
        automatic.request();
      }
    };
    const handleOnline = () => {
      automatic.request();
    };
    const handleVisibility = () => automatic.resume();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      automatic.dispose();
      if (automaticRevalidatorRef.current === automatic) automaticRevalidatorRef.current = null;
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
        const key = mutationKey(intendedPersonId, mutation);
        const existingFlight = mutationFlightsRef.current.get(key);
        if (existingFlight) return existingFlight;
        const requestId = crypto.randomUUID();
        const result = new Promise<VocabularyData>((resolve, reject) => {
          resolveMutation = resolve;
          rejectMutation = reject;
        });
        const runMutation = async () => {
          try {
            const fingerprint = await mutationFingerprint(key);
            const storedFence = readMutationFence(storageRuntimeRef.current);
            const pending = pendingMutationRef.current ?? storedFence;
            if (pending) {
              if (!pending.committed && pending.personId === intendedPersonId && pending.fingerprint === fingerprint &&
                mutationStateMatches(dataRef.current, nextData, intendedPersonId, mutation)) {
                clearMutationFence(storageRuntimeRef.current, pending);
                pendingMutationRef.current = null;
                setLoadError(null);
                resolveMutation(dataRef.current);
                return;
              }
              throw new Error(pending.committed ? SAVE_REFRESH_ERROR : SAVE_UNKNOWN_ERROR);
            }
            if (mutationStateMatches(dataRef.current, nextData, intendedPersonId, mutation)) {
              resolveMutation(dataRef.current);
              return;
            }
            const revisionAtStart = clientRevisionRef.current;
            activeMutationRevisionRef.current = revisionAtStart;
            const fence: MutationFence = { requestId, personId: intendedPersonId, fingerprint, mutation, expected: nextData, committed: false };
            // Persist only identity + digest before dispatch. Reloading cannot
            // silently turn an in-flight/unknown operation into a fresh write.
            persistMutationFence(storageRuntimeRef.current, fence);
            let persisted: { data: VocabularyData; serverNow: string };
            let written: Awaited<ReturnType<typeof writePostgresMutation>>;
            try {
              written = await writePostgresMutation(intendedPersonId, mutation, requestId);
            } catch (error) {
              if (!(error instanceof StorageMutationError) || error.outcome === "rejected") {
                clearMutationFence(storageRuntimeRef.current, fence);
                throw error;
              }
              pendingMutationRef.current = fence;
              clientRevisionRef.current += 1;
              setLoadError(SAVE_UNKNOWN_ERROR);
              // One read can confirm a state save; it can never authorize an
              // automatic second write after an ambiguous response.
              const checked = await readPostgresData(getStoredSelectedPersonId());
              if (checked.status !== "ready" || !mutationStateMatches(checked.data, nextData, intendedPersonId, mutation)) {
                throw error;
              }
              pendingMutationRef.current = null;
              written = { status: "ready", data: checked.data, serverNow: checked.serverNow };
            }
            if (written.status === "committed") {
              fence.committed = true;
              persistMutationFence(storageRuntimeRef.current, fence);
              pendingMutationRef.current = fence;
              clientRevisionRef.current += 1;
              setLoadError(SAVE_REFRESH_ERROR);
              const checked = await readPostgresData(written.selectedPersonId ?? getStoredSelectedPersonId());
              if (checked.status !== "ready") {
                signalPostgresDataChange();
                resolveMutation(dataRef.current);
                return;
              }
              pendingMutationRef.current = null;
              persisted = { data: checked.data, serverNow: checked.serverNow };
            } else {
              persisted = written;
            }
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
            clearMutationFence(storageRuntimeRef.current, fence);
            clientSnapshotPatchesRef.current = [];
            signalPostgresDataChange();
            resolveMutation(installedData);
          } catch (error) {
            rejectMutation(error);
          } finally {
            mutationFlightsRef.current.delete(key);
            activeMutationRevisionRef.current = null;
            clientSnapshotPatchesRef.current = [];
          }
        };

        mutationFlightsRef.current.set(key, result);
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

  const restoreLocalBackup = useCallback(async (backup: VocabularyData) => {
    if (storageRuntimeRef.current !== "local") {
      throw new Error("Local backup recovery is available only for this browser's local workspace.");
    }
    const restored = restoreVocabularyData(backup);
    clientRevisionRef.current += 1;
    installSnapshot(backup, "local");
    setLocalRecoveryRequired(false);
    setLoadError(null);
    return restored;
  }, [installSnapshot]);

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
      localRecoveryRequired,
      storageRuntime,
      commit,
      restoreLocalBackup,
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
      localRecoveryRequired,
      revalidateAfterMutation,
      storageRuntime,
      restoreLocalBackup,
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
    value.localRecoveryRequired
      ? createElement(LocalBackupRecovery, { onRestore: value.restoreLocalBackup })
      : null,
  );
}

export function useVocabularyData() {
  const value = useContext(VocabularyDataContext);

  if (!value) {
    throw new Error("useVocabularyData must be used inside VocabularyDataProvider");
  }

  return value;
}
