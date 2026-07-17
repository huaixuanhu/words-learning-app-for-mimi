import {
  AI_DISCLOSURE_VERSION,
  GEMINI_STAGE2_MODEL,
} from "./contract";
import {
  buildAiCacheKeyHash,
  buildAiIdempotencyKeyHash,
  buildAiRequestHash,
  buildAiSourceHash,
  currentAiDisclosureDigest,
} from "./canonical-hash";
import { GeminiProviderAdapterError } from "./gemini-provider-adapter";
import type {
  AiContextExplanation,
  AiEnrichmentDraft,
  AiGenerationAvailability,
  GeminiUsage,
  PublicAiContextExplainRequest,
  PublicAiEnrichmentRequest,
  TrustedAiContextPayload,
  TrustedAiLexicalPayload,
} from "./types";

export type FormalAiRequest =
  | PublicAiEnrichmentRequest
  | PublicAiContextExplainRequest;
export type FormalAiPayload = TrustedAiLexicalPayload | TrustedAiContextPayload;
export type FormalAiValue = AiEnrichmentDraft | AiContextExplanation;

export type FormalAiSource<TPayload extends FormalAiPayload> = Readonly<{
  personId: string;
  vocabularyEntryId: string;
  payload: TPayload;
}>;

export type FormalAiLineage = Readonly<{
  aiRunId: string;
  provider: "google-gemini-api";
  model: typeof GEMINI_STAGE2_MODEL;
  modelLabel: "Gemini 3.1 Flash-Lite";
}>;

export type FormalAiStoredResult<TResult extends FormalAiValue> = Readonly<{
  resourceId: string;
  value: TResult;
  lineage: FormalAiLineage;
}>;

export type FormalAiClaimResult<TResult extends FormalAiValue> =
  | Readonly<{ status: "owner" }>
  | Readonly<{
      status: "replay" | "cache_hit";
      stored: FormalAiStoredResult<TResult>;
    }>
  | Readonly<{ status: "processing" }>
  | Readonly<{ status: "failed"; terminalCategory: string }>;

export type FormalAiReservation<THandle> =
  | Readonly<{ status: "reserved"; handle: THandle }>
  | Readonly<{ status: "blocked"; terminalCategory: string }>;

export type FormalAiProviderResult<TResult extends FormalAiValue> = Readonly<{
  value: TResult;
  usage: GeminiUsage;
  modelVersion: string;
  providerResponseId: string | null;
}>;

export type FormalAiRequestIdentity = Readonly<{
  personId: string;
  vocabularyEntryId: string;
  feature: FormalAiRequest["feature"];
  sourceHash: string;
  requestHash: string;
  idempotencyKeyHash: string;
  cacheKeyHash: string;
  disclosureVersion: typeof AI_DISCLOSURE_VERSION;
  disclosureDigest: string;
  now: string;
}>;

export type FormalAiDependencies<
  TRequest extends FormalAiRequest,
  TPayload extends FormalAiPayload,
  TResult extends FormalAiValue,
  THandle,
> = Readonly<{
  loadSource: (request: TRequest) => Promise<FormalAiSource<TPayload> | null>;
  hasDisclosureConfirmation: (input: Readonly<{
    personId: string;
    sessionTokenHash: string;
    disclosureVersion: typeof AI_DISCLOSURE_VERSION;
    disclosureDigest: string;
  }>) => Promise<boolean>;
  claimRequest: (
    identity: FormalAiRequestIdentity,
  ) => Promise<FormalAiClaimResult<TResult>>;
  checkProviderAvailability: () => Promise<AiGenerationAvailability>;
  reserveProviderAttempt: (
    identity: FormalAiRequestIdentity,
  ) => Promise<FormalAiReservation<THandle>>;
  callProvider: (
    payload: TPayload,
    signal?: AbortSignal,
  ) => Promise<FormalAiProviderResult<TResult>>;
  reloadSource: (request: TRequest) => Promise<FormalAiSource<TPayload> | null>;
  completeSuccess: (input: Readonly<{
    identity: FormalAiRequestIdentity;
    handle: THandle;
    provider: FormalAiProviderResult<TResult>;
    startedAt: number;
    completedAt: string;
  }>) => Promise<FormalAiStoredResult<TResult>>;
  completeFailure: (input: Readonly<{
    identity: FormalAiRequestIdentity;
    handle: THandle | null;
    terminalCategory: string;
    usage: GeminiUsage | null;
    providerResponseId: string | null;
    startedAt: number | null;
    completedAt: string;
  }>) => Promise<void>;
  now?: () => Date;
  monotonicNow?: () => number;
}>;

export type FormalAiOrchestrationResult<TResult extends FormalAiValue> =
  | Readonly<{
      ok: true;
      status: "generated" | "cached" | "replay";
      stored: FormalAiStoredResult<TResult>;
    }>
  | Readonly<{
      ok: false;
      status: "resting" | "rejected";
      reason: string;
    }>;

function safeFailureCategory(error: unknown) {
  return error instanceof GeminiProviderAdapterError
    ? error.category
    : "provider_orchestration_failed";
}

export async function runFormalAiOrchestration<
  TRequest extends FormalAiRequest,
  TPayload extends FormalAiPayload,
  TResult extends FormalAiValue,
  THandle,
>(input: Readonly<{
  request: TRequest;
  sessionTokenHash: string;
  signal?: AbortSignal;
  dependencies: FormalAiDependencies<TRequest, TPayload, TResult, THandle>;
}>): Promise<FormalAiOrchestrationResult<TResult>> {
  const now = input.dependencies.now ?? (() => new Date());
  const monotonicNow = input.dependencies.monotonicNow ?? (() => Date.now());
  const source = await input.dependencies.loadSource(input.request);
  if (!source || source.vocabularyEntryId !== input.request.vocabularyEntryId) {
    return { ok: false, status: "rejected", reason: "source_unavailable" };
  }

  const disclosureDigest = currentAiDisclosureDigest();
  const hasDisclosure = await input.dependencies.hasDisclosureConfirmation({
    personId: source.personId,
    sessionTokenHash: input.sessionTokenHash,
    disclosureVersion: AI_DISCLOSURE_VERSION,
    disclosureDigest,
  });
  if (!hasDisclosure) {
    return { ok: false, status: "rejected", reason: "disclosure_required" };
  }

  const sourceHash = buildAiSourceHash(source.payload);
  const identity: FormalAiRequestIdentity = {
    personId: source.personId,
    vocabularyEntryId: source.vocabularyEntryId,
    feature: input.request.feature,
    sourceHash,
    requestHash: buildAiRequestHash(
      source.personId,
      input.request,
      sourceHash,
    ),
    idempotencyKeyHash: buildAiIdempotencyKeyHash(
      source.personId,
      input.request.idempotencyKey,
    ),
    cacheKeyHash: buildAiCacheKeyHash({
      personId: source.personId,
      vocabularyEntryId: source.vocabularyEntryId,
      feature: input.request.feature,
      sourceHash,
    }),
    disclosureVersion: AI_DISCLOSURE_VERSION,
    disclosureDigest,
    now: now().toISOString(),
  };

  const claim = await input.dependencies.claimRequest(identity);
  if (claim.status === "replay" || claim.status === "cache_hit") {
    return {
      ok: true,
      status: claim.status === "replay" ? "replay" : "cached",
      stored: claim.stored,
    };
  }
  if (claim.status === "processing") {
    return { ok: false, status: "resting", reason: "already_processing" };
  }
  if (claim.status === "failed") {
    return { ok: false, status: "rejected", reason: claim.terminalCategory };
  }

  const availability = await input.dependencies.checkProviderAvailability();
  if (availability.status === "resting") {
    await input.dependencies.completeFailure({
      identity,
      handle: null,
      terminalCategory: availability.reason,
      usage: null,
      providerResponseId: null,
      startedAt: null,
      completedAt: now().toISOString(),
    });
    return { ok: false, status: "resting", reason: availability.reason };
  }

  const reservation = await input.dependencies.reserveProviderAttempt(identity);
  if (reservation.status === "blocked") {
    await input.dependencies.completeFailure({
      identity,
      handle: null,
      terminalCategory: reservation.terminalCategory,
      usage: null,
      providerResponseId: null,
      startedAt: null,
      completedAt: now().toISOString(),
    });
    return { ok: false, status: "resting", reason: reservation.terminalCategory };
  }

  const startedAt = monotonicNow();
  try {
    const provider = await input.dependencies.callProvider(
      source.payload,
      input.signal,
    );
    if (!provider.modelVersion.startsWith(GEMINI_STAGE2_MODEL)) {
      throw new GeminiProviderAdapterError(
        "provider_model_mismatch",
        "Gemini returned an unexpected model version.",
        null,
        provider,
      );
    }
    const currentSource = await input.dependencies.reloadSource(input.request);
    if (
      !currentSource ||
      currentSource.personId !== source.personId ||
      buildAiSourceHash(currentSource.payload) !== sourceHash
    ) {
      await input.dependencies.completeFailure({
        identity,
        handle: reservation.handle,
        terminalCategory: "source_changed",
        usage: provider.usage,
        providerResponseId: provider.providerResponseId,
        startedAt,
        completedAt: now().toISOString(),
      });
      return { ok: false, status: "rejected", reason: "source_changed" };
    }
    const stored = await input.dependencies.completeSuccess({
      identity,
      handle: reservation.handle,
      provider,
      startedAt,
      completedAt: now().toISOString(),
    });
    return { ok: true, status: "generated", stored };
  } catch (error) {
    const adapterError = error instanceof GeminiProviderAdapterError ? error : null;
    const terminalCategory = safeFailureCategory(error);
    await input.dependencies.completeFailure({
      identity,
      handle: reservation.handle,
      terminalCategory,
      usage: adapterError?.usage ?? null,
      providerResponseId: adapterError?.providerResponseId ?? null,
      startedAt,
      completedAt: now().toISOString(),
    });
    return { ok: false, status: "resting", reason: terminalCategory };
  }
}
