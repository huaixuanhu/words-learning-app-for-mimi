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
      <section className="rounded-md border border-[#dfddd6] bg-white p-4">
        <h2 className="mb-4 text-base font-semibold">Input</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Text file</span>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={(event) => void readFile(event.target.files?.[0])}
              className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Paste text</span>
            <textarea
              rows={5}
              value={inputText}
              onChange={(event) => {
                setInputText(event.target.value);
                setSourceType("pasted_text");
                setFileName(null);
              }}
              placeholder={"allocate - 分配\ncoherent, ambiguous"}
              className="min-h-32 resize-y rounded-md border border-[#d7d4ca] bg-white px-3 py-2 text-base outline-none focus:border-[#517056]"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => parseInput(inputText, "pasted_text", null)}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#517056] px-4 text-sm font-semibold text-white"
        >
          <Upload aria-hidden="true" className="size-4" />
          生成预览
        </button>
      </section>

      <section className="rounded-md border border-[#dfddd6] bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Preview</h2>
          <button
            type="button"
            disabled={!acceptedIds.size}
            onClick={() => void saveImport()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#517056] px-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save aria-hidden="true" className="size-4" />
            确认保存
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Total", summary.totalRows],
            ["New", summary.newRows],
            ["Duplicate", summary.duplicateRows],
            ["Invalid", summary.invalidRows],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-[#f8f7f4] p-3">
              <p className="text-xs font-medium text-[#66645c]">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        {message ? <p className="mb-3 text-sm text-[#517056]">{message}</p> : null}

        {candidates.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dfddd6] text-[#66645c]">
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
                  <tr key={candidate.tempId} className="border-b border-[#eeeae1] align-top">
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={acceptedIds.has(candidate.tempId)}
                        disabled={candidate.status === "invalid"}
                        onChange={(event) => toggleAccepted(candidate.tempId, event.target.checked)}
                      />
                    </td>
                    <td className="py-2 pr-3">{candidate.lineNumber}</td>
                    <td className="py-2 pr-3">
                      <input
                        value={candidate.surfaceText}
                        onChange={(event) => updateCandidate(candidate.tempId, { surfaceText: event.target.value })}
                        className="min-h-9 w-full rounded-md border border-[#d7d4ca] px-2"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        value={candidate.meaningZh}
                        onChange={(event) => updateCandidate(candidate.tempId, { meaningZh: event.target.value })}
                        className="min-h-9 w-full rounded-md border border-[#d7d4ca] px-2"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        value={candidate.example}
                        onChange={(event) => updateCandidate(candidate.tempId, { example: event.target.value })}
                        className="min-h-9 w-full rounded-md border border-[#d7d4ca] px-2"
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
                        className="min-h-9 w-20 rounded-md border border-[#d7d4ca] px-2"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <span className="block font-medium">{candidate.status}</span>
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
          <p className="text-sm leading-6 text-[#66645c]">选择 `.txt` 文件或粘贴文本后生成预览。</p>
        )}
      </section>
    </div>
  );
}
