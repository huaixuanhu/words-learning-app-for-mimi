"use client";

import { Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MimiTheme } from "@/components/theme-provider";
import { useMimiTheme } from "@/components/theme-provider";

const themeOptions: Array<{
  value: MimiTheme;
  label: string;
  icon: LucideIcon;
}> = [
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
  },
  {
    value: "light",
    label: "Light",
    icon: Sun,
  },
];

export function ThemeSettingsForm() {
  const { theme, setTheme } = useMimiTheme();

  return (
    <div className="grid gap-3 md:max-w-xl">
      <div className="grid gap-3 sm:grid-cols-2" aria-label="Theme">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const active = theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTheme(option.value)}
              className={`mimi-focus-ring mimi-card-interactive min-h-24 rounded-md border p-4 text-left transition duration-200 ease-[var(--mimi-ease)] ${
                active
                  ? "border-[var(--mimi-primary)] bg-[var(--mimi-primary-soft)] text-[var(--mimi-primary-deep)] shadow-[0_14px_30px_rgb(31_47_38/0.14)]"
                  : "border-[var(--mimi-border)] bg-[var(--mimi-surface-strong)] text-[var(--mimi-text)] hover:border-[var(--mimi-border-strong)]"
              }`}
            >
              <span className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--mimi-surface)] text-[var(--mimi-primary-deep)] shadow-[inset_0_0_0_1px_var(--mimi-border)]">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="text-base font-semibold">{option.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-sm leading-6 text-[var(--mimi-text-soft)]">This device only.</p>
    </div>
  );
}
