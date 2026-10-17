"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { PressableButton } from "@/components/ui/motion-primitives";

type BulkDeleteDialogProps = {
  items: readonly { id: string; surfaceText: string }[];
  onCancel: () => void;
  onDelete: () => Promise<void>;
};

export function BulkDeleteDialog({ items, onCancel, onDelete }: BulkDeleteDialogProps) {
  const [step, setStep] = useState<"review" | "final">("review");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const confirm = async () => {
    if (inFlight.current) return;
    if (step === "review") {
      setStep("final");
      return;
    }
    inFlight.current = true;
    setIsDeleting(true);
    setError("");
    try {
      await onDelete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "删除未完成，请检查后重试。");
    } finally {
      inFlight.current = false;
      setIsDeleting(false);
    }
  };

  const cancelButton = (
    <PressableButton
      key="cancel"
      type="button"
      disabled={isDeleting}
      onClick={() => { if (!inFlight.current) onCancel(); }}
      className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold disabled:opacity-50"
    >
      No · 取消
    </PressableButton>
  );
  const confirmButton = (
    <PressableButton
      key="confirm"
      type="button"
      disabled={isDeleting || items.length === 0}
      onClick={() => void confirm()}
      className="mimi-button mimi-focus-ring inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold disabled:opacity-50"
    >
      {isDeleting ? "Deleting…" : step === "final" ? "Yes · 确认删除" : "Yes · 继续"}
    </PressableButton>
  );

  return (
    <ResponsiveDialog
      key={step}
      open
      onClose={() => { if (!inFlight.current) onCancel(); }}
      labelledBy="bulk-delete-title"
      describedBy="bulk-delete-description"
      panelClassName="max-w-md text-center sm:max-w-md"
      dismissOnBackdrop={false}
    >
      <Trash2 aria-hidden="true" className="mx-auto size-9 text-[#8a4d21]" />
      <h2 id="bulk-delete-title" className="mimi-cjk mt-4 text-xl font-semibold text-[var(--mimi-text)]">
        {step === "review" ? `确认删除这 ${items.length} 个词条？` : "再次确认真的确认要删除吗？"}
      </h2>
      <p id="bulk-delete-description" className="mt-2 text-sm leading-6 text-[var(--mimi-text-soft)]">
        将永久删除以下 {items.length} 个词条及其复习记录、相关 AI 草稿和词汇关联。此操作无法撤销。
      </p>
      <ul tabIndex={0} aria-label="待删除单词" className="mimi-focus-ring mt-3 max-h-48 overflow-y-auto rounded-md border border-[var(--mimi-border)] px-4 py-2 text-left text-sm text-[var(--mimi-text)]">
        {items.map((item) => <li key={item.id} className="break-words py-1">{item.surfaceText}</li>)}
      </ul>
      {error ? <p role="alert" className="mt-3 text-sm text-[#8a4d21]">{error}</p> : null}
      {isDeleting ? <p role="status" className="mt-3 text-sm text-[var(--mimi-text-soft)]">Deleting selected words…</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {step === "review" ? [cancelButton, confirmButton] : [confirmButton, cancelButton]}
      </div>
    </ResponsiveDialog>
  );
}
