"use client";

import Link from "next/link";
import { Archive, ArrowRightLeft, Download, RotateCcw, Save, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type {
  ImportBatch,
  UpdateVocabularyInput,
  VocabularyItem,
} from "@/lib/vocabulary/types";
import { getSelectedPersonId } from "@/lib/people/repository";
import {
  archiveVocabularyItem,
  deleteVocabularyItem,
  getActiveVocabularyItems,
  getActiveTrackVocabularyItems,
  getArchivedVocabularyItems,
  getRecognitionVocabularyItems,
  getVocabularyItemsForSelectedPerson,
  restoreVocabularyItem,
  rollbackImportBatch,
  startVocabularyItemFreshInTrack,
  updateVocabularyItem,
} from "@/lib/vocabulary/repository";
import {
  VOCABULARY_TAGS,
  normalizeRarityScore,
  normalizeSurfaceText,
  normalizeTextList,
  normalizeVocabularyTags,
} from "@/lib/vocabulary/normalize";
import { useVocabularyData } from "./use-vocabulary-data";
import { PressableButton } from "@/components/ui/motion-primitives";
import { getLearningStage } from "@/lib/daily-study/runtime-engine";
import { AiEnrichmentDialog } from "@/components/ai/ai-enrichment-dialog";
import { getVocabularySourceLabel } from "@/lib/ai-enrichment/source-label";
import { isPostgresClientStorageRuntime } from "./use-vocabulary-data";
import {
  assertCompleteVocabularyExamplePairs,
  buildVocabularyExamplePairs,
  findIncompleteVocabularyExampleIndexes,
} from "@/lib/vocabulary/example-pairs";

type LibraryFilter =
  | "all"
  | "new"
  | "inReview"
  | "recognition"
  | "activeVocabulary"
  | "needsTranslation"
  | "weak"
  | "archived";

type PendingLibraryAction =
  | {
      type: "delete";
      itemId: string;
      label: string;
    }
  | {
      type: "rollback";
      batchId: string;
      label: string;
      remainingItems: number;
    }
  | {
      type: "startFresh";
      itemId: string;
      label: string;
      sourceTrack: VocabularyItem["learningTrack"];
      targetTrack: VocabularyItem["learningTrack"];
    };

type EditDraft = Pick<
  VocabularyItem,
  "surfaceText" | "notes" | "learningTrack" | "tags" | "createdAt" | "timezone"
> & {
  meaningsZhText: string;
  examplesText: string;
  exampleTranslationsZhText: string;
  rarityScore: string;
};

function getItemMeanings(item: VocabularyItem) {
  return item.meaningsZh.length ? item.meaningsZh : normalizeTextList(item.meaningZh);
}

function getItemExamples(item: VocabularyItem) {
  return item.examples.length ? item.examples : normalizeTextList(item.example);
}

function toMultilineText(values: string[]) {
  return values.join("\n");
}

function fromMultilineText(value: string) {
  return normalizeTextList(value.split(/\r?\n/));
}

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
    meaningsZhText: toMultilineText(getItemMeanings(item)),
    examplesText: toMultilineText(getItemExamples(item)),
    exampleTranslationsZhText: toMultilineText(
      buildVocabularyExamplePairs(item).map((pair) => pair.zh),
    ),
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

function getBatchLabel(batch: ImportBatch) {
  const sourceLabel =
    batch.sourceType === "json_file" || batch.sourceType === "json_paste"
      ? "Batch imported"
      : "Text imported";

  return batch.fileName
    ? `${sourceLabel} · ${batch.fileName}`
    : `${sourceLabel} · ${new Date(batch.createdAt).toLocaleDateString()}`;
}

export function VocabularyLibrary() {
  const {
    data,
    isLoaded,
    storageRuntime,
    commit,
    revalidateAfterMutation,
  } = useVocabularyData();
  const refreshAfterFormalMutation = useCallback(
    () => revalidateAfterMutation({ broadcast: true }),
    [revalidateAfterMutation],
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingLibraryAction | null>(null);
  const [message, setMessage] = useState("");
  const [aiPreviewItemId, setAiPreviewItemId] = useState<string | null>(null);

  const selectedPersonId = getSelectedPersonId(data);
  const allItems = getVocabularyItemsForSelectedPerson(data);
  const activeItems = getActiveVocabularyItems(data);
  const recognitionItems = getRecognitionVocabularyItems(data);
  const activeTrackItems = getActiveTrackVocabularyItems(data);
  const archivedItems = getArchivedVocabularyItems(data);
  const itemsNeedingTranslation = useMemo(
    () =>
      activeItems.filter(
        (item) =>
          findIncompleteVocabularyExampleIndexes(
            buildVocabularyExamplePairs(item),
          ).length > 0,
      ),
    [activeItems],
  );
  const weakWordIds = useMemo(
    () =>
      new Set(
        data.reviewStates
          .filter(
            (state) =>
              state.personId === selectedPersonId && state.lapseCount > 0,
          )
          .map((state) => state.vocabularyItemId),
      ),
    [data.reviewStates, selectedPersonId],
  );
  const historyProfilesByItemId = useMemo(
    () => {
      const profiles = new Map<string, Set<VocabularyItem["learningTrack"]>>();

      for (const record of [...data.reviewStates, ...data.reviewEvents]) {
        if (record.personId !== selectedPersonId) {
          continue;
        }

        const itemProfiles = profiles.get(record.vocabularyItemId) ?? new Set();
        itemProfiles.add(record.reviewProfile);
        profiles.set(record.vocabularyItemId, itemProfiles);
      }

      return profiles;
    },
    [data.reviewEvents, data.reviewStates, selectedPersonId],
  );
  const learningStageById = useMemo(
    () =>
      new Map(
        activeItems.map((item) => [
          item.id,
          getLearningStage(data, item.id, item.learningTrack),
        ]),
      ),
    [activeItems, data],
  );
  const filterTabs = [
    { value: "all", label: "All Words", count: allItems.length },
    {
      value: "new",
      label: "New",
      count: activeItems.filter((item) => learningStageById.get(item.id) === "new").length,
    },
    {
      value: "inReview",
      label: "In review",
      count: activeItems.filter((item) => learningStageById.get(item.id) === "in_review").length,
    },
    { value: "recognition", label: "Recognition", count: recognitionItems.length },
    { value: "activeVocabulary", label: "Active", count: activeTrackItems.length },
    {
      value: "needsTranslation",
      label: "Needs translation",
      count: itemsNeedingTranslation.length,
    },
    { value: "weak", label: "Needs care", count: activeItems.filter((item) => weakWordIds.has(item.id)).length },
    { value: "archived", label: "Archived", count: archivedItems.length },
  ] as const satisfies readonly { value: LibraryFilter; label: string; count: number }[];
  const batchSummaries = useMemo(
    () =>
      data.importBatches
        .filter(
          (batch) =>
            batch.personId === selectedPersonId &&
            (batch.sourceType === "json_file" || batch.sourceType === "json_paste"),
        )
        .map((batch) => ({
          batch,
          remainingItems: allItems.filter((item) => item.importBatchId === batch.id).length,
        }))
        .sort((a, b) => b.batch.createdAt.localeCompare(a.batch.createdAt)),
    [allItems, data.importBatches, selectedPersonId],
  );

  const visibleItems = useMemo(() => {
    const sourceItems =
      filter === "new"
        ? activeItems.filter((item) => learningStageById.get(item.id) === "new")
        : filter === "inReview"
          ? activeItems.filter((item) => learningStageById.get(item.id) === "in_review")
          : filter === "recognition"
        ? recognitionItems
        : filter === "activeVocabulary"
          ? activeTrackItems
          : filter === "needsTranslation"
            ? itemsNeedingTranslation
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
        getItemMeanings(item).some((meaning) => meaning.includes(query.trim())) ||
        getItemExamples(item).some((example) =>
          example.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
        ) ||
        buildVocabularyExamplePairs(item).some((pair) => pair.zh.includes(query.trim())),
    );
  }, [activeItems, activeTrackItems, allItems, archivedItems, filter, itemsNeedingTranslation, learningStageById, query, recognitionItems, weakWordIds]);
  const aiPreviewItem = aiPreviewItemId
    ? data.items.find(
        (item) => item.id === aiPreviewItemId && item.personId === selectedPersonId,
      ) ?? null
    : null;

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
      const meaningsZh = fromMultilineText(draft.meaningsZhText);
      const examplePairs = buildVocabularyExamplePairs({
        examples: fromMultilineText(draft.examplesText),
        exampleTranslationsZh: draft.exampleTranslationsZhText.split(/\r?\n/),
      });
      assertCompleteVocabularyExamplePairs(examplePairs);
      const examples = examplePairs.map((pair) => pair.en);
      const input: UpdateVocabularyInput = {
        surfaceText: draft.surfaceText,
        meaningZh: meaningsZh[0] ?? "",
        meaningsZh,
        example: examples[0] ?? "",
        examples,
        exampleTranslationsZh: examplePairs.map((pair) => pair.zh),
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
      setMessage(`Updated ${result.item.surfaceText}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update this word");
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
      setMessage("Moved to Archive");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not archive this word");
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
      setMessage("Returned to Library");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not restore this word");
    }
  };

  const deleteItem = async (id: string) => {
    const now = new Date().toISOString();

    try {
      const result = deleteVocabularyItem(data, id, now);

      await commit(result.data, {
        type: "vocabulary.delete",
        vocabularyItemId: id,
        now,
        timezone: detectTimezone(),
      });
      setEditingId(null);
      setDraft(null);
      setMessage(`Deleted ${result.item.surfaceText}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete this word");
    }
  };

  const rollbackBatch = async (batchId: string) => {
    const now = new Date().toISOString();

    try {
      const result = rollbackImportBatch(data, batchId, now);

      await commit(result.data, {
        type: "import.rollbackBatch",
        importBatchId: batchId,
        now,
        timezone: detectTimezone(),
      });
      setEditingId(null);
      setDraft(null);
      setMessage(`Undid this batch and removed ${result.deletedItemsCount} ${result.deletedItemsCount === 1 ? "word" : "words"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not undo this batch");
    }
  };

  const startFreshInTrack = async (
    itemId: string,
    targetTrack: VocabularyItem["learningTrack"],
  ) => {
    const now = new Date().toISOString();

    try {
      const result = startVocabularyItemFreshInTrack(data, itemId, targetTrack, now);

      await commit(result.data, {
        type: "vocabulary.startFreshInTrack",
        vocabularyItemId: itemId,
        targetTrack,
        now,
        timezone: detectTimezone(),
      });
      setEditingId(null);
      setDraft(null);
      setMessage(
        `Started ${result.item.surfaceText} fresh in ${targetTrack === "active" ? "Active" : "Recognition"}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start this entry fresh");
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;

    setPendingAction(null);

    if (action.type === "delete") {
      await deleteItem(action.itemId);
      return;
    }

    if (action.type === "startFresh") {
      await startFreshInTrack(action.itemId, action.targetTrack);
      return;
    }

    await rollbackBatch(action.batchId);
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

          <div className="flex flex-wrap gap-2">
            <Link href="/import" className="mimi-button-secondary mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold">
              <Upload aria-hidden="true" className="size-4" />
              Add words
            </Link>
            <Link href="/export" className="mimi-button-secondary mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold">
              <Download aria-hidden="true" className="size-4" />
              Backup
            </Link>
          </div>

          {batchSummaries.length ? (
            <div className="grid gap-3 rounded-md border border-[#d8d1c2] bg-[#fffaf1]/64 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#203229]">Batch imported</h2>
                  <p className="text-xs leading-5 text-[#5f6d62]">
                    Undo a batch if it was added by mistake.
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                {batchSummaries.map(({ batch, remainingItems }) => (
                  <div
                    key={batch.id}
                    className="grid gap-2 rounded-md border border-[#e4dece] bg-[#fffaf1] p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#203229]">{getBatchLabel(batch)}</p>
                      <p className="text-xs leading-5 text-[#5f6d62]">
                        {remainingItems} in Library · {batch.acceptedRows} originally saved
                      </p>
                    </div>
                    <PressableButton
                      type="button"
                      onClick={() =>
                        setPendingAction({
                          type: "rollback",
                          batchId: batch.id,
                          label: getBatchLabel(batch),
                          remainingItems,
                        })
                      }
                      className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-center gap-2 px-3 text-sm font-semibold"
                    >
                      <RotateCcw aria-hidden="true" className="size-4" />
                      Undo batch
                    </PressableButton>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {message ? <p className="mt-3 rounded-md bg-[#d9e5d5] px-3 py-2 text-sm text-[#274331]">{message}</p> : null}
      </div>

      <div className="mimi-panel overflow-hidden">
        <div className="border-b border-[#d8d1c2] px-4 py-3">
          <p className="text-sm text-[#5f6d62]">
            {isLoaded
              ? `${visibleItems.length} shown / ${allItems.length} total`
              : "Loading Library..."}
          </p>
        </div>

        {visibleItems.length ? (
          <div className="divide-y divide-[#e4dece]">
            {visibleItems.map((item) => {
              const isEditing = editingId === item.id && draft;
              const itemMeanings = getItemMeanings(item);
              const itemExamplePairs = buildVocabularyExamplePairs(item);
              const historyProfiles = historyProfilesByItemId.get(item.id);
              const otherTrack = item.learningTrack === "active" ? "recognition" : "active";
              const canStartFresh =
                Boolean(historyProfiles?.has(item.learningTrack)) &&
                !historyProfiles?.has(otherTrack);

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
                          <span className="text-sm font-semibold text-[#203229]">Chinese meanings</span>
                          <textarea
                            rows={2}
                            value={draft.meaningsZhText}
                            onChange={(event) => setDraft({ ...draft, meaningsZhText: event.target.value })}
                            className="mimi-input min-h-20 px-3 py-2"
                          />
                        </label>
                      </div>
                      <label className="grid gap-1">
                        <span className="text-sm font-semibold text-[#203229]">Example</span>
                        <textarea
                          rows={2}
                          value={draft.examplesText}
                          onChange={(event) => setDraft({ ...draft, examplesText: event.target.value })}
                          className="mimi-input min-h-20 px-3 py-2"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-semibold text-[#203229]">Chinese translations</span>
                        <textarea
                          rows={2}
                          value={draft.exampleTranslationsZhText}
                          onChange={(event) => setDraft({ ...draft, exampleTranslationsZhText: event.target.value })}
                          className="mimi-input min-h-20 px-3 py-2"
                        />
                      </label>
                      <fieldset className="grid gap-2">
                        <legend className="text-sm font-semibold text-[#203229]">Learning track</legend>
                        {historyProfiles?.size ? (
                          <div className="grid gap-2 rounded-md border border-[#d8d1c2] bg-[#fffaf1] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                            <p className="text-sm leading-6 text-[#5f6d62]">
                              Current: <span className="font-semibold text-[#203229]">{item.learningTrack === "active" ? "Active" : "Recognition"}</span>. {canStartFresh ? "Old progress will stay read-only." : "A retained history already exists in the other Track, so another Track change is unavailable."}
                            </p>
                            {canStartFresh ? (
                              <PressableButton
                                type="button"
                                onClick={() =>
                                  setPendingAction({
                                    type: "startFresh",
                                    itemId: item.id,
                                    label: item.surfaceText,
                                    sourceTrack: item.learningTrack,
                                    targetTrack: otherTrack,
                                  })
                                }
                                className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
                              >
                                <ArrowRightLeft aria-hidden="true" className="size-4" />
                                Start fresh in {otherTrack === "active" ? "Active" : "Recognition"}
                              </PressableButton>
                            ) : null}
                          </div>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {[
                              { value: "recognition", label: "Recognition" },
                              { value: "active", label: "Active" },
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
                        )}
                      </fieldset>
                      <fieldset className="grid gap-2">
                        <legend className="text-sm font-semibold text-[#203229]">Tags</legend>
                        <div className="flex flex-wrap gap-2">
                          {VOCABULARY_TAGS.map((tag) => (
                            <label
                              key={tag}
                              className="mimi-focus-ring flex min-h-11 items-center justify-center rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-3 text-xs font-semibold text-[#203229] transition has-checked:border-[#5f7d66] has-checked:bg-[#d9e5d5]"
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
                          Save changes
                        </PressableButton>
                        <PressableButton
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setDraft(null);
                          }}
                          className="mimi-button-secondary mimi-focus-ring px-3 text-sm font-semibold"
                        >
                          Cancel
                        </PressableButton>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="mimi-word-serif text-2xl text-[#203229]">{item.surfaceText}</h2>
                          <span className="mimi-pill px-2 py-1 text-xs font-semibold">
                            {getVocabularySourceLabel(data, item)}
                          </span>
                          {!item.archivedAt ? (
                            <span className="mimi-pill px-2 py-1 text-xs font-semibold">
                              {item.learningTrack === "active" ? "Active" : "Recognition"}
                            </span>
                          ) : null}
                          {!item.archivedAt ? (
                            <span className="rounded-md bg-[var(--mimi-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--mimi-primary-deep)]">
                              {learningStageById.get(item.id) === "in_review" ? "In review" : "New"}
                            </span>
                          ) : null}
                          {item.tags?.map((tag) => (
                            <span key={tag} className="mimi-pill px-2 py-1 text-xs font-semibold">
                              {tag}
                            </span>
                          ))}
                          {weakWordIds.has(item.id) ? (
                            <span className="rounded-md bg-[#efe0d1] px-2 py-1 text-xs font-semibold text-[#8a4d21]">
                              Needs care
                            </span>
                          ) : null}
                          {findIncompleteVocabularyExampleIndexes(itemExamplePairs).length ? (
                            <span className="rounded-md bg-[#f1e8c8] px-2 py-1 text-xs font-semibold text-[#735f21]">
                              Translation needed
                            </span>
                          ) : null}
                          {item.archivedAt ? (
                            <span className="rounded-md bg-[#efe0d1] px-2 py-1 text-xs font-semibold text-[#8a4d21]">
                              Archived
                            </span>
                          ) : null}
                        </div>
                        {itemMeanings.length ? (
                          <div className="mt-1 grid gap-1 text-sm text-[#5f6d62]">
                            {itemMeanings.map((meaning, index) => (
                              <p key={`${item.id}-meaning-${index}`}>{meaning}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-sm text-[#5f6d62]">No meaning yet</p>
                        )}
                        {itemExamplePairs.length ? (
                          <div className="mt-2 grid gap-1 text-sm leading-6 text-[#203229]">
                            {itemExamplePairs.map((pair, index) => (
                              <div key={`${item.id}-example-${index}`} className="grid gap-0.5">
                                <p>{pair.en}</p>
                                <p className="text-[#6f796f]">
                                  {pair.zh || "Chinese translation needed"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-3 text-xs text-[#879087]">
                          Added {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-start gap-2 md:justify-end">
                        {!item.archivedAt ? (
                          <PressableButton
                            type="button"
                            onClick={() => setAiPreviewItemId(item.id)}
                            className="mimi-button-secondary mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold"
                          >
                            <Sparkles aria-hidden="true" className="size-4" />
                            AI suggestions
                          </PressableButton>
                        ) : null}
                        <PressableButton
                          type="button"
                          onClick={() => startEditing(item)}
                          className="mimi-button-secondary mimi-focus-ring px-3 text-sm font-semibold"
                        >
                          Edit
                        </PressableButton>
                        {item.archivedAt ? (
                          <PressableButton
                            type="button"
                            onClick={() => void restoreItem(item.id)}
                            className="mimi-button-secondary mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold"
                          >
                            <RotateCcw aria-hidden="true" className="size-4" />
                            Restore
                          </PressableButton>
                        ) : (
                          <PressableButton
                            type="button"
                            onClick={() => void archiveItem(item.id)}
                            className="mimi-button-secondary mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold"
                          >
                            <Archive aria-hidden="true" className="size-4" />
                            Archive
                          </PressableButton>
                        )}
                        <PressableButton
                          type="button"
                          onClick={() =>
                            setPendingAction({
                              type: "delete",
                              itemId: item.id,
                              label: item.surfaceText,
                            })
                          }
                          className="mimi-button-secondary mimi-focus-ring inline-flex items-center gap-2 px-3 text-sm font-semibold"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                          Delete
                        </PressableButton>
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
                ? "No Active Vocabulary yet. Add one in Add Words."
                : "No matching words."
              : "Loading..."}
          </p>
        )}
      </div>

      <AiEnrichmentDialog
        open={Boolean(aiPreviewItem)}
        onClose={() => setAiPreviewItemId(null)}
        item={aiPreviewItem}
        data={data}
        localPreviewEnabled={
          storageRuntime !== "loading" &&
          !isPostgresClientStorageRuntime(storageRuntime)
        }
        formalRouteEnabled={isPostgresClientStorageRuntime(storageRuntime)}
        refresh={refreshAfterFormalMutation}
        commit={commit}
      />

      <ResponsiveDialog
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        labelledBy="library-confirm-title"
        describedBy="library-confirm-description"
        panelClassName="max-w-sm text-center sm:max-w-sm"
        dismissOnBackdrop={false}
      >
        {pendingAction ? (
          <>
            {pendingAction.type === "delete" ? (
              <Trash2 aria-hidden="true" className="mx-auto size-9 text-[#8a4d21]" />
            ) : pendingAction.type === "startFresh" ? (
              <ArrowRightLeft aria-hidden="true" className="mx-auto size-9 text-[var(--mimi-primary)]" />
            ) : (
              <RotateCcw aria-hidden="true" className="mx-auto size-9 text-[var(--mimi-primary)]" />
            )}
            <h2 id="library-confirm-title" className="mt-4 text-xl font-semibold text-[var(--mimi-text)]">
              {pendingAction.type === "delete"
                ? "确认删除这个词条？"
                : pendingAction.type === "startFresh"
                  ? `Start fresh in ${pendingAction.targetTrack === "active" ? "Active" : "Recognition"}?`
                  : "确认撤销这批导入？"}
            </h2>
            <p id="library-confirm-description" className="mt-2 text-sm leading-6 text-[var(--mimi-text-soft)]">
              {pendingAction.type === "delete"
                ? `将删除 ${pendingAction.label} 和它的复习记录。`
                : pendingAction.type === "startFresh"
                  ? `${pendingAction.label} will start with no progress in the new Track. Its ${pendingAction.sourceTrack === "active" ? "Active" : "Recognition"} history will stay read-only and will not be copied.`
                  : `将删除 ${pendingAction.remainingItems} 个仍在词库中的词条，并移除相关复习记录。`}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <PressableButton
                type="button"
                onClick={() => setPendingAction(null)}
                className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-center px-4 text-sm font-semibold"
              >
                取消
              </PressableButton>
              <PressableButton
                type="button"
                onClick={() => void confirmPendingAction()}
                className="mimi-button mimi-focus-ring inline-flex items-center justify-center px-4 text-sm font-semibold"
              >
                YES
              </PressableButton>
            </div>
          </>
        ) : null}
      </ResponsiveDialog>
    </div>
  );
}
