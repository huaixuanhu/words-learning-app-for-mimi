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
  detail: string;
  previewLabel: string;
  icon: LucideIcon;
};

const soundRows: SoundRow[] = [
  {
    key: "button",
    title: "Button sound",
    detail: "Soft tactile click for normal app buttons.",
    previewLabel: "试听按键音",
    icon: Volume2,
  },
  {
    key: "reviewComplete",
    title: "Review complete",
    detail: "Mimi custom sound after today's review task is confirmed.",
    previewLabel: "试听复习完成音",
    icon: Volume2,
  },
];

export function SoundSettingsForm() {
  const { settings, setButtonSound, setReviewCompleteSound } = useMimiSound();
  const [status, setStatus] = useState("音效偏好只保存在本机浏览器。");

  const setEnabled = (key: SoundRow["key"], enabled: boolean) => {
    if (key === "button") {
      setButtonSound(enabled);
    } else {
      setReviewCompleteSound(enabled);
    }

    setStatus(`${key === "button" ? "按键音效" : "复习完成音效"}已${enabled ? "开启" : "关闭"}。`);
  };

  const previewSound = async (key: SoundRow["key"]) => {
    try {
      if (key === "button") {
        await playSoftButtonClick();
        setStatus("已试听按键音效。");
      } else {
        await playReviewCompleteSound();
        setStatus("已试听复习完成音效。");
      }
    } catch {
      setStatus("浏览器暂时没有播放音效，请再点一次试听。");
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
                  <p className="mt-1 text-sm leading-6 text-[var(--mimi-text-soft)]">{row.detail}</p>
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
                          className={`mimi-focus-ring min-h-9 min-w-14 rounded-[6px] px-3 text-xs font-semibold transition duration-200 ease-[var(--mimi-ease)] ${
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
                    className="mimi-button-secondary mimi-focus-ring inline-grid size-10 place-items-center p-0"
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
      <p className="text-sm leading-6 text-[var(--mimi-text-soft)]">
        不会写入词库、复习记录、备份文件、API 或远程数据。
      </p>
    </div>
  );
}
