import { AI_DISCLOSURE_VERSION } from "./contract";
import type {
  PublicAiCandidateAdd,
  PublicAiDraftDecision,
} from "./formal-action-contract";
import type {
  AiContextExplanation,
  AiEnrichmentDraft,
  PublicAiContextExplainRequest,
  PublicAiEnrichmentRequest,
} from "./types";

export class FormalAiClientError extends Error {
  readonly reason: string;
  readonly status: number;

  constructor(message: string, reason: string, status: number) {
    super(message);
    this.name = "FormalAiClientError";
    this.reason = reason;
    this.status = status;
  }
}

async function postFormalAi<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as
    | Record<string, unknown>
    | null;
  if (!response.ok) {
    throw new FormalAiClientError(
      typeof payload?.message === "string"
        ? payload.message
        : "AI suggestions are resting for now.",
      typeof payload?.reason === "string" ? payload.reason : "request_failed",
      response.status,
    );
  }
  return payload as T;
}

export function confirmFormalAiDisclosure(vocabularyEntryId: string) {
  return postFormalAi<{ ok: true; status: "confirmed" }>("/api/ai/disclosure", {
    vocabularyEntryId,
    disclosureVersion: AI_DISCLOSURE_VERSION,
    confirmed: true,
  });
}

export function requestFormalAiEnrichment(
  vocabularyEntryId: string,
  idempotencyKey: string,
) {
  const request: PublicAiEnrichmentRequest = {
    vocabularyEntryId,
    feature: "enrichment_v1",
    disclosureVersion: AI_DISCLOSURE_VERSION,
    idempotencyKey,
  };
  return postFormalAi<{
    ok: true;
    status: "generated" | "cached" | "replay";
    stored: {
      resourceId: string;
      value: AiEnrichmentDraft;
      lineage: { modelLabel: string };
    };
  }>("/api/ai/enrichment", request);
}

export function requestFormalAiContextExplanation(
  request: PublicAiContextExplainRequest,
) {
  return postFormalAi<{
    ok: true;
    status: "generated" | "cached" | "replay";
    stored: {
      resourceId: string;
      value: AiContextExplanation;
      lineage: { modelLabel: string };
    };
  }>("/api/ai/context-explain", request);
}

export function decideFormalAiDraft(input: PublicAiDraftDecision) {
  return postFormalAi<{ ok: true; result: unknown }>(
    "/api/ai/enrichment/decision",
    input,
  );
}

export function addFormalAiCandidate(input: PublicAiCandidateAdd) {
  return postFormalAi<{ ok: true; result: unknown }>(
    "/api/ai/enrichment/add-to-learning",
    input,
  );
}
