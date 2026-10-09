import { WfdDataError, type WfdGrade, type WfdGradeToken } from "./types";

/** Ignore presentation punctuation/case, but retain word order and word forms. */
export function normalizeWfdWords(text: string): string[] {
  return text.normalize("NFKC").toLocaleLowerCase("en")
    .replace(/['’‘]/g, "")
    .match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
}

/** Minimum-edit word alignment. This is practice feedback, not official scoring. */
export function gradeWfd(expected: string, answer: string): WfdGrade {
  const target = normalizeWfdWords(expected);
  const actual = normalizeWfdWords(answer);
  if (!target.length) throw new WfdDataError("The target sentence must contain words.");
  // Bound the alignment matrix even when a very large string is pasted.
  if (target.length > 256 || actual.length > 512 || answer.length > 10000) {
    throw new WfdDataError("This answer is too long. Enter one WFD sentence.");
  }
  const distance = Array.from({ length: target.length + 1 }, () =>
    new Uint16Array(actual.length + 1));
  for (let i = 0; i <= target.length; i++) distance[i][0] = i;
  for (let j = 0; j <= actual.length; j++) distance[0][j] = j;
  for (let i = 1; i <= target.length; i++) {
    for (let j = 1; j <= actual.length; j++) {
      distance[i][j] = Math.min(
        distance[i - 1][j - 1] + (target[i - 1] === actual[j - 1] ? 0 : 1),
        distance[i - 1][j] + 1,
        distance[i][j - 1] + 1,
      );
    }
  }

  const tokens: WfdGradeToken[] = [];
  let i = target.length;
  let j = actual.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && target[i - 1] === actual[j - 1]) {
      tokens.push({ expected: target[--i], actual: actual[--j], kind: "correct" });
    } else if (i > 0 && j > 0 && distance[i][j] === distance[i - 1][j - 1] + 1) {
      tokens.push({ expected: target[--i], actual: actual[--j], kind: "changed" });
    } else if (i > 0 && distance[i][j] === distance[i - 1][j] + 1) {
      tokens.push({ expected: target[--i], kind: "missing" });
    } else {
      tokens.push({ actual: actual[--j], kind: "extra" });
    }
  }
  tokens.reverse();
  const correctCount = tokens.filter((token) => token.kind === "correct").length;
  return {
    correct: distance[target.length][actual.length] === 0,
    // Extra words reduce practice accuracy; inserting every possible word cannot score 100%.
    accuracy: correctCount / Math.max(target.length, actual.length),
    expectedCount: target.length,
    correctCount,
    tokens,
  };
}
