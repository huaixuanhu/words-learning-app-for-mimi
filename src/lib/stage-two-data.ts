import {
  Download,
  FlaskConical,
  GraduationCap,
  Home,
  Library,
  ListPlus,
  RotateCcw,
  Settings,
  Upload,
} from "lucide-react";
import type { ReviewRating } from "@/lib/review/types";

export const appNavItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/study", label: "学习", icon: GraduationCap },
  { href: "/review", label: "复习", icon: RotateCcw },
  { href: "/library", label: "词库", icon: Library },
  { href: "/practice-lab", label: "练习室", icon: FlaskConical },
  { href: "/import", label: "导入", icon: Upload },
  { href: "/settings", label: "设置", icon: Settings },
] as const;

export const primaryActions = [
  {
    href: "/review",
    label: "开始复习",
    detail: "meaning review",
    icon: RotateCcw,
  },
  {
    href: "/add",
    label: "添加单词",
    detail: "manual entry",
    icon: ListPlus,
  },
  {
    href: "/import",
    label: "批量导入",
    detail: ".txt / paste text",
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
