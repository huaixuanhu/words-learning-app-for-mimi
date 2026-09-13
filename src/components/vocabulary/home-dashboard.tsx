"use client";

import Link from "next/link";
import {
  ArrowRight,
  AudioWaveform,
  BookOpen,
  Download,
  Ear,
  Leaf,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDailyStudy } from "@/components/study/use-daily-study";
import { CalmEntrance } from "@/components/ui/motion-primitives";
import { getLearningStage } from "@/lib/daily-study/runtime-engine";
import { getSelectedPerson } from "@/lib/people/repository";
import {
  getActiveTrackVocabularyItems,
  getActiveVocabularyItems,
  getArchivedVocabularyItems,
  getRecognitionVocabularyItems,
} from "@/lib/vocabulary/repository";
import { DashboardInsights } from "./dashboard-insights";
import { HomeTrackCard } from "./home-track-card";

function getFirstMeaning(item: { meaningsZh: string[]; meaningZh: string }) {
  return item.meaningsZh[0] ?? item.meaningZh;
}

export function HomeDashboard() {
  const { data, isLoaded, today, resolveToday, todayRefreshError, getRuntimeNow } = useDailyStudy();
  const [todayMessage, setTodayMessage] = useState("");
  const activeItems = getActiveVocabularyItems(data);
  const recognitionItems = getRecognitionVocabularyItems(data);
  const activeTrackItems = getActiveTrackVocabularyItems(data);
  const archivedItems = getArchivedVocabularyItems(data);
  const selectedPerson = getSelectedPerson(data);
  const weakWordsCount = data.reviewStates.filter(
    (state) => state.personId === selectedPerson.id && state.lapseCount > 0,
  ).length;
  const latestItems = activeItems.slice(0, 3);

  useEffect(() => {
    let active = true;
    if (isLoaded) {
      void resolveToday()
        .then(() => { if (active) setTodayMessage(""); })
        .catch((error) => {
          if (active) setTodayMessage(error instanceof Error ? error.message : "Could not prepare today’s plan");
        });
    }
    return () => { active = false; };
  }, [isLoaded, resolveToday, selectedPerson.id]);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4">
      <CalmEntrance className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-stretch">
        <section className="mimi-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--mimi-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--mimi-primary-deep)]">
                <Leaf aria-hidden="true" className="size-3.5" />
                {selectedPerson.displayName}
              </div>
              <h2 className="mimi-display-title text-2xl text-[var(--mimi-text)]">Today’s plan</h2>
              {todayMessage || todayRefreshError ? (
                <p role="status" className="mt-2 text-xs leading-5 text-[var(--mimi-text-soft)]">{todayMessage || todayRefreshError}</p>
              ) : null}
            </div>
            <Link
              href="/study"
              className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
            >
              Study plan
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <HomeTrackCard
              title="Recognition Vocabulary"
              eyebrow="Reading and meaning"
              track={today?.tracks.recognition ?? null}
              reviewHref="/review?zone=review"
              newLearningHref="/review?zone=new"
              Icon={BookOpen}
              tone="bg-[#d9e5d5] text-[#274331]"
            />
            <HomeTrackCard
              title="Active Vocabulary"
              eyebrow="Recall and sound"
              track={today?.tracks.active ?? null}
              reviewHref="/practice-lab?zone=review"
              newLearningHref="/practice-lab?zone=new"
              Icon={AudioWaveform}
              tone="bg-[#e7decb] text-[#5b4c2c]"
            />
          </div>
        </section>

        <section className="mimi-panel-dark p-4 lg:h-full">
          <h2 className="mimi-display-title text-xl text-[var(--mimi-panel-dark-text)]">Library at a glance</h2>
          <div className="mt-4 grid gap-2">
            {[
              ["Recognition", isLoaded ? recognitionItems.length : "-"],
              ["Active", isLoaded ? activeTrackItems.length : "-"],
              ["Needs care", isLoaded ? weakWordsCount : "-"],
              ["Archived", isLoaded ? archivedItems.length : "-"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-[var(--mimi-panel-dark-item-border)] bg-[var(--mimi-panel-dark-item-bg)] px-3 py-2.5">
                <span className="text-sm text-[var(--mimi-panel-dark-muted)]">{label}</span>
                <span className="text-lg font-semibold text-[var(--mimi-panel-dark-text)]">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </CalmEntrance>

      <DashboardInsights data={data} isLoaded={isLoaded} getRuntimeNow={getRuntimeNow} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="mimi-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="mimi-display-title text-xl text-[var(--mimi-text)]">Latest entries</h2>
            <Link href="/library" className="mimi-focus-ring rounded-md text-sm font-semibold text-[var(--mimi-primary)]">
              See all
            </Link>
          </div>
          {latestItems.length ? (
            <div className="grid gap-3">
              {latestItems.map((item) => (
                <div key={item.id} className="rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface)] px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="mimi-word-serif text-xl text-[var(--mimi-text)]">{item.surfaceText}</p>
                    <span className="mimi-pill px-2 py-1 text-xs font-semibold">
                      {getLearningStage(data, item.id, item.learningTrack) === "new" ? "New" : "In review"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[var(--mimi-text-soft)]">{getFirstMeaning(item) || "No meaning yet"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-[var(--mimi-border-strong)] bg-[var(--mimi-surface)] p-3 text-sm leading-6 text-[var(--mimi-text-soft)]">
              {isLoaded ? "No entries yet." : "Loading entries..."}
            </p>
          )}
        </section>

        <section className="mimi-panel p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--mimi-primary-soft)] text-[var(--mimi-primary-deep)]">
              <AudioWaveform aria-hidden="true" className="size-4.5" />
            </span>
            <div>
              <h2 className="mimi-display-title text-xl text-[var(--mimi-text)]">Practice Lab</h2>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { label: "Say it", icon: AudioWaveform },
              { label: "Spell it", icon: Sparkles },
              { label: "Dictation", icon: Ear },
            ].map((labItem) => {
              const Icon = labItem.icon;

              return (
                <span key={labItem.label} className="mimi-pill inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold">
                  <Icon aria-hidden="true" className="size-3.5" />
                  {labItem.label}
                </span>
              );
            })}
          </div>
          <Link
            href="/practice-lab"
            className="mimi-button-secondary mimi-focus-ring mt-3 inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
          >
            Open lab
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>

        <section className="mimi-panel p-4">
          <h2 className="mimi-display-title text-xl text-[var(--mimi-text)]">More</h2>
          <div className="mt-3 grid gap-2">
            {[
              { href: "/import", label: "Add words", icon: Upload },
              { href: "/export", label: "Backup", icon: Download },
              { href: "/settings", label: "Settings", icon: Settings },
            ].map((tool) => {
              const Icon = tool.icon;

              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-between gap-3 px-3 text-sm font-semibold"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon aria-hidden="true" className="size-4" />
                    {tool.label}
                  </span>
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
