import Link from "next/link";
import type { ReactNode } from "react";
import { DesktopSidebar, MobileBottomNav } from "@/components/app-nav";
import { BrandIdentity } from "@/components/brand-identity";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="mimi-shell">
      <div className="min-h-dvh lg:flex">
        <DesktopSidebar />

        <div className="min-w-0 flex-1">
          <header className="border-b border-white/10 bg-[#1d2c26]/92 px-4 py-4 text-[#fbf7ee] lg:hidden">
            <Link href="/" className="mimi-focus-ring inline-flex rounded-md" aria-label="Mimi words home">
              <BrandIdentity variant="mobile" />
            </Link>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            <div className="mb-6 text-[#fbf7ee]">
              <p className="text-sm font-medium text-[#c8d2c4]">Calm mind. Clear words.</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">{title}</h1>
              {subtitle ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#dfe6d9]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {children}
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
