import Link from "next/link";
import type { ReactNode } from "react";
import { appNavItems } from "@/lib/stage-two-data";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[#f8f7f4] text-[#1d1d1b]">
      <header className="border-b border-[#dfddd6] bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="min-w-0" aria-label="Mimi words home">
            <p className="text-sm font-semibold tracking-[0.08em] text-[#517056]">
              MIMI PTE
            </p>
            <p className="truncate text-lg font-semibold">Words Learning</p>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {appNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-[#464640] hover:bg-[#f0eee8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#517056]"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 md:pb-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66645c]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 border-t border-[#dfddd6] bg-white md:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-5 px-2 py-2">
          {appNavItems.slice(0, 5).map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium text-[#464640] hover:bg-[#f0eee8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#517056]"
              >
                <Icon aria-hidden="true" className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
