import Link from "next/link";
import { ArrowRight, AudioWaveform, Ear, Keyboard, Mic2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function PracticeLabPage() {
  const modules = [
    {
      title: "Say it",
      description: "See the meaning, then recall the word aloud.",
      icon: Mic2,
    },
    {
      title: "Spell it",
      description: "See the meaning and type the word from memory.",
      icon: Keyboard,
    },
    {
      title: "Dictation",
      description: "Hear the word, write it, then check the meaning.",
      icon: Ear,
    },
  ] as const;

  return (
    <AppShell title="Practice Lab" subtitle="A quiet space for Active Vocabulary.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <section className="mimi-panel p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-[#d9e5d5] text-[#274331]">
              <AudioWaveform aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-[#879087]">Practice Lab</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#203229]">Active Vocabulary</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f6d62]">
                Say it, spell it, or write what you hear. These modes are resting for now.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <div key={module.title} className="rounded-md border border-[#d8d1c2] bg-[#fffaf1] p-4">
                  <span className="inline-flex size-10 items-center justify-center rounded-md bg-[#eef0df] text-[#425f4a]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-[#203229]">{module.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5f6d62]">{module.description}</p>
                  <span className="mimi-pill-muted mt-4 inline-flex px-2 py-1 text-xs font-semibold">Resting</span>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="mimi-panel-dark p-5">
          <h2 className="text-base font-semibold text-[var(--mimi-panel-dark-text)]">Coming gently</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--mimi-panel-dark-muted)]">
            Active practice is resting for now. Review remains ready today.
          </p>
          <Link
            href="/review"
            className="mimi-button-secondary mimi-focus-ring mt-5 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
          >
            Return to review
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </aside>
      </div>
    </AppShell>
  );
}
