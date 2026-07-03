import { AppShell } from "@/components/app-shell";
import { ImportWorkspace } from "@/components/vocabulary/import-workspace";

export default function ImportPage() {
  return (
    <AppShell title="批量导入" subtitle=".txt / paste text local parser">
      <ImportWorkspace />
    </AppShell>
  );
}
