import { AppShell } from "@/components/app-shell";
import { DailyStudyBoard } from "@/components/study/daily-study-board";

export default function StudyPage() {
  return (
    <AppShell title="Study" subtitle="Plan today, then choose one calm zone.">
      <DailyStudyBoard />
    </AppShell>
  );
}
