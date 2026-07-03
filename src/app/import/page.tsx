import { AppShell } from "@/components/app-shell";
import { SimplePanel } from "@/components/simple-panel";
import { importPreviewRows } from "@/lib/stage-two-data";

export default function ImportPage() {
  return (
    <AppShell title="批量导入" subtitle=".txt / paste text scaffold">
      <div className="grid gap-4">
        <SimplePanel title="Input">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Text file</span>
              <input
                type="file"
                accept=".txt,text/plain"
                className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Paste text</span>
              <textarea
                rows={5}
                placeholder={"allocate - 分配\ncoherent, ambiguous"}
                className="min-h-32 resize-y rounded-md border border-[#d7d4ca] bg-white px-3 py-2 text-base outline-none focus:border-[#517056]"
              />
            </label>
          </div>
        </SimplePanel>

        <SimplePanel title="Preview">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Total", "3"],
              ["New", "1"],
              ["Duplicate", "1"],
              ["Invalid", "1"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-[#f8f7f4] p-3">
                <p className="text-xs font-medium text-[#66645c]">{label}</p>
                <p className="mt-1 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dfddd6] text-[#66645c]">
                  <th className="py-2 pr-3 font-medium">Line</th>
                  <th className="py-2 pr-3 font-medium">Raw</th>
                  <th className="py-2 pr-3 font-medium">Word</th>
                  <th className="py-2 pr-3 font-medium">Meaning</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {importPreviewRows.map((row) => (
                  <tr key={`${row.line}-${row.status}`} className="border-b border-[#eeeae1]">
                    <td className="py-2 pr-3">{row.line}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.raw || "empty"}</td>
                    <td className="py-2 pr-3">{row.surfaceText || "-"}</td>
                    <td className="py-2 pr-3">{row.meaningZh || "-"}</td>
                    <td className="py-2 pr-3">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SimplePanel>
      </div>
    </AppShell>
  );
}
