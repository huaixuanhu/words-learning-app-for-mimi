import { AppShell } from "@/components/app-shell";
import { ImportWorkspace } from "@/components/vocabulary/import-workspace";

export default function ImportPage() {
  return (
    <AppShell title="Add Words">
      <ImportWorkspace />
    </AppShell>
  );
}
