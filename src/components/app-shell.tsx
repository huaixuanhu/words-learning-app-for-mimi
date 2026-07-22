import Link from "next/link";
import type { ReactNode } from "react";
import { DesktopSidebar, MobileBottomNav } from "@/components/app-nav";
import { BrandIdentity } from "@/components/brand-identity";

type AppShellProps = {
  title: string;
  children: ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
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

          <main className="mimi-main-content mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
            <div className="mimi-page-heading mb-6">
              <h1 className="mimi-display-title text-4xl sm:text-5xl">{title}</h1>
            </div>
            {children}
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
