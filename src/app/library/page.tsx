import { AppShell } from "@/components/app-shell";
import { VocabularyLibrary } from "@/components/vocabulary/vocabulary-library";

export default function LibraryPage() {
  return (
    <AppShell title="词库" subtitle="Local vocabulary CRUD">
      <VocabularyLibrary />
    </AppShell>
  );
}
