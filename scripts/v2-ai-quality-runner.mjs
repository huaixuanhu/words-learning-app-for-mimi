import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const STAGE2_MODEL = "gemini-3.1-flash-lite";
export const STAGE2_RUNNER_VERSION = "v2-ai-quality-runner-v3";
export const STAGE2_PROMPT_VERSION = "v2-ai-enrichment-prompt-v1";
export const STAGE2_SCHEMA_VERSION = "v2-ai-enrichment-draft-v1";
export const STAGE2_CORPUS_SIZE = 120;
export const STAGE2_MAXIMUM_CALLS = 120;
export const STAGE2_CONCURRENCY = 1;
export const STAGE2_AUTOMATIC_RETRIES = 0;
export const STAGE2_MAXIMUM_OUTPUT_TOKENS = 700;
export const STAGE2_MAXIMUM_RESERVED_RUN_COST_USD = 0.1;
export const STAGE2_CONFIRMATION_FLAG = "--i-confirm-120-external-calls";
export const STAGE2_PRICING = Object.freeze({
  model: STAGE2_MODEL,
  inputUsdPerMillionTokens: 0.125,
  outputUsdPerMillionTokens: 0.75,
  checkedAt: "2026-07-13T00:00:00.000Z",
  staleAfter: "2026-08-13T00:00:00.000Z",
});
export const STAGE2_RESERVED_ATTEMPT = Object.freeze({
  inputTokens: 2_000,
  outputTokens: 700,
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corpusPath = path.join(root, "test_fixtures/v2-stage2-ai-corpus.json");
const schemaPath = path.join(
  root,
  "src/lib/ai-enrichment/gemini-response-schema.json",
);
const promptPath = path.join(root, "src/lib/ai-enrichment/prompt-v1.txt");
const artifactRoot = path.join(root, "local_artifacts/v2-stage2-ai");
const expectedGroups = Object.freeze({
  academic: 30,
  polysemy: 20,
  phrase: 20,
  spelling: 20,
  sound: 20,
  usage: 10,
});

export class Stage2AiQualityError extends Error {
  constructor(message, safeContext = null, terminalCategory = null) {
    super(message);
    this.name = "Stage2AiQualityError";
    this.safeContext = safeContext;
    this.terminalCategory = terminalCategory;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(record, keys, label) {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Stage2AiQualityError(`${label} fields do not match the contract`);
  }
}

function boundedText(value, label, maximum) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Stage2AiQualityError(`${label} must be non-blank text`);
  }
  const trimmed = value.trim();
  if ([...trimmed].length > maximum) {
    throw new Stage2AiQualityError(`${label} is too long`);
  }
  return trimmed;
}

function boundedTextArray(value, label, minimum, maximum, textMaximum) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Stage2AiQualityError(`${label} has an invalid item count`);
  }
  return value.map((entry, index) =>
    boundedText(entry, `${label}[${index}]`, textMaximum),
  );
}

function normalized(value) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
}

export function validateCorpus(corpus) {
  if (!isRecord(corpus)) {
    throw new Stage2AiQualityError("corpus must be an object");
  }
  exactKeys(corpus, ["format", "version", "description", "entries"], "corpus");
  if (corpus.format !== "mimi-v2-ai-quality-corpus" || corpus.version !== 1) {
    throw new Stage2AiQualityError("corpus format or version is unsupported");
  }
  if (!Array.isArray(corpus.entries) || corpus.entries.length !== STAGE2_CORPUS_SIZE) {
    throw new Stage2AiQualityError(`corpus must contain exactly ${STAGE2_CORPUS_SIZE} entries`);
  }

  const ids = new Set();
  const terms = new Set();
  const groupCounts = Object.fromEntries(Object.keys(expectedGroups).map((key) => [key, 0]));
  const entries = corpus.entries.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Stage2AiQualityError(`entries[${index}] must be an object`);
    }
    exactKeys(
      entry,
      [
        "id",
        "term",
        "kind",
        "meaningsZh",
        "examples",
        "primaryGroup",
        "expectedRelations",
      ],
      `entries[${index}]`,
    );
    const id = boundedText(entry.id, `entries[${index}].id`, 80);
    const term = boundedText(entry.term, `entries[${index}].term`, 120);
    const termKey = normalized(term);
    if (ids.has(id) || terms.has(termKey)) {
      throw new Stage2AiQualityError("corpus ids and normalized terms must be unique");
    }
    ids.add(id);
    terms.add(termKey);
    if (entry.kind !== "word" && entry.kind !== "phrase") {
      throw new Stage2AiQualityError(`entries[${index}].kind is unsupported`);
    }
    const meaningsZh = boundedTextArray(
      entry.meaningsZh,
      `entries[${index}].meaningsZh`,
      1,
      8,
      160,
    );
    const examples = boundedTextArray(
      entry.examples,
      `entries[${index}].examples`,
      0,
      8,
      320,
    );
    if (!(entry.primaryGroup in expectedGroups)) {
      throw new Stage2AiQualityError(`entries[${index}].primaryGroup is unsupported`);
    }
    groupCounts[entry.primaryGroup] += 1;
    if (!Array.isArray(entry.expectedRelations)) {
      throw new Stage2AiQualityError(`entries[${index}].expectedRelations must be an array`);
    }
    for (const [relationIndex, relation] of entry.expectedRelations.entries()) {
      if (!isRecord(relation)) {
        throw new Stage2AiQualityError(
          `entries[${index}].expectedRelations[${relationIndex}] must be an object`,
        );
      }
      exactKeys(
        relation,
        ["word", "type"],
        `entries[${index}].expectedRelations[${relationIndex}]`,
      );
      boundedText(relation.word, "expected relation word", 80);
      if (!["similar", "spelling", "sound", "usage"].includes(relation.type)) {
        throw new Stage2AiQualityError("expected relation type is unsupported");
      }
    }
    return {
      id,
      term,
      kind: entry.kind,
      meaningsZh,
      examples,
      primaryGroup: entry.primaryGroup,
      expectedRelations: entry.expectedRelations,
    };
  });

  if (JSON.stringify(groupCounts) !== JSON.stringify(expectedGroups)) {
    throw new Stage2AiQualityError(
      `corpus group counts do not match: ${JSON.stringify(groupCounts)}`,
    );
  }
  return { ...corpus, entries, groupCounts };
}

export function buildProviderLexicalPayload(entry) {
  return {
    term: entry.term,
    meaningsZh: entry.meaningsZh,
    examples: entry.examples,
  };
}

export function buildGeminiRequest(entry, prompt, responseJsonSchema) {
  const lexicalPayload = buildProviderLexicalPayload(entry);
  return {
    systemInstruction: {
      parts: [{ text: prompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: JSON.stringify(lexicalPayload) }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema,
      thinkingConfig: {
        thinkingLevel: "minimal",
      },
      maxOutputTokens: STAGE2_MAXIMUM_OUTPUT_TOKENS,
    },
  };
}

export function validateDraftForRunner(value, sourceTerm) {
  if (!isRecord(value)) {
    throw new Stage2AiQualityError("draft must be an object");
  }
  exactKeys(
    value,
    ["additionalMeaningsZh", "examples", "similarWords", "confusableWords"],
    "draft",
  );
  const additionalMeaningsZh = boundedTextArray(
    value.additionalMeaningsZh,
    "additionalMeaningsZh",
    0,
    3,
    80,
  );
  const examples = boundedTextArray(value.examples, "examples", 0, 3, 240);
  if (!Array.isArray(value.similarWords) || value.similarWords.length > 3) {
    throw new Stage2AiQualityError("similarWords has an invalid item count");
  }
  if (!Array.isArray(value.confusableWords) || value.confusableWords.length > 3) {
    throw new Stage2AiQualityError("confusableWords has an invalid item count");
  }
  const seen = new Set([normalized(sourceTerm)]);
  const similarWords = value.similarWords.map((suggestion, index) => {
    if (!isRecord(suggestion)) {
      throw new Stage2AiQualityError(`similarWords[${index}] must be an object`);
    }
    exactKeys(suggestion, ["word", "differenceZh"], `similarWords[${index}]`);
    const word = boundedText(suggestion.word, `similarWords[${index}].word`, 80);
    const key = normalized(word);
    if (seen.has(key)) {
      throw new Stage2AiQualityError("candidate words must be unique and not the source term");
    }
    seen.add(key);
    return {
      word,
      differenceZh: boundedText(
        suggestion.differenceZh,
        `similarWords[${index}].differenceZh`,
        180,
      ),
    };
  });
  const confusableWords = value.confusableWords.map((suggestion, index) => {
    if (!isRecord(suggestion)) {
      throw new Stage2AiQualityError(`confusableWords[${index}] must be an object`);
    }
    exactKeys(
      suggestion,
      ["word", "type", "differenceZh", "examplePair"],
      `confusableWords[${index}]`,
    );
    const word = boundedText(suggestion.word, `confusableWords[${index}].word`, 80);
    const key = normalized(word);
    if (seen.has(key)) {
      throw new Stage2AiQualityError("candidate words must be unique and not the source term");
    }
    seen.add(key);
    if (!["spelling", "sound", "usage"].includes(suggestion.type)) {
      throw new Stage2AiQualityError(`confusableWords[${index}].type is unsupported`);
    }
    const examplePair = boundedTextArray(
      suggestion.examplePair,
      `confusableWords[${index}].examplePair`,
      0,
      2,
      240,
    );
    if (examplePair.length === 1) {
      throw new Stage2AiQualityError("examplePair must be empty or contain two examples");
    }
    return {
      word,
      type: suggestion.type,
      differenceZh: boundedText(
        suggestion.differenceZh,
        `confusableWords[${index}].differenceZh`,
        180,
      ),
      examplePair,
    };
  });
  return { additionalMeaningsZh, examples, similarWords, confusableWords };
}

export function validateUsageMetadata(value) {
  if (!isRecord(value)) {
    throw new Stage2AiQualityError("usageMetadata is missing");
  }
  const integer = (field) => {
    const candidate = value[field] ?? (field === "thoughtsTokenCount" ? 0 : undefined);
    if (!Number.isSafeInteger(candidate) || candidate < 0) {
      throw new Stage2AiQualityError(`usageMetadata.${field} is invalid`);
    }
    return candidate;
  };
  const usage = {
    promptTokenCount: integer("promptTokenCount"),
    candidatesTokenCount: integer("candidatesTokenCount"),
    thoughtsTokenCount: integer("thoughtsTokenCount"),
    totalTokenCount: integer("totalTokenCount"),
  };
  if (
    usage.totalTokenCount <
    usage.promptTokenCount + usage.candidatesTokenCount + usage.thoughtsTokenCount
  ) {
    throw new Stage2AiQualityError("usageMetadata token total is inconsistent");
  }
  return usage;
}

export function estimateCostUsd(usage) {
  return (
    (usage.promptTokenCount / 1_000_000) * STAGE2_PRICING.inputUsdPerMillionTokens +
    ((usage.candidatesTokenCount + usage.thoughtsTokenCount) / 1_000_000) *
      STAGE2_PRICING.outputUsdPerMillionTokens
  );
}

export function reservedAttemptCostUsd() {
  return (
    (STAGE2_RESERVED_ATTEMPT.inputTokens / 1_000_000) *
      STAGE2_PRICING.inputUsdPerMillionTokens +
    (STAGE2_RESERVED_ATTEMPT.outputTokens / 1_000_000) *
      STAGE2_PRICING.outputUsdPerMillionTokens
  );
}

export function classifyProviderError(httpStatus) {
  if (httpStatus === 400) return "provider_rejected_request";
  if (httpStatus === 401 || httpStatus === 403) return "provider_auth_or_permission";
  if (httpStatus === 429) return "provider_quota_or_rate_limit";
  if (httpStatus >= 500) return "provider_unavailable";
  return "provider_error";
}

export function parseGeminiResponse(body, sourceTerm) {
  if (!isRecord(body)) {
    throw new Stage2AiQualityError("provider response is not an object");
  }
  const usage = validateUsageMetadata(body.usageMetadata);
  if (usage.promptTokenCount > STAGE2_RESERVED_ATTEMPT.inputTokens) {
    throw new Stage2AiQualityError("usageMetadata exceeds the input-token reservation");
  }
  if (
    usage.candidatesTokenCount + usage.thoughtsTokenCount >
    STAGE2_RESERVED_ATTEMPT.outputTokens
  ) {
    throw new Stage2AiQualityError("usageMetadata exceeds the output-token reservation");
  }
  const modelVersion =
    typeof body.modelVersion === "string" ? body.modelVersion : STAGE2_MODEL;
  if (!modelVersion.startsWith(STAGE2_MODEL)) {
    throw new Stage2AiQualityError("provider returned an unexpected model version");
  }
  const baseContext = {
    usage,
    modelVersion,
    finishReason: null,
    rejectedDraft: null,
  };
  const promptFeedback = isRecord(body.promptFeedback) ? body.promptFeedback : null;
  const blockReason =
    promptFeedback && typeof promptFeedback.blockReason === "string"
      ? promptFeedback.blockReason
      : null;
  if (blockReason && blockReason !== "BLOCK_REASON_UNSPECIFIED") {
    throw new Stage2AiQualityError(
      "provider blocked the evaluation prompt",
      baseContext,
      "provider_content_block",
    );
  }
  const candidate = Array.isArray(body.candidates) ? body.candidates[0] : null;
  if (!isRecord(candidate)) {
    throw new Stage2AiQualityError(
      "provider response has no candidate",
      baseContext,
      "provider_response_contract",
    );
  }
  const finishReason =
    typeof candidate.finishReason === "string" ? candidate.finishReason : "UNKNOWN";
  const safeContext = { ...baseContext, finishReason };
  if (finishReason !== "STOP") {
    throw new Stage2AiQualityError(
      `provider returned non-STOP finish reason: ${finishReason}`,
      safeContext,
      "provider_nonstop_finish",
    );
  }
  if (!isRecord(candidate.content)) {
    throw new Stage2AiQualityError(
      "provider response has no candidate content",
      safeContext,
      "provider_response_contract",
    );
  }
  const parts = Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
  const text = parts
    .filter((part) => isRecord(part) && typeof part.text === "string" && part.thought !== true)
    .map((part) => part.text)
    .join("");
  if (!text.trim()) {
    throw new Stage2AiQualityError(
      "provider response has no visible JSON text",
      safeContext,
      "provider_response_contract",
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Stage2AiQualityError(
      "provider response is not valid JSON",
      safeContext,
    );
  }
  try {
    return {
      draft: validateDraftForRunner(parsed, sourceTerm),
      usage,
      modelVersion,
      finishReason,
    };
  } catch (error) {
    if (error instanceof Stage2AiQualityError) {
      throw new Stage2AiQualityError(error.message, {
        usage,
        modelVersion,
        finishReason,
        rejectedDraft: parsed,
      });
    }
    throw error;
  }
}

function percentile(values, percentileValue) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * ordered.length) - 1),
  );
  return ordered[index];
}

export function summarizeResults(results, corpusHash, startedAt, finishedAt) {
  const usageTotals = results.reduce(
    (total, result) => {
      if (!result.usage) return total;
      total.promptTokenCount += result.usage.promptTokenCount;
      total.candidatesTokenCount += result.usage.candidatesTokenCount;
      total.thoughtsTokenCount += result.usage.thoughtsTokenCount;
      total.totalTokenCount += result.usage.totalTokenCount;
      return total;
    },
    {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      thoughtsTokenCount: 0,
      totalTokenCount: 0,
    },
  );
  const latencies = results.map((result) => result.latencyMs).filter(Number.isFinite);
  return {
    format: "mimi-v2-stage2-ai-quality-summary",
    version: 2,
    runnerVersion: STAGE2_RUNNER_VERSION,
    provider: "google-gemini-api",
    configuredModel: STAGE2_MODEL,
    observedModelVersions: [...new Set(results.map((result) => result.modelVersion).filter(Boolean))],
    promptVersion: STAGE2_PROMPT_VERSION,
    outputSchemaVersion: STAGE2_SCHEMA_VERSION,
    corpusHash,
    startedAt,
    finishedAt,
    submitted: results.length,
    succeeded: results.filter((result) => result.status === "valid").length,
    invalid: results.filter((result) => result.status === "invalid").length,
    failed: results.filter((result) => result.status === "failed").length,
    terminalCategories: Object.fromEntries(
      [...new Set(results.map((result) => result.terminalCategory))].map((category) => [
        category,
        results.filter((result) => result.terminalCategory === category).length,
      ]),
    ),
    usageTotals,
    estimatedCostUsd: results.reduce(
      (total, result) => total + (result.estimatedCostUsd ?? 0),
      0,
    ),
    latencyMs: {
      minimum: latencies.length ? Math.min(...latencies) : null,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      maximum: latencies.length ? Math.max(...latencies) : null,
    },
    pricing: STAGE2_PRICING,
    executionEnvelope: {
      maximumCalls: STAGE2_MAXIMUM_CALLS,
      concurrency: STAGE2_CONCURRENCY,
      automaticRetries: STAGE2_AUTOMATIC_RETRIES,
      maximumOutputTokens: STAGE2_MAXIMUM_OUTPUT_TOKENS,
      maximumReservedRunCostUsd: STAGE2_MAXIMUM_RESERVED_RUN_COST_USD,
    },
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildReviewWorksheet(results) {
  const header = [
    "entryId",
    "term",
    "primaryGroup",
    "structuralStatus",
    "terminalCategory",
    "validationCategory",
    "meaningRating",
    "exampleRating",
    "candidateRating",
    "fabrication",
    "overallAction",
    "reviewerNote",
  ];
  const rows = results.map((result) => [
    result.entryId,
    result.term,
    result.primaryGroup,
    result.status,
    result.terminalCategory,
    result.validationCategory ?? "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function checkedDate(value) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function assertLiveGuards(args, now = new Date()) {
  if (!args.includes("--live")) {
    return { live: false };
  }
  if (!args.includes(STAGE2_CONFIRMATION_FLAG)) {
    throw new Stage2AiQualityError(
      `live mode requires ${STAGE2_CONFIRMATION_FLAG}`,
    );
  }
  const staleAfter = checkedDate(STAGE2_PRICING.staleAfter);
  if (!staleAfter || now.getTime() >= staleAfter.getTime()) {
    throw new Stage2AiQualityError("pricing evidence is stale; re-check official pricing");
  }
  const reservedRunCost = reservedAttemptCostUsd() * STAGE2_MAXIMUM_CALLS;
  if (reservedRunCost > STAGE2_MAXIMUM_RESERVED_RUN_COST_USD + Number.EPSILON) {
    throw new Stage2AiQualityError("reserved run cost exceeds the Stage 2 ceiling");
  }
  return { live: true, reservedRunCostUsd: reservedRunCost };
}

function gitOutput(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function assertLocalSecretBoundary() {
  try {
    execFileSync("git", ["check-ignore", "-q", ".env.stage2.local"], {
      cwd: root,
      stdio: "ignore",
    });
    execFileSync("git", ["check-ignore", "-q", "local_artifacts/v2-stage2-ai"], {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    throw new Stage2AiQualityError("local secret or artifact path is not ignored");
  }
  const tracked = gitOutput(["ls-files", "--", ".env.stage2.local"]);
  if (tracked) {
    throw new Stage2AiQualityError(".env.stage2.local must not be tracked");
  }
}

async function loadInputs() {
  const [corpusText, schemaText, prompt] = await Promise.all([
    readFile(corpusPath, "utf8"),
    readFile(schemaPath, "utf8"),
    readFile(promptPath, "utf8"),
  ]);
  const corpus = validateCorpus(JSON.parse(corpusText));
  const responseJsonSchema = JSON.parse(schemaText);
  const corpusHash = createHash("sha256").update(corpusText).digest("hex");
  const promptHash = createHash("sha256").update(prompt).digest("hex");
  const responseSchemaHash = createHash("sha256").update(schemaText).digest("hex");
  return {
    corpus,
    responseJsonSchema,
    prompt: prompt.trim(),
    corpusHash,
    promptHash,
    responseSchemaHash,
  };
}

function safeRunId(date = new Date()) {
  return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

async function writeCheckpoint(runDirectory, results) {
  await writeFile(
    path.join(runDirectory, "results.json"),
    `${JSON.stringify({ format: "mimi-v2-stage2-ai-quality-results", version: 2, runnerVersion: STAGE2_RUNNER_VERSION, results }, null, 2)}\n`,
    "utf8",
  );
}

async function runLive({
  corpus,
  responseJsonSchema,
  prompt,
  corpusHash,
  promptHash,
  responseSchemaHash,
}) {
  const providerCredential = Reflect.get(process.env, "GEMINI_API_KEY");
  if (typeof providerCredential !== "string" || !providerCredential.trim()) {
    throw new Stage2AiQualityError("GEMINI_API_KEY is missing");
  }
  assertLocalSecretBoundary();
  await mkdir(artifactRoot, { recursive: true });
  const runDirectory = path.join(artifactRoot, safeRunId());
  await mkdir(runDirectory, { recursive: false });
  const startedAt = new Date().toISOString();
  const results = [];
  let stopReason = null;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${STAGE2_MODEL}:generateContent`;

  for (const entry of corpus.entries) {
    if (results.length >= STAGE2_MAXIMUM_CALLS) {
      throw new Stage2AiQualityError("maximum submitted request count reached");
    }
    const request = buildGeminiRequest(entry, prompt, responseJsonSchema);
    const began = Date.now();
    let result;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": providerCredential,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(45_000),
      });
      const latencyMs = Date.now() - began;
      if (!response.ok) {
        result = {
          entryId: entry.id,
          term: entry.term,
          primaryGroup: entry.primaryGroup,
          status: "failed",
          terminalCategory: classifyProviderError(response.status),
          httpStatus: response.status,
          latencyMs,
          modelVersion: null,
          finishReason: null,
          usage: null,
          estimatedCostUsd: null,
          draft: null,
        };
      } else {
        const body = await response.json();
        try {
          const parsed = parseGeminiResponse(body, entry.term);
          result = {
            entryId: entry.id,
            term: entry.term,
            primaryGroup: entry.primaryGroup,
            status: "valid",
            terminalCategory: "valid_draft",
            httpStatus: response.status,
            latencyMs,
            modelVersion: parsed.modelVersion,
            finishReason: parsed.finishReason,
            usage: parsed.usage,
            estimatedCostUsd: estimateCostUsd(parsed.usage),
            draft: parsed.draft,
          };
        } catch (error) {
          const safeContext =
            error instanceof Stage2AiQualityError && isRecord(error.safeContext)
              ? error.safeContext
              : null;
          const usage = safeContext?.usage ?? null;
          result = {
            entryId: entry.id,
            term: entry.term,
            primaryGroup: entry.primaryGroup,
            status: "invalid",
            terminalCategory:
              error instanceof Stage2AiQualityError && error.terminalCategory
                ? error.terminalCategory
                : "invalid_structure_or_usage",
            httpStatus: response.status,
            latencyMs,
            modelVersion:
              typeof safeContext?.modelVersion === "string"
                ? safeContext.modelVersion
                : isRecord(body) && typeof body.modelVersion === "string"
                  ? body.modelVersion
                  : null,
            finishReason:
              typeof safeContext?.finishReason === "string"
                ? safeContext.finishReason
                : null,
            usage,
            estimatedCostUsd: usage ? estimateCostUsd(usage) : null,
            draft: null,
            rejectedDraft: safeContext?.rejectedDraft ?? null,
            validationCategory:
              error instanceof Stage2AiQualityError ? error.message : "unknown validation error",
          };
        }
      }
    } catch (error) {
      result = {
        entryId: entry.id,
        term: entry.term,
        primaryGroup: entry.primaryGroup,
        status: "failed",
        terminalCategory:
          error instanceof DOMException && error.name === "TimeoutError"
            ? "provider_timeout"
            : "provider_network_error",
        httpStatus: null,
        latencyMs: Date.now() - began,
        modelVersion: null,
        finishReason: null,
        usage: null,
        estimatedCostUsd: null,
        draft: null,
      };
    }
    results.push(result);
    await writeCheckpoint(runDirectory, results);
    if (results.length % 10 === 0 || results.length === corpus.entries.length) {
      process.stdout.write(
        `${JSON.stringify({ progress: results.length, total: corpus.entries.length, valid: results.filter((item) => item.status === "valid").length, invalid: results.filter((item) => item.status === "invalid").length, failed: results.filter((item) => item.status === "failed").length })}\n`,
      );
    }
    if (
      [
        "provider_rejected_request",
        "provider_auth_or_permission",
        "provider_quota_or_rate_limit",
        "provider_content_block",
        "provider_nonstop_finish",
        "provider_response_contract",
      ].includes(result.terminalCategory)
    ) {
      stopReason = result.terminalCategory;
      break;
    }
    if (
      result.validationCategory &&
      (result.validationCategory.startsWith("usageMetadata") ||
        result.validationCategory.includes("token reservation") ||
        result.validationCategory.includes("unexpected model"))
    ) {
      stopReason = "accounting_or_model_guard";
      break;
    }
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    ...summarizeResults(results, corpusHash, startedAt, finishedAt),
    promptHash,
    responseSchemaHash,
    stopReason,
  };
  await writeFile(
    path.join(runDirectory, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(runDirectory, "review-worksheet.csv"),
    buildReviewWorksheet(results),
    "utf8",
  );
  process.stdout.write(
    `${JSON.stringify({ status: stopReason ? "stopped" : "complete", stopReason, submitted: summary.submitted, succeeded: summary.succeeded, invalid: summary.invalid, failed: summary.failed, estimatedCostUsd: Number(summary.estimatedCostUsd.toFixed(6)), artifactPath: path.relative(root, runDirectory) })}\n`,
  );
  return { summary, runDirectory };
}

export async function main(args = process.argv.slice(2)) {
  const guards = assertLiveGuards(args);
  const inputs = await loadInputs();
  assertLocalSecretBoundary();
  if (!guards.live) {
    const firstRequest = buildGeminiRequest(
      inputs.corpus.entries[0],
      inputs.prompt,
      inputs.responseJsonSchema,
    );
    process.stdout.write(
      `${JSON.stringify({ status: "dry-run", runnerVersion: STAGE2_RUNNER_VERSION, model: STAGE2_MODEL, corpusEntries: inputs.corpus.entries.length, groupCounts: inputs.corpus.groupCounts, corpusHash: inputs.corpusHash, promptVersion: STAGE2_PROMPT_VERSION, promptHash: inputs.promptHash, outputSchemaVersion: STAGE2_SCHEMA_VERSION, responseSchemaHash: inputs.responseSchemaHash, reservedRunCostUsd: Number((reservedAttemptCostUsd() * STAGE2_MAXIMUM_CALLS).toFixed(6)), providerPayloadFields: Object.keys(JSON.parse(firstRequest.contents[0].parts[0].text)), toolsPresent: "tools" in firstRequest })}\n`,
    );
    return;
  }
  await runLive(inputs);
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    const message =
      error instanceof Stage2AiQualityError ? error.message : "unexpected Stage 2 runner failure";
    process.stderr.write(`${JSON.stringify({ status: "blocked", reason: message })}\n`);
    process.exitCode = 1;
  });
}
