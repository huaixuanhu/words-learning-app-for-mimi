import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SimplePanel } from "@/components/simple-panel";
import {
  defaultSessionLimit,
  primaryActions,
  sampleVocabulary,
} from "@/lib/stage-two-data";

export default function Home() {
  return (
    <AppShell title="今日入口" subtitle="Stage 2 minimal scaffold">
      <div className="grid gap-4 md:grid-cols-3">
        {primaryActions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-md border border-[#dfddd6] bg-white p-4 hover:border-[#b9c7b5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#517056]"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-md bg-[#edf4ef] text-[#517056]">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <p className="text-lg font-semibold">{action.label}</p>
              <p className="mt-1 text-sm text-[#66645c]">{action.detail}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <SimplePanel title="Queue">
          <dl className="grid grid-cols-3 gap-3">
            <div className="rounded-md bg-[#f8f7f4] p-3">
              <dt className="text-xs font-medium text-[#66645c]">New</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {sampleVocabulary.filter((item) => item.status === "new").length}
              </dd>
            </div>
            <div className="rounded-md bg-[#f8f7f4] p-3">
              <dt className="text-xs font-medium text-[#66645c]">Learning</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {
                  sampleVocabulary.filter((item) => item.status === "learning")
                    .length
                }
              </dd>
            </div>
            <div className="rounded-md bg-[#f8f7f4] p-3">
              <dt className="text-xs font-medium text-[#66645c]">Limit</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {defaultSessionLimit}
              </dd>
            </div>
          </dl>
        </SimplePanel>

        <SimplePanel title="Next">
          <div className="space-y-3">
            {sampleVocabulary.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-[#eeeae1] px-3 py-2"
              >
                <p className="font-medium">{item.surfaceText}</p>
                <p className="text-sm text-[#66645c]">{item.meaningZh}</p>
              </div>
            ))}
          </div>
        </SimplePanel>
      </div>
    </AppShell>
  );
}
