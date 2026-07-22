"use client";

import { Save, Upload } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { ImportCandidate, ImportSourceType, LearningTrack, VocabularyTag } from "@/lib/vocabulary/types";
import {
  parseJsonImport,
  recomputeImportCandidates,
  summarizeImportCandidates,
} from "@/lib/vocabulary/import-parser";
import { commitImportCandidates, getExistingNormalizedTexts, addVocabularyItem } from "@/lib/vocabulary/repository";
import {
  VOCABULARY_TAGS,
  normalizeRarityScore,
  normalizeTextList,
  normalizeVocabularyTags,
} from "@/lib/vocabulary/normalize";
import { useVocabularyData } from "./use-vocabulary-data";
import { PressableButton } from "@/components/ui/motion-primitives";
import {
  alignExampleTranslationsZh,
  assertCompleteVocabularyExamplePairs,
  buildVocabularyExamplePairs,
} from "@/lib/vocabulary/example-pairs";

const JSON_IMPORT_SAMPLE = `{
  "items": [
    {
      "word": "allocate",
      "track": "recognition",
      "meaningsZh": ["分配"],
      "examples": ["The tutor allocated extra practice time."],
      "exampleTranslationsZh": ["老师安排了额外的练习时间。"]
    }
  ]
}`;

const DESKTOP_PREVIEW_QUERY = "(min-width: 1024px)";

const IMPORT_ISSUE_LABELS: Record<string, string> = {
  duplicate: "Already in Library",
  empty: "Add a word or phrase",
  too_long: "Word or phrase is too long",
  sentence_like: "Use a word, phrase, or fixed expression",
  invalid_track: "Choose a learning Track",
  invalid_tags: "Check the selected tags",
  unsupported_tag: "Remove an unsupported tag",
  invalid_json: "Check the Example format",
  missing_items: "Add at least one item",
  missing_meaning: "Add a Chinese meaning",
  missing_example: "Add an example",
  missing_example_translation: "Add a Chinese translation for every example",
};

function subscribeToDesktopPreview(callback: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_PREVIEW_QUERY);

  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getDesktopPreviewSnapshot() {
  return window.matchMedia(DESKTOP_PREVIEW_QUERY).matches;
}

function getServerDesktopPreviewSnapshot() {
  return false;
}

function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function trackLabel(track: LearningTrack) {
  return track === "active" ? "Active" : "Recognition";
}

function candidateStatusLabel(status: ImportCandidate["status"]) {
  if (status === "new") {
    return "Ready";
  }

  if (status === "duplicate") {
    return "Already saved";
  }

  return "Needs attention";
}

function candidateIssueLabel(issue: string) {
  return IMPORT_ISSUE_LABELS[issue] ?? "Check this entry";
}

function toMultilineText(values: string[]) {
  return values.join("\n");
}

function fromMultilineText(value: string) {
  return normalizeTextList(value.split(/\r?\n/));
}

type ImportMode = "single" | "batch";

export function ImportWorkspace() {
  const { data, commit } = useVocabularyData();
  const [mode, setMode] = useState<ImportMode>("single");
  const [singleTrack, setSingleTrack] = useState<LearningTrack>("recognition");
  const [singleTags, setSingleTags] = useState<VocabularyTag[] | null>(null);
  const [singleRarityScore, setSingleRarityScore] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<ImportSourceType>("json_paste");
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const desktopPreview = useSyncExternalStore(
    subscribeToDesktopPreview,
    getDesktopPreviewSnapshot,
    getServerDesktopPreviewSnapshot,
  );
  const summary = useMemo(() => summarizeImportCandidates(candidates), [candidates]);

  const parseInput = (text = jsonText, nextSourceType = sourceType, nextFileName = fileName) => {
    const parsed = parseJsonImport(text, {
      existingNormalizedTexts: getExistingNormalizedTexts(data),
    });
    const nextAccepted = new Set(
      parsed.filter((candidate) => candidate.status === "new").map((candidate) => candidate.tempId),
    );

    setJsonText(text);
    setSourceType(nextSourceType);
    setFileName(nextFileName);
    setCandidates(parsed);
    setAcceptedIds(nextAccepted);
    setMessage(parsed.length ? "Preview ready" : "No words found");
  };

  const readFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const text = await file.text();
    parseInput(text, "json_file", file.name);
  };

  const updateCandidate = (tempId: string, patch: Partial<ImportCandidate>) => {
    setCandidates((current) => {
      const patched = current.map((candidate) =>
        candidate.tempId === tempId ? { ...candidate, ...patch } : candidate,
      );

      return recomputeImportCandidates(patched, {
        existingNormalizedTexts: getExistingNormalizedTexts(data),
        requireMeaningAndExample: true,
      });
    });
  };

  const toggleAccepted = (tempId: string, checked: boolean) => {
    setAcceptedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(tempId);
      } else {
        next.delete(tempId);
      }

      return next;
    });
  };

  const saveSingleInput = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const now = new Date().toISOString();
    const timezone = detectTimezone();

    try {
      const example = String(formData.get("example") ?? "");
      const examplePairs = buildVocabularyExamplePairs({
        example,
        exampleTranslationsZh: normalizeTextList(
          String(formData.get("example_translation_zh") ?? ""),
        ),
      });
      assertCompleteVocabularyExamplePairs(examplePairs);
      const input = {
        surfaceText: String(formData.get("word_or_phrase") ?? ""),
        meaningZh: String(formData.get("meaning_zh") ?? ""),
        meaningsZh: normalizeTextList(String(formData.get("meaning_zh") ?? "")),
        example,
        examples: examplePairs.map((pair) => pair.en),
        exampleTranslationsZh: examplePairs.map((pair) => pair.zh),
        notes: String(formData.get("notes") ?? ""),
        rarityScore: normalizeRarityScore(singleRarityScore),
        learningTrack: singleTrack,
        tags: normalizeVocabularyTags(singleTags),
        source: "manual" as const,
        createdAt: now,
        timezone,
      };
      const result = addVocabularyItem(data, input, now);

      await commit(result.data, {
        type: "vocabulary.add",
        input,
        now,
        timezone,
      });
      form.reset();
      setSingleTrack("recognition");
      setSingleTags(null);
      setSingleRarityScore("");
      setMessage(`Saved ${result.item.surfaceText} to ${trackLabel(result.item.learningTrack)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this word");
    }
  };

  const saveImport = async () => {
    const now = new Date().toISOString();
    const timezone = detectTimezone();
    const batchInput = {
      sourceType,
      fileName,
    };
    const acceptedTempIds = Array.from(acceptedIds);
    const result = commitImportCandidates(
      data,
      batchInput,
      candidates,
      acceptedIds,
      timezone,
      now,
    );

    try {
      await commit(result.data, {
        type: "import.commitCandidates",
        batchInput,
        candidates,
        acceptedTempIds,
        now,
        timezone,
      });
      setMessage(`Saved ${result.items.length} ${result.items.length === 1 ? "word" : "words"}`);
      setCandidates([]);
      setAcceptedIds(new Set());
      setFileName(null);
      setSourceType("json_paste");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this batch");
    }
  };

  const renderTagControls = (
    currentTags: VocabularyTag[] | null,
    onChange: (tags: VocabularyTag[] | null) => void,
  ) => (
    <div className="flex flex-wrap gap-2">
      {VOCABULARY_TAGS.map((tag) => (
        <label
          key={tag}
          className="mimi-focus-ring relative flex min-h-11 items-center justify-center rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-3 text-xs font-semibold text-[#203229] transition has-checked:border-[#5f7d66] has-checked:bg-[#d9e5d5]"
        >
          <input
            className="sr-only"
            type="checkbox"
            checked={currentTags?.includes(tag) ?? false}
            onChange={(event) => {
              const tags = currentTags ?? [];
              const nextTags = event.target.checked
                ? [...tags, tag]
                : tags.filter((currentTag) => currentTag !== tag);

              onChange(nextTags.length ? nextTags : null);
            }}
          />
          {tag}
        </label>
      ))}
    </div>
  );

  return (
    <div className="grid gap-4">
      <section className="mimi-panel p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {[
            { value: "single", label: "Add one" },
            { value: "batch", label: "Batch import" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setMode(tab.value as ImportMode)}
              aria-pressed={mode === tab.value}
              className={`mimi-focus-ring rounded-md border px-3 py-2 text-sm font-semibold transition duration-200 ease-[var(--mimi-ease)] ${
                mode === tab.value
                  ? "border-[var(--mimi-primary)] bg-[var(--mimi-primary-soft)] text-[var(--mimi-primary-deep)]"
                  : "border-[var(--mimi-border)] bg-[#fffaf1]/72 text-[#5f6d62] hover:-translate-y-0.5 hover:border-[var(--mimi-border-strong)] hover:text-[#274331]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {mode === "single" ? (
        <section className="mimi-panel p-4 sm:p-5">
          <h2 className="mimi-display-title mb-4 text-xl text-[#203229]">Add one word or phrase</h2>
          <form className="grid gap-4" aria-label="Single vocabulary input" onSubmit={saveSingleInput}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#203229]">Word or phrase</span>
              <input name="word_or_phrase" required placeholder="allocate" className="mimi-input px-3 text-base" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#203229]">Chinese meaning</span>
                <input name="meaning_zh" placeholder="分配" className="mimi-input px-3 text-base" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#203229]">Rarity</span>
                <input
                  value={singleRarityScore}
                  onChange={(event) => setSingleRarityScore(event.target.value)}
                  type="number"
                  min={1}
                  max={5}
                  className="mimi-input px-3 text-base"
                />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#203229]">Example</span>
              <textarea name="example" rows={3} className="mimi-input min-h-24 resize-y px-3 py-2 text-base" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#203229]">Chinese translation</span>
              <textarea
                name="example_translation_zh"
                rows={2}
                className="mimi-input min-h-20 resize-y px-3 py-2 text-base"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#203229]">Notes</span>
              <textarea name="notes" rows={2} className="mimi-input min-h-20 resize-y px-3 py-2 text-base" />
            </label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-[#203229]">Learning track</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: "recognition", label: "Recognition" },
                  { value: "active", label: "Active" },
                ].map((track) => (
                  <label
                    key={track.value}
                    className="mimi-focus-ring relative flex min-h-11 items-center justify-center rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-3 text-sm font-semibold text-[#203229] transition has-checked:border-[#5f7d66] has-checked:bg-[#d9e5d5]"
                  >
                    <input
                      className="sr-only"
                      name="learning_track"
                      type="radio"
                      value={track.value}
                      checked={singleTrack === track.value}
                      onChange={(event) => setSingleTrack(event.target.value as LearningTrack)}
                    />
                    {track.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-[#203229]">Tags</legend>
              {renderTagControls(singleTags, setSingleTags)}
            </fieldset>
            <PressableButton
              type="submit"
              className="mimi-button mimi-focus-ring inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
            >
              <Save aria-hidden="true" className="size-4" />
              Save word
            </PressableButton>
          </form>
        </section>
      ) : (
        <>
          <section className="mimi-panel p-4 sm:p-5">
            <h2 className="mimi-display-title mb-4 text-xl text-[#203229]">Batch import</h2>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#203229]">Choose a file</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) => void readFile(event.target.files?.[0])}
                    className="mimi-input px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#203229]">Or paste your list</span>
                  <textarea
                    rows={15}
                    value={jsonText}
                    placeholder="Paste your JSON list here"
                    onChange={(event) => {
                      setJsonText(event.target.value);
                      setSourceType("json_paste");
                      setFileName(null);
                    }}
                    className="mimi-input min-h-72 resize-y px-3 py-2 font-mono text-sm"
                  />
                </label>
              </div>
              <aside className="rounded-md border border-[#d8d1c2] bg-[#fffaf1]/72 p-4 text-sm leading-6 text-[#5f6d62]">
                <details className="rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-strong)] px-3 py-2">
                  <summary className="mimi-focus-ring cursor-pointer font-semibold text-[var(--mimi-primary-deep)]">
                    Example format
                  </summary>
                  <div className="mt-3 grid gap-2 text-xs leading-5 text-[var(--mimi-text-soft)]">
                    <p>Choose Recognition or Active.</p>
                    <p>Add at least one Chinese meaning and example.</p>
                    <p>Tags and rarity are optional.</p>
                    <pre className="whitespace-pre-wrap break-words rounded bg-[var(--mimi-surface-muted)] p-2 font-mono text-[0.68rem] leading-4 text-[var(--mimi-text)]">
                      {JSON_IMPORT_SAMPLE}
                    </pre>
                  </div>
                </details>
              </aside>
            </div>
            <PressableButton
              type="button"
              onClick={() => parseInput(jsonText, "json_paste", null)}
              className="mimi-button mimi-focus-ring mt-4 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
            >
              <Upload aria-hidden="true" className="size-4" />
              Preview words
            </PressableButton>
          </section>

          <section className="mimi-panel p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="mimi-display-title text-xl text-[#203229]">Preview</h2>
              <PressableButton
                type="button"
                disabled={!acceptedIds.size}
                onClick={() => void saveImport()}
                className="mimi-button mimi-focus-ring inline-flex items-center justify-center gap-2 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save aria-hidden="true" className="size-4" />
                Save selected
              </PressableButton>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Total", summary.totalRows],
                ["Ready", summary.newRows],
                ["Saved", summary.duplicateRows],
                ["Check", summary.invalidRows],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-[#efe9dc] p-3">
                  <p className="text-xs font-semibold text-[#5f6d62]">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-[#203229]">{value}</p>
                </div>
              ))}
            </div>

            {candidates.length ? (
              <>
                {!desktopPreview ? <div className="grid gap-3">
                  {candidates.map((candidate, index) => (
                    <article key={candidate.tempId} className="mimi-card grid gap-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <label className="mimi-focus-ring flex min-h-11 items-center gap-3 rounded-md px-1 text-sm font-semibold text-[var(--mimi-text)]">
                          <input
                            type="checkbox"
                            checked={acceptedIds.has(candidate.tempId)}
                            disabled={candidate.status === "invalid"}
                            onChange={(event) => toggleAccepted(candidate.tempId, event.target.checked)}
                            className="size-5 accent-[#5f7d66]"
                          />
                          Save entry {index + 1}
                        </label>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          candidate.status === "new"
                            ? "bg-[var(--mimi-primary-soft)] text-[var(--mimi-primary-deep)]"
                            : "bg-[var(--mimi-surface-muted)] text-[var(--mimi-text-soft)]"
                        }`}>
                          {candidateStatusLabel(candidate.status)}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5">
                          <span className="text-sm font-semibold text-[var(--mimi-text)]">Word or phrase</span>
                          <input
                            value={candidate.surfaceText}
                            onChange={(event) => updateCandidate(candidate.tempId, { surfaceText: event.target.value })}
                            className="mimi-input px-3 text-base"
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-sm font-semibold text-[var(--mimi-text)]">Learning Track</span>
                          <select
                            value={candidate.learningTrack}
                            onChange={(event) =>
                              updateCandidate(candidate.tempId, {
                                learningTrack: event.target.value as LearningTrack,
                                errors: candidate.errors.filter((error) => error !== "invalid_track"),
                              })
                            }
                            className="mimi-input px-3 text-base"
                          >
                            <option value="recognition">Recognition</option>
                            <option value="active">Active</option>
                          </select>
                        </label>
                      </div>

                      <label className="grid gap-1.5">
                        <span className="text-sm font-semibold text-[var(--mimi-text)]">Chinese meanings</span>
                        <textarea
                          value={toMultilineText(candidate.meaningsZh)}
                          onChange={(event) => {
                            const meaningsZh = fromMultilineText(event.target.value);
                            updateCandidate(candidate.tempId, {
                              meaningZh: meaningsZh[0] ?? "",
                              meaningsZh,
                            });
                          }}
                          rows={3}
                          className="mimi-input min-h-24 resize-y px-3 py-2 text-base"
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-sm font-semibold text-[var(--mimi-text)]">Examples</span>
                        <textarea
                          value={toMultilineText(candidate.examples)}
                          onChange={(event) => {
                            const examples = fromMultilineText(event.target.value);
                            updateCandidate(candidate.tempId, {
                              example: examples[0] ?? "",
                              examples,
                              exampleTranslationsZh: alignExampleTranslationsZh(
                                examples,
                                candidate.exampleTranslationsZh,
                              ),
                            });
                          }}
                          rows={3}
                          className="mimi-input min-h-24 resize-y px-3 py-2 text-base"
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-sm font-semibold text-[var(--mimi-text)]">Chinese translations</span>
                        <textarea
                          value={toMultilineText(candidate.exampleTranslationsZh ?? [])}
                          onChange={(event) =>
                            updateCandidate(candidate.tempId, {
                              exampleTranslationsZh: alignExampleTranslationsZh(
                                candidate.examples,
                                event.target.value.split(/\r?\n/),
                              ),
                            })
                          }
                          rows={3}
                          className="mimi-input min-h-24 resize-y px-3 py-2 text-base"
                        />
                      </label>

                      <fieldset className="grid gap-2">
                        <legend className="text-sm font-semibold text-[var(--mimi-text)]">Tags</legend>
                        {renderTagControls(candidate.tags, (tags) => updateCandidate(candidate.tempId, { tags }))}
                      </fieldset>

                      <label className="grid max-w-40 gap-1.5">
                        <span className="text-sm font-semibold text-[var(--mimi-text)]">Rarity</span>
                        <input
                          value={candidate.rarityScore ?? ""}
                          onChange={(event) =>
                            updateCandidate(candidate.tempId, {
                              rarityScore: normalizeRarityScore(event.target.value),
                            })
                          }
                          type="number"
                          min={1}
                          max={5}
                          className="mimi-input px-3 text-base"
                        />
                      </label>

                      {candidate.errors.length ? (
                        <ul className="grid gap-1 rounded-md bg-[var(--mimi-surface-muted)] px-3 py-2 text-sm text-[var(--mimi-text-soft)]">
                          {Array.from(new Set(candidate.errors.map(candidateIssueLabel))).map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div> : null}

                {desktopPreview ? <div className="overflow-x-auto">
                <table className="w-full min-w-[1380px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#d8d1c2] text-[#5f6d62]">
                      <th className="py-2 pr-3 font-medium">Save</th>
                      <th className="py-2 pr-3 font-medium">Track</th>
                      <th className="py-2 pr-3 font-medium">Word</th>
                      <th className="py-2 pr-3 font-medium">Meaning</th>
                      <th className="py-2 pr-3 font-medium">Example</th>
                      <th className="py-2 pr-3 font-medium">Chinese translation</th>
                      <th className="py-2 pr-3 font-medium">Tags</th>
                      <th className="py-2 pr-3 font-medium">Rarity</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate) => (
                      <tr key={candidate.tempId} className="border-b border-[#e4dece] align-top">
                        <td className="py-2 pr-3">
                          <input
                            type="checkbox"
                            checked={acceptedIds.has(candidate.tempId)}
                            disabled={candidate.status === "invalid"}
                            onChange={(event) => toggleAccepted(candidate.tempId, event.target.checked)}
                            className="size-4 accent-[#5f7d66]"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            value={candidate.learningTrack}
                            onChange={(event) =>
                              updateCandidate(candidate.tempId, {
                                learningTrack: event.target.value as LearningTrack,
                                errors: candidate.errors.filter((error) => error !== "invalid_track"),
                              })
                            }
                            className="mimi-input min-h-9 w-36 px-2"
                          >
                            <option value="recognition">Recognition</option>
                            <option value="active">Active</option>
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            value={candidate.surfaceText}
                            onChange={(event) => updateCandidate(candidate.tempId, { surfaceText: event.target.value })}
                            className="mimi-input min-h-9 w-full px-2"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <textarea
                            value={toMultilineText(candidate.meaningsZh)}
                            onChange={(event) => {
                              const meaningsZh = fromMultilineText(event.target.value);

                              updateCandidate(candidate.tempId, {
                                meaningZh: meaningsZh[0] ?? "",
                                meaningsZh,
                              });
                            }}
                            rows={3}
                            className="mimi-input min-h-24 w-full resize-y px-2 py-2"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <textarea
                            value={toMultilineText(candidate.examples)}
                            onChange={(event) => {
                              const examples = fromMultilineText(event.target.value);

                              updateCandidate(candidate.tempId, {
                                example: examples[0] ?? "",
                                examples,
                                exampleTranslationsZh: alignExampleTranslationsZh(
                                  examples,
                                  candidate.exampleTranslationsZh,
                                ),
                              });
                            }}
                            rows={3}
                            className="mimi-input min-h-24 w-full resize-y px-2 py-2"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <textarea
                            value={toMultilineText(candidate.exampleTranslationsZh ?? [])}
                            onChange={(event) =>
                              updateCandidate(candidate.tempId, {
                                exampleTranslationsZh: alignExampleTranslationsZh(
                                  candidate.examples,
                                  event.target.value.split(/\r?\n/),
                                ),
                              })
                            }
                            rows={3}
                            className="mimi-input min-h-24 w-full resize-y px-2 py-2"
                          />
                        </td>
                        <td className="min-w-56 py-2 pr-3">
                          {renderTagControls(candidate.tags, (tags) => updateCandidate(candidate.tempId, { tags }))}
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            value={candidate.rarityScore ?? ""}
                            onChange={(event) =>
                              updateCandidate(candidate.tempId, {
                                rarityScore: normalizeRarityScore(event.target.value),
                              })
                            }
                            type="number"
                            min={1}
                            max={5}
                            className="mimi-input min-h-9 w-20 px-2"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <span className="block font-medium text-[#203229]">{candidateStatusLabel(candidate.status)}</span>
                          {candidate.errors.length ? (
                            <span className="block text-xs text-[#8a4d21]">
                              {Array.from(new Set(candidate.errors.map(candidateIssueLabel))).join(", ")}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div> : null}
              </>
            ) : (
              <p className="rounded-md border border-dashed border-[#afbea9] bg-[#fffaf1] p-4 text-sm leading-6 text-[#5f6d62]">
                Choose a file or paste your list to begin.
              </p>
            )}
          </section>
        </>
      )}

      {message ? <p className="rounded-md bg-[#d9e5d5] px-3 py-2 text-sm text-[#274331]">{message}</p> : null}
    </div>
  );
}
