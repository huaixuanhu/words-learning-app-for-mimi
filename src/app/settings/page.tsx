import { AppShell } from "@/components/app-shell";
import { SimplePanel } from "@/components/simple-panel";
import { defaultSessionLimit } from "@/lib/stage-two-data";

export default function SettingsPage() {
  return (
    <AppShell title="设置" subtitle="Settings scaffold">
      <SimplePanel title="Review">
        <form className="grid gap-4 md:max-w-md">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Daily session limit</span>
            <input
              type="number"
              min={1}
              max={80}
              defaultValue={defaultSessionLimit}
              className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Timezone</span>
            <input
              defaultValue="Australia/Melbourne"
              className="min-h-11 rounded-md border border-[#d7d4ca] bg-white px-3 text-base outline-none focus:border-[#517056]"
            />
          </label>
        </form>
      </SimplePanel>
    </AppShell>
  );
}
