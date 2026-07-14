import type { PromptSeed } from "./runtime-engine";
import type { TrustedPromptClaims } from "./types";

const LOCAL_RUNTIME_KEY = "mimi-study-runtime-v1";
const MAX_PROMPT_RECORDS = 300;

type LocalPromptRecord = Readonly<{
  claims: Extract<TrustedPromptClaims, { reviewProfile: "recognition" }>;
  consumedByIdempotencyKey: string | null;
}>;

type LocalCommandRecord = Readonly<{
  commandType: "record_rating" | "reset_today";
  idempotencyKey: string;
  canonicalRequest: string;
  result: Record<string, unknown>;
  expiresAt: string;
}>;

type LocalRuntimeState = Readonly<{
  prompts: readonly LocalPromptRecord[];
  commands: readonly LocalCommandRecord[];
}>;

let memoryState: LocalRuntimeState = { prompts: [], commands: [] };

function randomId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseState(value: string | null): LocalRuntimeState {
  if (!value) {
    return memoryState;
  }

  try {
    const parsed = JSON.parse(value) as Partial<LocalRuntimeState>;
    return {
      prompts: Array.isArray(parsed.prompts) ? parsed.prompts : [],
      commands: Array.isArray(parsed.commands) ? parsed.commands : [],
    };
  } catch {
    return { prompts: [], commands: [] };
  }
}

function readState() {
  if (typeof window === "undefined") {
    return memoryState;
  }

  try {
    return parseState(window.sessionStorage.getItem(LOCAL_RUNTIME_KEY));
  } catch {
    return memoryState;
  }
}

function writeState(state: LocalRuntimeState) {
  memoryState = state;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(LOCAL_RUNTIME_KEY, JSON.stringify(state));
  } catch {
    // The in-memory operational fallback remains usable for this page session.
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }

  return value;
}

export function canonicalLocalStudyRequest(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export function issueLocalPromptToken(
  seed: PromptSeed,
  now = new Date().toISOString(),
) {
  const promptToken = randomId("local_prompt_token");
  const promptId = randomId("local_prompt");
  const expiresAt = new Date(new Date(now).getTime() + 30 * 60 * 1000).toISOString();
  const claims = {
    ...seed,
    promptId,
    promptToken,
    targetRevision: null,
    expiresAt,
  } satisfies Extract<TrustedPromptClaims, { reviewProfile: "recognition" }>;
  const current = readState();
  const activePrompts = current.prompts.filter(
    (record) => new Date(record.claims.expiresAt).getTime() > new Date(now).getTime(),
  );

  writeState({
    ...current,
    prompts: [
      { claims, consumedByIdempotencyKey: null },
      ...activePrompts,
    ].slice(0, MAX_PROMPT_RECORDS),
  });

  return promptToken;
}

export function readLocalPromptToken(
  promptToken: string,
  now = new Date().toISOString(),
) {
  const record = readState().prompts.find(
    (candidate) => candidate.claims.promptToken === promptToken,
  );

  if (!record) {
    throw new Error("This study card is stale. Please start the zone again.");
  }

  if (new Date(record.claims.expiresAt).getTime() <= new Date(now).getTime()) {
    throw new Error("This study card expired. Please start the zone again.");
  }

  return record;
}

export function consumeLocalPrompt(
  promptToken: string,
  idempotencyKey: string,
  now = new Date().toISOString(),
) {
  const current = readState();
  const record = readLocalPromptToken(promptToken, now);

  if (
    record.consumedByIdempotencyKey &&
    record.consumedByIdempotencyKey !== idempotencyKey
  ) {
    throw new Error("This study card was already saved.");
  }

  writeState({
    ...current,
    prompts: current.prompts.map((candidate) =>
      candidate.claims.promptToken === promptToken
        ? { ...candidate, consumedByIdempotencyKey: idempotencyKey }
        : candidate,
    ),
  });
}

export function readLocalCommandReplay(
  commandType: LocalCommandRecord["commandType"],
  idempotencyKey: string,
  request: unknown,
  now = new Date().toISOString(),
) {
  const existing = readState().commands.find(
    (record) =>
      record.commandType === commandType && record.idempotencyKey === idempotencyKey,
  );

  if (!existing || new Date(existing.expiresAt).getTime() <= new Date(now).getTime()) {
    return null;
  }

  if (existing.canonicalRequest !== canonicalLocalStudyRequest(request)) {
    throw new Error("The Idempotency Key was already used with a different request");
  }

  return existing.result;
}

export function completeLocalCommand(
  commandType: LocalCommandRecord["commandType"],
  idempotencyKey: string,
  request: unknown,
  result: Record<string, unknown>,
  now = new Date().toISOString(),
) {
  const current = readState();
  const withoutExisting = current.commands.filter(
    (record) =>
      !(record.commandType === commandType && record.idempotencyKey === idempotencyKey) &&
      new Date(record.expiresAt).getTime() > new Date(now).getTime(),
  );

  writeState({
    ...current,
    commands: [
      {
        commandType,
        idempotencyKey,
        canonicalRequest: canonicalLocalStudyRequest(request),
        result,
        expiresAt: new Date(new Date(now).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      ...withoutExisting,
    ],
  });
}

export function resetLocalStudyRuntimeForTests() {
  memoryState = { prompts: [], commands: [] };
}
