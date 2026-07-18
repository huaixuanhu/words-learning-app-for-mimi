import { AppShell } from "@/components/app-shell";
import { ExportWorkspace } from "@/components/export/export-workspace";

export default function ExportPage() {
  return (
    <AppShell title="Backup">
      <ExportWorkspace />
    </AppShell>
  );
}
