import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("V2 client data loading performance contract", () => {
  const layout = source("src/app/layout.tsx");
  const provider = source(
    "src/components/vocabulary/use-vocabulary-data.ts",
  );
  const localStorage = source(
    "src/lib/vocabulary/local-storage-repository.ts",
  );
  const dailyStudy = source("src/components/study/use-daily-study.ts");

  it("mounts one persistent root Provider and makes the hook context-only", () => {
    expect(layout).toContain(
      "<VocabularyDataProvider>{children}</VocabularyDataProvider>",
    );
    expect(provider).toContain(
      "const VocabularyDataContext = createContext<VocabularyDataContextValue | null>(null)",
    );
    expect(provider).toContain("useContext(VocabularyDataContext)");
  });

  it("coalesces full refreshes and ignores unrelated browser preferences", () => {
    expect(provider).toContain("refreshInFlightRef.current");
    expect(provider).toContain("clientRevisionRef.current === revisionAtStart");
    expect(provider).toContain("event.key === VOCABULARY_STORAGE_KEY");
    expect(provider).toContain("event.key === SELECTED_PERSON_STORAGE_KEY");
    expect(provider).toContain("event.key === VOCABULARY_SYNC_STORAGE_KEY");
    expect(provider).not.toContain("mimi-vocabulary-data-changed");
    expect(localStorage).not.toContain("mimi-vocabulary-data-changed");
    expect(provider).toContain(
      "await waitForStableQueue(() => mutationQueueRef.current)",
    );
  });

  it("persists a learner choice only after a guarded snapshot is accepted", () => {
    const remoteRead = provider.slice(
      provider.indexOf("async function readPostgresData"),
      provider.indexOf("async function writePostgresMutation"),
    );
    const remoteWrite = provider.slice(
      provider.indexOf("async function writePostgresMutation"),
      provider.indexOf("function useVocabularyDataStore"),
    );

    expect(remoteRead).not.toContain("rememberSelectedPersonId");
    expect(remoteWrite).not.toContain("rememberSelectedPersonId");
    expect(provider).toContain(
      "rememberSelectedPersonId(getSelectedPersonId(nextData))",
    );
  });

  it("uses authoritative mutation deltas without a rating-time full refresh", () => {
    const ratingSource = dailyStudy.slice(
      dailyStudy.indexOf("const recordRating = useCallback"),
      dailyStudy.indexOf("const rollbackRating = useCallback"),
    );
    const rollbackSource = dailyStudy.slice(
      dailyStudy.indexOf("const rollbackRating = useCallback"),
      dailyStudy.indexOf("const resetToday = useCallback"),
    );

    expect(ratingSource).toContain("applyRecordedReviewToClientSnapshot");
    expect(ratingSource).not.toContain("await refresh()");
    expect(rollbackSource).toContain("applyRolledBackReviewToClientSnapshot");
    expect(rollbackSource).not.toContain("await refresh()");
  });

  it("resolves an already-persisted Today locally before reading a queue", () => {
    const resolveSource = dailyStudy.slice(
      dailyStudy.indexOf("const resolveCurrent = useCallback"),
      dailyStudy.indexOf("const resolveToday = useCallback"),
    );

    expect(dailyStudy).toContain("const runtimeNow = getRuntimeNow()");
    expect(dailyStudy).toContain(
      "? resolveDailyStudyToday(data, runtimeNow)",
    );
    expect(dailyStudy).toContain("if (localResolution?.data === data)");
    expect(provider).toContain("? estimateServerNow(");
    expect(provider).toContain("revalidateAfterMutation");
    expect(provider).toContain("const intendedPersonId = getSelectedPersonId(dataRef.current)");
    expect(dailyStudy).toContain("{ broadcast: true }");
    expect(resolveSource).toContain("setToday(currentResolution.today)");
    expect(resolveSource).not.toContain("setToday(result)");
  });
});
