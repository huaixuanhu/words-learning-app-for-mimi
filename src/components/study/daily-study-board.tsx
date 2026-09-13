"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { PressableButton } from "@/components/ui/motion-primitives";
import { getSelectedPersonId } from "@/lib/people/repository";
import { DailyTrackCard } from "./daily-track-card";
import { ResetTodayControl } from "./reset-today-control";
import { useDailyStudy } from "./use-daily-study";

export function DailyStudyBoard() {
  const {
    data,
    isLoaded,
    today,
    isTodayLoading,
    todayRefreshError,
    resolveToday,
    updateTodayGoals,
    resetToday,
  } = useDailyStudy();
  const [loadError, setLoadError] = useState("");
  const selectedPersonId = getSelectedPersonId(data);

  useEffect(() => {
    if (isLoaded) {
      void resolveToday()
        .then(() => setLoadError(""))
        .catch((error) => {
          setLoadError(error instanceof Error ? error.message : "Could not prepare today’s plan");
        });
    }
  }, [isLoaded, resolveToday, selectedPersonId]);

  if (loadError && !today) {
    return (
      <div className="mimi-panel grid min-h-48 place-items-center gap-3 p-6 text-center">
        <p className="text-sm leading-6 text-[var(--mimi-text-soft)]">{loadError}</p>
        <PressableButton
          type="button"
          onClick={() => {
            setLoadError("");
            void resolveToday().catch((error) => {
              setLoadError(error instanceof Error ? error.message : "Could not prepare today’s plan");
            });
          }}
          className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold"
        >
          Try again
        </PressableButton>
      </div>
    );
  }

  if (!isLoaded || !today) {
    return (
      <div className="mimi-panel grid min-h-48 place-items-center p-6 text-center">
        <p className="text-sm text-[var(--mimi-text-soft)]">
          {isTodayLoading ? "Preparing today’s plan..." : "Loading Study..."}
        </p>
      </div>
    );
  }

  const recognition =
    today.tracks.recognition.status === "available"
      ? today.tracks.recognition
      : null;

  return (
    <div className="grid gap-4">
      {todayRefreshError ? (
        <p role="status" className="mimi-panel p-4 text-sm text-[var(--mimi-text-soft)]">
          {todayRefreshError}
        </p>
      ) : null}
      <div className="mimi-panel flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--mimi-primary-soft)] text-[var(--mimi-primary-deep)]">
            <CalendarDays aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--mimi-text-muted)]">Today</p>
            <h2 className="mt-0.5 text-lg font-semibold text-[var(--mimi-text)]">{today.localDate}</h2>
          </div>
        </div>
        <p className="mimi-pill px-3 py-1 text-xs font-semibold">{today.timezone}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyTrackCard
          personId={today.personId}
          localDate={today.localDate}
          profile="recognition"
          track={today.tracks.recognition}
          onSaveGoals={updateTodayGoals}
        />
        <DailyTrackCard
          personId={today.personId}
          localDate={today.localDate}
          profile="active"
          track={today.tracks.active}
          onSaveGoals={updateTodayGoals}
        />
      </div>

      <ResetTodayControl
        personId={today.personId}
        localDate={today.localDate}
        recognition={recognition}
        onReset={resetToday}
      />
    </div>
  );
}
