"use client";

import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";
import { getSelectedPersonId } from "@/lib/people/repository";
import {
  DEFAULT_SESSION_LIMIT,
  getSelectedReviewSettings,
  normalizeSessionLimit,
  updateReviewSettings,
} from "@/lib/review/settings";

function detectTimezone(fallback: string) {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function ReviewSettingsForm() {
  const { data, isLoaded, commit } = useVocabularyData();
  const [message, setMessage] = useState("");
  const selectedPersonId = getSelectedPersonId(data);
  const settings = getSelectedReviewSettings(data);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const input = {
      sessionLimit: normalizeSessionLimit(String(formData.get("session_limit") ?? "")),
      timezone: String(formData.get("timezone") ?? ""),
    };
    const nextData = updateReviewSettings(data, input, now);

    try {
      await commit(nextData, {
        type: "reviewSettings.update",
        input,
        now,
        timezone: input.timezone,
      });
      setMessage(`已保存，每次最多复习 ${getSelectedReviewSettings(nextData).sessionLimit} 张卡片`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "设置保存失败");
    }
  };

  return (
    <form
      key={`${selectedPersonId}-${settings.updatedAt}-${isLoaded ? "loaded" : "loading"}`}
      className="grid gap-4 md:max-w-md"
      onSubmit={handleSubmit}
    >
      <label className="grid gap-2">
        <span className="text-sm font-medium">Daily session limit</span>
        <input
          name="session_limit"
          type="number"
          min={1}
          max={80}
          defaultValue={isLoaded ? settings.sessionLimit : DEFAULT_SESSION_LIMIT}
          className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium">Timezone</span>
        <input
          name="timezone"
          defaultValue={isLoaded ? settings.timezone : detectTimezone(settings.timezone)}
          className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
        />
      </label>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#517056] px-4 text-sm font-semibold text-white"
      >
        <Save aria-hidden="true" className="size-4" />
        保存设置
      </button>
      {message ? <p className="text-sm text-[#517056]">{message}</p> : null}
    </form>
  );
}
