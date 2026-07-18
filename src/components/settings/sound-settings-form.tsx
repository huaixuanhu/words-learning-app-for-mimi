"use client";

import { Volume2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useMimiSound } from "@/components/sound-provider";
import { PressableButton } from "@/components/ui/motion-primitives";
import { playReviewCompleteSound, playSoftButtonClick } from "@/lib/ui/sound-player";

type SoundRow = {
  key: "button" | "reviewComplete";
  title: string;
  previewLabel: string;
  icon: LucideIcon;
};

const soundRows: SoundRow[] = [
  {
    key: "button",
    title: "Button sound",
    previewLabel: "Preview button sound",
    icon: Volume2,
  },
  {
    key: "reviewComplete",
    title: "Review complete",
    previewLabel: "Preview review-complete sound",
    icon: Volume2,
  },
];

export function SoundSettingsForm() {
  const { settings, setButtonSound, setReviewCompleteSound } = useMimiSound();
  const [status, setStatus] = useState("This device only.");

  const setEnabled = (key: SoundRow["key"], enabled: boolean) => {
    if (key === "button") {
      setButtonSound(enabled);
    } else {
      setReviewCompleteSound(enabled);
    }

    setStatus(`${key === "button" ? "Button sound" : "Review-complete sound"} is ${enabled ? "on" : "off"}.`);
  };

  const previewSound = async (key: SoundRow["key"]) => {
    try {
      if (key === "button") {
        await playSoftButtonClick();
        setStatus("Button sound played.");
      } else {
        await playReviewCompleteSound();
        setStatus("Review-complete sound played.");
      }
    } catch {
      setStatus("Sound did not play. Try the preview again.");
    }
  };

  return (
    <div className="grid gap-3 md:max-w-2xl">
      <div className="grid gap-3" aria-label="Sound">
        {soundRows.map((row) => {
          const enabled = settings[row.key];
          const Icon = row.icon;

          return (
            <div
              key={row.key}
              className="rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-strong)] p-3 sm:p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--mimi-text)]">{row.title}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div
                    className="grid grid-cols-2 rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface)] p-1"
                    aria-label={row.title}
                  >
                    {[true, false].map((option) => {
                      const active = enabled === option;

                      return (
                        <PressableButton
                          key={String(option)}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setEnabled(row.key, option)}
                          className={`mimi-focus-ring min-h-11 min-w-14 rounded-[6px] px-3 text-xs font-semibold transition duration-200 ease-[var(--mimi-ease)] ${
                            active
                              ? "bg-[var(--mimi-primary)] text-[var(--mimi-surface-strong)] shadow-[0_10px_20px_rgb(31_47_38/0.16)]"
                              : "text-[var(--mimi-text-soft)] hover:bg-[var(--mimi-primary-soft)] hover:text-[var(--mimi-primary-deep)]"
                          }`}
                        >
                          {option ? "ON" : "OFF"}
                        </PressableButton>
                      );
                    })}
                  </div>

                  <PressableButton
                    type="button"
                    data-mimi-sound-skip="true"
                    aria-label={row.previewLabel}
                    title={row.previewLabel}
                    onClick={() => void previewSound(row.key)}
                    className="mimi-button-secondary mimi-focus-ring inline-grid size-11 place-items-center p-0"
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </PressableButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-sm leading-6 text-[var(--mimi-text-soft)]">{status}</p>
    </div>
  );
}
