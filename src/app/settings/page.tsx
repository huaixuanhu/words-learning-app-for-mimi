import { AppShell } from "@/components/app-shell";
import { SimplePanel } from "@/components/simple-panel";
import { PersonSettingsForm } from "@/components/settings/person-settings-form";
import { ReviewSettingsForm } from "@/components/settings/review-settings-form";
import { SoundSettingsForm } from "@/components/settings/sound-settings-form";
import { ThemeSettingsForm } from "@/components/settings/theme-settings-form";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Choose how the app feels and who is studying.">
      <div className="grid gap-4">
        <SimplePanel title="Theme">
          <ThemeSettingsForm />
        </SimplePanel>
        <SimplePanel title="Sound">
          <SoundSettingsForm />
        </SimplePanel>
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
