"use client";

import { AlertTriangle, Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { SimplePanel } from "@/components/simple-panel";
import { exportVocabularyCsv } from "@/lib/backup/csv-export";
import {
  parseVocabularyBackupText,
  serializeVocabularyBackup,
  summarizeVocabularyData,
} from "@/lib/backup/json-backup";
import type { BackupParseResult } from "@/lib/backup/types";
import type { VocabularyData } from "@/lib/vocabulary/types";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";

function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function compactTimestamp(value = new Date().toISOString()) {
  return value.replaceAll(":", "").replaceAll("-", "").replace(/\.\d{3}Z$/, "Z");
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function SummaryGrid({ data }: { data: VocabularyData }) {
  const counts = summarizeVocabularyData(data);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {[
        ["Items", counts.items],
        ["Active", counts.activeItems],
        ["Archived", counts.archivedItems],
        ["Batches", counts.importBatches],
        ["States", counts.reviewStates],
        ["Events", counts.reviewEvents],
      ].map(([label, value]) => (
        <div key={label} className="rounded-md bg-[#f8f7f4] p-3">
          <p className="text-xs font-medium text-[#66645c]">{label}</p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ErrorList({ result }: { result: Extract<BackupParseResult, { ok: false }> }) {
  return (
    <div className="rounded-md border border-[#e0b9a8] bg-[#fff8f4] p-3 text-sm text-[#7a3421]">
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">备份文件无法恢复</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {result.errors.slice(0, 6).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          {result.errors.length > 6 ? (
            <p className="mt-2">另有 {result.errors.length - 6} 个校验错误未显示。</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ExportWorkspace() {
  const { data, isLoaded, commit } = useVocabularyData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreResult, setRestoreResult] = useState<BackupParseResult | null>(null);
  const [message, setMessage] = useState("");

  const downloadJsonBackup = () => {
    const exportedAt = new Date().toISOString();
    const backup = serializeVocabularyBackup(data, {
      exportedAt,
      timezone: detectTimezone(),
    });

    downloadTextFile(
      `mimi-pte-backup-${compactTimestamp(exportedAt)}.json`,
      backup,
      "application/json;charset=utf-8",
    );
    setMessage("已生成 JSON backup");
  };

  const downloadCsv = () => {
    const exportedAt = new Date().toISOString();

    downloadTextFile(
      `mimi-pte-vocabulary-${compactTimestamp(exportedAt)}.csv`,
      exportVocabularyCsv(data),
      "text/csv;charset=utf-8",
    );
    setMessage("已生成 vocabulary CSV");
  };

  const readBackupFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const text = await file.text();
    const result = parseVocabularyBackupText(text);

    setRestoreResult(result);
    setMessage(result.ok ? "已读取备份预览" : "备份文件未通过校验");
  };

  const restoreBackup = () => {
    if (!restoreResult?.ok) {
      return;
    }

    commit(restoreResult.data);
    setMessage(`已恢复 ${restoreResult.counts.items} 个词条到本地浏览器存储`);
    setRestoreResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-4">
      <SimplePanel title="Current Local Data">
        {isLoaded ? <SummaryGrid data={data} /> : <p className="text-sm text-[#66645c]">Loading local data...</p>}
      </SimplePanel>

      <SimplePanel title="Download">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!isLoaded}
            onClick={downloadJsonBackup}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md border border-[#d7d4ca] bg-white px-4 text-sm font-semibold hover:border-[#517056] disabled:opacity-50"
          >
            <FileJson aria-hidden="true" className="size-4" />
            JSON backup
          </button>
          <button
            type="button"
            disabled={!isLoaded}
            onClick={downloadCsv}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md border border-[#d7d4ca] bg-white px-4 text-sm font-semibold hover:border-[#517056] disabled:opacity-50"
          >
            <FileSpreadsheet aria-hidden="true" className="size-4" />
            Vocabulary CSV
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-[#517056]">{message}</p> : null}
      </SimplePanel>

      <SimplePanel title="Restore Preview">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="grid gap-2">
            <span className="text-sm font-medium">JSON backup file</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(event) => void readBackupFile(event.target.files?.[0])}
              className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-md border border-[#d7d4ca] bg-white px-4 text-sm font-semibold"
          >
            <Upload aria-hidden="true" className="size-4" />
            选择文件
          </button>
        </div>

        {restoreResult?.ok ? (
          <div className="mt-4 grid gap-4">
            <div className="rounded-md border border-[#dfddd6] bg-[#f8f7f4] p-3 text-sm text-[#464640]">
              <p>Exported at: {new Date(restoreResult.backup.metadata.exportedAt).toLocaleString()}</p>
              <p>Timezone: {restoreResult.backup.metadata.timezone}</p>
              <p>Schema version: {restoreResult.backup.metadata.schemaVersion}</p>
            </div>
            <SummaryGrid data={restoreResult.data} />
            <button
              type="button"
              onClick={restoreBackup}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#517056] px-4 text-sm font-semibold text-white"
            >
              <Download aria-hidden="true" className="size-4" />
              确认恢复到本地
            </button>
          </div>
        ) : null}

        {restoreResult && !restoreResult.ok ? (
          <div className="mt-4">
            <ErrorList result={restoreResult} />
          </div>
        ) : null}
      </SimplePanel>
    </div>
  );
}
