import { AppShell } from "@/components/app-shell";
import { HomeDashboard } from "@/components/vocabulary/home-dashboard";

export default function Home() {
  return (
    <AppShell title="今日学习" subtitle="Keep going, one word at a time.">
      <HomeDashboard />
    </AppShell>
  );
}
