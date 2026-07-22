"use client";

import { Save } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useDailyStudy } from "@/components/study/use-daily-study";
import { PressableButton } from "@/components/ui/motion-primitives";
import { parseDailyGoal } from "@/lib/daily-study/contract";
import { getSelectedPersonId } from "@/lib/people/repository";
import { getSelectedReviewSettings } from "@/lib/review/settings";
import { DailyGoalInput } from "./daily-goal-input";

function detectTimezone(fallback: string) {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function ReviewSettingsForm() {
  const {
    data,
    isLoaded,
    today,
    resolveToday,
    updateDefaults,
  } = useDailyStudy();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedPersonId = getSelectedPersonId(data);
  const settings = getSelectedReviewSettings(data);
  const defaults = useMemo(
    () =>
      new Map(
        data.dailyStudyDefaults
          .filter((entry) => entry.personId === selectedPersonId)
          .map((entry) => [entry.reviewProfile, entry]),
      ),
    [data.dailyStudyDefaults, selectedPersonId],
  );
  const recognition = defaults.get("recognition");
  const active = defaults.get("active");

  useEffect(() => {
    if (isLoaded) {
      void resolveToday().catch((error) => {
        setMessage(error instanceof Error ? error.message : "Could not prepare daily defaults");
      });
    }
  }, [isLoaded, resolveToday, selectedPersonId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      setIsSaving(true);
      setMessage("");
      const timezone = String(formData.get("timezone") ?? "").trim();
      const recognitionReviewGoal = parseDailyGoal(
        String(formData.get("recognitionReviewGoal") ?? ""),
      );
      const recognitionNewWordGoal = parseDailyGoal(
        String(formData.get("recognitionNewWordGoal") ?? ""),
      );
      const activeReviewGoal = parseDailyGoal(
        String(formData.get("activeReviewGoal") ?? ""),
      );
      const activeNewWordGoal = parseDailyGoal(
        String(formData.get("activeNewWordGoal") ?? ""),
      );

      await updateDefaults({
        personId: selectedPersonId,
        timezone,
        goals: [
          {
            personId: selectedPersonId,
            reviewProfile: "recognition",
            reviewGoal: recognitionReviewGoal,
            newWordGoal: recognitionNewWordGoal,
          },
          {
            personId: selectedPersonId,
            reviewProfile: "active",
            reviewGoal: activeReviewGoal,
            newWordGoal: activeNewWordGoal,
          },
        ],
      });
      setMessage("Daily defaults are saved. Today’s existing goals stay unchanged.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save these defaults");
    } finally {
      setIsSaving(false);
    }
  };

  const recognitionMetrics =
    today?.tracks.recognition.status === "available"
      ? today.tracks.recognition.metrics
      : null;
  const activeMetrics =
    today?.tracks.active.status === "available" ? today.tracks.active.metrics : null;
  const formKey = [
    selectedPersonId,
    recognition?.updatedAt,
    active?.updatedAt,
    isLoaded ? "loaded" : "loading",
  ].join("-");

  return (
    <form key={formKey} className="grid gap-5 md:max-w-2xl" onSubmit={handleSubmit}>
      <p className="text-sm leading-6 text-[var(--mimi-text-soft)]">
        Applies from the next study day. Change today in Study.
      </p>

      <fieldset className="grid gap-3 rounded-md border border-[var(--mimi-border)] p-3 sm:p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--mimi-text)]">Recognition Vocabulary</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <DailyGoalInput
            name="recognitionReviewGoal"
            label="Review goal"
            value={recognition?.reviewGoal ?? recognitionMetrics?.reviewGoal ?? settings.recognitionSessionLimit}
          />
          <DailyGoalInput
            name="recognitionNewWordGoal"
            label="New learning goal"
            value={recognition?.newWordGoal ?? recognitionMetrics?.newWordGoal ?? 0}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 rounded-md border border-[var(--mimi-border)] p-3 sm:p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--mimi-text)]">Active Vocabulary</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <DailyGoalInput
            name="activeReviewGoal"
            label="Review goal"
            value={active?.reviewGoal ?? activeMetrics?.reviewGoal ?? settings.activeSessionLimit}
          />
          <DailyGoalInput
            name="activeNewWordGoal"
            label="New learning goal"
            value={active?.newWordGoal ?? activeMetrics?.newWordGoal ?? 0}
          />
        </div>
      </fieldset>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-[var(--mimi-text)]">Timezone</span>
        <input
          name="timezone"
          defaultValue={isLoaded ? settings.timezone : detectTimezone(settings.timezone)}
          className="mimi-input min-h-11 px-3 text-base"
        />
      </label>

      <PressableButton
        type="submit"
        disabled={!isLoaded || isSaving}
        className="mimi-button mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
      >
        <Save aria-hidden="true" className="size-4" />
        {isSaving ? "Saving..." : "Save daily defaults"}
      </PressableButton>
      {message ? (
        <p className="rounded-md bg-[var(--mimi-primary-soft)] px-3 py-2 text-sm leading-6 text-[var(--mimi-primary-deep)]">
          {message}
        </p>
      ) : null}
    </form>
  );
}
