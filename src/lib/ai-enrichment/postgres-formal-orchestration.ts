import { randomUUID } from "node:crypto";

import {
  AI_DISCLOSURE_VERSION,
  AI_OUTPUT_SCHEMA_VERSION,
  AI_PROMPT_VERSION,
  GEMINI_STAGE2_MODEL,
} from "./contract";
import {
  AI_CONTEXT_OUTPUT_SCHEMA_VERSION,
  AI_CONTEXT_PROMPT_VERSION,
} from "./context-contract";
import type {
  FormalAiDependencies,
  FormalAiRequestIdentity,
} from "./formal-orchestration";
import {
  createGeminiProviderAdapter,
  type GeminiProviderMaterials,
} from "./gemini-provider-adapter";
import {
  loadContextProviderMaterials,
  loadEnrichmentProviderMaterials,
} from "./provider-materials";
import {
  reservePostgresAiProviderAttempt,
  settlePostgresAiProviderAttempt,
  type PostgresAiReservationHandle,
} from "./postgres-accounting";
import {
  claimPostgresFormalAiRequest,
  hasPostgresAiDisclosureConfirmation,
  loadPostgresFormalAiSource,
  markPostgresFormalAiRequestFailed,
  persistPostgresFormalAiSuccess,
} from "./postgres-formal-store";
import type {
  AiContextExplanation,
  AiEnrichmentDraft,
  PublicAiContextExplainRequest,
  PublicAiEnrichmentRequest,
  TrustedAiContextPayload,
  TrustedAiLexicalPayload,
} from "./types";
import { withPostgresTransaction } from "@/lib/storage/postgres/client";
import { resolveAiRuntimeHealth } from "./runtime-config";

function getGeminiAdapter() {
  return createGeminiProviderAdapter(process.env.GEMINI_API_KEY ?? "");
}

function settlementOutcome(category: string) {
  return /(?:response_contract|nonstop_finish|content_block|usage_exceeded|model_|source_changed)/u
    .test(category)
    ? "rejected" as const
    : "failed" as const;
}

function latencyMs(startedAt: number | null) {
  return startedAt === null
    ? 0
    : Math.max(0, Math.min(2_147_483_647, Math.round(Date.now() - startedAt)));
}

function runSubmission(
  identity: FormalAiRequestIdentity,
  promptVersion: string,
  outputSchemaVersion: string,
) {
  return {
    id: randomUUID(),
    personId: identity.personId,
    sourceVocabularyItemId: identity.vocabularyEntryId,
    feature: identity.feature,
    model: GEMINI_STAGE2_MODEL,
    modelLabel: "Gemini 3.1 Flash-Lite",
    promptVersion,
    sourceHash: identity.sourceHash,
    outputSchemaVersion,
    disclosureVersion: AI_DISCLOSURE_VERSION,
    idempotencyKeyHash: identity.idempotencyKeyHash,
    cacheKeyHash: identity.cacheKeyHash,
    createdAt: identity.now,
  } as const;
}

function commonDependencies<
  TRequest extends PublicAiEnrichmentRequest | PublicAiContextExplainRequest,
  TPayload extends TrustedAiLexicalPayload | TrustedAiContextPayload,
  TResult extends AiEnrichmentDraft | AiContextExplanation,
>(input: Readonly<{
  request: TRequest;
  promptVersion: string;
  outputSchemaVersion: string;
  loadMaterials: () => Promise<GeminiProviderMaterials>;
  call: (
    payload: TPayload,
    materials: GeminiProviderMaterials,
    signal?: AbortSignal,
  ) => Promise<Readonly<{
    value: TResult;
    usage: import("./types").GeminiUsage;
    modelVersion: string;
    providerResponseId: string | null;
  }>>;
}>): FormalAiDependencies<TRequest, TPayload, TResult, PostgresAiReservationHandle> {
  let payloadForClaim: TPayload | null = null;
  return {
    async loadSource(request) {
      const source = await loadPostgresFormalAiSource(request as never);
      if (source) payloadForClaim = source.payload as TPayload;
      return source as import("./formal-orchestration").FormalAiSource<TPayload> | null;
    },
    hasDisclosureConfirmation: hasPostgresAiDisclosureConfirmation,
    async claimRequest(identity) {
      if (!payloadForClaim) throw new Error("AI source must load before claim");
      return claimPostgresFormalAiRequest<TResult>(identity, payloadForClaim);
    },
    async checkProviderAvailability() {
      return resolveAiRuntimeHealth(process.env, new Date()).availability;
    },
    async reserveProviderAttempt(identity) {
      const reservation = await reservePostgresAiProviderAttempt(
        runSubmission(identity, input.promptVersion, input.outputSchemaVersion),
      );
      if (reservation.status === "reserved") {
        return { status: "reserved", handle: reservation.handle };
      }
      if (reservation.status === "blocked") {
        return {
          status: "blocked",
          terminalCategory: reservation.reasons[0] ?? "quota_exhausted",
        };
      }
      return { status: "blocked", terminalCategory: "already_processing" };
    },
    async callProvider(payload, signal) {
      return input.call(payload, await input.loadMaterials(), signal);
    },
    async reloadSource(request) {
      return await loadPostgresFormalAiSource(request as never) as
        import("./formal-orchestration").FormalAiSource<TPayload> | null;
    },
    async completeSuccess({ identity, handle, provider, startedAt, completedAt }) {
      const resourceId = identity.feature === "enrichment_v1"
        ? randomUUID()
        : identity.cacheKeyHash;
      await settlePostgresAiProviderAttempt(
        handle,
        {
          outcome: "succeeded",
          usage: provider.usage,
          providerResponseId: provider.providerResponseId,
          latencyMs: latencyMs(startedAt),
          completedAt,
        },
        {
          persistResult: async (queryable, aiRunId) => {
            await persistPostgresFormalAiSuccess({
              identity,
              aiRunId,
              value: provider.value,
              completedAt,
              resourceId,
              contextPayload: input.request.feature === "context_explain_v1"
                ? payloadForClaim as TrustedAiContextPayload
                : undefined,
              queryable,
            });
          },
        },
      );
      return {
        resourceId,
        value: provider.value,
        lineage: {
          aiRunId: handle.aiRunId,
          provider: "google-gemini-api",
          model: GEMINI_STAGE2_MODEL,
          modelLabel: "Gemini 3.1 Flash-Lite",
        },
      };
    },
    async completeFailure({
      identity,
      handle,
      terminalCategory,
      usage,
      providerResponseId,
      startedAt,
      completedAt,
    }) {
      if (!handle) {
        await withPostgresTransaction((queryable) =>
          markPostgresFormalAiRequestFailed(
            identity,
            terminalCategory,
            queryable,
            completedAt,
          ));
        return;
      }
      await settlePostgresAiProviderAttempt(
        handle,
        {
          outcome: settlementOutcome(terminalCategory),
          terminalCategory,
          usage,
          providerResponseId,
          latencyMs: latencyMs(startedAt),
          completedAt,
        },
        {
          persistFailure: async (queryable) => {
            await markPostgresFormalAiRequestFailed(
              identity,
              terminalCategory,
              queryable,
              completedAt,
            );
          },
        },
      );
    },
  };
}

export function createPostgresEnrichmentDependencies(
  request: PublicAiEnrichmentRequest,
) {
  return commonDependencies<
    PublicAiEnrichmentRequest,
    TrustedAiLexicalPayload,
    AiEnrichmentDraft
  >({
    request,
    promptVersion: AI_PROMPT_VERSION,
    outputSchemaVersion: AI_OUTPUT_SCHEMA_VERSION,
    loadMaterials: loadEnrichmentProviderMaterials,
    call: (payload, materials, signal) =>
      getGeminiAdapter().generateEnrichment(payload, materials, signal),
  });
}

export function createPostgresContextDependencies(
  request: PublicAiContextExplainRequest,
) {
  return commonDependencies<
    PublicAiContextExplainRequest,
    TrustedAiContextPayload,
    AiContextExplanation
  >({
    request,
    promptVersion: AI_CONTEXT_PROMPT_VERSION,
    outputSchemaVersion: AI_CONTEXT_OUTPUT_SCHEMA_VERSION,
    loadMaterials: loadContextProviderMaterials,
    call: (payload, materials, signal) =>
      getGeminiAdapter().generateContextExplanation(payload, materials, signal),
  });
}
