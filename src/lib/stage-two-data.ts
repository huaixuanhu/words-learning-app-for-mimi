import {
  Download,
  FlaskConical,
  GraduationCap,
  Home,
  Library,
  MoreHorizontal,
  RotateCcw,
  Settings,
  Upload,
} from "lucide-react";
import type { ReviewRating } from "@/lib/review/types";

export const appNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/study", label: "Study", icon: GraduationCap },
  {
    href: "/review",
    label: "Review / New Learning",
    mobileLabel: "Learn",
    icon: RotateCcw,
  },
  { href: "/library", label: "Library", icon: Library },
  { href: "/practice-lab", label: "Practice Lab", icon: FlaskConical },
  { href: "/import", label: "Add Words", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/export", label: "Backup", icon: Download },
] as const;

export const mobilePrimaryNavItems = appNavItems.slice(0, 4);

export const mobileMoreNavItems = [
  appNavItems[5],
  appNavItems[4],
  appNavItems[6],
  appNavItems[7],
] as const;

export const mobileMoreItem = { label: "More", icon: MoreHorizontal } as const;

export const primaryActions = [
  {
    href: "/review",
    label: "开始复习",
    detail: "meaning review",
    icon: RotateCcw,
  },
  {
    href: "/import",
    label: "输入词汇",
    detail: "single / JSON",
    icon: Upload,
  },
  {
    href: "/export",
    label: "导出备份",
    detail: "JSON / CSV",
    icon: Download,
  },
] as const;

export const reviewRatings = [
  { label: "完全忘记了", value: "forgot", interval: "很快再次复习" },
  { label: "有点忘记了", value: "hard", interval: "短间隔复习" },
  { label: "模糊记得", value: "vague", interval: "中等短间隔" },
  { label: "完全记得", value: "remembered", interval: "拉长间隔" },
] as const satisfies readonly {
  label: string;
  value: ReviewRating;
  interval: string;
}[];
