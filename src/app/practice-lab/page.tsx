import Link from "next/link";
import { ArrowRight, AudioWaveform, Ear, Keyboard, Mic2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  ActivePracticeSession,
  type ActivePracticeMode,
} from "@/components/practice/active-practice-session";
import type { StudyZone } from "@/lib/daily-study/types";

export default async function PracticeLabPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    zone?: string | string[];
    mode?: string | string[];
  }>;
}>) {
  const params = await searchParams;
  const zone: StudyZone = params.zone === "new" ? "new" : "review";
  const mode: ActivePracticeMode | null =
    params.mode === "say" ||
    params.mode === "spell" ||
    params.mode === "dictation"
      ? params.mode
      : null;

  if (mode) {
    return (
      <AppShell
        title={zone === "new" ? "Active New Words" : "Active Review"}
        subtitle="Recall the whole entry, then rate your memory."
      >
        <ActivePracticeSession zone={zone} mode={mode} />
      </AppShell>
    );
  }

  const modules = [
    {
      title: "Say it",
      description: "See the meaning, then recall the word aloud.",
      icon: Mic2,
      mode: "say",
    },
    {
      title: "Spell it",
      description: "See the meaning and type the word from memory.",
      icon: Keyboard,
      mode: "spell",
    },
    {
      title: "Dictation",
      description: "Hear the word, write it, then check the meaning.",
      icon: Ear,
      mode: "dictation",
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
                Say it, spell it, or write what you hear. Choose one mode for this session.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.title}
                  href={`/practice-lab?zone=${zone}&mode=${module.mode}`}
                  className="mimi-focus-ring rounded-md border border-[#d8d1c2] bg-[#fffaf1] p-4 transition duration-200 ease-[var(--mimi-ease)] hover:-translate-y-0.5 hover:border-[var(--mimi-border-strong)]"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-md bg-[#eef0df] text-[#425f4a]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-[#203229]">{module.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5f6d62]">{module.description}</p>
                  <span className="mimi-pill mt-4 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold">
                    Start
                    <ArrowRight aria-hidden="true" className="size-3" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="mimi-panel-dark p-5">
          <h2 className="text-base font-semibold text-[var(--mimi-panel-dark-text)]">Choose one mode</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--mimi-panel-dark-muted)]">
            This session stays in {zone === "new" ? "New Words" : "Review"}. You can change the mode before starting.
          </p>
          <Link
            href="/study"
            className="mimi-button-secondary mimi-focus-ring mt-5 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
          >
            Back to Study
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </aside>
      </div>
    </AppShell>
  );
}
