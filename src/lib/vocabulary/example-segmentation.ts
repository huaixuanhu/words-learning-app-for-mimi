export type ExampleTextSegment = Readonly<{
  text: string;
  start: number;
  end: number;
  isActionable: boolean;
}>;

type RawSegment = ExampleTextSegment;

const LETTER_PATTERN = /\p{L}/u;
const CONNECTOR_PATTERN = /^['’-]$/u;
const FALLBACK_WORD_PATTERN = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;

function fallbackSegments(example: string): RawSegment[] {
  const segments: RawSegment[] = [];
  let cursor = 0;

  for (const match of example.matchAll(FALLBACK_WORD_PATTERN)) {
    const start = match.index;
    const text = match[0];

    if (start > cursor) {
      segments.push({
        text: example.slice(cursor, start),
        start: cursor,
        end: start,
        isActionable: false,
      });
    }

    const end = start + text.length;
    segments.push({ text, start, end, isActionable: LETTER_PATTERN.test(text) });
    cursor = end;
  }

  if (cursor < example.length) {
    segments.push({
      text: example.slice(cursor),
      start: cursor,
      end: example.length,
      isActionable: false,
    });
  }

  return segments;
}

function mergeJoinedWordSegments(segments: RawSegment[]) {
  const merged: RawSegment[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    const current = segments[index];

    if (!current.isActionable) {
      merged.push(current);
      continue;
    }

    let text = current.text;
    let end = current.end;

    while (
      index + 2 < segments.length &&
      segments[index + 1].start === end &&
      segments[index + 1].end === segments[index + 2].start &&
      CONNECTOR_PATTERN.test(segments[index + 1].text) &&
      segments[index + 2].isActionable
    ) {
      text += segments[index + 1].text + segments[index + 2].text;
      end = segments[index + 2].end;
      index += 2;
    }

    merged.push({
      text,
      start: current.start,
      end,
      isActionable: true,
    });
  }

  return merged;
}

function segmentWithIntl(example: string): RawSegment[] | null {
  if (typeof Intl.Segmenter !== "function") {
    return null;
  }

  const segmenter = new Intl.Segmenter("en", { granularity: "word" });

  return Array.from(segmenter.segment(example), (segment) => ({
    text: segment.segment,
    start: segment.index,
    end: segment.index + segment.segment.length,
    isActionable: Boolean(segment.isWordLike && LETTER_PATTERN.test(segment.segment)),
  }));
}

export function segmentEnglishExample(
  example: string,
  options: Readonly<{ forceFallback?: boolean }> = {},
): ExampleTextSegment[] {
  if (!example) {
    return [];
  }

  const rawSegments = options.forceFallback ? null : segmentWithIntl(example);
  return mergeJoinedWordSegments(rawSegments ?? fallbackSegments(example));
}

export function findActionableExampleSegment(
  example: string,
  start: number,
  end: number,
) {
  return segmentEnglishExample(example).find(
    (segment) => segment.isActionable && segment.start === start && segment.end === end,
  ) ?? null;
}
