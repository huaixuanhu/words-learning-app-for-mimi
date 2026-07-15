import {
  AI_OUTPUT_SCHEMA_VERSION,
  validateAiEnrichmentDraft,
  validateTrustedAiLexicalPayload,
} from "./contract";
import { validateAiContextExplanation } from "./context-contract";
import type {
  AiContextExplanation,
  AiEnrichmentDraft,
  TrustedAiContextPayload,
} from "./types";

export const LOCAL_FIXTURE_LINEAGE = Object.freeze({
  provider: "local-fixture",
  model: "fixture-v1",
  modelLabel: "Local preview",
  notice: "Local preview · No AI request was made.",
});
export const LOCAL_FIXTURE_PROMPT_VERSION = "local-fixture-v1" as const;
export const LOCAL_FIXTURE_DISCLOSURE_VERSION = "local-fixture-no-network-v1" as const;
export const LOCAL_CONTEXT_PROMPT_VERSION = "local-context-fixture-v1" as const;
export const LOCAL_CONTEXT_SCHEMA_VERSION = "local-context-explanation-v1" as const;

export type LocalFixtureResult<T> = Readonly<{
  value: T;
  cacheStatus: "generated" | "cached";
  lineage: typeof LOCAL_FIXTURE_LINEAGE;
}>;

export const LOCAL_CONTEXT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
export const LOCAL_FIXTURE_CACHE_MAX_ENTRIES = 128;

type LocalContextCacheEntry = Readonly<{
  value: AiContextExplanation;
  expiresAtMs: number;
}>;

type FixtureRuntimeState = {
  enrichmentCache: Map<string, AiEnrichmentDraft>;
  contextCache: Map<string, LocalContextCacheEntry>;
  idempotency: Map<string, string>;
};

const state: FixtureRuntimeState = {
  enrichmentCache: new Map(),
  contextCache: new Map(),
  idempotency: new Map(),
};

const FIXTURE_DRAFTS: Readonly<Record<string, AiEnrichmentDraft>> = Object.freeze({
  adapt: {
    additionalMeaningsZh: [],
    examples: ["People adapt more quickly when the reason for change is clear."],
    similarWords: [],
    confusableWords: [
      {
        word: "adopt",
        type: "spelling",
        differenceZh: "adapt 表示适应；adopt 常表示采纳或收养。",
        examplePair: ["We adapt to change.", "We adopt a new policy."],
      },
    ],
  },
  affect: {
    additionalMeaningsZh: [],
    examples: ["The weather can affect how people travel."],
    similarWords: [],
    confusableWords: [
      {
        word: "effect",
        type: "usage",
        differenceZh: "affect 通常作动词；effect 通常作名词。",
        examplePair: [
          "The change affected demand.",
          "The change had an immediate effect.",
        ],
      },
    ],
  },
  effect: {
    additionalMeaningsZh: [],
    examples: ["The new rule had little effect on attendance."],
    similarWords: [{ word: "outcome", differenceZh: "outcome 更强调最终产生的结果。" }],
    confusableWords: [
      {
        word: "affect",
        type: "usage",
        differenceZh: "effect 通常作名词；affect 通常作动词。",
        examplePair: [
          "The change had an immediate effect.",
          "The change affected demand.",
        ],
      },
    ],
  },
  allocate: {
    additionalMeaningsZh: [],
    examples: ["The team allocated more time to the final review."],
    similarWords: [
      { word: "assign", differenceZh: "assign 更常用于分派任务、角色或责任。" },
    ],
    confusableWords: [],
  },
  coherent: {
    additionalMeaningsZh: [],
    examples: ["Her explanation was clear and coherent."],
    similarWords: [
      { word: "consistent", differenceZh: "consistent 更强调前后一致或长期稳定。" },
    ],
    confusableWords: [],
  },
  ambiguous: {
    additionalMeaningsZh: [],
    examples: ["The wording was ambiguous and caused several questions."],
    similarWords: [
      { word: "unclear", differenceZh: "unclear 是更通用的表达，强调不清楚。" },
    ],
    confusableWords: [],
  },
  concise: {
    additionalMeaningsZh: [],
    examples: ["Keep the summary concise and easy to follow."],
    similarWords: [
      { word: "brief", differenceZh: "brief 强调篇幅或时间短；concise 也强调没有赘述。" },
    ],
    confusableWords: [],
  },
  course: {
    additionalMeaningsZh: [],
    examples: ["The course introduces the main ideas gradually."],
    similarWords: [],
    confusableWords: [
      {
        word: "coarse",
        type: "sound",
        differenceZh: "course 可指课程或路线；coarse 表示粗糙的。",
        examplePair: ["She joined the course.", "The fabric feels coarse."],
      },
    ],
  },
  big: {
    additionalMeaningsZh: [],
    examples: ["They faced a big decision at the end of the week."],
    similarWords: [
      { word: "large", differenceZh: "large 更常用于尺寸、数量或规模。" },
    ],
    confusableWords: [],
  },
});

const CONTEXT_FIXTURES: Readonly<
  Record<string, Omit<AiContextExplanation, "suggestedHeadword" | "phraseInContext">>
> = Object.freeze({
  adapt: {
    meaningInContextZh: "适应",
    grammarRoleZh: "动词",
    contextExplanationZh: "这里表示逐渐适应某个变化或环境。",
  },
  allocated: {
    meaningInContextZh: "分配了",
    grammarRoleZh: "动词",
    contextExplanationZh: "这里表示把时间、资金或资源安排给特定用途。",
  },
  coherent: {
    meaningInContextZh: "连贯的",
    grammarRoleZh: "形容词",
    contextExplanationZh: "这里描述内容组织清楚、各部分能够自然衔接。",
  },
  quickly: {
    meaningInContextZh: "快速地",
    grammarRoleZh: "副词",
    contextExplanationZh: "这里修饰动作发生的速度。",
  },
});

function normalizedTerm(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function canonicalKey(value: unknown) {
  return JSON.stringify(value);
}

function removeOldestEntries<T>(map: Map<string, T>, maximumEntries: number) {
  while (map.size >= maximumEntries) {
    const oldestKey = map.keys().next().value;
    if (typeof oldestKey !== "string") break;
    map.delete(oldestKey);
  }
}

function removeExpiredContextEntries(nowMs: number) {
  for (const [key, entry] of state.contextCache) {
    if (entry.expiresAtMs <= nowMs) state.contextCache.delete(key);
  }
}

function registerIdempotency(idempotencyKey: string, requestKey: string) {
  const trimmedKey = idempotencyKey.trim();
  if (!trimmedKey || [...trimmedKey].length > 160) {
    throw new Error("The local preview key is invalid.");
  }

  const previousRequest = state.idempotency.get(trimmedKey);
  if (previousRequest && previousRequest !== requestKey) {
    throw new Error("This local preview key was already used for another request.");
  }
  if (!previousRequest) {
    removeOldestEntries(state.idempotency, LOCAL_FIXTURE_CACHE_MAX_ENTRIES);
  }
  state.idempotency.set(trimmedKey, requestKey);
}

export function runLocalFixtureEnrichment(
  sourceValue: unknown,
  idempotencyKey: string,
): LocalFixtureResult<AiEnrichmentDraft> {
  const source = validateTrustedAiLexicalPayload(sourceValue);
  const requestKey = `enrichment:${canonicalKey({
    source,
    provider: LOCAL_FIXTURE_LINEAGE.provider,
    model: LOCAL_FIXTURE_LINEAGE.model,
    promptVersion: LOCAL_FIXTURE_PROMPT_VERSION,
    schemaVersion: AI_OUTPUT_SCHEMA_VERSION,
    disclosureVersion: LOCAL_FIXTURE_DISCLOSURE_VERSION,
  })}`;
  registerIdempotency(idempotencyKey, requestKey);

  const cached = state.enrichmentCache.get(requestKey);
  if (cached) {
    return { value: cached, cacheStatus: "cached", lineage: LOCAL_FIXTURE_LINEAGE };
  }

  const fixture = FIXTURE_DRAFTS[normalizedTerm(source.term)] ?? {
    additionalMeaningsZh: [],
    examples: [],
    similarWords: [],
    confusableWords: [],
  };
  const value = validateAiEnrichmentDraft(fixture, source);
  removeOldestEntries(state.enrichmentCache, LOCAL_FIXTURE_CACHE_MAX_ENTRIES);
  state.enrichmentCache.set(requestKey, value);

  return { value, cacheStatus: "generated", lineage: LOCAL_FIXTURE_LINEAGE };
}

export function runLocalFixtureContextExplanation(
  trustedContext: TrustedAiContextPayload,
  idempotencyKey: string,
  now: string | Date = new Date(),
): LocalFixtureResult<AiContextExplanation> {
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  if (!Number.isFinite(nowMs)) {
    throw new Error("The local preview time is invalid.");
  }
  const requestKey = `context:${canonicalKey({
    trustedContext,
    provider: LOCAL_FIXTURE_LINEAGE.provider,
    model: LOCAL_FIXTURE_LINEAGE.model,
    promptVersion: LOCAL_CONTEXT_PROMPT_VERSION,
    schemaVersion: LOCAL_CONTEXT_SCHEMA_VERSION,
    disclosureVersion: LOCAL_FIXTURE_DISCLOSURE_VERSION,
  })}`;
  registerIdempotency(idempotencyKey, requestKey);
  removeExpiredContextEntries(nowMs);

  const cached = state.contextCache.get(requestKey);
  if (cached && cached.expiresAtMs > nowMs) {
    return { value: cached.value, cacheStatus: "cached", lineage: LOCAL_FIXTURE_LINEAGE };
  }
  if (cached) {
    state.contextCache.delete(requestKey);
  }

  const fixture = CONTEXT_FIXTURES[normalizedTerm(trustedContext.selectedText)];
  const value = validateAiContextExplanation(
    fixture
      ? {
          suggestedHeadword: trustedContext.selectedText,
          ...fixture,
          phraseInContext: trustedContext.selectedText,
        }
      : {
          suggestedHeadword: trustedContext.selectedText,
          meaningInContextZh: "本地固定预览没有收录这个词的释义。",
          grammarRoleZh: "待核查",
          contextExplanationZh:
            "这是界面测试用的固定内容，没有调用 AI；正式服务启用后请再核查。",
          phraseInContext: trustedContext.selectedText,
        },
    trustedContext,
  );
  removeOldestEntries(state.contextCache, LOCAL_FIXTURE_CACHE_MAX_ENTRIES);
  state.contextCache.set(requestKey, {
    value,
    expiresAtMs: nowMs + LOCAL_CONTEXT_CACHE_TTL_MS,
  });

  return { value, cacheStatus: "generated", lineage: LOCAL_FIXTURE_LINEAGE };
}

export function resetLocalFixtureRuntimeForTests() {
  state.enrichmentCache.clear();
  state.contextCache.clear();
  state.idempotency.clear();
}
