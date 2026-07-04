"use client";

import { RotateCcw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SimplePanel } from "@/components/simple-panel";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";
import { recordReview } from "@/lib/review/repository";
import { selectReviewQueue } from "@/lib/review/scheduler";
import { reviewRatings } from "@/lib/stage-two-data";
import { getActiveVocabularyItems } from "@/lib/vocabulary/repository";

function getItemById(dataItems: ReturnType<typeof getActiveVocabularyItems>, id: string) {
  return dataItems.find((item) => item.id === id);
}

export function ReviewSession() {
  const { data, isLoaded, commit } = useVocabularyData();
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [cardStartedAt, setCardStartedAt] = useState(0);
  const [submittedItemId, setSubmittedItemId] = useState<string | null>(null);
  const submittedItemIdRef = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const activeItems = useMemo(() => getActiveVocabularyItems(data), [data]);

  const buildSessionIds = useCallback(() => {
    return selectReviewQueue(data).map((item) => item.id);
  }, [data]);

  useEffect(() => {
    if (!isLoaded || sessionIds) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSessionIds(buildSessionIds());
      setCardStartedAt(0);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [buildSessionIds, isLoaded, sessionIds]);

  const currentItem = sessionIds?.length ? getItemById(activeItems, sessionIds[0]) : null;
  const sessionTotal = completedCount + (sessionIds?.length ?? 0);

  const restartSession = () => {
    submittedItemIdRef.current = null;
    setSessionIds(buildSessionIds());
    setCompletedCount(0);
    setShowBack(false);
    setCardStartedAt(0);
    setSubmittedItemId(null);
    setMessage("");
  };

  const submitRating = (rating: (typeof reviewRatings)[number]["value"], eventTimeStamp: number) => {
    if (!currentItem || submittedItemIdRef.current === currentItem.id) {
      return;
    }

    submittedItemIdRef.current = currentItem.id;
    setSubmittedItemId(currentItem.id);

    try {
      const result = recordReview(data, {
        vocabularyItemId: currentItem.id,
        rating,
        elapsedMs: cardStartedAt ? eventTimeStamp - cardStartedAt : 0,
      });

      commit(result.data);
      setSessionIds((current) => (current ? current.slice(1) : current));
      setCompletedCount((current) => current + 1);
      setShowBack(false);
      setCardStartedAt(0);
      setMessage(`已记录，下次复习 ${new Date(result.state.dueAt).toLocaleString()}`);
    } catch (error) {
      submittedItemIdRef.current = null;
      setSubmittedItemId(null);
      setMessage(error instanceof Error ? error.message : "复习记录失败");
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <SimplePanel title="Card">
        <div className="grid min-h-64 place-items-center rounded-md border border-[#dfddd6] bg-[#f8f7f4] p-6 text-center">
          {currentItem ? (
            <div className="grid gap-4">
              <p className="text-4xl font-semibold">{currentItem.surfaceText}</p>
              {showBack ? (
                <div className="grid gap-2 text-base text-[#464640]">
                  <p>{currentItem.meaningZh || "No meaning yet"}</p>
                  {currentItem.example ? (
                    <p className="text-sm leading-6 text-[#66645c]">{currentItem.example}</p>
                  ) : null}
                  {currentItem.notes ? (
                    <p className="text-sm leading-6 text-[#66645c]">{currentItem.notes}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[#66645c]">先回忆，再翻开答案。</p>
              )}
            </div>
          ) : (
            <p className="text-sm leading-6 text-[#66645c]">
              {isLoaded
                ? sessionTotal
                  ? "本次复习已完成。"
                  : "当前没有到期或可开始的新词。"
                : "Loading local vocabulary..."}
            </p>
          )}
        </div>

        {currentItem ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                setShowBack((current) => !current);
                setCardStartedAt(showBack ? 0 : event.timeStamp);
              }}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[#d7d4ca] bg-white px-4 text-sm font-semibold"
            >
              {showBack ? "隐藏答案" : "显示答案"}
            </button>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {reviewRatings.map((rating) => (
                <button
                  key={rating.value}
                  type="button"
                  disabled={!showBack || submittedItemId === currentItem.id}
                  onClick={(event) => submitRating(rating.value, event.timeStamp)}
                  className="min-h-12 rounded-md border border-[#d7d4ca] bg-white px-3 text-sm font-medium hover:border-[#517056] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#517056] disabled:opacity-50"
                >
                  {rating.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={restartSession}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#d7d4ca] bg-white px-4 text-sm font-semibold"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            重新生成本次复习
          </button>
        )}

        {message ? <p className="mt-3 text-sm text-[#517056]">{message}</p> : null}
      </SimplePanel>

      <SimplePanel title="Session">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-[#f8f7f4] p-3">
            <p className="text-xs font-medium text-[#66645c]">Limit</p>
            <p className="mt-1 text-xl font-semibold">{data.settings.sessionLimit}</p>
          </div>
          <div className="rounded-md bg-[#f8f7f4] p-3">
            <p className="text-xs font-medium text-[#66645c]">Done</p>
            <p className="mt-1 text-xl font-semibold">{completedCount}</p>
          </div>
          <div className="rounded-md bg-[#f8f7f4] p-3">
            <p className="text-xs font-medium text-[#66645c]">Left</p>
            <p className="mt-1 text-xl font-semibold">{sessionIds?.length ?? "-"}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {reviewRatings.map((rating) => (
            <div key={rating.value} className="rounded-md bg-[#f8f7f4] p-3">
              <p className="font-medium">{rating.label}</p>
              <p className="text-sm text-[#66645c]">{rating.interval}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={restartSession}
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[#517056] px-3 text-sm font-semibold text-white"
        >
          <Save aria-hidden="true" className="size-4" />
          新建本次复习
        </button>
      </SimplePanel>
    </div>
  );
}
