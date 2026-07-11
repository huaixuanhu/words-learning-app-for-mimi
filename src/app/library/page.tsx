import { AppShell } from "@/components/app-shell";
import { VocabularyLibrary } from "@/components/vocabulary/vocabulary-library";

export default function LibraryPage() {
  return (
    <AppShell title="词库" subtitle="Search, edit, archive, and keep your study material tidy.">
      <VocabularyLibrary />
    </AppShell>
  );
}
