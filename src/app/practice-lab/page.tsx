import Link from "next/link";
import { ArrowRight, AudioWaveform, Ear, PenLine, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function PracticeLabPage() {
  const modules = [
    {
      title: "Dictation",
      titleZh: "听写",
      description: "Hear the word and write it back.",
      icon: Ear,
    },
    {
      title: "Spelling",
      titleZh: "拼写",
      description: "Practice exact letters for higher-risk words.",
      icon: Sparkles,
    },
    {
      title: "Writing usage",
      titleZh: "写作运用",
      description: "Use active words inside short sentences.",
      icon: PenLine,
    },
  ] as const;

  return (
    <AppShell title="练习室" subtitle="A quiet space reserved for Active Vocabulary practice.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <section className="mimi-panel p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-[#d9e5d5] text-[#274331]">
              <AudioWaveform aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-[#879087]">Practice Lab</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#203229]">Active Vocabulary / 输出词汇</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f6d62]">
                Dictation, spelling, sentence recall, and writing feedback are planned here after V1. This screen reserves the learning architecture without changing current study data.
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
                  <p className="mimi-cjk mt-1 text-sm font-semibold text-[#425f4a]">{module.titleZh}</p>
                  <p className="mt-3 text-sm leading-6 text-[#5f6d62]">{module.description}</p>
                  <span className="mimi-pill mt-4 inline-flex px-2 py-1 text-xs font-semibold">Prepared</span>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="mimi-panel-dark p-5">
          <h2 className="text-base font-semibold text-[var(--mimi-panel-dark-text)]">Quiet for now</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--mimi-panel-dark-muted)]">
            Current daily progress remains in Review. The lab will stay calm until active-practice work is approved later.
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
