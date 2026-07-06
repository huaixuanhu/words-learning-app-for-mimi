"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { BrandIdentity } from "@/components/brand-identity";
import { appNavItems } from "@/lib/stage-two-data";

function isActiveRoute(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function DesktopSidebar() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <aside className="hidden w-[248px] shrink-0 border-r border-white/10 bg-[#1d2c26]/92 px-4 py-5 text-[#f7f2e8] shadow-[18px_0_50px_rgb(9_16_12/0.16)] lg:flex lg:flex-col">
      <Link href="/" className="mimi-focus-ring block rounded-md" aria-label="Mimi words home">
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
                  ? "bg-[#d9e5d5] text-[#203229] shadow-[0_12px_28px_rgb(15_27_21/0.16)]"
                  : "text-[#dfe6d9] hover:-translate-y-0.5 hover:bg-white/10 hover:text-white hover:shadow-[0_12px_24px_rgb(9_16_12/0.14)]"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="desktop-nav-active"
                  transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-[#5f7d66]"
                />
              ) : null}
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-md border border-[#afbea9]/24 bg-white/[0.07] p-4 text-sm text-[#dfe6d9]">
        <p className="font-semibold text-[#fbf7ee]">Small steps today.</p>
        <p className="mt-1 leading-6 text-[#c8d2c4]">Review gently, remember deeply.</p>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[#d8d1c2]/80 bg-[#fbf7ee]/96 px-2 py-2 shadow-[0_-18px_42px_rgb(31_47_38/0.16)] backdrop-blur md:hidden"
      aria-label="Mobile"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1">
        {appNavItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`mimi-focus-ring relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold transition duration-200 ease-[var(--mimi-ease)] ${
                active ? "text-[#274331]" : "text-[#6c766c] hover:-translate-y-0.5 hover:bg-[#e9efdf] hover:text-[#274331]"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="mobile-nav-active"
                  transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-2 inset-y-1 rounded-md bg-[#d9e5d5]"
                />
              ) : null}
              <span className="relative z-10">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
