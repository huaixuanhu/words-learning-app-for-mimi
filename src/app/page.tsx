import { AppShell } from "@/components/app-shell";
import { HomeDashboard } from "@/components/vocabulary/home-dashboard";

export default function Home() {
  return (
    <AppShell title="Today" subtitle="One calm step at a time.">
      <HomeDashboard />
    </AppShell>
  );
}
