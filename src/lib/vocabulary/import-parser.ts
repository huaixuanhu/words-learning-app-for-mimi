import type { ImportCandidate, ImportCandidateStatus } from "./types";
import { normalizeOptionalText, validateSurfaceText } from "./normalize";

type ParseTextImportOptions = {
  existingNormalizedTexts?: Iterable<string>;
};

type RawCandidate = {
  lineNumber: number;
  rawLine: string;
  surfaceText: string;
  meaningZh: string;
  example: string;
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
      },
    ];
  }

  if (trimmed.includes("\t")) {
    const [surfaceText = "", meaningZh = "", ...exampleParts] = trimmed
      .split("\t")
      .map((part) => part.trim());

    return [
      {
        lineNumber,
        rawLine,
        surfaceText,
        meaningZh,
        example: exampleParts.join(" "),
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
    }));
  }

  return [
    {
      lineNumber,
      rawLine,
      surfaceText: trimmed,
      meaningZh: "",
      example: "",
    },
  ];
}

function getCandidateStatus(errors: string[], duplicate: boolean): ImportCandidateStatus {
  if (errors.includes("empty") || errors.includes("too_long") || errors.includes("sentence_like")) {
    return "invalid" as const;
  }

  return duplicate ? "duplicate" : "new";
}

export function recomputeImportCandidates(
  candidates: ImportCandidate[],
  options: ParseTextImportOptions = {},
): ImportCandidate[] {
  const existing = new Set(options.existingNormalizedTexts ?? []);
  const seen = new Set<string>();

  return candidates.map((candidate) => {
    const validation = validateSurfaceText(candidate.surfaceText);
    const duplicate =
      validation.normalizedText &&
      (existing.has(validation.normalizedText) || seen.has(validation.normalizedText));
    const errors = duplicate ? [...validation.errors, "duplicate"] : validation.errors;

    if (validation.normalizedText) {
      seen.add(validation.normalizedText);
    }

    return {
      ...candidate,
      surfaceText: validation.surfaceText,
      normalizedText: validation.normalizedText,
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
      const errors = [...validation.errors];
      const duplicate =
        validation.normalizedText &&
        (existing.has(validation.normalizedText) || seen.has(validation.normalizedText));

      if (duplicate) {
        errors.push("duplicate");
      }

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
        example: normalizeOptionalText(rawCandidate.example),
        rarityScore: null,
        status: getCandidateStatus(errors, Boolean(duplicate)),
        errors,
      });
    });
  });

  return candidates;
}

export function summarizeImportCandidates(candidates: ImportCandidate[]) {
  return {
    totalRows: candidates.length,
    newRows: candidates.filter((candidate) => candidate.status === "new").length,
    duplicateRows: candidates.filter((candidate) => candidate.status === "duplicate").length,
    invalidRows: candidates.filter((candidate) => candidate.status === "invalid").length,
  };
}
