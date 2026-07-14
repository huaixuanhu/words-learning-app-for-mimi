import Link from "next/link";
import { ArrowRight, BookOpen, PenLine, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function StudyPage() {
  const studyCards = [
    {
      href: "/review",
      title: "Recognition Vocabulary",
      description: "Recognize meanings and examples with calm flashcards.",
      icon: BookOpen,
      cta: "Start review",
    },
    {
      href: "/practice-lab",
      title: "Active Vocabulary",
      description: "Preview Say it, Spell it, and Dictation practice.",
      icon: PenLine,
      cta: "Open lab",
    },
  ] as const;

  return (
    <AppShell title="Study" subtitle="Choose a learning Track.">
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
            Recognition supports reading. Active practice will focus on recall and sound.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
