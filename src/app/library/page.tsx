import { AppShell } from "@/components/app-shell";
import { VocabularyLibrary } from "@/components/vocabulary/vocabulary-library";

export default function LibraryPage() {
  return (
    <AppShell title="Library" subtitle="Find and care for your words.">
      <VocabularyLibrary />
    </AppShell>
  );
}
