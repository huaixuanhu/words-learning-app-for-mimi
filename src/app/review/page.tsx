import { AppShell } from "@/components/app-shell";
import { ReviewSession } from "@/components/review/review-session";
import type { StudyZone } from "@/lib/daily-study/types";

export default async function ReviewPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ zone?: string | string[] }>;
}>) {
  const params = await searchParams;
  const zone: StudyZone = params.zone === "new" ? "new" : "review";

  return (
    <AppShell title={zone === "new" ? "New Words" : "Review"}>
      <ReviewSession zone={zone} />
    </AppShell>
  );
}
