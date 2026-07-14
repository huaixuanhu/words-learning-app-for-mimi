import { AppShell } from "@/components/app-shell";
import { ExportWorkspace } from "@/components/export/export-workspace";

export default function ExportPage() {
  return (
    <AppShell title="Backup" subtitle="Keep a copy you can carry and restore.">
      <ExportWorkspace />
    </AppShell>
  );
}
