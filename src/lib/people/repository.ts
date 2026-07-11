import type { Person, VocabularyData } from "@/lib/vocabulary/types";
import { cleanSurfaceText, normalizeSurfaceText } from "@/lib/vocabulary/normalize";

export const DEFAULT_PERSON_ID = "person_mimi";
export const DEFAULT_PERSON_SLUG = "mimi";
export const DEFAULT_PERSON_DISPLAY_NAME = "Mimi";

export type NewPersonInput = {
  id?: string;
  displayName: string;
  slug?: string;
};

function makePersonId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `person_${crypto.randomUUID()}`;
  }

  return `person_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultPerson(now = new Date().toISOString()): Person {
  return {
    id: DEFAULT_PERSON_ID,
    displayName: DEFAULT_PERSON_DISPLAY_NAME,
    slug: DEFAULT_PERSON_SLUG,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizePersonDisplayName(input: string | null | undefined) {
  return cleanSurfaceText(input || "") || DEFAULT_PERSON_DISPLAY_NAME;
}

export function normalizePersonSlug(input: string | null | undefined, fallback: string) {
  const normalized = normalizeSurfaceText(input || fallback)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || DEFAULT_PERSON_SLUG;
}

export function getUniquePersonSlug(
  people: Person[],
  desiredSlug: string,
  excludingPersonId?: string,
) {
  const used = new Set(
    people
      .filter((person) => person.id !== excludingPersonId)
      .map((person) => person.slug),
  );

  if (!used.has(desiredSlug)) {
    return desiredSlug;
  }

  let counter = 2;
  let nextSlug = `${desiredSlug}-${counter}`;

  while (used.has(nextSlug)) {
    counter += 1;
    nextSlug = `${desiredSlug}-${counter}`;
  }

  return nextSlug;
}

export function buildPerson(input: NewPersonInput, people: Person[] = [], now = new Date().toISOString()): Person {
  const displayName = normalizePersonDisplayName(input.displayName);
  const desiredSlug = normalizePersonSlug(input.slug, displayName);

  return {
    id: input.id ?? makePersonId(),
    displayName,
    slug: getUniquePersonSlug(people, desiredSlug, input.id),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function getActivePeople(data: VocabularyData) {
  return data.people.filter((person) => person.isActive);
}

export function getSelectedPersonId(data: VocabularyData) {
  if (data.people.some((person) => person.id === data.selectedPersonId && person.isActive)) {
    return data.selectedPersonId;
  }

  return getActivePeople(data)[0]?.id ?? data.people[0]?.id ?? DEFAULT_PERSON_ID;
}

export function getSelectedPerson(data: VocabularyData) {
  const selectedPersonId = getSelectedPersonId(data);

  return data.people.find((person) => person.id === selectedPersonId) ?? createDefaultPerson();
}
