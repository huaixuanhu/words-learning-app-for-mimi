import { AppShell } from "@/components/app-shell";
import { HomeDashboard } from "@/components/vocabulary/home-dashboard";

export default function Home() {
  return (
    <AppShell title="今日入口" subtitle="Stage 3 local vocabulary scaffold">
      <HomeDashboard />
    </AppShell>
  );
}
