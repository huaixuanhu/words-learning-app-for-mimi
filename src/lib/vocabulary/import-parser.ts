import type { ImportCandidate, ImportCandidateStatus } from "./types";
import {
  isLearningTrack,
  normalizeLearningTrack,
  normalizeOptionalText,
  normalizeRarityScore,
  normalizeTextList,
  validateSurfaceText,
  validateVocabularyTags,
} from "./normalize";
import { alignExampleTranslationsZh } from "./example-pairs";

type ParseTextImportOptions = {
  existingNormalizedTexts?: Iterable<string>;
  requireMeaningAndExample?: boolean;
};

type RawCandidate = {
  lineNumber: number;
  rawLine: string;
  surfaceText: string;
  meaningZh: string;
  example: string;
  exampleTranslationZh: string;
  notes: string;
  learningTrack: unknown;
  tags: unknown;
  rarityScore: number | string | null | undefined;
};

function makeTempId(lineNumber: number, index: number) {
  return `candidate-${lineNumber}-${index}`;
}

function splitDashRow(line: string): string[] {
  return line.split(/\s+-\s+/).map((part) => part.trim());
}

function parseRawLine(line: string, lineNumber: number): RawCandidate[] {
  const rawLine = line;
  const trimmed = line.trim();

  if (!trimmed) {
    return [
      {
        lineNumber,
        rawLine,
        surfaceText: "",
        meaningZh: "",
        example: "",
        exampleTranslationZh: "",
        notes: "",
        learningTrack: "recognition",
        tags: null,
        rarityScore: null,
      },
    ];
  }

  if (trimmed.includes("\t")) {
    const [
      surfaceText = "",
      meaningZh = "",
      example = "",
      ...exampleTranslationParts
    ] = trimmed
      .split("\t")
      .map((part) => part.trim());

    return [
      {
        lineNumber,
        rawLine,
        surfaceText,
        meaningZh,
        example,
        exampleTranslationZh: exampleTranslationParts.join(" "),
        notes: "",
        learningTrack: "recognition",
        tags: null,
        rarityScore: null,
      },
    ];
  }

  const dashParts = splitDashRow(trimmed);
  if (dashParts.length > 1) {
    const [surfaceText = "", meaningZh = "", ...exampleParts] = dashParts;

    return [
      {
        lineNumber,
        rawLine,
        surfaceText,
        meaningZh,
        example: exampleParts.join(" - "),
        exampleTranslationZh: "",
        notes: "",
        learningTrack: "recognition",
        tags: null,
        rarityScore: null,
      },
    ];
  }

  if (trimmed.includes(",")) {
    return trimmed.split(",").map((part) => ({
      lineNumber,
      rawLine,
      surfaceText: part.trim(),
      meaningZh: "",
      example: "",
      exampleTranslationZh: "",
      notes: "",
      learningTrack: "recognition",
      tags: null,
      rarityScore: null,
    }));
  }

  return [
    {
      lineNumber,
      rawLine,
      surfaceText: trimmed,
      meaningZh: "",
      example: "",
      exampleTranslationZh: "",
      notes: "",
      learningTrack: "recognition",
      tags: null,
      rarityScore: null,
    },
  ];
}

function getCandidateStatus(errors: string[], duplicate: boolean): ImportCandidateStatus {
  if (
    errors.includes("empty") ||
    errors.includes("too_long") ||
    errors.includes("sentence_like") ||
    errors.includes("invalid_track") ||
    errors.includes("invalid_tags") ||
    errors.includes("unsupported_tag") ||
    errors.includes("invalid_json") ||
    errors.includes("missing_items") ||
    errors.includes("missing_meaning") ||
    errors.includes("missing_example") ||
    errors.includes("missing_example_translation")
  ) {
    return "invalid" as const;
  }

  return duplicate ? "duplicate" : "new";
}

function normalizeCandidateLists(candidate: Pick<
  ImportCandidate,
  | "meaningZh"
  | "meaningsZh"
  | "example"
  | "examples"
  | "exampleTranslationsZh"
>) {
  const meaningsZh = normalizeTextList(
    Array.isArray(candidate.meaningsZh) && candidate.meaningsZh.length
      ? candidate.meaningsZh
      : candidate.meaningZh,
  );
  const examples = normalizeTextList(
    Array.isArray(candidate.examples) && candidate.examples.length ? candidate.examples : candidate.example,
  );
  const exampleTranslationsZh = alignExampleTranslationsZh(
    examples,
    candidate.exampleTranslationsZh,
  );

  return {
    meaningsZh,
    meaningZh: meaningsZh[0] ?? normalizeOptionalText(candidate.meaningZh),
    examples,
    example: examples[0] ?? normalizeOptionalText(candidate.example),
    exampleTranslationsZh,
  };
}

export function recomputeImportCandidates(
  candidates: ImportCandidate[],
  options: ParseTextImportOptions = {},
): ImportCandidate[] {
  const existing = new Set(options.existingNormalizedTexts ?? []);
  const seen = new Set<string>();

  return candidates.map((candidate) => {
    const validation = validateSurfaceText(candidate.surfaceText);
    const tagValidation = validateVocabularyTags(candidate.tags);
    const textLists = normalizeCandidateLists(candidate);
    const carriedErrors = candidate.errors.filter((error) => error === "invalid_track");
    const duplicate =
      validation.normalizedText &&
      (existing.has(validation.normalizedText) || seen.has(validation.normalizedText));
    const listErrors = [
      ...(options.requireMeaningAndExample && !textLists.meaningsZh.length ? ["missing_meaning"] : []),
      ...(options.requireMeaningAndExample && !textLists.examples.length ? ["missing_example"] : []),
      ...(options.requireMeaningAndExample && textLists.examples.some(
        (_, index) => !textLists.exampleTranslationsZh[index],
      )
        ? ["missing_example_translation"]
        : []),
    ];
    const errors = duplicate
      ? [...validation.errors, ...tagValidation.errors, ...listErrors, ...carriedErrors, "duplicate"]
      : [...validation.errors, ...tagValidation.errors, ...listErrors, ...carriedErrors];

    if (validation.normalizedText) {
      seen.add(validation.normalizedText);
    }

    return {
      ...candidate,
      surfaceText: validation.surfaceText,
      normalizedText: validation.normalizedText,
      ...textLists,
      learningTrack: normalizeLearningTrack(candidate.learningTrack),
      tags: tagValidation.tags,
      status: getCandidateStatus(errors, Boolean(duplicate)),
      errors,
    };
  });
}

export function parseTextImport(text: string, options: ParseTextImportOptions = {}) {
  const existing = new Set(options.existingNormalizedTexts ?? []);
  const seen = new Set<string>();
  const candidates: ImportCandidate[] = [];

  text.split(/\r?\n/).forEach((line, lineIndex) => {
    const rawCandidates = parseRawLine(line, lineIndex + 1);

    rawCandidates.forEach((rawCandidate, candidateIndex) => {
      const validation = validateSurfaceText(rawCandidate.surfaceText);
      const tagValidation = validateVocabularyTags(rawCandidate.tags);
      const errors = [...validation.errors];
      const duplicate =
        validation.normalizedText &&
        (existing.has(validation.normalizedText) || seen.has(validation.normalizedText));

      if (duplicate) {
        errors.push("duplicate");
      }

      errors.push(...tagValidation.errors);

      if (validation.normalizedText) {
        seen.add(validation.normalizedText);
      }

      candidates.push({
        tempId: makeTempId(rawCandidate.lineNumber, candidateIndex + 1),
        lineNumber: rawCandidate.lineNumber,
        rawLine: rawCandidate.rawLine,
        surfaceText: validation.surfaceText,
        normalizedText: validation.normalizedText,
        meaningZh: normalizeOptionalText(rawCandidate.meaningZh),
        meaningsZh: normalizeTextList(rawCandidate.meaningZh),
        example: normalizeOptionalText(rawCandidate.example),
        examples: normalizeTextList(rawCandidate.example),
        exampleTranslationsZh: alignExampleTranslationsZh(
          normalizeTextList(rawCandidate.example),
          [rawCandidate.exampleTranslationZh],
        ),
        notes: normalizeOptionalText(rawCandidate.notes),
        rarityScore: normalizeRarityScore(rawCandidate.rarityScore),
        learningTrack: normalizeLearningTrack(rawCandidate.learningTrack),
        tags: tagValidation.tags,
        status: getCandidateStatus(errors, Boolean(duplicate)),
        errors,
      });
    });
  });

  return candidates;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getJsonItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (isRecord(value) && Array.isArray(value.items)) {
    return value.items;
  }

  return [];
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function parseJsonImport(text: string, options: ParseTextImportOptions = {}) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return [
      {
        tempId: "candidate-json-1",
        lineNumber: 1,
        rawLine: text,
        surfaceText: "",
        normalizedText: "",
        meaningZh: "",
        meaningsZh: [],
        example: "",
        examples: [],
        exampleTranslationsZh: [],
        notes: "",
        rarityScore: null,
        learningTrack: "recognition" as const,
        tags: null,
        status: "invalid" as const,
        errors: ["invalid_json"],
      },
    ];
  }

  const jsonItems = getJsonItems(parsed);

  if (!jsonItems.length) {
    return [
      {
        tempId: "candidate-json-1",
        lineNumber: 1,
        rawLine: text,
        surfaceText: "",
        normalizedText: "",
        meaningZh: "",
        meaningsZh: [],
        example: "",
        examples: [],
        exampleTranslationsZh: [],
        notes: "",
        rarityScore: null,
        learningTrack: "recognition" as const,
        tags: null,
        status: "invalid" as const,
        errors: ["missing_items"],
      },
    ];
  }

  const candidates = jsonItems.map((item, index): ImportCandidate => {
    const record = isRecord(item) ? item : {};
    const rawTrack = record.track ?? record.learningTrack;
    const validation = validateSurfaceText(readString(record.word ?? record.surfaceText));
    const tagValidation = validateVocabularyTags(record.tags);
    const meaningsZh = normalizeTextList(record.meaningsZh ?? record.meaningZh);
    const examples = normalizeTextList(record.examples ?? record.example);
    const exampleTranslationsZh = alignExampleTranslationsZh(
      examples,
      record.exampleTranslationsZh ??
        (typeof record.exampleTranslationZh === "string"
          ? [record.exampleTranslationZh]
          : undefined),
    );
    const errors = [...validation.errors, ...tagValidation.errors];

    if (!isLearningTrack(rawTrack)) {
      errors.push("invalid_track");
    }

    if (!meaningsZh.length) {
      errors.push("missing_meaning");
    }

    if (!examples.length) {
      errors.push("missing_example");
    }

    if (examples.some((_, exampleIndex) => !exampleTranslationsZh[exampleIndex])) {
      errors.push("missing_example_translation");
    }

    return {
      tempId: makeTempId(index + 1, 1),
      lineNumber: index + 1,
      rawLine: JSON.stringify(item),
      surfaceText: validation.surfaceText,
      normalizedText: validation.normalizedText,
      meaningZh: meaningsZh[0] ?? "",
      meaningsZh,
      example: examples[0] ?? "",
      examples,
      exampleTranslationsZh,
      notes: normalizeOptionalText(readString(record.notes)),
      rarityScore: normalizeRarityScore(record.rarityScore as number | string | null | undefined),
      learningTrack: normalizeLearningTrack(rawTrack),
      tags: tagValidation.tags,
      status: "new",
      errors,
    };
  });

  return recomputeImportCandidates(candidates, { ...options, requireMeaningAndExample: true });
}

export function summarizeImportCandidates(candidates: ImportCandidate[]) {
  return {
    totalRows: candidates.length,
    newRows: candidates.filter((candidate) => candidate.status === "new").length,
    duplicateRows: candidates.filter((candidate) => candidate.status === "duplicate").length,
    invalidRows: candidates.filter((candidate) => candidate.status === "invalid").length,
  };
}
