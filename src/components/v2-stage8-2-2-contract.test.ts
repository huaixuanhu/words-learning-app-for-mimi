import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("V2-8-2.2 learner interaction contract", () => {
  it("keeps keyboard rating movement available after ordinary button focus", () => {
    const recognition = source("src/components/review/review-session.tsx");
    const active = source("src/components/practice/active-practice-session.tsx");
    const guard = source("src/lib/review/keyboard-shortcuts.ts");

    for (const component of [recognition, active]) {
      expect(component).toContain("data-review-rating-index");
      expect(component).toContain("?.focus();");
      expect(component).toContain("isReviewRatingArrowKey(event.key)");
    }
    expect(guard).toContain("REVIEW_TEXT_ENTRY_SELECTOR");
    expect(guard).not.toContain("nativeActionFocused");
  });

  it("keeps the Stage 8-2.2 device selector as an explicit fallback", () => {
    const settings = source("src/components/settings/voice-settings-form.tsx");
    const speech = source("src/lib/ui/speech-synthesis.ts");

    expect(settings).toContain("Best available");
    expect(settings).toContain("voiceschanged");
    expect(settings).toContain("Preview");
    expect(settings).toContain("Cloud voice");
    expect(settings).toContain("Use device voice");
    expect(settings).toContain("cancelEnglishSpeech();");
    expect(settings).toContain("each eligible new card");
    expect(speech).toContain("SPEECH_VOICE_STORAGE_KEY");
    expect(speech).toContain('fetchImpl("/api/tts"');
    expect(speech.indexOf("cancelEnglishSpeech();")).toBeLessThan(
      speech.indexOf('if (sourcePreference === "device")'),
    );
    expect(speech).toContain('DEFAULT_SPEECH_SOURCE_PREFERENCE: SpeechSourcePreference = "cloud"');
  });

  it("shows paired translations while preserving English example offsets", () => {
    const review = source("src/components/review/review-session.tsx");
    const wordActions = source("src/components/review/example-word-actions.tsx");
    const library = source("src/components/vocabulary/vocabulary-library.tsx");

    expect(review).toContain("buildVocabularyExamplePairs(currentItem)");
    expect(review).toContain("example={pair.en}");
    expect(review).toContain("exampleTranslationZh={pair.zh}");
    expect(wordActions).toContain("Chinese translation needed");
    expect(library).toContain("Needs translation");
    expect(library).toContain("Translation needed");
  });
});
