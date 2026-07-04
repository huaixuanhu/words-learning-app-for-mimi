import { AppShell } from "@/components/app-shell";
import { SimplePanel } from "@/components/simple-panel";
import { PersonSettingsForm } from "@/components/settings/person-settings-form";
import { ReviewSettingsForm } from "@/components/settings/review-settings-form";

export default function SettingsPage() {
  return (
    <AppShell title="设置" subtitle="Local person and review settings">
      <div className="grid gap-4">
        <SimplePanel title="People">
          <PersonSettingsForm />
        </SimplePanel>
        <SimplePanel title="Review">
          <ReviewSettingsForm />
        </SimplePanel>
      </div>
    </AppShell>
  );
}
