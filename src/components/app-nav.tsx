"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useState } from "react";
import { BrandIdentity } from "@/components/brand-identity";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  appNavItems,
  mobileMoreItem,
  mobileMoreNavItems,
  mobilePrimaryNavItems,
} from "@/lib/stage-two-data";

function isActiveRoute(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function DesktopSidebar() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <aside className="mimi-rail hidden w-[248px] shrink-0 border-r px-4 py-5 lg:flex lg:flex-col">
      <Link
        href="/"
        className="mimi-brand-home-button mimi-focus-ring block rounded-md"
        aria-label="Go to dashboard"
      >
        <BrandIdentity variant="sidebar" />
      </Link>

      <nav className="mt-8 grid gap-1" aria-label="Main">
        {appNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`mimi-focus-ring group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition duration-200 ease-[var(--mimi-ease)] ${
                active
                  ? "bg-[var(--mimi-primary-soft)] text-[var(--mimi-primary-deep)] shadow-[0_12px_28px_rgb(15_27_21/0.16)]"
                  : "text-[var(--mimi-rail-soft)] hover:-translate-y-0.5 hover:bg-[var(--mimi-nav-hover-bg)] hover:text-[var(--mimi-rail-strong)] hover:shadow-[0_12px_24px_rgb(9_16_12/0.14)]"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="desktop-nav-active"
                  transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-[var(--mimi-primary)]"
                />
              ) : null}
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-md border border-[var(--mimi-brand-border)] bg-[var(--mimi-rail-card-bg)] p-4 text-sm text-[var(--mimi-rail-soft)]">
        <p className="font-semibold text-[var(--mimi-rail-strong)]">Small steps today.</p>
        <p className="mt-1 leading-6 text-[var(--mimi-rail-muted)]">Review gently, remember deeply.</p>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = mobileMoreNavItems.some((item) => isActiveRoute(pathname, item.href));
  const MoreIcon = mobileMoreItem.icon;

  return (
    <>
      <nav
        className="mimi-mobile-nav fixed inset-x-0 bottom-0 z-20 border-t px-2 pt-2 backdrop-blur lg:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1">
          {mobilePrimaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={`mimi-focus-ring relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold transition duration-200 ease-[var(--mimi-ease)] ${
                  active ? "text-[var(--mimi-primary-deep)]" : "text-[var(--mimi-text-soft)] hover:-translate-y-0.5 hover:bg-[var(--mimi-primary-soft)] hover:text-[var(--mimi-primary-deep)]"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="mobile-nav-active"
                    transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-x-1 inset-y-1 rounded-md bg-[var(--mimi-primary-soft)]"
                  />
                ) : null}
                <span className="relative z-10">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            title={mobileMoreItem.label}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-current={moreActive ? "page" : undefined}
            onClick={() => setMoreOpen(true)}
            className={`mimi-focus-ring relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold transition duration-200 ease-[var(--mimi-ease)] ${
              moreActive || moreOpen
                ? "text-[var(--mimi-primary-deep)]"
                : "text-[var(--mimi-text-soft)] hover:-translate-y-0.5 hover:bg-[var(--mimi-primary-soft)] hover:text-[var(--mimi-primary-deep)]"
            }`}
          >
            {moreActive || moreOpen ? (
              <motion.span
                layoutId="mobile-nav-active"
                transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-x-1 inset-y-1 rounded-md bg-[var(--mimi-primary-soft)]"
              />
            ) : null}
            <span className="relative z-10">
              <MoreIcon aria-hidden="true" className="size-5" />
            </span>
            <span className="relative z-10">{mobileMoreItem.label}</span>
          </button>
        </div>
      </nav>

      <ResponsiveDialog
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        labelledBy="mobile-more-title"
        panelClassName="sm:max-w-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mimi-text-muted)]">Navigate</p>
            <h2 id="mobile-more-title" className="mt-1 text-2xl font-semibold text-[var(--mimi-text)]">
              More
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setMoreOpen(false)}
            aria-label="Close More menu"
            className="mimi-button-secondary mimi-focus-ring grid size-11 shrink-0 place-items-center"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <nav className="mt-5 grid gap-2" aria-label="More destinations">
          {mobileMoreNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
                className={`mimi-focus-ring flex min-h-14 items-center gap-3 rounded-md border px-4 text-sm font-semibold transition duration-200 ease-[var(--mimi-ease)] ${
                  active
                    ? "border-[var(--mimi-primary)] bg-[var(--mimi-primary-soft)] text-[var(--mimi-primary-deep)]"
                    : "border-[var(--mimi-border)] bg-[var(--mimi-surface-strong)] text-[var(--mimi-text)] hover:border-[var(--mimi-border-strong)] hover:shadow-[var(--mimi-shadow-soft)]"
                }`}
              >
                <Icon aria-hidden="true" className="size-5 text-[var(--mimi-primary-dark)]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ResponsiveDialog>
    </>
  );
}
