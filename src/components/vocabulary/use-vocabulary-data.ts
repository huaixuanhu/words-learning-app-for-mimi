"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ImportBatchInput,
  ImportCandidate,
  NewVocabularyInput,
  UpdateVocabularyInput,
  VocabularyData,
} from "@/lib/vocabulary/types";
import { getSelectedPersonId } from "@/lib/people/repository";
import type { ReviewRating } from "@/lib/review/types";
import { createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import { readVocabularyData, writeVocabularyData } from "@/lib/vocabulary/local-storage-repository";

export type ClientStorageRuntime = "loading" | "local" | "postgres-preview";

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
  data?: VocabularyData;
  error?: string;
  reason?: string;
};

const SELECTED_PERSON_STORAGE_KEY = "mimi-pte-selected-person-id";
const UI_WRITE_CONFIRMATION_HEADER = "x-mimi-ui-storage-write";
const UI_WRITE_CONFIRMATION_VALUE = "allow-dev-preview-ui-write";
const WRITE_HTTP_METHOD = "P" + "OST";

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

function dispatchVocabularyChange() {
  window.dispatchEvent(new Event("mimi-vocabulary-data-changed"));
}

function readLocalData() {
  const localData = readVocabularyData();

  rememberSelectedPersonId(getSelectedPersonId(localData));

  return localData;
}

async function readPostgresData(selectedPersonId: string | null) {
  const params = new URLSearchParams();

  if (selectedPersonId) {
    params.set("selectedPersonId", selectedPersonId);
  }

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

  rememberSelectedPersonId(getSelectedPersonId(payload.data));

  return payload.data;
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

  rememberSelectedPersonId(getSelectedPersonId(payload.data));

  return payload.data;
}

export function useVocabularyData() {
  const [data, setData] = useState<VocabularyData>(() => createEmptyVocabularyData());
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageRuntime, setStorageRuntime] = useState<ClientStorageRuntime>("loading");

  const refresh = useCallback(async () => {
    const postgresData = await readPostgresData(getStoredSelectedPersonId());

    if (postgresData) {
      setData(postgresData);
      setStorageRuntime("postgres-preview");
      setIsLoaded(true);
      return;
    }

    setData(readLocalData());
    setStorageRuntime("local");
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    const handleChange = () => {
      void refresh();
    };

    window.addEventListener("storage", handleChange);
    window.addEventListener("mimi-vocabulary-data-changed", handleChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleChange);
      window.removeEventListener("mimi-vocabulary-data-changed", handleChange);
    };
  }, [refresh]);

  const commit = useCallback(
    async (nextData: VocabularyData, mutation?: VocabularyStorageMutation) => {
      if (storageRuntime === "postgres-preview") {
        if (!mutation) {
          throw new Error("Postgres storage commit requires mutation metadata");
        }

        if (mutation.type === "people.select") {
          const selectedData = {
            ...data,
            selectedPersonId: mutation.personId,
            updatedAt: new Date().toISOString(),
          };

          rememberSelectedPersonId(mutation.personId);
          setData(selectedData);
          setIsLoaded(true);
          dispatchVocabularyChange();

          return selectedData;
        }

        const persistedData = await writePostgresMutation(getSelectedPersonId(data), mutation);

        setData(persistedData);
        setIsLoaded(true);
        dispatchVocabularyChange();

        return persistedData;
      }

      writeVocabularyData(nextData);
      rememberSelectedPersonId(getSelectedPersonId(nextData));
      setData(nextData);
      setStorageRuntime("local");
      setIsLoaded(true);

      return nextData;
    },
    [data, storageRuntime],
  );

  return {
    data,
    isLoaded,
    storageRuntime,
    commit,
    refresh,
  };
}
