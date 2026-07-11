import { AppShell } from "@/components/app-shell";
import { ImportWorkspace } from "@/components/vocabulary/import-workspace";

export default function ImportPage() {
  return (
    <AppShell title="导入" subtitle="Choose single input or batch JSON import with an explicit learning track.">
      <ImportWorkspace />
    </AppShell>
  );
}
