"use client";

import { AppShell } from "@/components/app-shell";
import { SimplePanel } from "@/components/simple-panel";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";
import { reviewRatings } from "@/lib/stage-two-data";
import { getActiveVocabularyItems } from "@/lib/vocabulary/repository";

export default function ReviewPage() {
  const { data, isLoaded } = useVocabularyData();
  const card = getActiveVocabularyItems(data)[0];

  return (
    <AppShell title="开始复习" subtitle="Local flashcard scaffold">
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <SimplePanel title="Card">
          <div className="grid min-h-64 place-items-center rounded-md border border-[#dfddd6] bg-[#f8f7f4] p-6 text-center">
            {card ? (
              <div>
                <p className="text-4xl font-semibold">{card.surfaceText}</p>
                <p className="mt-4 text-base text-[#66645c]">
                  {card.example || card.meaningZh || "No example yet"}
                </p>
              </div>
            ) : (
              <p className="text-sm leading-6 text-[#66645c]">
                {isLoaded ? "还没有可复习的本地词条。" : "Loading local vocabulary..."}
              </p>
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {reviewRatings.map((rating) => (
              <button
                key={rating.value}
                type="button"
                className="min-h-12 rounded-md border border-[#d7d4ca] bg-white px-3 text-sm font-medium hover:border-[#517056] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#517056]"
              >
                {rating.label}
              </button>
            ))}
          </div>
        </SimplePanel>

        <SimplePanel title="Schedule">
          <div className="space-y-3">
            {reviewRatings.map((rating) => (
              <div key={rating.value} className="rounded-md bg-[#f8f7f4] p-3">
                <p className="font-medium">{rating.label}</p>
                <p className="text-sm text-[#66645c]">{rating.interval}</p>
              </div>
            ))}
          </div>
        </SimplePanel>
      </div>
    </AppShell>
  );
}
