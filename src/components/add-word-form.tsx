"use client";

import { CalendarClock, ChevronDown, Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";
import { addVocabularyItem } from "@/lib/vocabulary/repository";
import { normalizeRarityScore } from "@/lib/vocabulary/normalize";

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function AddWordForm() {
  const { data, commit } = useVocabularyData();
  const [addedAt, setAddedAt] = useState("");
  const [timezone, setTimezone] = useState("Detecting");
  const [showAddedTime, setShowAddedTime] = useState(false);
  const [rarityScore, setRarityScore] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAddedAt(toDateTimeLocalValue(new Date()));
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const now = new Date().toISOString();

    try {
      const result = addVocabularyItem(
        data,
        {
          surfaceText: String(formData.get("word_or_phrase") ?? ""),
          meaningZh: String(formData.get("meaning_zh") ?? ""),
          example: String(formData.get("example") ?? ""),
          notes: String(formData.get("notes") ?? ""),
          rarityScore: normalizeRarityScore(rarityScore),
          source: "manual",
          createdAt: addedAt ? new Date(addedAt).toISOString() : now,
          timezone,
        },
        now,
      );

      commit(result.data);
      form.reset();
      setRarityScore("");
      setAddedAt(toDateTimeLocalValue(new Date()));
      setMessage(`已保存 ${result.item.surfaceText}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    }
  };

  return (
    <form className="grid gap-4" aria-label="Add word" onSubmit={handleSubmit}>
      <label className="grid gap-2">
        <span className="text-sm font-medium">Word or phrase</span>
        <input
          name="word_or_phrase"
          required
          placeholder="allocate"
          className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium">中文释义</span>
        <input
          name="meaning_zh"
          placeholder="分配"
          className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium">Example</span>
        <textarea
          name="example"
          rows={3}
          placeholder="The tutor allocated extra practice time."
          className="min-h-24 resize-y rounded-md border border-[#d7d4ca] bg-white px-3 py-2 text-base outline-none focus:border-[#517056]"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium">Notes</span>
        <textarea
          name="notes"
          rows={2}
          className="min-h-20 resize-y rounded-md border border-[#d7d4ca] bg-white px-3 py-2 text-base outline-none focus:border-[#517056]"
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Self-rated rarity</legend>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <label
              key={score}
              className="flex min-h-11 items-center justify-center rounded-md border border-[#d7d4ca] bg-white text-sm font-medium has-checked:border-[#517056] has-checked:bg-[#edf4ef]"
            >
              <input
                className="sr-only"
                name="rarity_score"
                type="radio"
                value={score}
                checked={rarityScore === String(score)}
                onChange={(event) => setRarityScore(event.target.value)}
              />
              {score}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => setShowAddedTime((current) => !current)}
        className="inline-flex min-h-11 items-center justify-between rounded-md border border-[#d7d4ca] bg-white px-3 text-sm font-medium text-[#464640]"
      >
        <span className="inline-flex items-center gap-2">
          <CalendarClock aria-hidden="true" className="size-4" />
          修改添加时间
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition ${showAddedTime ? "rotate-180" : ""}`}
        />
      </button>

      {showAddedTime ? (
        <div className="grid gap-4 rounded-md border border-[#d7d4ca] bg-white p-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Created at</span>
            <input
              name="created_at"
              type="datetime-local"
              value={addedAt}
              onChange={(event) => setAddedAt(event.target.value)}
              className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Timezone</span>
            <input
              name="timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
            />
          </label>
        </div>
      ) : null}

      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#517056] px-4 text-sm font-semibold text-white"
      >
        <Save aria-hidden="true" className="size-4" />
        保存
      </button>

      {message ? <p className="text-sm text-[#517056]">{message}</p> : null}
    </form>
  );
}
