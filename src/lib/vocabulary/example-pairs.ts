import { normalizeOptionalText, normalizeTextList } from "./normalize";

export type VocabularyExamplePair = Readonly<{
  en: string;
  zh: string;
}>;

export function alignExampleTranslationsZh(
  examples: readonly string[],
  translations: unknown,
) {
  const normalizedTranslations = Array.isArray(translations)
    ? translations.map((value) =>
        normalizeOptionalText(typeof value === "string" ? value : ""),
      )
    : [];

  return examples.map((_, index) => normalizedTranslations[index] ?? "");
}

export function buildVocabularyExamplePairs(input: Readonly<{
  example?: string;
  examples?: readonly string[];
  exampleTranslationsZh?: unknown;
}>) {
  const legacyExample = normalizeOptionalText(input.example);
  const examples = normalizeTextList(
    input.examples?.length ? input.examples : legacyExample,
  );
  const translationsZh = alignExampleTranslationsZh(
    examples,
    input.exampleTranslationsZh,
  );

  return examples.map((en, index) => ({
    en,
    zh: translationsZh[index],
  }));
}

export function splitVocabularyExamplePairs(
  pairs: readonly VocabularyExamplePair[],
) {
  const normalizedPairs = pairs
    .map((pair) => ({
      en: normalizeOptionalText(pair.en),
      zh: normalizeOptionalText(pair.zh),
    }))
    .filter((pair) => Boolean(pair.en));

  return {
    example: normalizedPairs[0]?.en ?? "",
    examples: normalizedPairs.map((pair) => pair.en),
    exampleTranslationsZh: normalizedPairs.map((pair) => pair.zh),
  };
}

export function findIncompleteVocabularyExampleIndexes(
  pairs: readonly VocabularyExamplePair[],
) {
  return pairs.flatMap((pair, index) =>
    pair.en && !pair.zh ? [index] : [],
  );
}

export function assertCompleteVocabularyExamplePairs(
  pairs: readonly VocabularyExamplePair[],
) {
  const incomplete = findIncompleteVocabularyExampleIndexes(pairs);
  if (incomplete.length) {
    throw new Error("Add a Chinese translation for every English example.");
  }
  return pairs;
}
