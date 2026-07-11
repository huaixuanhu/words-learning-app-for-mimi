import { AppShell } from "@/components/app-shell";
import { ReviewSession } from "@/components/review/review-session";

export default function ReviewPage() {
  return (
    <AppShell title="开始复习" subtitle="Review gently, remember deeply.">
      <ReviewSession />
    </AppShell>
  );
}
