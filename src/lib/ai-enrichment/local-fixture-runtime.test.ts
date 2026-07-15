import { beforeEach, describe, expect, it } from "vitest";
import {
  LOCAL_CONTEXT_CACHE_TTL_MS,
  LOCAL_FIXTURE_CACHE_MAX_ENTRIES,
  resetLocalFixtureRuntimeForTests,
  runLocalFixtureContextExplanation,
  runLocalFixtureEnrichment,
} from "./local-fixture-runtime";

describe("V2 Stage 7A local AI preview", () => {
  beforeEach(() => resetLocalFixtureRuntimeForTests());

  it("returns strict deterministic enrichment without a provider request", () => {
    const source = {
      term: "adapt",
      meaningsZh: ["适应"],
      examples: ["It takes time to adapt to a new routine."],
    };
    const first = runLocalFixtureEnrichment(source, "preview-1");
    const replay = runLocalFixtureEnrichment(source, "preview-1");

    expect(first.cacheStatus).toBe("generated");
    expect(replay.cacheStatus).toBe("cached");
    expect(first.value.confusableWords[0]).toMatchObject({
      word: "adopt",
      type: "spelling",
    });
    expect(first.lineage).toMatchObject({
      provider: "local-fixture",
      model: "fixture-v1",
      notice: "Local preview · No AI request was made.",
    });
  });

  it("rejects one local replay key used for different source data", () => {
    runLocalFixtureEnrichment(
      { term: "adapt", meaningsZh: ["适应"], examples: [] },
      "preview-shared",
    );

    expect(() =>
      runLocalFixtureEnrichment(
        { term: "effect", meaningsZh: ["影响"], examples: [] },
        "preview-shared",
      ),
    ).toThrow("already used for another request");
  });

  it("uses an honest fallback when a context word is outside the fixture set", () => {
    const result = runLocalFixtureContextExplanation(
      {
        sourceTerm: "course",
        sourceMeaningsZh: ["课程"],
        example: "The course introduces new ideas gradually.",
        exampleIndex: 0,
        selectedStart: 32,
        selectedEnd: 41,
        selectedText: "gradually",
      },
      "context-1",
    );

    expect(result.value).toMatchObject({
      suggestedHeadword: "gradually",
      grammarRoleZh: "待核查",
      phraseInContext: "gradually",
    });
    expect(result.lineage.modelLabel).toBe("Local preview");
  });

  it("expires the context preview after seven days without a background job", () => {
    const context = {
      sourceTerm: "adapt",
      sourceMeaningsZh: ["适应"],
      example: "We adapt to change.",
      exampleIndex: 0,
      selectedStart: 3,
      selectedEnd: 8,
      selectedText: "adapt",
    };
    const start = new Date("2026-07-15T00:00:00.000Z");
    const first = runLocalFixtureContextExplanation(context, "context-ttl", start);
    const cached = runLocalFixtureContextExplanation(
      context,
      "context-ttl",
      new Date(start.getTime() + LOCAL_CONTEXT_CACHE_TTL_MS - 1),
    );
    const expired = runLocalFixtureContextExplanation(
      context,
      "context-ttl",
      new Date(start.getTime() + LOCAL_CONTEXT_CACHE_TTL_MS),
    );

    expect(first.cacheStatus).toBe("generated");
    expect(cached.cacheStatus).toBe("cached");
    expect(expired.cacheStatus).toBe("generated");
  });

  it("keeps local replay and enrichment caches bounded", () => {
    for (let index = 0; index <= LOCAL_FIXTURE_CACHE_MAX_ENTRIES; index += 1) {
      runLocalFixtureEnrichment(
        { term: `fixture term ${index}`, meaningsZh: [], examples: [] },
        `bounded-preview-${index}`,
      );
    }

    expect(
      runLocalFixtureEnrichment(
        { term: "fixture term 0", meaningsZh: [], examples: [] },
        "bounded-preview-revisit",
      ).cacheStatus,
    ).toBe("generated");
  });
});
