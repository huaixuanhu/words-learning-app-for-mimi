"use client";

import { Archive, RotateCcw, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { VocabularyItem } from "@/lib/vocabulary/types";
import {
  archiveVocabularyItem,
  getActiveVocabularyItems,
  getArchivedVocabularyItems,
  getVocabularyItemsForSelectedPerson,
  restoreVocabularyItem,
  updateVocabularyItem,
} from "@/lib/vocabulary/repository";
import { normalizeRarityScore, normalizeSurfaceText } from "@/lib/vocabulary/normalize";
import { useVocabularyData } from "./use-vocabulary-data";

type LibraryFilter = "active" | "archived" | "all";

type EditDraft = Pick<
  VocabularyItem,
  "surfaceText" | "meaningZh" | "example" | "notes" | "createdAt" | "timezone"
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

export function VocabularyLibrary() {
  const { data, isLoaded, commit } = useVocabularyData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("active");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [message, setMessage] = useState("");

  const visibleItems = useMemo(() => {
    const sourceItems =
      filter === "active"
        ? getActiveVocabularyItems(data)
        : filter === "archived"
          ? getArchivedVocabularyItems(data)
          : getVocabularyItemsForSelectedPerson(data);
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
  }, [data, filter, query]);

  const startEditing = (item: VocabularyItem) => {
    setEditingId(item.id);
    setDraft(createDraft(item));
    setMessage("");
  };

  const saveDraft = () => {
    if (!editingId || !draft) {
      return;
    }

    try {
      const result = updateVocabularyItem(data, editingId, {
        surfaceText: draft.surfaceText,
        meaningZh: draft.meaningZh,
        example: draft.example,
        notes: draft.notes,
        rarityScore: normalizeRarityScore(draft.rarityScore),
        createdAt: toIsoFromLocalDateTime(draft.createdAt),
        timezone: draft.timezone,
      });

      commit(result.data);
      setEditingId(null);
      setDraft(null);
      setMessage(`已更新 ${result.item.surfaceText}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败");
    }
  };

  const archiveItem = (id: string) => {
    commit(archiveVocabularyItem(data, id));
    setMessage("已归档词条");
  };

  const restoreItem = (id: string) => {
    commit(restoreVocabularyItem(data, id));
    setMessage("已恢复词条");
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-[#dfddd6] bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="relative grid gap-2">
            <span className="text-sm font-medium">Search</span>
            <Search aria-hidden="true" className="absolute bottom-3 left-3 size-4 text-[#66645c]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="word, meaning, example"
              className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-9 text-base outline-none focus:border-[#517056]"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Filter</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as LibraryFilter)}
              className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>

        {message ? <p className="mt-3 text-sm text-[#517056]">{message}</p> : null}
      </div>

      <div className="rounded-md border border-[#dfddd6] bg-white">
        <div className="border-b border-[#dfddd6] px-4 py-3">
          <p className="text-sm text-[#66645c]">
            {isLoaded
              ? `${visibleItems.length} shown / ${getVocabularyItemsForSelectedPerson(data).length} total`
              : "Loading local vocabulary..."}
          </p>
        </div>

        {visibleItems.length ? (
          <div className="divide-y divide-[#eeeae1]">
            {visibleItems.map((item) => {
              const isEditing = editingId === item.id && draft;

              return (
                <div key={item.id} className="grid gap-3 p-4">
                  {isEditing ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Word or phrase</span>
                          <input
                            value={draft.surfaceText}
                            onChange={(event) => setDraft({ ...draft, surfaceText: event.target.value })}
                            className="min-h-10 rounded-md border border-[#d7d4ca] px-3"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">中文释义</span>
                          <input
                            value={draft.meaningZh}
                            onChange={(event) => setDraft({ ...draft, meaningZh: event.target.value })}
                            className="min-h-10 rounded-md border border-[#d7d4ca] px-3"
                          />
                        </label>
                      </div>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium">Example</span>
                        <textarea
                          rows={2}
                          value={draft.example}
                          onChange={(event) => setDraft({ ...draft, example: event.target.value })}
                          className="min-h-20 rounded-md border border-[#d7d4ca] px-3 py-2"
                        />
                      </label>
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Rarity</span>
                          <input
                            value={draft.rarityScore}
                            onChange={(event) => setDraft({ ...draft, rarityScore: event.target.value })}
                            type="number"
                            min={1}
                            max={5}
                            className="min-h-10 rounded-md border border-[#d7d4ca] px-3"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Created at</span>
                          <input
                            value={draft.createdAt}
                            onChange={(event) => setDraft({ ...draft, createdAt: event.target.value })}
                            type="datetime-local"
                            className="min-h-10 rounded-md border border-[#d7d4ca] px-3"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium">Timezone</span>
                          <input
                            value={draft.timezone}
                            onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}
                            className="min-h-10 rounded-md border border-[#d7d4ca] px-3"
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={saveDraft}
                          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#517056] px-3 text-sm font-semibold text-white"
                        >
                          <Save aria-hidden="true" className="size-4" />
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setDraft(null);
                          }}
                          className="min-h-10 rounded-md border border-[#d7d4ca] px-3 text-sm font-medium"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">{item.surfaceText}</h2>
                          <span className="rounded-md bg-[#edf4ef] px-2 py-1 text-xs text-[#517056]">
                            {item.source}
                          </span>
                          {item.archivedAt ? (
                            <span className="rounded-md bg-[#f3e7dd] px-2 py-1 text-xs text-[#8a4d21]">
                              archived
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-[#66645c]">{item.meaningZh || "No meaning yet"}</p>
                        {item.example ? <p className="mt-2 text-sm leading-6">{item.example}</p> : null}
                        <p className="mt-2 font-mono text-xs text-[#77736a]">
                          created {item.createdAt} · system {item.systemCreatedAt}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-start gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          className="min-h-10 rounded-md border border-[#d7d4ca] px-3 text-sm font-medium"
                        >
                          编辑
                        </button>
                        {item.archivedAt ? (
                          <button
                            type="button"
                            onClick={() => restoreItem(item.id)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d7d4ca] px-3 text-sm font-medium"
                          >
                            <RotateCcw aria-hidden="true" className="size-4" />
                            恢复
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => archiveItem(item.id)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d7d4ca] px-3 text-sm font-medium"
                          >
                            <Archive aria-hidden="true" className="size-4" />
                            归档
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-sm leading-6 text-[#66645c]">
            {isLoaded ? "没有匹配的本地词条。" : "Loading..."}
          </p>
        )}
      </div>
    </div>
  );
}
