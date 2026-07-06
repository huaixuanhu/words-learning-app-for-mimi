import { AppShell } from "@/components/app-shell";
import { ImportWorkspace } from "@/components/vocabulary/import-workspace";

export default function ImportPage() {
  return (
    <AppShell title="批量导入" subtitle="Turn a plain text list into reviewable cards.">
      <ImportWorkspace />
    </AppShell>
  );
}
