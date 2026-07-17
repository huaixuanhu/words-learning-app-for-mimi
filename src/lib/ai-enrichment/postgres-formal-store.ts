import { randomUUID } from "node:crypto";
import {
  AI_DISCLOSURE_VERSION,
  validateStoredAiEnrichmentDraft,
  validateTrustedAiLexicalPayload,
} from "./contract";
import {
  buildTrustedAiContextPayload,
  validateAiContextExplanation,
} from "./context-contract";
import type {
  FormalAiClaimResult,
  FormalAiRequest,
  FormalAiRequestIdentity,
  FormalAiSource,
  FormalAiStoredResult,
  FormalAiValue,
} from "./formal-orchestration";
import type {
  AiContextExplanation,
  AiEnrichmentDraft,
  PublicAiContextExplainRequest,
  PublicAiEnrichmentRequest,
  TrustedAiContextPayload,
  TrustedAiLexicalPayload,
} from "./types";
import {
  getPostgresPool,
  type PostgresQueryable,
  withPostgresTransaction,
} from "@/lib/storage/postgres/client";

const DATABASE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CONTEXT_CACHE_MS = 7 * 24 * 60 * 60 * 1_000;
export const AI_REQUEST_OWNERSHIP_LEASE_MS = 150_000;
type TransactionRunner = <T>(
  callback: (queryable: PostgresQueryable) => Promise<T>,
) => Promise<T>;

type SourceRow = Readonly<{
  id: string;
  person_id: string;
  surface_text: string;
  meaning_zh: string;
  meanings_zh: unknown;
  example: string;
  examples: unknown;
  status: string;
}>;

type IdempotencyRow = Readonly<{
  request_hash: string;
  status: "processing" | "succeeded" | "failed";
  result_ai_run_id: string | null;
  terminal_category: string | null;
  lease_expires_at: string | Date | null;
}>;

function assertDatabaseUuid(value: string, label: string) {
  if (!DATABASE_UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a database UUID`);
  }
}

function textArray(value: unknown, fallback: string) {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return fallback.trim() ? [fallback] : [];
}

async function loadSourceRow(
  vocabularyEntryId: string,
  queryable: PostgresQueryable,
) {
  assertDatabaseUuid(vocabularyEntryId, "vocabularyEntryId");
  const result = await queryable.query<SourceRow>(
    `
      select
        id, person_id, surface_text, meaning_zh, meanings_zh,
        example, examples, status
      from vocabulary_items
      where id = $1
      limit 1
    `,
    [vocabularyEntryId],
  );
  const row = result.rows[0];
  return row?.status === "new" ? row : null;
}

export async function loadPostgresFormalAiSource(
  request: PublicAiEnrichmentRequest,
  queryable?: PostgresQueryable,
): Promise<FormalAiSource<TrustedAiLexicalPayload> | null>;
export async function loadPostgresFormalAiSource(
  request: PublicAiContextExplainRequest,
  queryable?: PostgresQueryable,
): Promise<FormalAiSource<TrustedAiContextPayload> | null>;
export async function loadPostgresFormalAiSource(
  request: FormalAiRequest,
  queryable: PostgresQueryable = getPostgresPool(),
): Promise<FormalAiSource<TrustedAiLexicalPayload | TrustedAiContextPayload> | null> {
  const row = await loadSourceRow(request.vocabularyEntryId, queryable);
  if (!row) return null;
  const meaningsZh = textArray(row.meanings_zh, row.meaning_zh);
  const examples = textArray(row.examples, row.example);
  const payload = request.feature === "enrichment_v1"
    ? validateTrustedAiLexicalPayload({
        term: row.surface_text,
        meaningsZh,
        examples,
      })
    : buildTrustedAiContextPayload(request, {
        surfaceText: row.surface_text,
        meaningZh: row.meaning_zh,
        meaningsZh,
        example: row.example,
        examples,
      });
  return {
    personId: row.person_id,
    vocabularyEntryId: row.id,
    payload,
  };
}

export async function confirmPostgresAiDisclosure(input: Readonly<{
  vocabularyEntryId: string;
  sessionTokenHash: string;
  disclosureDigest: string;
  confirmedAt: string;
  queryable?: PostgresQueryable;
}>) {
  const queryable = input.queryable ?? getPostgresPool();
  const source = await loadSourceRow(input.vocabularyEntryId, queryable);
  if (!source) throw new Error("The vocabulary entry is unavailable");
  await queryable.query(
    `
      insert into ai_disclosure_confirmations (
        id, person_id, session_token_hash, disclosure_version,
        disclosure_digest, confirmed_at
      )
      values ($1, $2, $3, $4, $5, $6)
      on conflict (
        person_id, session_token_hash, disclosure_version, disclosure_digest
      ) do update set confirmed_at = excluded.confirmed_at
    `,
    [
      randomUUID(),
      source.person_id,
      input.sessionTokenHash,
      AI_DISCLOSURE_VERSION,
      input.disclosureDigest,
      input.confirmedAt,
    ],
  );
  return { personId: source.person_id };
}

export async function hasPostgresAiDisclosureConfirmation(input: Readonly<{
  personId: string;
  sessionTokenHash: string;
  disclosureVersion: typeof AI_DISCLOSURE_VERSION;
  disclosureDigest: string;
  queryable?: PostgresQueryable;
}>) {
  const queryable = input.queryable ?? getPostgresPool();
  const result = await queryable.query<{ confirmed: boolean }>(
    `
      select exists (
        select 1
        from ai_disclosure_confirmations
        where person_id = $1
          and session_token_hash = $2
          and disclosure_version = $3
          and disclosure_digest = $4
      ) as confirmed
    `,
    [
      input.personId,
      input.sessionTokenHash,
      input.disclosureVersion,
      input.disclosureDigest,
    ],
  );
  return result.rows[0]?.confirmed === true;
}

async function loadStoredResult<TResult extends FormalAiValue>(
  feature: FormalAiRequest["feature"],
  aiRunId: string,
  payload: TrustedAiLexicalPayload | TrustedAiContextPayload,
  queryable: PostgresQueryable,
): Promise<FormalAiStoredResult<TResult> | null> {
  if (feature === "enrichment_v1") {
    const result = await queryable.query<{
      id: string;
      draft_json: unknown;
      accepted_content_json: unknown;
      status: string;
    }>(
      `
        select id, draft_json, accepted_content_json, status
        from ai_enrichment_drafts
        where ai_run_id = $1 and status in ('draft', 'accepted')
        order by updated_at desc
        limit 1
      `,
      [aiRunId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const value = validateStoredAiEnrichmentDraft(
      row.status === "accepted" ? row.accepted_content_json : row.draft_json,
    );
    return {
      resourceId: row.id,
      value: value as TResult,
      lineage: {
        aiRunId,
        provider: "google-gemini-api",
        model: "gemini-3.1-flash-lite",
        modelLabel: "Gemini 3.1 Flash-Lite",
      },
    };
  }
  const result = await queryable.query<{
    cache_key_hash: string;
    explanation_json: unknown;
  }>(
    `
      select cache_key_hash, explanation_json
      from ai_context_explanation_cache
      where ai_run_id = $1 and expires_at > now()
      order by created_at desc
      limit 1
    `,
    [aiRunId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const value = validateAiContextExplanation(
    row.explanation_json,
    payload as TrustedAiContextPayload,
  );
  return {
    resourceId: row.cache_key_hash,
    value: value as TResult,
    lineage: {
      aiRunId,
      provider: "google-gemini-api",
      model: "gemini-3.1-flash-lite",
      modelLabel: "Gemini 3.1 Flash-Lite",
    },
  };
}

export async function claimPostgresFormalAiRequest<TResult extends FormalAiValue>(
  identity: FormalAiRequestIdentity,
  payload: TrustedAiLexicalPayload | TrustedAiContextPayload,
  dependencies: Readonly<{
    transaction?: TransactionRunner;
  }> = {},
): Promise<FormalAiClaimResult<TResult>> {
  const transaction = dependencies.transaction ?? withPostgresTransaction;
  return transaction(async (queryable) => {
    await queryable.query(
      `select pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`${identity.personId}:${identity.idempotencyKeyHash}`],
    );
    await queryable.query(
      `select pg_advisory_xact_lock(hashtextextended($1, 1))`,
      [`${identity.personId}:${identity.cacheKeyHash}`],
    );
    await queryable.query(
      `
        update ai_request_idempotency
        set
          status = 'failed',
          terminal_category = 'request_lease_expired',
          lease_expires_at = null,
          updated_at = $3
        where person_id = $1
          and cache_key_hash = $2
          and status = 'processing'
          and lease_expires_at <= $3
      `,
      [identity.personId, identity.cacheKeyHash, identity.now],
    );
    const existing = await queryable.query<IdempotencyRow>(
      `
        select
          request_hash, status, result_ai_run_id, terminal_category,
          lease_expires_at
        from ai_request_idempotency
        where person_id = $1 and idempotency_key_hash = $2
        for update
      `,
      [identity.personId, identity.idempotencyKeyHash],
    );
    const row = existing.rows[0];
    if (row) {
      if (row.request_hash !== identity.requestHash) {
        throw new Error("AI Idempotency Key conflicts with another request");
      }
      if (row.status === "processing") return { status: "processing" };
      if (row.status === "failed") {
        return {
          status: "failed",
          terminalCategory: row.terminal_category ?? "previous_request_failed",
        };
      }
      const stored = row.result_ai_run_id
        ? await loadStoredResult<TResult>(
            identity.feature,
            row.result_ai_run_id,
            payload,
            queryable,
          )
        : null;
      if (!stored) throw new Error("AI replay result is unavailable");
      return { status: "replay", stored };
    }

    const cachedRun = await queryable.query<{ id: string }>(
      `
        select id
        from ai_runs
        where person_id = $1
          and cache_key_hash = $2
          and feature = $3
          and status = 'succeeded'
          and structure_validation_status = 'valid'
        order by completed_at desc
        limit 1
      `,
      [identity.personId, identity.cacheKeyHash, identity.feature],
    );
    const cachedRunId = cachedRun.rows[0]?.id ?? null;
    const cached = cachedRunId
      ? await loadStoredResult<TResult>(
          identity.feature,
          cachedRunId,
          payload,
          queryable,
        )
      : null;
    if (cached && cachedRunId) {
      await queryable.query(
        `
          insert into ai_request_idempotency (
            person_id, idempotency_key_hash, request_hash, cache_key_hash,
            feature, source_vocabulary_item_id, status, result_ai_run_id,
            terminal_category, lease_expires_at, created_at, updated_at
          ) values ($1, $2, $3, $4, $5, $6, 'succeeded', $7, null, null, $8, $8)
        `,
        [
          identity.personId,
          identity.idempotencyKeyHash,
          identity.requestHash,
          identity.cacheKeyHash,
          identity.feature,
          identity.vocabularyEntryId,
          cachedRunId,
          identity.now,
        ],
      );
      return { status: "cache_hit", stored: cached };
    }

    const inserted = await queryable.query<{ person_id: string }>(
      `
        insert into ai_request_idempotency (
          person_id, idempotency_key_hash, request_hash, cache_key_hash,
          feature, source_vocabulary_item_id, status, result_ai_run_id,
          terminal_category, lease_expires_at, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6, 'processing', null, null, $8, $7, $7)
        on conflict do nothing
        returning person_id
      `,
      [
        identity.personId,
        identity.idempotencyKeyHash,
        identity.requestHash,
        identity.cacheKeyHash,
        identity.feature,
        identity.vocabularyEntryId,
        identity.now,
        new Date(
          new Date(identity.now).getTime() + AI_REQUEST_OWNERSHIP_LEASE_MS,
        ).toISOString(),
      ],
    );
    return inserted.rows.length ? { status: "owner" } : { status: "processing" };
  });
}

export async function markPostgresFormalAiRequestFailed(
  identity: FormalAiRequestIdentity,
  terminalCategory: string,
  queryable: PostgresQueryable,
  updatedAt = identity.now,
) {
  const result = await queryable.query<{ person_id: string }>(
    `
      update ai_request_idempotency
      set
        status = 'failed', terminal_category = $3,
        lease_expires_at = null, updated_at = $4
      where person_id = $1
        and idempotency_key_hash = $2
        and request_hash = $5
        and status = 'processing'
      returning person_id
    `,
    [
      identity.personId,
      identity.idempotencyKeyHash,
      terminalCategory,
      updatedAt,
      identity.requestHash,
    ],
  );
  if (!result.rows.length) {
    throw new Error("AI request ownership changed before failure persistence");
  }
}

export async function persistPostgresFormalAiSuccess(input: Readonly<{
  identity: FormalAiRequestIdentity;
  aiRunId: string;
  value: FormalAiValue;
  completedAt: string;
  resourceId: string;
  contextPayload?: TrustedAiContextPayload;
  queryable: PostgresQueryable;
}>) {
  if (input.identity.feature === "enrichment_v1") {
    await input.queryable.query(
      `
        insert into ai_enrichment_drafts (
          id, person_id, source_vocabulary_item_id, ai_run_id, status,
          draft_json, accepted_content_json, created_at, updated_at, decided_at
        ) values ($1, $2, $3, $4, 'draft', $5::jsonb, null, $6, $6, null)
      `,
      [
        input.resourceId,
        input.identity.personId,
        input.identity.vocabularyEntryId,
        input.aiRunId,
        JSON.stringify(input.value as AiEnrichmentDraft),
        input.completedAt,
      ],
    );
  } else {
    const payload = input.value as AiContextExplanation;
    if (!input.contextPayload) {
      throw new Error("Context persistence requires the trusted source span");
    }
    const expiresAt = new Date(
      new Date(input.completedAt).getTime() + CONTEXT_CACHE_MS,
    ).toISOString();
    await input.queryable.query(
      `
        insert into ai_context_explanation_cache (
          cache_key_hash, person_id, source_vocabulary_item_id, ai_run_id,
          source_hash, example_index, selected_start, selected_end,
          explanation_json, created_at, expires_at
        )
        select
          $1, $2, $3, $4, $5,
          ($6::jsonb ->> 'exampleIndex')::integer,
          ($6::jsonb ->> 'selectedStart')::integer,
          ($6::jsonb ->> 'selectedEnd')::integer,
          $7::jsonb, $8, $9
      `,
      [
        input.resourceId,
        input.identity.personId,
        input.identity.vocabularyEntryId,
        input.aiRunId,
        input.identity.sourceHash,
        JSON.stringify(input.contextPayload),
        JSON.stringify(payload),
        input.completedAt,
        expiresAt,
      ],
    );
  }
  const completed = await input.queryable.query<{ person_id: string }>(
    `
      update ai_request_idempotency
      set
        status = 'succeeded',
        result_ai_run_id = $3,
        terminal_category = null,
        lease_expires_at = null,
        updated_at = $4
      where person_id = $1
        and idempotency_key_hash = $2
        and request_hash = $5
        and status = 'processing'
      returning person_id
    `,
    [
      input.identity.personId,
      input.identity.idempotencyKeyHash,
      input.aiRunId,
      input.completedAt,
      input.identity.requestHash,
    ],
  );
  if (!completed.rows.length) {
    throw new Error("AI request ownership changed before success persistence");
  }
}
