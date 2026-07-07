"use client";

import Link from "next/link";
import { Archive, Download, RotateCcw, Save, Search, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import type { UpdateVocabularyInput, VocabularyItem } from "@/lib/vocabulary/types";
import {
  archiveVocabularyItem,
  getActiveVocabularyItems,
  getActiveTrackVocabularyItems,
  getArchivedVocabularyItems,
  getRecognitionVocabularyItems,
  getVocabularyItemsForSelectedPerson,
  restoreVocabularyItem,
  updateVocabularyItem,
} from "@/lib/vocabulary/repository";
import {
  VOCABULARY_TAGS,
  normalizeRarityScore,
  normalizeSurfaceText,
  normalizeVocabularyTags,
} from "@/lib/vocabulary/normalize";
import { useVocabularyData } from "./use-vocabulary-data";
import { PressableButton } from "@/components/ui/motion-primitives";

type LibraryFilter = "all" | "recognition" | "activeVocabulary" | "weak" | "archived";

type EditDraft = Pick<
  VocabularyItem,
  "surfaceText" | "meaningZh" | "example" | "notes" | "learningTrack" | "tags" | "createdAt" | "timezone"
> & {
  rarityScore: string;
};

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function createDraft(item: VocabularyItem): EditDraft {
  return {
    surfaceText: item.surfaceText,
    meaningZh: item.meaningZh,
    example: item.example,
    notes: item.notes,
    learningTrack: item.learningTrack,
    tags: item.tags,
    rarityScore: item.rarityScore?.toString() ?? "",
    createdAt: toDateTimeLocalValue(item.createdAt),
    timezone: item.timezone,
  };
}

function toIsoFromLocalDateTime(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  return new Date(value).toISOString();
}

function detectTimezone(fallback = "Australia/Melbourne") {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function VocabularyLibrary() {
  const { data, isLoaded, commit } = useVocabularyData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [message, setMessage] = useState("");

  const allItems = getVocabularyItemsForSelectedPerson(data);
  const activeItems = getActiveVocabularyItems(data);
  const recognitionItems = getRecognitionVocabularyItems(data);
  const activeTrackItems = getActiveTrackVocabularyItems(data);
  const archivedItems = getArchivedVocabularyItems(data);
  const weakWordIds = useMemo(
    () => new Set(data.reviewStates.filter((state) => state.lapseCount > 0).map((state) => state.vocabularyItemId)),
    [data.reviewStates],
  );
  const filterTabs = [
    { value: "all", label: "All Words", count: allItems.length },
    { value: "recognition", label: "Recognition", count: recognitionItems.length },
    { value: "activeVocabulary", label: "Active", count: activeTrackItems.length },
    { value: "weak", label: "Weak Words", count: activeItems.filter((item) => weakWordIds.has(item.id)).length },
    { value: "archived", label: "Archived", count: archivedItems.length },
  ] as const satisfies readonly { value: LibraryFilter; label: string; count: number }[];

  const visibleItems = useMemo(() => {
    const sourceItems =
      filter === "recognition"
        ? recognitionItems
        : filter === "activeVocabulary"
          ? activeTrackItems
          : filter === "weak"
            ? activeItems.filter((item) => weakWordIds.has(item.id))
            : filter === "archived"
              ? archivedItems
              : allItems;
    const normalizedQuery = normalizeSurfaceText(query);

    if (!normalizedQuery) {
      return sourceItems;
    }

    return sourceItems.filter(
      (item) =>
        item.normalizedText.includes(normalizedQuery) ||
        item.meaningZh.includes(query.trim()) ||
        item.example.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    );
  }, [activeItems, activeTrackItems, allItems, archivedItems, filter, query, recognitionItems, weakWordIds]);

  const startEditing = (item: VocabularyItem) => {
    setEditingId(item.id);
    setDraft(createDraft(item));
    setMessage("");
  };

  const saveDraft = async () => {
    if (!editingId || !draft) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const input: UpdateVocabularyInput = {
        surfaceText: draft.surfaceText,
        meaningZh: draft.meaningZh,
        example: draft.example,
        notes: draft.notes,
        rarityScore: normalizeRarityScore(draft.rarityScore),
        learningTrack: draft.learningTrack,
        tags: normalizeVocabularyTags(draft.tags),
        createdAt: toIsoFromLocalDateTime(draft.createdAt),
        timezone: draft.timezone,
      };
      const result = updateVocabularyItem(data, editingId, input, now);

      await commit(result.data, {
        type: "vocabulary.update",
        vocabularyItemId: editingId,
        input,
        now,
        timezone: draft.timezone,
      });
      setEditingId(null);
      setDraft(null);
      setMessage(`已更新 ${result.item.surfaceText}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败");
    }
  };

  const archiveItem = async (id: string) => {
    const now = new Date().toISOString();

    try {
      await commit(archiveVocabularyItem(data, id, now), {
        type: "vocabulary.archive",
        vocabularyItemId: id,
        now,
        timezone: detectTimezone(),
      });
      setMessage("已归档词条");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "归档失败");
    }
  };

  const restoreItem = async (id: string) => {
    const now = new Date().toISOString();

    try {
      await commit(restoreVocabularyItem(data, id, now), {
        type: "vocabulary.restore",
        vocabularyItemId: id,
        now,
        timezone: detectTimezone(),
      });
      setMessage("已恢复词条");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "恢复失败");
    }
  };

  return (
    <div className="grid gap-4">
      <div className="mimi-panel p-4 sm:p-5">
        <div className="grid gap-4">
          <label className="relative grid gap-2">
            <span className="text-sm font-semibold text-[#203229]">Search</span>
            <Search aria-hidden="true" className="absolute bottom-3 left-3 size-4 text-[#5f6d62]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="word, meaning, example"
              className="mimi-input px-9 text-base"
            />
          </label>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Library filters">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                aria-pressed={filter === tab.value}
                className={`mimi-focus-ring rounded-md border px-3 py-2 text-sm font-semibold transition duration-200 ease-[var(--mimi-ease)] ${
                  filter === tab.value
                    ? "border-[var(--mimi-primary)] bg-[var(--mimi-primary-soft)] text-[var(--mimi-primary-deep)]"
                    : "border-[var(--mimi-border)] bg-[#fffaf1]/72 text-[#5f6d62] hover:-translate-y-0.5 hover:border-[var(--mimi-border-strong)] hover:text-[#274331]"
                }`}
              >
                {tab.label}
                <span className="ml-2 font-mono text-xs opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 rounded-md border border-[#d8d1c2] bg-[#fffaf1]/64 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-normal text-[#879087]">Soft tags</span>
              {["Recognition", "Active", ...VOCABULARY_TAGS].map((tag) => (
                <span key={tag} className="mimi-pill-muted px-2 py-1 text-xs font-semibold">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-normal text-[#879087]">Mastery</span>
              <span className="mimi-pill px-2 py-1 text-xs font-semibold">Meaning</span>
              {["Listening", "Spelling", "Usage"].map((tag) => (
                <span key={tag} className="mimi-pill-muted px-2 py-1 text-xs font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/import" className="mimi-button-secondary mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold">
              <Upload aria-hidden="true" className="size-4" />
              Input vocabulary
            </Link>
            <Link href="/export" className="mimi-button-secondary mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold">
              <Download aria-hidden="true" className="size-4" />
              Export
            </Link>
          </div>
        </div>

        {message ? <p className="mt-3 rounded-md bg-[#d9e5d5] px-3 py-2 text-sm text-[#274331]">{message}</p> : null}
      </div>

      <div className="mimi-panel overflow-hidden">
        <div className="border-b border-[#d8d1c2] px-4 py-3">
          <p className="text-sm text-[#5f6d62]">
            {isLoaded
              ? `${visibleItems.length} shown / ${allItems.length} total`
              : "Loading local vocabulary..."}
          </p>
        </div>

        {visibleItems.length ? (
          <div className="divide-y divide-[#e4dece]">
            {visibleItems.map((item) => {
              const isEditing = editingId === item.id && draft;

              return (
                <div key={item.id} className="grid gap-3 p-4 transition hover:bg-[#fffaf1]/72">
                  {isEditing ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1">
                          <span className="text-sm font-semibold text-[#203229]">Word or phrase</span>
                          <input
                            value={draft.surfaceText}
                            onChange={(event) => setDraft({ ...draft, surfaceText: event.target.value })}
                            className="mimi-input min-h-10 px-3"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-semibold text-[#203229]">中文释义</span>
                          <input
                            value={draft.meaningZh}
                            onChange={(event) => setDraft({ ...draft, meaningZh: event.target.value })}
                            className="mimi-input min-h-10 px-3"
                          />
                        </label>
                      </div>
                      <label className="grid gap-1">
                        <span className="text-sm font-semibold text-[#203229]">Example</span>
                        <textarea
                          rows={2}
                          value={draft.example}
                          onChange={(event) => setDraft({ ...draft, example: event.target.value })}
                          className="mimi-input min-h-20 px-3 py-2"
                        />
                      </label>
                      <fieldset className="grid gap-2">
                        <legend className="text-sm font-semibold text-[#203229]">Learning track</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {[
                            { value: "recognition", label: "Recognition / 阅读词汇" },
                            { value: "active", label: "Active / 输出词汇" },
                          ].map((track) => (
                            <label
                              key={track.value}
                              className="mimi-focus-ring flex min-h-11 items-center justify-center rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-3 text-sm font-semibold text-[#203229] transition has-checked:border-[#5f7d66] has-checked:bg-[#d9e5d5]"
                            >
                              <input
                                className="sr-only"
                                name={`learning_track_${item.id}`}
                                type="radio"
                                value={track.value}
                                checked={draft.learningTrack === track.value}
                                onChange={(event) =>
                                  setDraft({ ...draft, learningTrack: event.target.value as VocabularyItem["learningTrack"] })
                                }
                              />
                              {track.label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset className="grid gap-2">
                        <legend className="text-sm font-semibold text-[#203229]">Tags</legend>
                        <div className="flex flex-wrap gap-2">
                          {VOCABULARY_TAGS.map((tag) => (
                            <label
                              key={tag}
                              className="mimi-focus-ring flex min-h-9 items-center justify-center rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-3 text-xs font-semibold text-[#203229] transition has-checked:border-[#5f7d66] has-checked:bg-[#d9e5d5]"
                            >
                              <input
                                className="sr-only"
                                type="checkbox"
                                checked={draft.tags?.includes(tag) ?? false}
                                onChange={(event) => {
                                  const currentTags = draft.tags ?? [];
                                  const nextTags = event.target.checked
                                    ? [...currentTags, tag]
                                    : currentTags.filter((currentTag) => currentTag !== tag);

                                  setDraft({ ...draft, tags: nextTags.length ? nextTags : null });
                                }}
                              />
                              {tag}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="grid gap-1">
                          <span className="text-sm font-semibold text-[#203229]">Rarity</span>
                          <input
                            value={draft.rarityScore}
                            onChange={(event) => setDraft({ ...draft, rarityScore: event.target.value })}
                            type="number"
                            min={1}
                            max={5}
                            className="mimi-input min-h-10 px-3"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-semibold text-[#203229]">Created at</span>
                          <input
                            value={draft.createdAt}
                            onChange={(event) => setDraft({ ...draft, createdAt: event.target.value })}
                            type="datetime-local"
                            className="mimi-input min-h-10 px-3"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-semibold text-[#203229]">Timezone</span>
                          <input
                            value={draft.timezone}
                            onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}
                            className="mimi-input min-h-10 px-3"
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <PressableButton
                          type="button"
                          onClick={() => void saveDraft()}
                          className="mimi-button mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold"
                        >
                          <Save aria-hidden="true" className="size-4" />
                          保存
                        </PressableButton>
                        <PressableButton
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setDraft(null);
                          }}
                          className="mimi-button-secondary mimi-focus-ring px-3 text-sm font-semibold"
                        >
                          取消
                        </PressableButton>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="mimi-word-serif text-2xl text-[#203229]">{item.surfaceText}</h2>
                          <span className="mimi-pill px-2 py-1 text-xs font-semibold">
                            {item.source}
                          </span>
                          {!item.archivedAt ? (
                            <span className="mimi-pill px-2 py-1 text-xs font-semibold">
                              {item.learningTrack === "active" ? "Active" : "Recognition"}
                            </span>
                          ) : null}
                          {item.tags?.map((tag) => (
                            <span key={tag} className="mimi-pill px-2 py-1 text-xs font-semibold">
                              {tag}
                            </span>
                          ))}
                          {weakWordIds.has(item.id) ? (
                            <span className="rounded-md bg-[#efe0d1] px-2 py-1 text-xs font-semibold text-[#8a4d21]">
                              Weak Words
                            </span>
                          ) : null}
                          {item.archivedAt ? (
                            <span className="rounded-md bg-[#efe0d1] px-2 py-1 text-xs font-semibold text-[#8a4d21]">
                              archived
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-[#5f6d62]">{item.meaningZh || "No meaning yet"}</p>
                        {item.example ? <p className="mt-2 text-sm leading-6 text-[#203229]">{item.example}</p> : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="mimi-pill px-2 py-1 text-xs font-semibold">Meaning</span>
                          {item.learningTrack === "active" ? (
                            <>
                              <span className="mimi-pill px-2 py-1 text-xs font-semibold">Listening</span>
                              <span className="mimi-pill px-2 py-1 text-xs font-semibold">Spelling</span>
                              <span className="mimi-pill px-2 py-1 text-xs font-semibold">Usage</span>
                            </>
                          ) : (
                            <>
                              <span className="mimi-pill-muted px-2 py-1 text-xs font-semibold">Listening</span>
                              <span className="mimi-pill-muted px-2 py-1 text-xs font-semibold">Spelling</span>
                              <span className="mimi-pill-muted px-2 py-1 text-xs font-semibold">Usage</span>
                            </>
                          )}
                        </div>
                        <p className="mt-2 font-mono text-xs text-[#879087]">
                          created {item.createdAt} · system {item.systemCreatedAt}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-start gap-2 md:justify-end">
                        <PressableButton
                          type="button"
                          onClick={() => startEditing(item)}
                          className="mimi-button-secondary mimi-focus-ring px-3 text-sm font-semibold"
                        >
                          编辑
                        </PressableButton>
                        {item.archivedAt ? (
                          <PressableButton
                            type="button"
                            onClick={() => void restoreItem(item.id)}
                            className="mimi-button-secondary mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold"
                          >
                            <RotateCcw aria-hidden="true" className="size-4" />
                            恢复
                          </PressableButton>
                        ) : (
                          <PressableButton
                            type="button"
                            onClick={() => void archiveItem(item.id)}
                            className="mimi-button-secondary mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold"
                          >
                            <Archive aria-hidden="true" className="size-4" />
                            归档
                          </PressableButton>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-sm leading-6 text-[#5f6d62]">
            {isLoaded
              ? filter === "activeVocabulary"
                ? "还没有 Active Vocabulary 词条。可以从导入页添加输出词汇。"
                : "没有匹配的本地词条。"
              : "Loading..."}
          </p>
        )}
      </div>
    </div>
  );
}
