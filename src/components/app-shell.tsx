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
          <header className="mimi-mobile-header border-b px-4 py-4 lg:hidden">
            <Link
              href="/"
              className="mimi-brand-home-button mimi-focus-ring inline-flex rounded-md"
              aria-label="Go to dashboard"
            >
              <BrandIdentity variant="mobile" />
            </Link>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            <div className="mimi-page-heading mb-6">
              <p className="mimi-page-kicker text-sm font-medium">Calm mind. Clear words.</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">{title}</h1>
              {subtitle ? (
                <p className="mimi-page-copy mt-3 max-w-2xl text-sm leading-6">
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
