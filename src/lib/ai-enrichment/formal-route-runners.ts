import { runFormalAiOrchestration } from "./formal-orchestration";
import {
  createPostgresContextDependencies,
  createPostgresEnrichmentDependencies,
} from "./postgres-formal-orchestration";
import {
  confirmPostgresAiDisclosure,
} from "./postgres-formal-store";
import {
  addPostgresAiCandidateToLearning,
  decidePostgresAiDraft,
} from "./postgres-formal-actions";
import type {
  PublicAiCandidateAdd,
  PublicAiDraftDecision,
} from "./formal-action-contract";
import type {
  PublicAiContextExplainRequest,
  PublicAiDisclosureConfirmationRequest,
  PublicAiEnrichmentRequest,
} from "./types";

function statusForReason(reason: string) {
  if (reason === "disclosure_required") return 428;
  if (reason === "source_unavailable") return 404;
  if (reason === "already_processing") return 409;
  if (reason.includes("conflict")) return 409;
  return 503;
}

function routeResult(result: Awaited<ReturnType<typeof runFormalAiOrchestration>>) {
  return {
    body: result,
    status: result.ok ? 200 : statusForReason(result.reason),
  };
}

export async function runPostgresFormalEnrichmentRoute(input: Readonly<{
  request: PublicAiEnrichmentRequest;
  sessionTokenHash: string;
}>) {
  try {
    return routeResult(await runFormalAiOrchestration({
      ...input,
      dependencies: createPostgresEnrichmentDependencies(input.request),
    }));
  } catch (error) {
    const conflict = error instanceof Error && /conflict/iu.test(error.message);
    return {
      body: {
        ok: false,
        status: conflict ? "rejected" : "resting",
        reason: conflict ? "idempotency_conflict" : "formal_route_unavailable",
      },
      status: conflict ? 409 : 503,
    };
  }
}

export async function runPostgresFormalContextRoute(input: Readonly<{
  request: PublicAiContextExplainRequest;
  sessionTokenHash: string;
}>) {
  try {
    return routeResult(await runFormalAiOrchestration({
      ...input,
      dependencies: createPostgresContextDependencies(input.request),
    }));
  } catch (error) {
    const conflict = error instanceof Error && /conflict/iu.test(error.message);
    return {
      body: {
        ok: false,
        status: conflict ? "rejected" : "resting",
        reason: conflict ? "idempotency_conflict" : "formal_route_unavailable",
      },
      status: conflict ? 409 : 503,
    };
  }
}

export async function confirmPostgresFormalDisclosure(input: Readonly<{
  request: PublicAiDisclosureConfirmationRequest;
  sessionTokenHash: string;
  disclosureDigest: string;
  confirmedAt: string;
}>) {
  await confirmPostgresAiDisclosure({
    vocabularyEntryId: input.request.vocabularyEntryId,
    sessionTokenHash: input.sessionTokenHash,
    disclosureDigest: input.disclosureDigest,
    confirmedAt: input.confirmedAt,
  });
}

export function runPostgresFormalDraftDecision(input: PublicAiDraftDecision) {
  return decidePostgresAiDraft(input);
}

export function runPostgresFormalCandidateAdd(input: PublicAiCandidateAdd) {
  return addPostgresAiCandidateToLearning(input);
}
