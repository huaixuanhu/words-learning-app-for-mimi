import { AppShell } from "@/components/app-shell";
import { AddWordForm } from "@/components/add-word-form";
import { SimplePanel } from "@/components/simple-panel";

export default function AddPage() {
  return (
    <AppShell title="添加单词" subtitle="Manual entry scaffold">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <SimplePanel title="Word">
          <AddWordForm />
        </SimplePanel>

        <SimplePanel title="Rules">
          <ul className="space-y-3 text-sm leading-6 text-[#66645c]">
            <li>新词初始状态: new</li>
            <li>Rarity 不是 proficiency</li>
            <li>Created at 默认自动记录</li>
            <li>实际写入时间由系统维护</li>
          </ul>
        </SimplePanel>
      </div>
    </AppShell>
  );
}
