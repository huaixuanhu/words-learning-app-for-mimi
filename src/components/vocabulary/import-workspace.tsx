"use client";

import { ClipboardList, Save, Upload } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
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

const JSON_IMPORT_SAMPLE = `{
  "items": [
    {
      "word": "allocate",
      "track": "recognition",
      "meaningsZh": ["分配", "拨出时间或资源"],
      "examples": [
        "The tutor allocated extra practice time.",
        "The budget allocates more money to language support."
      ],
      "tags": ["PTE"],
      "rarityScore": 3
    },
    {
      "word": "coherent",
      "track": "active",
      "meaningsZh": ["连贯的", "条理清楚的"],
      "examples": ["Write a coherent paragraph using this word."],
      "tags": null,
      "rarityScore": null
    }
  ]
}`;

function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function trackLabel(track: LearningTrack) {
  return track === "active" ? "Active" : "Recognition";
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
  const [jsonText, setJsonText] = useState(JSON_IMPORT_SAMPLE);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<ImportSourceType>("json_paste");
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
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
    setMessage(parsed.length ? "已生成 JSON 导入预览" : "没有可解析内容");
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
      const input = {
        surfaceText: String(formData.get("word_or_phrase") ?? ""),
        meaningZh: String(formData.get("meaning_zh") ?? ""),
        meaningsZh: normalizeTextList(String(formData.get("meaning_zh") ?? "")),
        example: String(formData.get("example") ?? ""),
        examples: normalizeTextList(String(formData.get("example") ?? "")),
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
      setMessage(`已保存 ${result.item.surfaceText} (${trackLabel(result.item.learningTrack)})`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
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
      setMessage(`已保存 ${result.items.length} 个词条`);
      setCandidates([]);
      setAcceptedIds(new Set());
      setFileName(null);
      setSourceType("json_paste");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入保存失败");
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
          className="mimi-focus-ring flex min-h-9 items-center justify-center rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-3 text-xs font-semibold text-[#203229] transition has-checked:border-[#5f7d66] has-checked:bg-[#d9e5d5]"
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
            { value: "single", label: "Single input / 单个输入" },
            { value: "batch", label: "Batch JSON import / 批量 JSON 导入" },
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
          <h2 className="mb-4 text-base font-semibold text-[#203229]">Single input</h2>
          <form className="grid gap-4" aria-label="Single vocabulary input" onSubmit={saveSingleInput}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#203229]">Word or phrase</span>
              <input name="word_or_phrase" required placeholder="allocate" className="mimi-input px-3 text-base" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#203229]">中文释义</span>
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
              <span className="text-sm font-semibold text-[#203229]">Notes</span>
              <textarea name="notes" rows={2} className="mimi-input min-h-20 resize-y px-3 py-2 text-base" />
            </label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-[#203229]">Learning track</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: "recognition", label: "Recognition / 阅读词汇" },
                  { value: "active", label: "Active / 输出词汇" },
                ].map((track) => (
                  <label
                    key={track.value}
                    className="mimi-focus-ring flex min-h-11 items-center justify-center rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-3 text-sm font-semibold text-[#203229] transition has-checked:border-[#5f7d66] has-checked:bg-[#d9e5d5]"
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
              保存词条
            </PressableButton>
          </form>
        </section>
      ) : (
        <>
          <section className="mimi-panel p-4 sm:p-5">
            <h2 className="mb-4 text-base font-semibold text-[#203229]">Batch JSON import</h2>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#203229]">JSON file</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) => void readFile(event.target.files?.[0])}
                    className="mimi-input px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#203229]">Paste JSON</span>
                  <textarea
                    rows={15}
                    value={jsonText}
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
                <div className="mb-3 inline-flex size-9 items-center justify-center rounded-md bg-[#d9e5d5] text-[#274331]">
                  <ClipboardList aria-hidden="true" className="size-4" />
                </div>
                <p className="font-semibold text-[#203229]">JSON sample</p>
                <p className="mt-2">
                  可以使用对话 AI 根据这个 JSON 文件格式整理词汇。整理后的 JSON 可以被本 app 直接读取并入库。
                </p>
                  <p className="mt-3">
                  `track` 必须是 `recognition` 或 `active`。`meaningsZh` 和 `examples` 都是数组，至少需要 1 条，不限制数量。
                </p>
                <p className="mt-3">
                  `tags` 可以是数组、`null`，也可以省略后归一为 `null`。`rarityScore` 可以是 1-5，也可以是 `null`。
                </p>
              </aside>
            </div>
            <PressableButton
              type="button"
              onClick={() => parseInput(jsonText, "json_paste", null)}
              className="mimi-button mimi-focus-ring mt-4 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
            >
              <Upload aria-hidden="true" className="size-4" />
              生成预览
            </PressableButton>
          </section>

          <section className="mimi-panel p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-[#203229]">Preview</h2>
              <PressableButton
                type="button"
                disabled={!acceptedIds.size}
                onClick={() => void saveImport()}
                className="mimi-button mimi-focus-ring inline-flex items-center justify-center gap-2 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save aria-hidden="true" className="size-4" />
                确认保存
              </PressableButton>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Total", summary.totalRows],
                ["New", summary.newRows],
                ["Duplicate", summary.duplicateRows],
                ["Invalid", summary.invalidRows],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-[#efe9dc] p-3">
                  <p className="text-xs font-semibold text-[#5f6d62]">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-[#203229]">{value}</p>
                </div>
              ))}
            </div>

            {candidates.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#d8d1c2] text-[#5f6d62]">
                      <th className="py-2 pr-3 font-medium">Save</th>
                      <th className="py-2 pr-3 font-medium">Track</th>
                      <th className="py-2 pr-3 font-medium">Word</th>
                      <th className="py-2 pr-3 font-medium">Meaning</th>
                      <th className="py-2 pr-3 font-medium">Example</th>
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
                              });
                            }}
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
                          <span className="block font-medium text-[#203229]">{candidate.status}</span>
                          {candidate.errors.length ? (
                            <span className="block text-xs text-[#8a4d21]">{candidate.errors.join(", ")}</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-[#afbea9] bg-[#fffaf1] p-4 text-sm leading-6 text-[#5f6d62]">
                上传 `.json` 文件或粘贴 JSON 后生成预览。
              </p>
            )}
          </section>
        </>
      )}

      {message ? <p className="rounded-md bg-[#d9e5d5] px-3 py-2 text-sm text-[#274331]">{message}</p> : null}
    </div>
  );
}
