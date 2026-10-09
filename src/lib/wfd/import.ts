import { normalizeWfdWords } from "./grading";
import { WfdDataError, type WfdSentence } from "./types";

export const WFD_MAX_SENTENCES = 5000;

export function wfdObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new WfdDataError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function wfdText(value: unknown, label: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new WfdDataError(`${label} must be non-empty text (up to ${max} characters).`);
  }
  return value;
}

function optionalLearningText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length > 1000) {
    throw new WfdDataError(`${label} must be text (up to 1000 characters), or empty while awaiting curation.`);
  }
  return value.trim() ? value : "";
}

export function wfdId(value: unknown, label: string): string {
  const id = wfdText(value, label, 128);
  if (id.trim() !== id || ["__proto__", "constructor", "prototype"].includes(id)) {
    throw new WfdDataError(`${label} is not a valid ID.`);
  }
  return id;
}

export function wfdDate(value: unknown, label: string): string {
  const date = wfdText(value, label, 40);
  const isoPattern = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;
  const calendarDate = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  if (!isoPattern.test(date) || !Number.isFinite(Date.parse(date)) ||
    !Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date.slice(0, 10)) {
    throw new WfdDataError(`${label} must be an ISO date.`);
  }
  return date;
}

function enumValue<T extends string>(value: unknown, options: readonly T[], label: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new WfdDataError(`${label} must be one of: ${options.join(", ")}.`);
  }
  return value as T;
}

/** Build a new, validated object. Imported fields are never spread into app state. */
export function validateWfdSentence(input: unknown, label = "Sentence"): WfdSentence {
  const value = wfdObject(input, label);
  const text = wfdText(value.text, `${label} text`);
  if (!normalizeWfdWords(text).length || normalizeWfdWords(text).length > 256) {
    throw new WfdDataError(`${label} must contain 1–256 words.`);
  }
  if (!Array.isArray(value.chunks) || !value.chunks.length || value.chunks.length > 32) {
    throw new WfdDataError(`${label} needs 1–32 aligned phrase chunks.`);
  }
  const chunks = value.chunks.map((inputChunk, index) => {
    const chunk = wfdObject(inputChunk, `${label} chunk ${index + 1}`);
    return {
      text: wfdText(chunk.text, `${label} chunk text`),
      cueZh: optionalLearningText(chunk.cueZh, `${label} chunk Chinese cue`),
      ...(chunk.visualLabel === undefined ? {} : {
        visualLabel: wfdText(chunk.visualLabel, `${label} chunk visual label`, 200),
      }),
    };
  });
  if (normalizeWfdWords(chunks.map((chunk) => chunk.text).join(" ")).join(" ") !==
    normalizeWfdWords(text).join(" ")) {
    throw new WfdDataError(`${label} phrase chunks must reconstruct the original sentence in order.`);
  }
  const source = wfdObject(value.source, `${label} source`);
  const sourceUrl = typeof source.url === "string" ? source.url : null;
  if (sourceUrl === null || sourceUrl.length > 2000 ||
    (sourceUrl !== "" && !/^https?:\/\//i.test(sourceUrl))) {
    throw new WfdDataError(`${label} source URL must be an HTTP(S) URL or empty.`);
  }
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      if (url.username || url.password) throw new Error("credentials");
    } catch {
      throw new WfdDataError(`${label} source URL is invalid.`);
    }
  }
  if (!Array.isArray(value.tags) || value.tags.length > 30) {
    throw new WfdDataError(`${label} tags must be a list of up to 30 labels.`);
  }
  const image = value.image === undefined ? undefined : wfdText(value.image, `${label} image`, 500);
  if (image && (!image.startsWith("/") || image.startsWith("//") || image.includes("\\") ||
    image.includes("..") || /[?#%]/.test(image))) {
    throw new WfdDataError(`${label} image must use a local site asset path.`);
  }
  return {
    id: wfdId(value.id, `${label} ID`),
    text,
    translationZh: optionalLearningText(value.translationZh, `${label} Chinese translation`),
    chunks,
    source: {
      name: wfdText(source.name, `${label} source name`, 200),
      url: sourceUrl,
      edition: wfdText(source.edition, `${label} source edition`, 200),
      retrievedAt: wfdDate(source.retrievedAt, `${label} source retrieval date`),
      kind: enumValue(source.kind, ["prediction", "demo", "user"] as const, `${label} source kind`),
    },
    tags: value.tags.map((tag) => wfdText(tag, `${label} tag`, 100)),
    ...(image === undefined ? {} : { image }),
    ...(value.visualKind === undefined ? {} : {
      visualKind: enumValue(value.visualKind, ["scene", "sequence", "diagram"] as const, `${label} visual kind`),
    }),
    ...(value.animation === undefined ? {} : {
      animation: enumValue(value.animation, ["reveal", "flow", "timeline"] as const, `${label} animation`),
    }),
  };
}

export function validateWfdSentences(input: unknown): WfdSentence[] {
  if (!Array.isArray(input) || input.length > WFD_MAX_SENTENCES) {
    throw new WfdDataError(`The sentence bank must be a list of up to ${WFD_MAX_SENTENCES} sentences.`);
  }
  const sentences = input.map((sentence, index) => validateWfdSentence(sentence, `Sentence ${index + 1}`));
  if (new Set(sentences.map((sentence) => sentence.id)).size !== sentences.length) {
    throw new WfdDataError("The sentence bank contains duplicate IDs. Nothing was imported.");
  }
  return sentences;
}

export function parseWfdSentenceImport(json: string): WfdSentence[] {
  if (json.length > 10_000_000) throw new WfdDataError("The WFD import is too large (maximum 10 MB).");
  let input: unknown;
  try {
    input = JSON.parse(json) as unknown;
  } catch {
    throw new WfdDataError("The WFD import is not valid JSON. Nothing was changed.");
  }
  const list = Array.isArray(input) ? input : wfdObject(input, "Import").sentences;
  const sentences = validateWfdSentences(list);
  if (!sentences.length) throw new WfdDataError("The import does not contain any sentences.");
  return sentences;
}

/** Updating cues/source is safe; changing an ID's target would invalidate its history. */
export function mergeWfdSentences(existing: WfdSentence[], incoming: WfdSentence[]): WfdSentence[] {
  const current = new Map(validateWfdSentences(existing).map((sentence) => [sentence.id, sentence]));
  for (const sentence of validateWfdSentences(incoming)) {
    const previous = current.get(sentence.id);
    if (previous && normalizeWfdWords(previous.text).join(" ") !== normalizeWfdWords(sentence.text).join(" ")) {
      throw new WfdDataError(`Sentence ${sentence.id} has a different target. Give the revised sentence a new ID.`);
    }
    current.set(sentence.id, sentence);
  }
  if (current.size > WFD_MAX_SENTENCES) throw new WfdDataError("The combined sentence bank is too large.");
  return [...current.values()];
}
