import Link from "next/link";
import { ArrowRight, AudioWaveform, Ear, Keyboard, Mic2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  ActivePracticeSession,
  type ActivePracticeMode,
} from "@/components/practice/active-practice-session";
import { LearningZoneTabs } from "@/components/study/learning-zone-tabs";
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
      <AppShell title={zone === "new" ? "Active New Learning" : "Active Review"}>
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
    <AppShell title="Practice Lab">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <section className="mimi-panel p-5 sm:p-6">
          <div className="mb-6">
            <LearningZoneTabs
              zone={zone}
              reviewHref="/practice-lab?zone=review"
              newLearningHref="/practice-lab?zone=new"
              label="Active learning zone"
            />
          </div>
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-[#d9e5d5] text-[#274331]">
              <AudioWaveform aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h2 className="mimi-display-title text-3xl text-[#203229]">Active Vocabulary</h2>
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
                  <h3 className="mimi-display-title mt-4 text-xl text-[#203229]">{module.title}</h3>
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
          <h2 className="mimi-display-title text-xl text-[var(--mimi-panel-dark-text)]">
            {zone === "new" ? "New Learning" : "Review"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--mimi-panel-dark-muted)]">
            Choose a mode for this session.
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
