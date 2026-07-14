import { AppShell } from "@/components/app-shell";
import { ReviewSession } from "@/components/review/review-session";

export default function ReviewPage() {
  return (
    <AppShell title="Review" subtitle="Remember gently, one card at a time.">
      <ReviewSession />
    </AppShell>
  );
}
