"use client";

import { Save, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import type { ImportCandidate, ImportSourceType } from "@/lib/vocabulary/types";
import {
  parseTextImport,
  recomputeImportCandidates,
  summarizeImportCandidates,
} from "@/lib/vocabulary/import-parser";
import { commitImportCandidates, getExistingNormalizedTexts } from "@/lib/vocabulary/repository";
import { normalizeRarityScore } from "@/lib/vocabulary/normalize";
import { useVocabularyData } from "./use-vocabulary-data";
import { PressableButton } from "@/components/ui/motion-primitives";

function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function ImportWorkspace() {
  const { data, commit } = useVocabularyData();
  const [inputText, setInputText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<ImportSourceType>("pasted_text");
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const summary = useMemo(() => summarizeImportCandidates(candidates), [candidates]);

  const parseInput = (text = inputText, nextSourceType = sourceType, nextFileName = fileName) => {
    const parsed = parseTextImport(text, {
      existingNormalizedTexts: getExistingNormalizedTexts(data),
    });
    const nextAccepted = new Set(
      parsed.filter((candidate) => candidate.status === "new").map((candidate) => candidate.tempId),
    );

    setInputText(text);
    setSourceType(nextSourceType);
    setFileName(nextFileName);
    setCandidates(parsed);
    setAcceptedIds(nextAccepted);
    setMessage(parsed.length ? "已生成导入预览" : "没有可解析内容");
  };

  const readFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const text = await file.text();
    parseInput(text, "txt_file", file.name);
  };

  const updateCandidate = (tempId: string, patch: Partial<ImportCandidate>) => {
    setCandidates((current) => {
      const patched = current.map((candidate) =>
        candidate.tempId === tempId ? { ...candidate, ...patch } : candidate,
      );

      return recomputeImportCandidates(patched, {
        existingNormalizedTexts: getExistingNormalizedTexts(data),
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
      setInputText("");
      setFileName(null);
      setSourceType("pasted_text");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入保存失败");
    }
  };

  return (
    <div className="grid gap-4">
      <section className="mimi-panel p-4 sm:p-5">
        <h2 className="mb-4 text-base font-semibold text-[#203229]">Input</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#203229]">Text file</span>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={(event) => void readFile(event.target.files?.[0])}
              className="mimi-input px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#203229]">Paste text</span>
            <textarea
              rows={5}
              value={inputText}
              onChange={(event) => {
                setInputText(event.target.value);
                setSourceType("pasted_text");
                setFileName(null);
              }}
              placeholder={"allocate - 分配\ncoherent, ambiguous"}
              className="mimi-input min-h-32 resize-y px-3 py-2 text-base"
            />
          </label>
        </div>
        <PressableButton
          type="button"
          onClick={() => parseInput(inputText, "pasted_text", null)}
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

        {message ? <p className="mb-3 rounded-md bg-[#d9e5d5] px-3 py-2 text-sm text-[#274331]">{message}</p> : null}

        {candidates.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#d8d1c2] text-[#5f6d62]">
                  <th className="py-2 pr-3 font-medium">Save</th>
                  <th className="py-2 pr-3 font-medium">Line</th>
                  <th className="py-2 pr-3 font-medium">Word</th>
                  <th className="py-2 pr-3 font-medium">Meaning</th>
                  <th className="py-2 pr-3 font-medium">Example</th>
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
                    <td className="py-2 pr-3">{candidate.lineNumber}</td>
                    <td className="py-2 pr-3">
                      <input
                        value={candidate.surfaceText}
                        onChange={(event) => updateCandidate(candidate.tempId, { surfaceText: event.target.value })}
                        className="mimi-input min-h-9 w-full px-2"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        value={candidate.meaningZh}
                        onChange={(event) => updateCandidate(candidate.tempId, { meaningZh: event.target.value })}
                        className="mimi-input min-h-9 w-full px-2"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        value={candidate.example}
                        onChange={(event) => updateCandidate(candidate.tempId, { example: event.target.value })}
                        className="mimi-input min-h-9 w-full px-2"
                      />
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
            选择 `.txt` 文件或粘贴文本后生成预览。
          </p>
        )}
      </section>
    </div>
  );
}
