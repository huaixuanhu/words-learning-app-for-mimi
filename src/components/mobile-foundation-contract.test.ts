import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  mobileMoreItem,
  mobileMoreNavItems,
  mobilePrimaryNavItems,
} from "@/lib/stage-two-data";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("V2 Stage 4 mobile foundation", () => {
  it("keeps the accepted five-item mobile information architecture", () => {
    expect(mobilePrimaryNavItems.map((item) => item.label)).toEqual([
      "Home",
      "Study",
      "Review",
      "Library",
    ]);
    expect(mobileMoreItem.label).toBe("More");
    expect(mobileMoreNavItems.map((item) => [item.label, item.href])).toEqual([
      ["Add Words", "/import"],
      ["Practice Lab", "/practice-lab"],
      ["Settings", "/settings"],
      ["Backup", "/export"],
    ]);
  });

  it("closes the md-to-lg navigation gap and preserves Safe Area spacing", () => {
    const navSource = readSource("src/components/app-nav.tsx");
    const shellSource = readSource("src/components/app-shell.tsx");
    const cssSource = readSource("src/app/globals.css");

    expect(navSource).toContain("backdrop-blur lg:hidden");
    expect(navSource).not.toContain("backdrop-blur md:hidden");
    expect(navSource).toContain("hidden w-[248px]");
    expect(navSource).toContain("lg:flex lg:flex-col");
    expect(shellSource).toContain("mimi-main-content");
    expect(cssSource).toContain("env(safe-area-inset-bottom)");
    expect(cssSource).toContain("@media (min-width: 1024px)");
  });

  it("uses one candidate state with card editing below desktop and table editing at desktop", () => {
    const source = readSource("src/components/vocabulary/import-workspace.tsx");

    expect(source).toContain("!desktopPreview");
    expect(source).toContain("desktopPreview ?");
    expect(source).toContain("(min-width: 1024px)");
    expect(source).toContain("Save selected");
    expect(source).toContain("Example format");
  });

  it("keeps fluid non-spatial feedback in reduced-motion mode", () => {
    const cssSource = readSource("src/app/globals.css");
    const dialogSource = readSource("src/components/ui/responsive-dialog.tsx");

    expect(cssSource).not.toContain("transition-duration: 1ms");
    expect(cssSource).toContain("animation-duration: 120ms");
    expect(dialogSource).toContain("reduceMotion ? { opacity: 0 }");
    expect(dialogSource).toContain("reduceMotion ? 0.12 : 0.26");
  });

  it("keeps the Active preview limited to the accepted V2 modes", () => {
    const practiceSource = readSource("src/app/practice-lab/page.tsx");

    expect(practiceSource).toContain('title: "Say it"');
    expect(practiceSource).toContain('title: "Spell it"');
    expect(practiceSource).toContain('title: "Dictation"');
    expect(practiceSource).not.toContain("Writing usage");
  });
});
