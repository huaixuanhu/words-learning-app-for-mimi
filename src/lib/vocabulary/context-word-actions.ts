import { getSelectedPersonId } from "@/lib/people/repository";
import type { VocabularyData } from "./types";
import { normalizeSurfaceText } from "./normalize";

export function findSelectedPersonVocabularyDuplicate(
  data: VocabularyData,
  surfaceText: string,
) {
  const normalizedText = normalizeSurfaceText(surfaceText);

  if (!normalizedText) {
    return null;
  }

  const personId = getSelectedPersonId(data);
  return data.items.find(
    (item) => item.personId === personId && item.normalizedText === normalizedText,
  ) ?? null;
}
