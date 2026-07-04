import { AppShell } from "@/components/app-shell";
import { ExportWorkspace } from "@/components/export/export-workspace";

export default function ExportPage() {
  return (
    <AppShell title="导出" subtitle="Local export and backup">
      <ExportWorkspace />
    </AppShell>
  );
}
