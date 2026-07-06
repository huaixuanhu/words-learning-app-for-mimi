import Link from "next/link";
import { ArrowRight, BookOpen, ListPlus, PenLine, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function StudyPage() {
  const studyCards = [
    {
      href: "/review",
      title: "Recognition Vocabulary",
      titleZh: "阅读词汇",
      description: "Review meaning and examples with the current V1 flashcard flow.",
      icon: BookOpen,
      cta: "Start review",
    },
    {
      href: "/add",
      title: "Add study material",
      titleZh: "添加材料",
      description: "Capture a new word, meaning, example sentence, and study notes.",
      icon: ListPlus,
      cta: "Add word",
    },
    {
      href: "/practice-lab",
      title: "Active Vocabulary",
      titleZh: "输出词汇",
      description: "Open the reserved space for later listening, spelling, and writing practice.",
      icon: PenLine,
      cta: "Open lab",
    },
  ] as const;

  return (
    <AppShell title="学习" subtitle="Choose the daily path without changing the local study model.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
        <section className="grid gap-4">
          {studyCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link key={card.href} href={card.href} className="mimi-card mimi-card-interactive mimi-focus-ring block p-5">
                <div className="flex items-start gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-[#d9e5d5] text-[#274331]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-[#203229]">{card.title}</h2>
                        <p className="mimi-cjk mt-1 text-sm font-semibold text-[#425f4a]">{card.titleZh}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#5f7d66]">
                        {card.cta}
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </span>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f6d62]">{card.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <aside className="mimi-panel-dark p-5">
          <div className="inline-flex size-10 items-center justify-center rounded-md bg-[var(--mimi-panel-dark-item-bg)] text-[var(--mimi-panel-dark-text)]">
            <RotateCcw aria-hidden="true" className="size-5" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-[var(--mimi-panel-dark-text)]">Daily rhythm</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--mimi-panel-dark-muted)]">
            Recognition review stays higher volume. Active practice stays smaller and more focused when it arrives later.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
