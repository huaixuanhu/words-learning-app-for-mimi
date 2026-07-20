import { randomUUID } from "node:crypto";
import {
  assertCompleteAiExampleTranslations,
  normalizeAiCandidate,
  validateAiEnrichmentDraft,
  validateStoredAiEnrichmentDraft,
  validateTrustedAiLexicalPayload,
} from "./contract";
import { buildAiSourceHash } from "./canonical-hash";
import type {
  PublicAiCandidateAdd,
  PublicAiDraftDecision,
} from "./formal-action-contract";
import type { AiEnrichmentDraft } from "./types";
import {
  type PostgresQueryable,
  withPostgresTransaction,
} from "@/lib/storage/postgres/client";
import { normalizeSurfaceText } from "@/lib/vocabulary/normalize";

type TransactionRunner = <T>(
  callback: (queryable: PostgresQueryable) => Promise<T>,
) => Promise<T>;

type LockedDraftRow = Readonly<{
  id: string;
  person_id: string;
  source_vocabulary_item_id: string;
  ai_run_id: string;
  status: "draft" | "accepted" | "rejected";
  draft_json: unknown;
  accepted_content_json: unknown;
  source_hash: string;
  surface_text: string;
  meaning_zh: string;
  meanings_zh: unknown;
  example: string;
  examples: unknown;
  source_status: string;
}>;

function textArray(value: unknown, fallback: string) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : fallback.trim()
      ? [fallback]
      : [];
}

async function lockDraft(queryable: PostgresQueryable, draftId: string) {
  const result = await queryable.query<LockedDraftRow>(
    `
      select
        draft.id, draft.person_id, draft.source_vocabulary_item_id,
        draft.ai_run_id, draft.status, draft.draft_json,
        draft.accepted_content_json, run.source_hash,
        source.surface_text, source.meaning_zh, source.meanings_zh,
        source.example, source.examples, source.status as source_status
      from ai_enrichment_drafts draft
      join ai_runs run
        on run.person_id = draft.person_id and run.id = draft.ai_run_id
      join vocabulary_items source
        on source.person_id = draft.person_id
        and source.id = draft.source_vocabulary_item_id
      where draft.id = $1
      for update of draft, source
    `,
    [draftId],
  );
  const row = result.rows[0];
  if (!row || row.source_status !== "new") {
    throw new Error("The AI suggestion or its source word is unavailable");
  }
  return row;
}

function trustedSource(row: LockedDraftRow) {
  return validateTrustedAiLexicalPayload({
    term: row.surface_text,
    meaningsZh: textArray(row.meanings_zh, row.meaning_zh),
    examples: textArray(row.examples, row.example),
  });
}

function acceptedCandidate(draft: AiEnrichmentDraft, candidateWord: string) {
  const normalized = normalizeAiCandidate(candidateWord);
  const similar = draft.similarWords.find(
    (candidate) => normalizeAiCandidate(candidate.word) === normalized,
  );
  if (similar) {
    return {
      word: similar.word,
      relationType: "similar" as const,
      differenceZh: similar.differenceZh,
      examplePair: [] as readonly string[],
      examplePairTranslationsZh: [] as readonly string[],
    };
  }
  const confusable = draft.confusableWords.find(
    (candidate) => normalizeAiCandidate(candidate.word) === normalized,
  );
  return confusable
    ? {
        word: confusable.word,
        relationType: confusable.type,
        differenceZh: confusable.differenceZh,
        examplePair: confusable.examplePair,
        examplePairTranslationsZh: confusable.examplePairTranslationsZh ?? [],
      }
    : null;
}

export async function decidePostgresAiDraft(
  input: PublicAiDraftDecision,
  dependencies: Readonly<{ transaction?: TransactionRunner }> = {},
) {
  const transaction = dependencies.transaction ?? withPostgresTransaction;
  return transaction(async (queryable) => {
    const row = await lockDraft(queryable, input.draftId);
    if (row.status !== "draft") {
      return { status: row.status } as const;
    }
    if (input.action === "reject") {
      await queryable.query(
        `
          update ai_enrichment_drafts
          set status = 'rejected', decided_at = now(), updated_at = now()
          where id = $1 and status = 'draft'
        `,
        [row.id],
      );
      return { status: "rejected" } as const;
    }
    const source = trustedSource(row);
    if (buildAiSourceHash(source) !== row.source_hash) {
      throw new Error("This word changed after generation. Please create a fresh suggestion.");
    }
    const accepted = assertCompleteAiExampleTranslations(
      validateAiEnrichmentDraft(input.draft, source),
      source.examples,
    );
    await queryable.query(
      `
        update ai_enrichment_drafts
        set
          status = 'accepted',
          draft_json = $2::jsonb,
          accepted_content_json = $2::jsonb,
          decided_at = now(),
          updated_at = now()
        where id = $1 and status = 'draft'
      `,
      [row.id, JSON.stringify(accepted)],
    );
    await queryable.query(
      `
        update vocabulary_items
        set example_translations_zh = $3::jsonb, updated_at = now()
        where person_id = $1 and id = $2
      `,
      [
        row.person_id,
        row.source_vocabulary_item_id,
        JSON.stringify(accepted.sourceExampleTranslationsZh ?? []),
      ],
    );
    return { status: "accepted", draft: accepted } as const;
  });
}

export async function addPostgresAiCandidateToLearning(
  input: PublicAiCandidateAdd,
  dependencies: Readonly<{ transaction?: TransactionRunner }> = {},
) {
  const transaction = dependencies.transaction ?? withPostgresTransaction;
  return transaction(async (queryable) => {
    const row = await lockDraft(queryable, input.draftId);
    if (row.status !== "accepted" || !row.accepted_content_json) {
      throw new Error("Accept the suggestion before adding one of its words");
    }
    const source = trustedSource(row);
    if (buildAiSourceHash(source) !== row.source_hash) {
      throw new Error("This word changed after generation. Please create a fresh suggestion.");
    }
    const accepted = validateStoredAiEnrichmentDraft(row.accepted_content_json);
    const candidate = acceptedCandidate(accepted, input.candidateWord);
    if (!candidate) throw new Error("This word is not part of the accepted suggestion");
    const normalizedText = normalizeSurfaceText(input.surfaceText);
    if (!normalizedText) throw new Error("The word or phrase is not valid");
    const exampleTranslationZh = input.exampleTranslationZh?.trim() ?? "";
    if (input.example.trim() && !exampleTranslationZh) {
      throw new Error("Add a Chinese translation for the example");
    }
    const exactCandidate = normalizedText === normalizeSurfaceText(candidate.word);
    const duplicate = await queryable.query<{ id: string; surface_text: string }>(
      `
        select id, surface_text
        from vocabulary_items
        where person_id = $1 and normalized_text = $2
        order by (status = 'new') desc, system_created_at asc
        limit 1
        for update
      `,
      [row.person_id, normalizedText],
    );
    let target = duplicate.rows[0] ?? null;
    let created = false;
    if (!target) {
      const targetId = randomUUID();
      const sourceActionId = exactCandidate ? row.id : targetId;
      const createdAt = new Date().toISOString();
      await queryable.query(
        `
          insert into vocabulary_items (
            id, person_id, surface_text, normalized_text, meaning_zh, meanings_zh,
            example, examples, example_translations_zh, notes, rarity_score, learning_track, tags,
            source, import_batch_id, status, created_at, system_created_at,
            updated_at, timezone, archived_at
          ) values (
            $1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, '', null, $10,
            null, $11, null, 'new', $12, $12, $12, $13, null
          )
        `,
        [
          targetId,
          row.person_id,
          input.surfaceText,
          normalizedText,
          input.meaningZh,
          JSON.stringify(input.meaningZh ? [input.meaningZh] : []),
          input.example,
          JSON.stringify(input.example ? [input.example] : []),
          JSON.stringify(input.example ? [exampleTranslationZh] : []),
          input.learningTrack,
          exactCandidate ? "ai_generated" : "manual",
          createdAt,
          input.timezone,
        ],
      );
      await queryable.query(
        `
          insert into vocabulary_creation_facts (
            id, person_id, original_vocabulary_item_id, source_action_id,
            track_at_creation, source_kind, history_origin, system_created_at
          ) values ($1, $2, $3, $4, $5, $6, 'recorded', $7)
        `,
        [
          randomUUID(),
          row.person_id,
          targetId,
          sourceActionId,
          input.learningTrack,
          exactCandidate ? "ai_add_to_learning" : "single",
          createdAt,
        ],
      );
      target = { id: targetId, surface_text: input.surfaceText };
      created = true;
    }
    let relationLinked = false;
    if (exactCandidate && target.id !== row.source_vocabulary_item_id) {
      const relation = await queryable.query<{ id: string }>(
        `
          insert into vocabulary_relations (
            id, person_id, source_vocabulary_item_id, target_vocabulary_item_id,
            relation_type, difference_zh, example_pair, ai_run_id, created_at
          ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, now())
          on conflict (
            person_id, source_vocabulary_item_id, target_vocabulary_item_id,
            relation_type
          ) do nothing
          returning id
        `,
        [
          randomUUID(),
          row.person_id,
          row.source_vocabulary_item_id,
          target.id,
          candidate.relationType,
          candidate.differenceZh,
          JSON.stringify(candidate.examplePair),
          row.ai_run_id,
        ],
      );
      relationLinked = relation.rows.length > 0;
    }
    return { itemId: target.id, surfaceText: target.surface_text, created, relationLinked };
  });
}
