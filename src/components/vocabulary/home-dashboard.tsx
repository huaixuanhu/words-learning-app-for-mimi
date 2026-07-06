"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Download, Leaf, RotateCcw, Settings } from "lucide-react";
import { primaryActions } from "@/lib/stage-two-data";
import { getActiveVocabularyItems, getArchivedVocabularyItems } from "@/lib/vocabulary/repository";
import { useVocabularyData } from "./use-vocabulary-data";
import { DEFAULT_SESSION_LIMIT, getSelectedReviewSettings } from "@/lib/review/settings";
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
  const archivedItems = getArchivedVocabularyItems(data);
  const selectedPerson = getSelectedPerson(data);
  const settings = getSelectedReviewSettings(data);
  const reviewQueue = selectReviewQueue(data);
  const completedToday = data.reviewEvents.filter(
    (event) => event.personId === selectedPerson.id && isSameLocalDay(event.reviewedAt),
  ).length;
  const sessionLimit = isLoaded ? settings.sessionLimit : DEFAULT_SESSION_LIMIT;
  const progressPercent = sessionLimit ? Math.min(100, Math.round((completedToday / sessionLimit) * 100)) : 0;
  const latestItems = activeItems.slice(0, 4);
  const progressStyle = {
    background: `conic-gradient(#5f7d66 ${progressPercent}%, #e1dbce ${progressPercent}% 100%)`,
  };

  return (
    <div className="grid gap-5">
      <CalmEntrance className="grid items-start gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="mimi-panel p-5 sm:p-6">
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            <div
              className="grid size-36 place-items-center rounded-full p-2 shadow-[inset_0_0_0_1px_rgb(216_209_194/0.8)]"
              style={progressStyle}
              aria-label={`今日复习进度 ${progressPercent}%`}
            >
              <div className="grid size-28 place-items-center rounded-full bg-[#fffaf1] text-center shadow-[inset_0_0_0_1px_rgb(216_209_194/0.68)]">
                <span>
                  <span className="block text-3xl font-semibold text-[#203229]">{progressPercent}%</span>
                  <span className="mt-1 block text-xs font-medium text-[#5f6d62]">today</span>
                </span>
              </div>
            </div>

            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#d9e5d5] px-3 py-1 text-xs font-semibold text-[#274331]">
                <Leaf aria-hidden="true" className="size-3.5" />
                {selectedPerson.displayName}
              </div>
              <h2 className="text-2xl font-semibold text-[#203229]">Keep going, one word at a time.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#5f6d62]">
                今日已记录 {isLoaded ? completedToday : "-"} / {sessionLimit} 张卡片。你正在把词汇变成可回忆的材料。
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/review" className="mimi-button mimi-focus-ring inline-flex items-center justify-center gap-2 px-5 text-sm font-semibold">
                  <RotateCcw aria-hidden="true" className="size-4" />
                  开始复习
                </Link>
                <Link href="/library" className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-center gap-2 px-5 text-sm font-semibold">
                  <BookOpen aria-hidden="true" className="size-4" />
                  浏览词库
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mimi-panel-dark p-5">
          <p className="text-sm font-semibold text-[var(--mimi-panel-dark-text)]">Review schedule</p>
          <div className="mt-5 grid gap-3">
            {[
              ["Ready now", isLoaded ? reviewQueue.length : "-"],
              ["Active words", isLoaded ? activeItems.length : "-"],
              ["Archived", isLoaded ? archivedItems.length : "-"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-[var(--mimi-panel-dark-item-border)] bg-[var(--mimi-panel-dark-item-bg)] px-4 py-3">
                <span className="text-sm text-[var(--mimi-panel-dark-muted)]">{label}</span>
                <span className="text-xl font-semibold text-[var(--mimi-panel-dark-text)]">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--mimi-panel-dark-muted)]">
            Review gently, remember deeply. The queue follows the existing local scheduler.
          </p>
        </section>
      </CalmEntrance>

      <section className="grid gap-3 md:grid-cols-3 lg:max-w-4xl">
        {primaryActions.map((action) => {
          const Icon = action.icon;

          return (
            <CalmCard key={action.href} className="mimi-card mimi-card-interactive">
              <Link
                href={action.href}
                className="mimi-focus-ring block h-full rounded-md p-4 lg:p-3"
              >
                <div className="mb-3 inline-flex size-9 items-center justify-center rounded-md bg-[#d9e5d5] text-[#274331]">
                  <Icon aria-hidden="true" className="size-4" />
                </div>
                <p className="text-base font-semibold text-[#203229]">{action.label}</p>
                <p className="mt-1 text-sm leading-5 text-[#5f6d62]">{action.detail}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#5f7d66]">
                  进入
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            </CalmCard>
          );
        })}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="mimi-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#203229]">Latest words</h2>
            <Link href="/library" className="mimi-focus-ring rounded-md text-sm font-semibold text-[#5f7d66]">
              查看全部
            </Link>
          </div>
          {latestItems.length ? (
            <div className="grid gap-3">
              {latestItems.map((item) => (
                <div key={item.id} className="rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="mimi-word-serif text-2xl text-[#203229]">{item.surfaceText}</p>
                    <span className="text-xs font-semibold uppercase text-[#879087]">{item.source}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#5f6d62]">{item.meaningZh || "No meaning yet"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-[#afbea9] bg-[#fffaf1] p-4 text-sm leading-6 text-[#5f6d62]">
              {isLoaded ? "还没有本地词条。可以先添加一个单词或导入 .txt。" : "Loading local vocabulary..."}
            </p>
          )}
        </section>

        <section className="mimi-panel p-5">
          <h2 className="text-base font-semibold text-[#203229]">Quiet tools</h2>
          <div className="mt-4 grid gap-3">
            <Link href="/export" className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-between gap-3 px-4 text-sm font-semibold">
              <span className="inline-flex items-center gap-2">
                <Download aria-hidden="true" className="size-4" />
                Export and backup
              </span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link href="/settings" className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-between gap-3 px-4 text-sm font-semibold">
              <span className="inline-flex items-center gap-2">
                <Settings aria-hidden="true" className="size-4" />
                Review settings
              </span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div className="mt-5 rounded-md bg-[#d9e5d5] p-4 text-sm leading-6 text-[#274331]">
            Small steps today. Strong results tomorrow.
          </div>
        </section>
      </div>
    </div>
  );
}
