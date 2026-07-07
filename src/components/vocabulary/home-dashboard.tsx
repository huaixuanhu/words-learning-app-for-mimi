"use client";

import Link from "next/link";
import {
  ArrowRight,
  AudioWaveform,
  BookOpen,
  Download,
  Ear,
  Leaf,
  PenLine,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  getActiveTrackVocabularyItems,
  getActiveVocabularyItems,
  getArchivedVocabularyItems,
  getRecognitionVocabularyItems,
} from "@/lib/vocabulary/repository";
import { useVocabularyData } from "./use-vocabulary-data";
import {
  DEFAULT_ACTIVE_SESSION_LIMIT,
  DEFAULT_RECOGNITION_SESSION_LIMIT,
  getSelectedReviewSettings,
} from "@/lib/review/settings";
import { getSelectedPerson } from "@/lib/people/repository";
import { selectReviewQueue } from "@/lib/review/scheduler";
import { CalmCard, CalmEntrance } from "@/components/ui/motion-primitives";

function isSameLocalDay(value: string, now = new Date()) {
  const date = new Date(value);

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function HomeDashboard() {
  const { data, isLoaded } = useVocabularyData();
  const activeItems = getActiveVocabularyItems(data);
  const recognitionItems = getRecognitionVocabularyItems(data);
  const activeTrackItems = getActiveTrackVocabularyItems(data);
  const archivedItems = getArchivedVocabularyItems(data);
  const selectedPerson = getSelectedPerson(data);
  const settings = getSelectedReviewSettings(data);
  const reviewQueue = selectReviewQueue(data);
  const completedToday = data.reviewEvents.filter(
    (event) => event.personId === selectedPerson.id && isSameLocalDay(event.reviewedAt),
  ).length;
  const recognitionLimit = isLoaded ? settings.recognitionSessionLimit : DEFAULT_RECOGNITION_SESSION_LIMIT;
  const activeLimit = isLoaded ? settings.activeSessionLimit : DEFAULT_ACTIVE_SESSION_LIMIT;
  const recognitionProgress = recognitionLimit
    ? Math.min(100, Math.round((completedToday / recognitionLimit) * 100))
    : 0;
  const activeProgress = activeLimit
    ? Math.min(100, Math.round((activeTrackItems.length / activeLimit) * 100))
    : 0;
  const weakWordsCount = data.reviewStates.filter(
    (state) => state.personId === selectedPerson.id && state.lapseCount > 0,
  ).length;
  const latestItems = activeItems.slice(0, 3);

  const trackCards = [
    {
      title: "Recognition Vocabulary",
      titleZh: "阅读词汇",
      eyebrow: "Higher-volume reading review",
      description: "Recognize the word, meaning, and example context without adding pressure.",
      goal: `${recognitionLimit} cards today`,
      progressLabel: `${isLoaded ? completedToday : "-"} / ${recognitionLimit}`,
      progress: recognitionProgress,
      href: "/review",
      cta: "Start review",
      Icon: BookOpen,
      mastery: ["Meaning", "Example"],
      tone: "bg-[#d9e5d5] text-[#274331]",
    },
    {
      title: "Active Vocabulary",
      titleZh: "输出词汇",
      eyebrow: "Focused listening and writing track",
      description: "Reserved for dictation, spelling, sentence recall, and writing usage.",
      goal: `${activeLimit} focused words later`,
      progressLabel: `${isLoaded ? activeTrackItems.length : "-"} / ${activeLimit}`,
      progress: activeProgress,
      href: "/practice-lab",
      cta: "Open lab",
      Icon: PenLine,
      mastery: ["Listening", "Spelling", "Usage"],
      tone: "bg-[#e7decb] text-[#5b4c2c]",
    },
  ] as const;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4">
      <CalmEntrance className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_270px]">
        <section className="mimi-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#d9e5d5] px-3 py-1 text-xs font-semibold text-[#274331]">
                <Leaf aria-hidden="true" className="size-3.5" />
                {selectedPerson.displayName}
              </div>
              <h2 className="text-xl font-semibold text-[#203229]">Today Hub</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#5f6d62]">
                Pick the right learning track for today. V1 keeps the existing local review flow, while the active track has a calm space ready for later practice.
              </p>
            </div>
            <Link
              href="/study"
              className="mimi-button-secondary mimi-focus-ring inline-flex !min-h-10 items-center justify-center gap-2 px-3 text-sm font-semibold"
            >
              Study plan
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {trackCards.map((track) => {
              const Icon = track.Icon;

              return (
                <CalmCard key={track.title} className="mimi-card h-full">
                  <div className="flex h-full min-h-[17rem] flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-normal text-[#879087]">{track.eyebrow}</p>
                        <h3 className="mt-1.5 text-lg font-semibold text-[#203229]">{track.title}</h3>
                        <p className="mimi-cjk mt-1 text-sm font-semibold text-[#425f4a]">{track.titleZh}</p>
                      </div>
                      <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md ${track.tone}`}>
                        <Icon aria-hidden="true" className="size-4.5" />
                      </span>
                    </div>

                    <p className="min-h-[2.75rem] text-sm leading-5 text-[#5f6d62]">{track.description}</p>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-[#203229]">{track.goal}</span>
                        <span className="font-mono text-xs text-[#5f6d62]">{track.progressLabel}</span>
                      </div>
                      <div className="mimi-progress-track h-2">
                        <div className="mimi-progress-fill h-full" style={{ width: `${track.progress}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {track.mastery.map((tag) => (
                        <span key={tag} className="mimi-pill px-2 py-1 text-xs font-semibold">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={track.href}
                      className="mimi-button mimi-focus-ring mt-auto inline-flex !min-h-10 w-fit items-center justify-center gap-2 px-3 text-sm font-semibold"
                    >
                      {track.cta}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </CalmCard>
              );
            })}
          </div>
        </section>

        <section className="mimi-panel-dark p-4">
          <p className="text-sm font-semibold text-[var(--mimi-panel-dark-text)]">Review schedule</p>
          <div className="mt-4 grid gap-2">
            {[
              ["Ready now", isLoaded ? reviewQueue.length : "-"],
              ["Recognition", isLoaded ? recognitionItems.length : "-"],
              ["Active", isLoaded ? activeTrackItems.length : "-"],
              ["Weak words", isLoaded ? weakWordsCount : "-"],
              ["Archived", isLoaded ? archivedItems.length : "-"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-[var(--mimi-panel-dark-item-border)] bg-[var(--mimi-panel-dark-item-bg)] px-3 py-2.5">
                <span className="text-sm text-[var(--mimi-panel-dark-muted)]">{label}</span>
                <span className="text-lg font-semibold text-[var(--mimi-panel-dark-text)]">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--mimi-panel-dark-muted)]">
            The queue still follows the existing local scheduler.
          </p>
        </section>
      </CalmEntrance>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="mimi-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#203229]">Latest words</h2>
            <Link href="/library" className="mimi-focus-ring rounded-md text-sm font-semibold text-[#5f7d66]">
              查看全部
            </Link>
          </div>
          {latestItems.length ? (
            <div className="grid gap-3">
              {latestItems.map((item) => (
                <div key={item.id} className="rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="mimi-word-serif text-xl text-[#203229]">{item.surfaceText}</p>
                    <span className="mimi-pill px-2 py-1 text-xs font-semibold">Recognition</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#5f6d62]">{item.meaningZh || "No meaning yet"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-[#afbea9] bg-[#fffaf1] p-3 text-sm leading-6 text-[#5f6d62]">
              {isLoaded ? "还没有本地词条。可以从导入页添加单个词或导入 JSON。" : "Loading local vocabulary..."}
            </p>
          )}
        </section>

        <section className="mimi-panel p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-[#d9e5d5] text-[#274331]">
              <AudioWaveform aria-hidden="true" className="size-4.5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#203229]">Practice Lab / 练习室</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6d62]">
                Dictation, spelling, and writing practice for Active Vocabulary will be added here later.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { label: "Listen", icon: Ear },
              { label: "Spell", icon: Sparkles },
              { label: "Write", icon: PenLine },
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
            className="mimi-button-secondary mimi-focus-ring mt-3 inline-flex !min-h-10 items-center justify-center gap-2 px-3 text-sm font-semibold"
          >
            Open lab
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>

        <section className="mimi-panel p-4">
          <h2 className="text-base font-semibold text-[#203229]">Quiet tools</h2>
          <div className="mt-3 grid gap-2">
            {[
              { href: "/import", label: "Input vocabulary", icon: Upload },
              { href: "/export", label: "Export backup", icon: Download },
              { href: "/settings", label: "Settings", icon: Settings },
            ].map((tool) => {
              const Icon = tool.icon;

              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="mimi-button-secondary mimi-focus-ring inline-flex !min-h-10 items-center justify-between gap-3 px-3 text-sm font-semibold"
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
