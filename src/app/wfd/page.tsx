import { AppShell } from "@/components/app-shell";
import { WfdWorkspace } from "@/components/wfd/wfd-workspace";
import "./wfd.css";

export default function WfdPage() {
  return <AppShell title="Write from dictation"><WfdWorkspace /></AppShell>;
}
