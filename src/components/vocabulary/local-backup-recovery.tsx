"use client";

import { useRef, useState } from "react";
import { parseVocabularyBackupText } from "@/lib/backup/json-backup";
import type { BackupParseResult } from "@/lib/backup/types";
import type { VocabularyData } from "@/lib/vocabulary/types";

type LocalBackupRecoveryProps = {
  onRestore(data: VocabularyData): Promise<{ recoveryStorageKey: string | null }>;
};

export function LocalBackupRecovery({ onRestore }: LocalBackupRecoveryProps) {
  const [preview, setPreview] = useState<BackupParseResult | null>(null);
  const [message, setMessage] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const restoring = useRef(false);
  const selection = useRef(0);

  async function readFile(file?: File) {
    const currentSelection = ++selection.current;
    setPreview(null);
    setMessage("");
    if (!file) return;
    try {
      const parsed = parseVocabularyBackupText(await file.text());
      if (currentSelection === selection.current) setPreview(parsed);
    } catch {
      if (currentSelection === selection.current) setMessage("无法读取此文件，请重新选择。");
    }
  }

  async function restore() {
    if (!preview?.ok || restoring.current) return;
    restoring.current = true;
    setIsRestoring(true);
    try {
      await onRestore(preview.data);
    } catch {
      setMessage("恢复未完成。原始存档仍受保护，请检查浏览器存储空间后重试。");
    } finally {
      restoring.current = false;
      setIsRestoring(false);
    }
  }

  return (
    <section aria-label="Recover browser backup" className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">
      <div className="mimi-panel grid gap-4 p-5 text-[var(--mimi-text)] sm:p-6">
        <h2 className="mimi-display-title text-xl">恢复本机存档</h2>
        <p className="text-sm leading-6 text-[var(--mimi-text-soft)]">
          本浏览器的存档无法读取，普通保存已暂停。选择有效备份并确认后，系统会先保留原始存档，再替换本机数据；此操作不会修改云端数据库。
        </p>
        <label className="grid gap-2 text-sm">
          选择 JSON 备份
          <input type="file" accept=".json,application/json" disabled={isRestoring}
            onChange={(event) => { void readFile(event.target.files?.[0]); }}
            className="mimi-input min-w-0 px-3 py-2" />
        </label>
        {preview?.ok ? (
          <>
            <p className="text-sm leading-6">
              备份时间：{new Date(preview.backup.metadata.exportedAt).toLocaleString()}<br />
              {preview.counts.people} 位学习者 · {preview.counts.items} 个词 · {preview.counts.reviewEvents} 条复习记录
            </p>
            <button type="button" disabled={isRestoring} onClick={() => { void restore(); }}
              className="mimi-button mimi-focus-ring min-h-11 justify-self-start px-4 text-sm font-semibold disabled:opacity-60">
              {isRestoring ? "正在恢复…" : "确认保留原档并用此备份替换本机数据"}
            </button>
          </>
        ) : preview ? <p role="alert" className="text-sm">备份校验未通过，无法恢复。{preview.errors[0]}</p> : null}
        {message ? <p role="alert" className="text-sm">{message}</p> : null}
      </div>
    </section>
  );
}
