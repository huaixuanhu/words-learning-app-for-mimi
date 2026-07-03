import {
  Archive,
  BookOpen,
  Download,
  Home,
  ListPlus,
  RotateCcw,
  Settings,
  Upload,
} from "lucide-react";

export const appNavItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/add", label: "添加", icon: ListPlus },
  { href: "/import", label: "导入", icon: Upload },
  { href: "/review", label: "复习", icon: RotateCcw },
  { href: "/library", label: "词库", icon: BookOpen },
  { href: "/export", label: "导出", icon: Download },
  { href: "/settings", label: "设置", icon: Settings },
] as const;

export const primaryActions = [
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
    href: "/review",
    label: "开始复习",
    detail: "4 ratings",
    icon: RotateCcw,
  },
] as const;

export const reviewRatings = [
  { label: "完全忘记了", value: "forgot", interval: "很快再次复习" },
  { label: "有点忘记了", value: "hard", interval: "短间隔复习" },
  { label: "模糊记得", value: "vague", interval: "中等短间隔" },
  { label: "完全记得", value: "remembered", interval: "拉长间隔" },
] as const;

export const sampleVocabulary = [
  {
    id: "sample-1",
    surfaceText: "allocate",
    meaningZh: "分配",
    example: "The study schedule allocates more time to weak words.",
    source: "manual",
    status: "new",
    rarityScore: 3,
    createdAt: "2026-07-03T02:04:00+10:00",
  },
  {
    id: "sample-2",
    surfaceText: "coherent",
    meaningZh: "连贯的",
    example: "A coherent answer is easier to score well in PTE.",
    source: "txt_file",
    status: "learning",
    rarityScore: 4,
    createdAt: "2026-07-03T02:04:00+10:00",
  },
] as const;

export const importPreviewRows = [
  {
    line: 1,
    raw: "allocate - 分配",
    surfaceText: "allocate",
    meaningZh: "分配",
    status: "new",
  },
  {
    line: 2,
    raw: "coherent, ambiguous",
    surfaceText: "coherent",
    meaningZh: "",
    status: "duplicate candidate",
  },
  {
    line: 3,
    raw: "",
    surfaceText: "",
    meaningZh: "",
    status: "invalid",
  },
] as const;

export const defaultSessionLimit = 24;
export const stageTwoNotice =
  "Stage 2 scaffold only. Storage and real mutations start in later stages.";

export const archiveIcon = Archive;
