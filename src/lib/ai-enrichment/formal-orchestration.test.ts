import { describe, expect, it, vi } from "vitest";
import { AI_DISCLOSURE_VERSION } from "./contract";
import {
  runFormalAiOrchestration,
  type FormalAiDependencies,
} from "./formal-orchestration";
import { GeminiProviderAdapterError } from "./gemini-provider-adapter";
import type {
  AiEnrichmentDraft,
  PublicAiEnrichmentRequest,
  TrustedAiLexicalPayload,
} from "./types";

const request: PublicAiEnrichmentRequest = {
  vocabularyEntryId: "00000000-0000-4000-8000-000000007b11",
  feature: "enrichment_v1",
  disclosureVersion: AI_DISCLOSURE_VERSION,
  idempotencyKey: "request-one",
};
const payload: TrustedAiLexicalPayload = {
  term: "adapt",
  meaningsZh: ["适应"],
  examples: ["We adapt to change."],
};
const value: AiEnrichmentDraft = {
  additionalMeaningsZh: [],
  examples: ["People adapt gradually."],
  similarWords: [],
  confusableWords: [],
};
const usage = {
  promptTokenCount: 100,
  candidatesTokenCount: 80,
  thoughtsTokenCount: 20,
  totalTokenCount: 200,
};
const stored = {
  resourceId: "00000000-0000-4000-8000-000000007b12",
  value,
  lineage: {
    aiRunId: "00000000-0000-4000-8000-000000007b13",
    provider: "google-gemini-api" as const,
    model: "gemini-3.1-flash-lite" as const,
    modelLabel: "Gemini 3.1 Flash-Lite" as const,
  },
};

function dependencies(overrides: Partial<FormalAiDependencies<
  PublicAiEnrichmentRequest,
  TrustedAiLexicalPayload,
  AiEnrichmentDraft,
  { aiRunId: string }
>> = {}) {
  const base: FormalAiDependencies<
    PublicAiEnrichmentRequest,
    TrustedAiLexicalPayload,
    AiEnrichmentDraft,
    { aiRunId: string }
  > = {
    loadSource: vi.fn(async () => ({
      personId: "00000000-0000-4000-8000-000000007b10",
      vocabularyEntryId: request.vocabularyEntryId,
      payload,
    })),
    hasDisclosureConfirmation: vi.fn(async () => true),
    claimRequest: vi.fn(async () => ({ status: "owner" as const })),
    checkProviderAvailability: vi.fn(async () => ({
      status: "available" as const,
      reason: null,
    })),
    reserveProviderAttempt: vi.fn(async () => ({
      status: "reserved" as const,
      handle: { aiRunId: stored.lineage.aiRunId },
    })),
    callProvider: vi.fn(async () => ({
      value,
      usage,
      modelVersion: "gemini-3.1-flash-lite-001",
      providerResponseId: "provider-response-1",
    })),
    reloadSource: vi.fn(async () => ({
      personId: "00000000-0000-4000-8000-000000007b10",
      vocabularyEntryId: request.vocabularyEntryId,
      payload,
    })),
    completeSuccess: vi.fn(async () => stored),
    completeFailure: vi.fn(async () => undefined),
    now: () => new Date("2026-07-17T00:00:00.000Z"),
    monotonicNow: () => 10,
  };
  return { ...base, ...overrides };
}

describe("V2-7B-1 formal AI orchestration", () => {
  it("requires current session-bound Disclosure evidence before claim or quota", async () => {
    const deps = dependencies({ hasDisclosureConfirmation: vi.fn(async () => false) });
    const result = await runFormalAiOrchestration({
      request,
      sessionTokenHash: "session-hash",
      dependencies: deps,
    });
    expect(result).toEqual({ ok: false, status: "rejected", reason: "disclosure_required" });
    expect(deps.claimRequest).not.toHaveBeenCalled();
    expect(deps.reserveProviderAttempt).not.toHaveBeenCalled();
    expect(deps.callProvider).not.toHaveBeenCalled();
  });

  it("serves Cache before quota reservation and provider submission", async () => {
    const deps = dependencies({ claimRequest: vi.fn(async () => ({ status: "cache_hit" as const, stored })) });
    const result = await runFormalAiOrchestration({ request, sessionTokenHash: "session-hash", dependencies: deps });
    expect(result).toEqual({ ok: true, status: "cached", stored });
    expect(deps.reserveProviderAttempt).not.toHaveBeenCalled();
    expect(deps.callProvider).not.toHaveBeenCalled();
  });

  it("returns a calm in-progress result for a same-Cache owner", async () => {
    const deps = dependencies({ claimRequest: vi.fn(async () => ({ status: "processing" as const })) });
    const result = await runFormalAiOrchestration({ request, sessionTokenHash: "session-hash", dependencies: deps });
    expect(result).toEqual({ ok: false, status: "resting", reason: "already_processing" });
    expect(deps.reserveProviderAttempt).not.toHaveBeenCalled();
  });

  it("closes a claimed request before quota when the provider gate is resting", async () => {
    const deps = dependencies({
      checkProviderAvailability: vi.fn(async () => ({
        status: "resting" as const,
        reason: "provider_activation_pending" as const,
      })),
    });
    const result = await runFormalAiOrchestration({ request, sessionTokenHash: "session-hash", dependencies: deps });
    expect(result).toEqual({
      ok: false,
      status: "resting",
      reason: "provider_activation_pending",
    });
    expect(deps.reserveProviderAttempt).not.toHaveBeenCalled();
    expect(deps.callProvider).not.toHaveBeenCalled();
    expect(deps.completeFailure).toHaveBeenCalledWith(expect.objectContaining({
      handle: null,
      terminalCategory: "provider_activation_pending",
    }));
  });

  it("never calls the provider after the bounded rollout reservation is blocked", async () => {
    const deps = dependencies({
      reserveProviderAttempt: vi.fn(async () => ({
        status: "blocked" as const,
        terminalCategory: "stage8_3_production_rollout_attempt_limit",
      })),
    });

    const result = await runFormalAiOrchestration({
      request,
      sessionTokenHash: "session-hash",
      dependencies: deps,
    });

    expect(result).toEqual({
      ok: false,
      status: "resting",
      reason: "stage8_3_production_rollout_attempt_limit",
    });
    expect(deps.callProvider).not.toHaveBeenCalled();
    expect(deps.completeFailure).toHaveBeenCalledWith(expect.objectContaining({
      handle: null,
      terminalCategory: "stage8_3_production_rollout_attempt_limit",
    }));
  });

  it("persists a validated result only after source revalidation", async () => {
    const deps = dependencies();
    const result = await runFormalAiOrchestration({ request, sessionTokenHash: "session-hash", dependencies: deps });
    expect(result).toEqual({ ok: true, status: "generated", stored });
    expect(deps.completeSuccess).toHaveBeenCalledTimes(1);
    expect(deps.completeFailure).not.toHaveBeenCalled();
  });

  it("settles reliable usage but rejects a result after a source edit", async () => {
    const deps = dependencies({
      reloadSource: vi.fn(async () => ({
        personId: "00000000-0000-4000-8000-000000007b10",
        vocabularyEntryId: request.vocabularyEntryId,
        payload: { ...payload, meaningsZh: ["改编"] },
      })),
    });
    const result = await runFormalAiOrchestration({ request, sessionTokenHash: "session-hash", dependencies: deps });
    expect(result).toEqual({ ok: false, status: "rejected", reason: "source_changed" });
    expect(deps.completeFailure).toHaveBeenCalledWith(expect.objectContaining({
      terminalCategory: "source_changed",
      usage,
      providerResponseId: "provider-response-1",
    }));
    expect(deps.completeSuccess).not.toHaveBeenCalled();
  });

  it("reconciles provider usage retained on a locally rejected response", async () => {
    const error = new GeminiProviderAdapterError(
      "provider_response_contract",
      "invalid",
      null,
      { usage, modelVersion: "gemini-3.1-flash-lite-001", providerResponseId: "provider-response-2" },
    );
    const deps = dependencies({ callProvider: vi.fn(async () => { throw error; }) });
    const result = await runFormalAiOrchestration({ request, sessionTokenHash: "session-hash", dependencies: deps });
    expect(result).toEqual({ ok: false, status: "resting", reason: "provider_response_contract" });
    expect(deps.completeFailure).toHaveBeenCalledWith(expect.objectContaining({
      usage,
      providerResponseId: "provider-response-2",
    }));
  });
});
