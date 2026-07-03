import { AppShell } from "@/components/app-shell";
import { SimplePanel } from "@/components/simple-panel";
import { sampleVocabulary } from "@/lib/stage-two-data";

export default function LibraryPage() {
  return (
    <AppShell title="词库" subtitle="Vocabulary list scaffold">
      <SimplePanel title="Items">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#dfddd6] text-[#66645c]">
                <th className="py-2 pr-3 font-medium">Word</th>
                <th className="py-2 pr-3 font-medium">Meaning</th>
                <th className="py-2 pr-3 font-medium">Rarity</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {sampleVocabulary.map((item) => (
                <tr key={item.id} className="border-b border-[#eeeae1]">
                  <td className="py-2 pr-3 font-medium">{item.surfaceText}</td>
                  <td className="py-2 pr-3">{item.meaningZh}</td>
                  <td className="py-2 pr-3">{item.rarityScore}</td>
                  <td className="py-2 pr-3">{item.source}</td>
                  <td className="py-2 pr-3">{item.status}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{item.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SimplePanel>
    </AppShell>
  );
}
