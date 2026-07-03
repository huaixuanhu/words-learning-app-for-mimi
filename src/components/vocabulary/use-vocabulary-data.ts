"use client";

import { useCallback, useEffect, useState } from "react";
import type { VocabularyData } from "@/lib/vocabulary/types";
import { createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import { readVocabularyData, writeVocabularyData } from "@/lib/vocabulary/local-storage-repository";

export function useVocabularyData() {
  const [data, setData] = useState<VocabularyData>(() => createEmptyVocabularyData());
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(() => {
    setData(readVocabularyData());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    const handleChange = () => refresh();

    window.addEventListener("storage", handleChange);
    window.addEventListener("mimi-vocabulary-data-changed", handleChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleChange);
      window.removeEventListener("mimi-vocabulary-data-changed", handleChange);
    };
  }, [refresh]);

  const commit = useCallback((nextData: VocabularyData) => {
    writeVocabularyData(nextData);
    setData(nextData);
    setIsLoaded(true);
  }, []);

  return {
    data,
    isLoaded,
    commit,
    refresh,
  };
}
