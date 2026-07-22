"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { PressableButton } from "@/components/ui/motion-primitives";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { createStudyIdempotencyKey } from "./use-daily-study";
import type { AvailableDailyStudyTrackSummary } from "@/lib/daily-study/types";

type ResetTodayControlProps = Readonly<{
  personId: string;
  localDate: string;
  recognition: AvailableDailyStudyTrackSummary | null;
  onReset: (command: {
    personId: string;
    planId: string;
    localDate: string;
    contractVersion: "v2-stage1";
    finalConfirmation: "confirmed_after_second_gate";
    idempotencyKey: string;
  }) => Promise<{ resetItemsCount: number }>;
}>;

export function ResetTodayControl({
  personId,
  localDate,
  recognition,
  onReset,
}: ResetTodayControlProps) {
  const [gate, setGate] = useState<0 | 1 | 2>(0);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState("");

  const close = () => {
    if (!isResetting) {
      setGate(0);
    }
  };

  const confirmReset = async () => {
    if (!recognition) {
      return;
    }

    try {
      setIsResetting(true);
      const result = await onReset({
        personId,
        planId: recognition.planId,
        localDate,
        contractVersion: "v2-stage1",
        finalConfirmation: "confirmed_after_second_gate",
        idempotencyKey: createStudyIdempotencyKey("reset"),
      });
      setMessage(
        result.resetItemsCount
          ? `Today was cleared for ${result.resetItemsCount} ${result.resetItemsCount === 1 ? "entry" : "entries"}.`
          : "There is no study progress to clear today.",
      );
      setGate(0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not clear today’s progress");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <div className="mimi-panel-dark p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--mimi-panel-dark-item-bg)] text-[var(--mimi-panel-dark-text)]">
            <RotateCcw aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="mimi-display-title text-xl text-[var(--mimi-panel-dark-text)]">Today’s progress</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--mimi-panel-dark-muted)]">
              Clearing today returns both Tracks to the start of this study day.
            </p>
          </div>
        </div>
        <PressableButton
          type="button"
          disabled={!recognition}
          onClick={() => {
            setMessage("");
            setGate(1);
          }}
          className="mimi-button-secondary mimi-focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 px-3 text-sm font-semibold disabled:opacity-50"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Reset today’s progress
        </PressableButton>
        {message ? (
          <p className="mt-3 rounded-md bg-[var(--mimi-panel-dark-item-bg)] px-3 py-2 text-sm leading-5 text-[var(--mimi-panel-dark-text)]">
            {message}
          </p>
        ) : null}
      </div>

      <ResponsiveDialog
        open={gate === 1}
        onClose={close}
        labelledBy="reset-today-first-title"
        panelClassName="max-w-sm text-center sm:max-w-sm"
        dismissOnBackdrop={false}
      >
        <RotateCcw aria-hidden="true" className="mx-auto size-9 text-[var(--mimi-primary)]" />
        <h2 id="reset-today-first-title" className="mimi-display-title mt-4 text-2xl text-[var(--mimi-text)]">
          Reset today’s progress?
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <PressableButton
            type="button"
            onClick={close}
            className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold"
          >
            NO
          </PressableButton>
          <PressableButton
            type="button"
            onClick={() => setGate(2)}
            className="mimi-button mimi-focus-ring inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold"
          >
            YES
          </PressableButton>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={gate === 2}
        onClose={close}
        labelledBy="reset-today-final-title"
        panelClassName="max-w-sm text-center sm:max-w-sm"
        dismissOnBackdrop={false}
      >
        <RotateCcw aria-hidden="true" className="mx-auto size-9 text-[var(--mimi-primary)]" />
        <h2 id="reset-today-final-title" className="mt-4 text-xl font-semibold text-[var(--mimi-text)]">
          真的要确定清空本日记录吗？这里不可以撤销哦
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <PressableButton
            type="button"
            disabled={isResetting}
            onClick={() => setGate(1)}
            className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold disabled:opacity-50"
          >
            返回
          </PressableButton>
          <PressableButton
            type="button"
            disabled={isResetting}
            onClick={() => void confirmReset()}
            className="mimi-button mimi-focus-ring inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
          >
            {isResetting ? "正在清空..." : "确认清空"}
          </PressableButton>
        </div>
      </ResponsiveDialog>
    </>
  );
}
