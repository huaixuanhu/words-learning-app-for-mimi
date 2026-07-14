"use client";

import { Save } from "lucide-react";
import { type FormEvent, useState } from "react";
import { PressableButton } from "@/components/ui/motion-primitives";
import { parseDailyGoal } from "@/lib/daily-study/contract";
import type { AvailableDailyStudyTrackSummary } from "@/lib/daily-study/types";

type TodayGoalsFormProps = Readonly<{
  personId: string;
  localDate: string;
  track: AvailableDailyStudyTrackSummary;
  onSave: (input: {
    personId: string;
    planId: string;
    localDate: string;
    reviewProfile: AvailableDailyStudyTrackSummary["reviewProfile"];
    reviewGoal: number;
    newWordGoal: number;
    expectedPlanVersion: number;
  }) => Promise<unknown>;
}>;

export function TodayGoalsForm({
  personId,
  localDate,
  track,
  onSave,
}: TodayGoalsFormProps) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      setIsSaving(true);
      setMessage("");
      await onSave({
        personId,
        planId: track.planId,
        localDate,
        reviewProfile: track.reviewProfile,
        reviewGoal: parseDailyGoal(String(formData.get("reviewGoal") ?? "")),
        newWordGoal: parseDailyGoal(String(formData.get("newWordGoal") ?? "")),
        expectedPlanVersion: track.planVersion,
      });
      setMessage("Today’s goals are saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save today’s goals");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      key={`${track.planId}-${track.planVersion}`}
      className="grid gap-3 border-t border-[var(--mimi-border)] pt-4"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-[var(--mimi-text-soft)]">Review goal</span>
          <input
            name="reviewGoal"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={track.metrics.reviewGoal}
            onChange={() => setMessage("")}
            aria-label={`${track.reviewProfile} review goal for today`}
            className="mimi-input min-h-11 px-3 text-base"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-[var(--mimi-text-soft)]">New-word goal</span>
          <input
            name="newWordGoal"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={track.metrics.newWordGoal}
            onChange={() => setMessage("")}
            aria-label={`${track.reviewProfile} new-word goal for today`}
            className="mimi-input min-h-11 px-3 text-base"
          />
        </label>
      </div>
      <PressableButton
        type="submit"
        disabled={isSaving}
        className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
      >
        <Save aria-hidden="true" className="size-4" />
        {isSaving ? "Saving..." : "Save today"}
      </PressableButton>
      {message ? (
        <p className="rounded-md bg-[var(--mimi-primary-soft)] px-3 py-2 text-xs leading-5 text-[var(--mimi-primary-deep)]">
          {message}
        </p>
      ) : null}
    </form>
  );
}
