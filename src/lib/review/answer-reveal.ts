export type AnswerRevealState = Readonly<{
  showBack: boolean;
  cardStartedAt: number;
}>;

export function getNextAnswerRevealState(
  current: AnswerRevealState,
  eventTimeStamp: number,
): AnswerRevealState {
  const showBack = !current.showBack;
  const firstRevealTime =
    showBack && current.cardStartedAt <= 0 && Number.isFinite(eventTimeStamp)
      ? Math.max(0, eventTimeStamp)
      : current.cardStartedAt;

  return {
    showBack,
    cardStartedAt: firstRevealTime,
  };
}
