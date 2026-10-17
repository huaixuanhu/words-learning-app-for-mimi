"use client";

import { useRef, useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

export type PendingSaveRecovery = Readonly<{
  requestId: string;
  personId: string;
  personName: string;
  snapshotFingerprint: string;
}>;

type Props = {
  recovery: PendingSaveRecovery;
  onCancel(): void;
  onContinue(recovery: PendingSaveRecovery): Promise<void>;
};

export function PendingSaveRecoveryDialog({ recovery, onCancel, onContinue }: Props) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function resume() {
    if (!checked || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await onContinue(recovery);
      onCancel();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "核对未完成，请重试。");
      setChecked(false);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <ResponsiveDialog open onClose={() => { if (!inFlight.current) onCancel(); }}
      labelledBy="pending-save-title" describedBy="pending-save-description"
      dismissOnBackdrop={false} panelClassName="max-w-md text-[var(--mimi-text)]">
      <h2 id="pending-save-title" className="mimi-cjk text-xl font-semibold">核对后继续使用</h2>
      <p id="pending-save-description" className="mt-3 text-sm leading-6 text-[var(--mimi-text-soft)]">
        {recovery.personName} 的最新云端数据已载入，但上一次保存仍无法确认。
        请先检查词库和最近的操作是否已生效，避免重复添加或记录。
        继续时会再次读取云端数据，并解除本浏览器的旧保存标记；不会重发那次保存，也不会覆盖云端数据。
      </p>
      <label className="mt-4 flex min-h-11 items-start gap-3 text-sm leading-6">
        <input type="checkbox" checked={checked} disabled={busy}
          onChange={(event) => setChecked(event.target.checked)}
          className="mimi-focus-ring mt-1 size-5 shrink-0 accent-[var(--mimi-sage)]" />
        <span>我已关闭本网站的其他页面，并核对过这位学习者的词库和最近操作。</span>
      </label>
      {error ? <p role="alert" className="mt-3 text-sm text-[#8a4d21]">{error}</p> : null}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button type="button" disabled={busy} onClick={onCancel}
          className="mimi-button-secondary mimi-focus-ring min-h-11 px-4 text-sm font-semibold disabled:opacity-50">取消</button>
        <button type="button" disabled={!checked || busy} onClick={() => { void resume(); }}
          className="mimi-button mimi-focus-ring min-h-11 px-4 text-sm font-semibold disabled:opacity-50">
          {busy ? "正在重新核对…" : "使用当前云端数据继续"}
        </button>
      </div>
    </ResponsiveDialog>
  );
}
