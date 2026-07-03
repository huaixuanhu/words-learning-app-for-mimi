import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SimplePanel } from "@/components/simple-panel";

export default function ExportPage() {
  return (
    <AppShell title="导出" subtitle="CSV / JSON scaffold">
      <SimplePanel title="Formats">
        <div className="grid gap-3 sm:grid-cols-2">
          {["CSV", "JSON"].map((format) => (
            <button
              key={format}
              type="button"
              disabled
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md border border-[#d7d4ca] bg-white px-4 text-sm font-semibold opacity-70"
            >
              <Download aria-hidden="true" className="size-4" />
              {format}
            </button>
          ))}
        </div>
      </SimplePanel>
    </AppShell>
  );
}
