import { AppShell } from "@/components/app-shell";
import { SimplePanel } from "@/components/simple-panel";
import { ReviewSettingsForm } from "@/components/settings/review-settings-form";

export default function SettingsPage() {
  return (
    <AppShell title="设置" subtitle="Settings scaffold">
      <SimplePanel title="Review">
        <ReviewSettingsForm />
      </SimplePanel>
    </AppShell>
  );
}
