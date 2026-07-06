"use client";

import { CalendarClock, ChevronDown, Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";
import { normalizeRarityScore } from "@/lib/vocabulary/normalize";
import { addVocabularyItem } from "@/lib/vocabulary/repository";
import type { NewVocabularyInput } from "@/lib/vocabulary/types";
import { PressableButton } from "@/components/ui/motion-primitives";

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const now = new Date().toISOString();

    try {
      const input: NewVocabularyInput = {
        surfaceText: String(formData.get("word_or_phrase") ?? ""),
        meaningZh: String(formData.get("meaning_zh") ?? ""),
        example: String(formData.get("example") ?? ""),
        notes: String(formData.get("notes") ?? ""),
        rarityScore: normalizeRarityScore(rarityScore),
        source: "manual",
        createdAt: addedAt ? new Date(addedAt).toISOString() : now,
        timezone,
      };
      const result = addVocabularyItem(data, input, now);

      await commit(result.data, {
        type: "vocabulary.add",
        input,
        now,
        timezone,
      });
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
        <span className="text-sm font-semibold text-[#203229]">Word or phrase</span>
        <input
          name="word_or_phrase"
          required
          placeholder="allocate"
          className="mimi-input px-3 text-base"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-[#203229]">中文释义</span>
        <input
          name="meaning_zh"
          placeholder="分配"
          className="mimi-input px-3 text-base"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-[#203229]">Example</span>
        <textarea
          name="example"
          rows={3}
          placeholder="The tutor allocated extra practice time."
          className="mimi-input min-h-24 resize-y px-3 py-2 text-base"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-[#203229]">Notes</span>
        <textarea
          name="notes"
          rows={2}
          className="mimi-input min-h-20 resize-y px-3 py-2 text-base"
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-[#203229]">Self-rated rarity</legend>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <label
              key={score}
              className="mimi-focus-ring flex min-h-11 items-center justify-center rounded-md border border-[#d8d1c2] bg-[#fffaf1] text-sm font-semibold text-[#203229] transition has-checked:border-[#5f7d66] has-checked:bg-[#d9e5d5]"
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

      <PressableButton
        type="button"
        onClick={() => setShowAddedTime((current) => !current)}
        className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-between px-3 text-sm font-semibold"
      >
        <span className="inline-flex items-center gap-2">
          <CalendarClock aria-hidden="true" className="size-4" />
          修改添加时间
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition ${showAddedTime ? "rotate-180" : ""}`}
        />
      </PressableButton>

      {showAddedTime ? (
        <div className="grid gap-4 rounded-md border border-[#d8d1c2] bg-[#efe9dc] p-3">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#203229]">Created at</span>
            <input
              name="created_at"
              type="datetime-local"
              value={addedAt}
              onChange={(event) => setAddedAt(event.target.value)}
              className="mimi-input px-3 text-base"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#203229]">Timezone</span>
            <input
              name="timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="mimi-input px-3 text-base"
            />
          </label>
        </div>
      ) : null}

      <PressableButton
        type="submit"
        className="mimi-button mimi-focus-ring inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
      >
        <Save aria-hidden="true" className="size-4" />
        保存
      </PressableButton>

      {message ? <p className="rounded-md bg-[#d9e5d5] px-3 py-2 text-sm text-[#274331]">{message}</p> : null}
    </form>
  );
}
