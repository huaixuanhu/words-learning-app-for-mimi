"use client";

import { BookPlus, Check, Plus, Sparkles, Trash2, X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { PressableButton } from "@/components/ui/motion-primitives";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { VocabularyStorageMutation } from "@/components/vocabulary/use-vocabulary-data";
import { AI_DISCLOSURE } from "@/lib/ai-enrichment/contract";
import {
  addFormalAiCandidate,
  confirmFormalAiDisclosure,
  decideFormalAiDraft,
  requestFormalAiEnrichment,
} from "@/lib/ai-enrichment/formal-client";
import {
  addAcceptedAiCandidateToLearning,
  createLocalFixtureDraft,
  decideAiEnrichmentDraft,
} from "@/lib/ai-enrichment/repository";
import {
  LOCAL_FIXTURE_LINEAGE,
  runLocalFixtureEnrichment,
} from "@/lib/ai-enrichment/local-fixture-runtime";
import type {
  AiConfusableType,
  AiEnrichmentDraft,
} from "@/lib/ai-enrichment/types";
import { normalizeTextList } from "@/lib/vocabulary/normalize";
import { makeId } from "@/lib/vocabulary/repository";
import type {
  LearningTrack,
  VocabularyData,
  VocabularyItem,
} from "@/lib/vocabulary/types";

type AiEnrichmentDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  item: VocabularyItem | null;
  data: VocabularyData;
  localPreviewEnabled: boolean;
  formalRouteEnabled: boolean;
  refresh: () => Promise<void>;
  commit: (
    nextData: VocabularyData,
    mutation?: VocabularyStorageMutation,
  ) => Promise<VocabularyData>;
}>;

type CandidateToAdd = Readonly<{
  candidateWord: string;
  surfaceText: string;
  meaningZh: string;
  example: string;
  comparisonZh: string;
}>;

function sourceMeanings(item: VocabularyItem) {
  return item.meaningsZh.length ? item.meaningsZh : normalizeTextList(item.meaningZh);
}

function sourceExamples(item: VocabularyItem) {
  return item.examples.length ? item.examples : normalizeTextList(item.example);
}

function normalizeMultilineText(value: string) {
  return normalizeTextList(value.split(/\r?\n/u));
}

function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Melbourne";
}

function emptyDraft(): AiEnrichmentDraft {
  return {
    additionalMeaningsZh: [],
    examples: [],
    similarWords: [],
    confusableWords: [],
  };
}

export function AiEnrichmentDialog({
  open,
  onClose,
  item,
  data,
  localPreviewEnabled,
  formalRouteEnabled,
  refresh,
  commit,
}: AiEnrichmentDialogProps) {
  const titleId = useId();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AiEnrichmentDraft>(emptyDraft);
  const [decision, setDecision] = useState<"draft" | "accepted" | "rejected">("draft");
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [candidateToAdd, setCandidateToAdd] = useState<CandidateToAdd | null>(null);
  const [candidateTrack, setCandidateTrack] = useState<LearningTrack>("recognition");
  const [similarKeys, setSimilarKeys] = useState<string[]>([]);
  const [confusableKeys, setConfusableKeys] = useState<string[]>([]);
  const [additionalMeaningsText, setAdditionalMeaningsText] = useState("");
  const [examplesText, setExamplesText] = useState("");
  const [confusableExamplePairTexts, setConfusableExamplePairTexts] = useState<string[]>([]);
  const [formalDisclosureAccepted, setFormalDisclosureAccepted] = useState(false);
  const [modelNotice, setModelNotice] = useState<string>(LOCAL_FIXTURE_LINEAGE.notice);

  const candidateCount = draft.similarWords.length + draft.confusableWords.length;
  const canAccept = Boolean(draftId) && decision === "draft" && !isWorking;
  const notice = formalRouteEnabled && !draftId
    ? "Gemini 3.1 Flash-Lite · Review the AI data notice before continuing."
    : modelNotice;

  const createPreview = async () => {
    if (!item || (!localPreviewEnabled && !formalRouteEnabled) || isWorking) return;
    setIsWorking(true);
    setMessage("");

    try {
      let visibleDraft: AiEnrichmentDraft;
      let nextDraftId: string;
      let nextDecision: "draft" | "accepted" | "rejected" = "draft";
      if (localPreviewEnabled) {
        const fixture = runLocalFixtureEnrichment(
          {
            term: item.surfaceText,
            meaningsZh: sourceMeanings(item),
            examples: sourceExamples(item),
          },
          makeId("local_enrichment_preview"),
        );
        const staged = createLocalFixtureDraft(data, item.id, fixture.value);
        await commit(staged.data);
        nextDraftId = staged.draft.id;
        visibleDraft = staged.draft.status === "accepted" && staged.draft.acceptedContent
          ? staged.draft.acceptedContent
          : staged.draft.draft;
        nextDecision = staged.draft.status;
        setModelNotice(LOCAL_FIXTURE_LINEAGE.notice);
      } else {
        if (!formalDisclosureAccepted) {
          throw new Error("Please confirm the AI data notice first.");
        }
        await confirmFormalAiDisclosure(item.id);
        const result = await requestFormalAiEnrichment(
          item.id,
          makeId("formal_enrichment"),
        );
        nextDraftId = result.stored.resourceId;
        visibleDraft = result.stored.value;
        setModelNotice(
          `Generated by ${result.stored.lineage.modelLabel} · AI content may be inaccurate. Please review carefully before saving.`,
        );
      }
      setDraftId(nextDraftId);
      setDraft(visibleDraft);
      setAdditionalMeaningsText(visibleDraft.additionalMeaningsZh.join("\n"));
      setExamplesText(visibleDraft.examples.join("\n"));
      setSimilarKeys(visibleDraft.similarWords.map(() => makeId("similar_preview")));
      setConfusableKeys(visibleDraft.confusableWords.map(() => makeId("confusable_preview")));
      setConfusableExamplePairTexts(
        visibleDraft.confusableWords.map((candidate) => candidate.examplePair.join("\n")),
      );
      setDecision(nextDecision);
      setMessage(
        nextDecision === "accepted"
          ? "This preview was already accepted."
          : "Preview ready. Edit anything before accepting.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create this preview.");
    } finally {
      setIsWorking(false);
    }
  };

  const decide = async (nextDecision: "accepted" | "rejected") => {
    if (!draftId || isWorking) return;
    setIsWorking(true);
    setMessage("");

    try {
      const normalizedDraft: AiEnrichmentDraft = {
        ...draft,
        additionalMeaningsZh: normalizeMultilineText(additionalMeaningsText),
        examples: normalizeMultilineText(examplesText),
        confusableWords: draft.confusableWords.map((candidate, index) => ({
          ...candidate,
          examplePair: normalizeMultilineText(confusableExamplePairTexts[index] ?? ""),
        })),
      };
      if (formalRouteEnabled) {
        await decideFormalAiDraft({
          draftId,
          action: nextDecision === "accepted" ? "accept" : "reject",
          draft: nextDecision === "accepted" ? normalizedDraft : null,
        });
        await refresh();
      } else {
        const result = decideAiEnrichmentDraft(
          data,
          draftId,
          nextDecision,
          normalizedDraft,
        );
        await commit(result.data);
      }
      setDraft(normalizedDraft);
      setDecision(nextDecision);
      setCandidateToAdd(null);
      setMessage(
        nextDecision === "accepted"
          ? "Accepted."
          : "Preview rejected. The original word was not changed.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this decision.");
    } finally {
      setIsWorking(false);
    }
  };

  const openCandidateForm = (
    candidate: Readonly<{
      word: string;
      differenceZh: string;
      examplePair?: readonly string[];
    }>,
  ) => {
    setCandidateToAdd({
      candidateWord: candidate.word,
      surfaceText: candidate.word,
      meaningZh: "",
      example: candidate.examplePair?.[1] ?? "",
      comparisonZh: candidate.differenceZh,
    });
    setCandidateTrack(item?.learningTrack ?? "recognition");
    setMessage("");
  };

  const saveCandidate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draftId || !candidateToAdd || isWorking) return;
    setIsWorking(true);
    setMessage("");

    try {
      if (formalRouteEnabled) {
        const response = await addFormalAiCandidate({
          draftId,
          candidateWord: candidateToAdd.candidateWord,
          surfaceText: candidateToAdd.surfaceText,
          meaningZh: candidateToAdd.meaningZh,
          example: candidateToAdd.example,
          learningTrack: candidateTrack,
          timezone: detectTimezone(),
        });
        await refresh();
        setCandidateToAdd(null);
        setMessage(response.ok ? `Added “${candidateToAdd.surfaceText}” to learning.` : "Could not add this suggestion.");
        return;
      }
      const result = addAcceptedAiCandidateToLearning(
        data,
        {
          draftId,
          candidateWord: candidateToAdd.candidateWord,
          surfaceText: candidateToAdd.surfaceText,
          meaningZh: candidateToAdd.meaningZh,
          example: candidateToAdd.example,
          learningTrack: candidateTrack,
          timezone: detectTimezone(),
        },
      );
      await commit(result.data);
      setCandidateToAdd(null);
      setMessage(
        result.created
          ? `Added “${result.item.surfaceText}” to ${result.item.learningTrack === "active" ? "Active" : "Recognition"}.`
          : result.relationLinked
            ? `“${result.item.surfaceText}” is already in Library. The relation was linked to it.`
            : `“${result.item.surfaceText}” is already in Library. No AI relation was added.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add this suggestion.");
    } finally {
      setIsWorking(false);
    }
  };

  const closeDialog = () => {
    setDraftId(null);
    setDraft(emptyDraft());
    setDecision("draft");
    setMessage("");
    setCandidateToAdd(null);
    setSimilarKeys([]);
    setConfusableKeys([]);
    setAdditionalMeaningsText("");
    setExamplesText("");
    setConfusableExamplePairTexts([]);
    setFormalDisclosureAccepted(false);
    setModelNotice(LOCAL_FIXTURE_LINEAGE.notice);
    onClose();
  };

  return (
    <ResponsiveDialog
      open={open}
      onClose={closeDialog}
      labelledBy={titleId}
      panelClassName="sm:max-w-3xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mimi-text-muted)]">
            AI suggestions
          </p>
          <h2 id={titleId} className="mt-1 text-2xl font-semibold text-[var(--mimi-text)]">
            {item?.surfaceText ?? "Word preview"}
          </h2>
        </div>
        <button
          type="button"
          onClick={closeDialog}
          aria-label="Close AI suggestions"
          className="mimi-button-secondary mimi-focus-ring grid size-11 shrink-0 place-items-center"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="mt-4 rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-muted)] p-3">
        <p className="text-sm font-semibold text-[var(--mimi-text)]">{notice}</p>
        {formalRouteEnabled ? (
          <p className="mt-1 text-xs leading-5 text-[var(--mimi-text-soft)]">
            Only the word, Chinese meanings, and examples are sent. Notes, study history, answers, and audio stay out.
          </p>
        ) : null}
        {formalRouteEnabled ? (
          <details className="mt-2 text-xs leading-5 text-[var(--mimi-text-soft)]">
            <summary className="mimi-focus-ring cursor-pointer rounded-sm font-semibold text-[var(--mimi-text)]">
              AI data and retention
            </summary>
            <p className="mt-1">
              Only {AI_DISCLOSURE.sentFields.join(", ")} may be sent. {AI_DISCLOSURE.retentionSummary}{" "}
              {AI_DISCLOSURE.projectLoggingSummary}
            </p>
          </details>
        ) : null}
        {formalRouteEnabled && !draftId ? (
          <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--mimi-text-soft)]">
            <input
              type="checkbox"
              checked={formalDisclosureAccepted}
              onChange={(event) => setFormalDisclosureAccepted(event.target.checked)}
              className="mt-1"
            />
            <span>I understand and want to create this AI suggestion.</span>
          </label>
        ) : null}
      </div>

      {!localPreviewEnabled && !formalRouteEnabled ? (
        <p className="mt-4 rounded-md bg-[var(--mimi-surface-muted)] px-3 py-2 text-sm text-[var(--mimi-text-soft)]">
          AI suggestions unavailable.
        </p>
      ) : null}

      {!draftId ? (
        <PressableButton
          type="button"
          disabled={!item || (!localPreviewEnabled && !formalRouteEnabled) || isWorking}
          onClick={() => void createPreview()}
          className="mimi-button mimi-focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          {isWorking
            ? "Preparing..."
            : formalRouteEnabled
              ? "Create AI suggestion"
              : "Create local preview"}
        </PressableButton>
      ) : (
        <div className="mt-5 grid gap-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--mimi-text-muted)]">
            <span className="mimi-pill px-2 py-1 font-semibold">
              {decision === "accepted" ? "Accepted" : decision === "rejected" ? "Rejected" : "Draft"}
            </span>
          </div>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-[var(--mimi-text)]">Extra meanings</span>
            <textarea
              rows={3}
              disabled={decision !== "draft"}
              value={additionalMeaningsText}
              onChange={(event) => setAdditionalMeaningsText(event.target.value)}
              placeholder="One meaning per line"
              className="mimi-input resize-y px-3 py-2 text-base disabled:opacity-65"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-[var(--mimi-text)]">More examples</span>
            <textarea
              rows={4}
              disabled={decision !== "draft"}
              value={examplesText}
              onChange={(event) => setExamplesText(event.target.value)}
              placeholder="One example per line"
              className="mimi-input resize-y px-3 py-2 text-base disabled:opacity-65"
            />
          </label>

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--mimi-text)]">Similar words</h3>
              {decision === "draft" && candidateCount < 3 ? (
                <button
                  type="button"
                  onClick={() =>
                    {
                      setDraft({
                        ...draft,
                        similarWords: [...draft.similarWords, { word: "", differenceZh: "" }],
                      });
                      setSimilarKeys([...similarKeys, makeId("similar_preview")]);
                    }
                  }
                  className="mimi-button-secondary mimi-focus-ring inline-flex min-h-9 items-center gap-1.5 px-2.5 text-xs font-semibold"
                >
                  <Plus aria-hidden="true" className="size-3.5" /> Add
                </button>
              ) : null}
            </div>
            {draft.similarWords.length ? draft.similarWords.map((candidate, index) => (
              <div key={similarKeys[index]} className="grid gap-2 rounded-md border border-[var(--mimi-border)] p-3 sm:grid-cols-[0.7fr_1.3fr_auto]">
                <input
                  disabled={decision !== "draft"}
                  aria-label={`Similar word ${index + 1}`}
                  value={candidate.word}
                  onChange={(event) => {
                    const similarWords = [...draft.similarWords];
                    similarWords[index] = { ...candidate, word: event.target.value };
                    setDraft({ ...draft, similarWords });
                  }}
                  className="mimi-input px-3 text-base disabled:opacity-65"
                />
                <input
                  disabled={decision !== "draft"}
                  aria-label={`Similar word difference ${index + 1}`}
                  value={candidate.differenceZh}
                  onChange={(event) => {
                    const similarWords = [...draft.similarWords];
                    similarWords[index] = { ...candidate, differenceZh: event.target.value };
                    setDraft({ ...draft, similarWords });
                  }}
                  className="mimi-input px-3 text-base disabled:opacity-65"
                />
                {decision === "draft" ? (
                  <button
                    type="button"
                    aria-label={`Remove similar word ${index + 1}`}
                    onClick={() => {
                      setDraft({ ...draft, similarWords: draft.similarWords.filter((_, candidateIndex) => candidateIndex !== index) });
                      setSimilarKeys(similarKeys.filter((_, candidateIndex) => candidateIndex !== index));
                    }}
                    className="mimi-button-secondary mimi-focus-ring grid size-11 place-items-center"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                ) : (
                  <PressableButton
                    type="button"
                    onClick={() => openCandidateForm(candidate)}
                    disabled={decision !== "accepted"}
                    className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-center gap-1.5 px-3 text-xs font-semibold disabled:opacity-55"
                  >
                    <BookPlus aria-hidden="true" className="size-4" /> Add
                  </PressableButton>
                )}
              </div>
            )) : (
              <p className="text-sm text-[var(--mimi-text-muted)]">No similar words.</p>
            )}
          </section>

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--mimi-text)]">Easy to confuse</h3>
              {decision === "draft" && candidateCount < 3 ? (
                <button
                  type="button"
                  onClick={() =>
                    {
                      setDraft({
                        ...draft,
                        confusableWords: [
                          ...draft.confusableWords,
                          { word: "", type: "usage", differenceZh: "", examplePair: [] },
                        ],
                      });
                      setConfusableKeys([...confusableKeys, makeId("confusable_preview")]);
                      setConfusableExamplePairTexts([...confusableExamplePairTexts, ""]);
                    }
                  }
                  className="mimi-button-secondary mimi-focus-ring inline-flex min-h-9 items-center gap-1.5 px-2.5 text-xs font-semibold"
                >
                  <Plus aria-hidden="true" className="size-3.5" /> Add
                </button>
              ) : null}
            </div>
            {draft.confusableWords.length ? draft.confusableWords.map((candidate, index) => (
              <div key={confusableKeys[index]} className="grid gap-2 rounded-md border border-[var(--mimi-border)] p-3">
                <div className="grid gap-2 sm:grid-cols-[0.7fr_0.7fr_auto]">
                  <input
                    disabled={decision !== "draft"}
                    aria-label={`Confusable word ${index + 1}`}
                    value={candidate.word}
                    onChange={(event) => {
                      const confusableWords = [...draft.confusableWords];
                      confusableWords[index] = { ...candidate, word: event.target.value };
                      setDraft({ ...draft, confusableWords });
                    }}
                    className="mimi-input px-3 text-base disabled:opacity-65"
                  />
                  <select
                    disabled={decision !== "draft"}
                    aria-label={`Confusable word type ${index + 1}`}
                    value={candidate.type}
                    onChange={(event) => {
                      const confusableWords = [...draft.confusableWords];
                      confusableWords[index] = { ...candidate, type: event.target.value as AiConfusableType };
                      setDraft({ ...draft, confusableWords });
                    }}
                    className="mimi-input px-3 text-base disabled:opacity-65"
                  >
                    <option value="spelling">Spelling</option>
                    <option value="sound">Sound</option>
                    <option value="usage">Usage</option>
                  </select>
                  {decision === "draft" ? (
                    <button
                      type="button"
                      aria-label={`Remove confusable word ${index + 1}`}
                      onClick={() => {
                        setDraft({ ...draft, confusableWords: draft.confusableWords.filter((_, candidateIndex) => candidateIndex !== index) });
                        setConfusableKeys(confusableKeys.filter((_, candidateIndex) => candidateIndex !== index));
                        setConfusableExamplePairTexts(
                          confusableExamplePairTexts.filter((_, candidateIndex) => candidateIndex !== index),
                        );
                      }}
                      className="mimi-button-secondary mimi-focus-ring grid size-11 place-items-center"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  ) : (
                    <PressableButton
                      type="button"
                      onClick={() => openCandidateForm(candidate)}
                      disabled={decision !== "accepted"}
                      className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-center gap-1.5 px-3 text-xs font-semibold disabled:opacity-55"
                    >
                      <BookPlus aria-hidden="true" className="size-4" /> Add
                    </PressableButton>
                  )}
                </div>
                <input
                  disabled={decision !== "draft"}
                  aria-label={`Confusable word difference ${index + 1}`}
                  value={candidate.differenceZh}
                  onChange={(event) => {
                    const confusableWords = [...draft.confusableWords];
                    confusableWords[index] = { ...candidate, differenceZh: event.target.value };
                    setDraft({ ...draft, confusableWords });
                  }}
                  className="mimi-input px-3 text-base disabled:opacity-65"
                />
                <textarea
                  rows={2}
                  disabled={decision !== "draft"}
                  aria-label={`Confusable word example pair ${index + 1}`}
                  value={confusableExamplePairTexts[index] ?? ""}
                  onChange={(event) => {
                    const nextTexts = [...confusableExamplePairTexts];
                    nextTexts[index] = event.target.value;
                    setConfusableExamplePairTexts(nextTexts);
                  }}
                  placeholder="Leave blank, or add exactly two examples"
                  className="mimi-input resize-y px-3 py-2 text-base disabled:opacity-65"
                />
              </div>
            )) : (
              <p className="text-sm text-[var(--mimi-text-muted)]">No confusable words.</p>
            )}
          </section>

          {decision === "draft" ? (
            <div className="grid gap-2 border-t border-[var(--mimi-border)] pt-4 sm:grid-cols-2">
              <PressableButton
                type="button"
                disabled={!canAccept}
                onClick={() => void decide("accepted")}
                className="mimi-button mimi-focus-ring inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-55"
              >
                <Check aria-hidden="true" className="size-4" /> Accept preview
              </PressableButton>
              <PressableButton
                type="button"
                disabled={!canAccept}
                onClick={() => void decide("rejected")}
                className="mimi-button-secondary mimi-focus-ring px-4 text-sm font-semibold disabled:opacity-55"
              >
                Reject
              </PressableButton>
            </div>
          ) : null}

          {candidateToAdd ? (
            <form onSubmit={saveCandidate} className="grid gap-3 rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-muted)] p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--mimi-text)]">Add to learning</h3>
                <button type="button" onClick={() => setCandidateToAdd(null)} aria-label="Close add form" className="mimi-focus-ring rounded p-2">
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
              <div className="rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface)] px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mimi-text-muted)]">Comparison</p>
                <p className="mt-1 text-sm text-[var(--mimi-text-soft)]">{candidateToAdd.comparisonZh}</p>
              </div>
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-[var(--mimi-text)]">Word or phrase</span>
                <input required value={candidateToAdd.surfaceText} onChange={(event) => setCandidateToAdd({ ...candidateToAdd, surfaceText: event.target.value })} className="mimi-input px-3 text-base" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-[var(--mimi-text)]">Chinese meaning</span>
                <input required value={candidateToAdd.meaningZh} onChange={(event) => setCandidateToAdd({ ...candidateToAdd, meaningZh: event.target.value })} placeholder="Check and enter the target meaning" className="mimi-input px-3 text-base" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-[var(--mimi-text)]">Example</span>
                <textarea rows={2} value={candidateToAdd.example} onChange={(event) => setCandidateToAdd({ ...candidateToAdd, example: event.target.value })} className="mimi-input resize-y px-3 py-2 text-base" />
              </label>
              <fieldset>
                <legend className="text-sm font-semibold text-[var(--mimi-text)]">Learning Track</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["recognition", "active"] as const).map((track) => (
                    <label key={track} className="mimi-button-secondary flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-semibold">
                      <input type="radio" name={`${titleId}-candidate-track`} checked={candidateTrack === track} onChange={() => setCandidateTrack(track)} />
                      {track === "recognition" ? "Recognition" : "Active"}
                    </label>
                  ))}
                </div>
              </fieldset>
              <PressableButton type="submit" disabled={isWorking} className="mimi-button mimi-focus-ring inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-55">
                <BookPlus aria-hidden="true" className="size-4" /> {isWorking ? "Saving..." : "Save to learning"}
              </PressableButton>
            </form>
          ) : null}
        </div>
      )}

      {message ? (
        <p aria-live="polite" className="mt-4 rounded-md bg-[var(--mimi-primary-soft)] px-3 py-2 text-sm text-[var(--mimi-primary-deep)]">
          {message}
        </p>
      ) : null}
    </ResponsiveDialog>
  );
}
