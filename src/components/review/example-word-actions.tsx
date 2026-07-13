"use client";

import { BookPlus, Save, Sparkles, Volume2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PressableButton } from "@/components/ui/motion-primitives";
import type { VocabularyStorageMutation } from "@/components/vocabulary/use-vocabulary-data";
import { speakEnglishText } from "@/lib/ui/speech-synthesis";
import { findSelectedPersonVocabularyDuplicate } from "@/lib/vocabulary/context-word-actions";
import { segmentEnglishExample } from "@/lib/vocabulary/example-segmentation";
import { normalizeTextList } from "@/lib/vocabulary/normalize";
import { addVocabularyItem } from "@/lib/vocabulary/repository";
import type { LearningTrack, VocabularyData } from "@/lib/vocabulary/types";

type ExampleWordActionsProps = Readonly<{
  example: string;
  exampleIndex: number;
  sourceSurfaceText: string;
  data: VocabularyData;
  commit: (
    nextData: VocabularyData,
    mutation?: VocabularyStorageMutation,
  ) => Promise<VocabularyData>;
}>;

type SelectedWord = Readonly<{
  text: string;
  start: number;
  end: number;
}>;

function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Melbourne";
}

export function ExampleWordActions({
  example,
  exampleIndex,
  sourceSurfaceText,
  data,
  commit,
}: ExampleWordActionsProps) {
  const segments = useMemo(() => segmentEnglishExample(example), [example]);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftWord, setDraftWord] = useState("");
  const [draftMeaning, setDraftMeaning] = useState("");
  const [draftExample, setDraftExample] = useState(example);
  const [draftTrack, setDraftTrack] = useState<LearningTrack>("recognition");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const duplicate = useMemo(
    () =>
      selectedWord
        ? findSelectedPersonVocabularyDuplicate(data, draftWord)
        : null,
    [data, draftWord, selectedWord],
  );

  useEffect(() => {
    if (!selectedWord) {
      triggerButtonRef.current?.focus();
      triggerButtonRef.current = null;
      return;
    }

    closeButtonRef.current?.focus();
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedWord(null);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [selectedWord]);

  const openWordActions = (word: SelectedWord, trigger: HTMLButtonElement) => {
    triggerButtonRef.current = trigger;
    setSelectedWord(word);
    setShowAddForm(false);
    setDraftWord(word.text);
    setDraftMeaning("");
    setDraftExample(example);
    setDraftTrack("recognition");
    setMessage("");
    setIsSaving(false);
  };

  const closeWordActions = () => {
    setSelectedWord(null);
    setShowAddForm(false);
    setMessage("");
  };

  const listen = () => {
    if (!selectedWord) {
      return;
    }

    const result = speakEnglishText(selectedWord.text);
    setMessage(
      result.status === "unsupported"
        ? "Speech is not available in this browser."
        : result.status === "spoken"
          ? `Playing “${result.spokenText}”.`
          : "Choose a word to hear it.",
    );
  };

  const saveToLearning = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedWord || duplicate || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    const now = new Date().toISOString();
    const timezone = detectTimezone();
    const input = {
      surfaceText: draftWord,
      meaningZh: draftMeaning,
      meaningsZh: normalizeTextList(draftMeaning),
      example: draftExample,
      examples: normalizeTextList(draftExample),
      notes: "",
      rarityScore: null,
      learningTrack: draftTrack,
      tags: null,
      source: "manual" as const,
      createdAt: now,
      timezone,
    };

    try {
      const result = addVocabularyItem(data, input, now);
      await commit(result.data, {
        type: "vocabulary.add",
        input,
        now,
        timezone,
      });
      setShowAddForm(false);
      setMessage(
        `Added “${result.item.surfaceText}” to ${result.item.learningTrack === "active" ? "Active" : "Recognition"}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add this word.");
    } finally {
      setIsSaving(false);
    }
  };

  const dialog =
    selectedWord && typeof document !== "undefined"
      ? createPortal(
          <div
            data-card-toggle-ignore="true"
            className="fixed inset-0 z-[70] flex items-end bg-[#14251d]/48 px-3 pt-8 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-6"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                closeWordActions();
              }
            }}
          >
            <section
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="mimi-card max-h-[88dvh] w-full overflow-y-auto rounded-b-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_24px_70px_rgb(20_37_29/0.28)] sm:max-w-lg sm:rounded-lg sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mimi-text-muted)]">
                    Word in context
                  </p>
                  <h3 id={titleId} className="mt-1 text-2xl font-semibold text-[var(--mimi-text)]">
                    {selectedWord.text}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--mimi-text-soft)]">
                    Example {exampleIndex + 1} · from {sourceSurfaceText}
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeWordActions}
                  aria-label="Close word actions"
                  className="mimi-button-secondary mimi-focus-ring grid size-11 shrink-0 place-items-center"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>

              <p className="mt-4 rounded-md bg-[var(--mimi-surface-muted)] px-3 py-2 text-sm leading-6 text-[var(--mimi-text-soft)]">
                {example}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <PressableButton
                  type="button"
                  onClick={listen}
                  className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-center gap-2 px-3 text-sm font-semibold"
                >
                  <Volume2 aria-hidden="true" className="size-4" />
                  Listen
                </PressableButton>
                <PressableButton
                  type="button"
                  disabled
                  aria-describedby={`${titleId}-ai-resting`}
                  className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-center gap-2 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Sparkles aria-hidden="true" className="size-4" />
                  AI explain
                </PressableButton>
                <PressableButton
                  type="button"
                  onClick={() => {
                    setShowAddForm(true);
                    setMessage("");
                  }}
                  className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-center gap-2 px-3 text-sm font-semibold"
                >
                  <BookPlus aria-hidden="true" className="size-4" />
                  Add to learning
                </PressableButton>
              </div>

              <p id={`${titleId}-ai-resting`} className="mt-2 text-xs leading-5 text-[var(--mimi-text-muted)]">
                AI explanation is resting for now.
              </p>

              {showAddForm ? (
                <form className="mt-4 grid gap-3 border-t border-[var(--mimi-border)] pt-4" onSubmit={saveToLearning}>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-[var(--mimi-text)]">Word or phrase</span>
                    <input
                      required
                      value={draftWord}
                      onChange={(event) => setDraftWord(event.target.value)}
                      className="mimi-input px-3 text-base"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-[var(--mimi-text)]">Chinese meaning</span>
                    <input
                      value={draftMeaning}
                      onChange={(event) => setDraftMeaning(event.target.value)}
                      placeholder="可在保存前填写或修改"
                      className="mimi-input px-3 text-base"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-[var(--mimi-text)]">Example</span>
                    <textarea
                      rows={3}
                      value={draftExample}
                      onChange={(event) => setDraftExample(event.target.value)}
                      className="mimi-input min-h-24 resize-y px-3 py-2 text-base"
                    />
                  </label>
                  <fieldset>
                    <legend className="text-sm font-semibold text-[var(--mimi-text)]">Learning Track</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(["recognition", "active"] as const).map((track) => (
                        <label
                          key={track}
                          className="mimi-button-secondary flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-semibold"
                        >
                          <input
                            type="radio"
                            name={`${titleId}-track`}
                            checked={draftTrack === track}
                            onChange={() => setDraftTrack(track)}
                          />
                          {track === "recognition" ? "Recognition" : "Active"}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {duplicate ? (
                    <p className="rounded-md bg-[var(--mimi-surface-muted)] px-3 py-2 text-sm text-[var(--mimi-text-soft)]">
                      Already in Library{duplicate.status === "archived" ? " (archived)" : ""}.
                    </p>
                  ) : null}

                  <PressableButton
                    type="submit"
                    disabled={Boolean(duplicate) || isSaving}
                    className="mimi-button mimi-focus-ring inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <Save aria-hidden="true" className="size-4" />
                    {isSaving ? "Saving..." : "Save to learning"}
                  </PressableButton>
                </form>
              ) : null}

              {message ? (
                <p aria-live="polite" className="mt-3 rounded-md bg-[var(--mimi-primary-soft)] px-3 py-2 text-sm text-[var(--mimi-primary-deep)]">
                  {message}
                </p>
              ) : null}
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--mimi-text-soft)]">
        {segments.map((segment) =>
          segment.isActionable ? (
            <button
              key={`${segment.start}-${segment.end}`}
              type="button"
              data-card-toggle-ignore="true"
              onClick={(event) => {
                event.stopPropagation();
                openWordActions(segment, event.currentTarget);
              }}
              className="mimi-focus-ring rounded-[3px] px-0.5 text-inherit underline decoration-dotted decoration-[var(--mimi-border-strong)] underline-offset-2 transition hover:bg-[var(--mimi-primary-soft)] hover:text-[var(--mimi-primary-deep)]"
              aria-label={`Actions for ${segment.text}`}
            >
              {segment.text}
            </button>
          ) : (
            <span key={`${segment.start}-${segment.end}`}>{segment.text}</span>
          ),
        )}
      </p>
      {dialog}
    </>
  );
}
