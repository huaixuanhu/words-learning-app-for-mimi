import type { WfdSentence } from "./types";

const source: WfdSentence["source"] = {
  name: "Mimi original practice", url: "", edition: "Visual learning · 1",
  retrievedAt: "2026-10-09", kind: "demo",
};

/** Original examples only. Personal prediction banks are imported in the browser. */
export const WFD_DEMOS: WfdSentence[] = [
  {
    id: "demo-library-training", text: "The library will close tomorrow morning for staff training.",
    translationZh: "图书馆明天上午将因员工培训而闭馆。",
    chunks: [
      { text: "The library", cueZh: "图书馆", visualLabel: "图书馆" },
      { text: "will close", cueZh: "将关闭：will + 动词原形", visualLabel: "闭馆" },
      { text: "tomorrow morning", cueZh: "明天上午", visualLabel: "明天 · 上午" },
      { text: "for staff training.", cueZh: "原因是员工培训；for 不能漏", visualLabel: "员工培训" },
    ],
    source, tags: ["Illustrated", "Time & reason"], image: "/wfd/images/library-training.png", visualKind: "sequence", animation: "timeline",
  },
  {
    id: "demo-return-books", text: "Please return your library books before the end of term.",
    translationZh: "请在学期结束前归还你的图书馆借书。",
    chunks: [
      { text: "Please return", cueZh: "请归还", visualLabel: "归还" },
      { text: "your library books", cueZh: "你的图书馆借书；books 是复数", visualLabel: "借书" },
      { text: "before the end of term.", cueZh: "在学期结束之前；before + the end of", visualLabel: "学期结束之前" },
    ],
    source, tags: ["Illustrated", "Word order"], image: "/wfd/images/return-books.png", visualKind: "sequence", animation: "timeline",
  },
  {
    id: "demo-manufacturing", text: "Modern manufacturing produces many useful objects for everyday life.",
    translationZh: "现代制造业为日常生活生产许多实用物品。",
    chunks: [
      { text: "Modern manufacturing", cueZh: "现代制造业", visualLabel: "现代工厂" },
      { text: "produces many useful objects", cueZh: "生产许多实用物品；produces 的 -s", visualLabel: "生产实用品" },
      { text: "for everyday life.", cueZh: "用于日常生活；everyday 是形容词", visualLabel: "日常生活" },
    ],
    source, tags: ["Illustrated", "Process"], image: "/wfd/images/manufacturing.png", visualKind: "sequence", animation: "flow",
  },
  {
    id: "demo-practical-course", text: "Students gain practical experience as part of their engineering course.",
    translationZh: "学生通过工程课程中的实践环节获得实际经验。",
    chunks: [
      { text: "Students gain", cueZh: "学生获得", visualLabel: "学生" },
      { text: "practical experience", cueZh: "实际经验；experience 此处不可数", visualLabel: "动手实践" },
      { text: "as part of their engineering course.", cueZh: "作为工程课程的一部分；as part of", visualLabel: "工程课程的一部分" },
    ],
    source, tags: ["Illustrated", "Academic life"], image: "/wfd/images/practical-course.png", visualKind: "scene", animation: "reveal",
  },
  {
    id: "demo-nursing", text: "The nurse provides patient care and records important clinical information.",
    translationZh: "护士提供患者护理，并记录重要的临床信息。",
    chunks: [
      { text: "The nurse", cueZh: "这位护士；the 不能漏", visualLabel: "护士" },
      { text: "provides patient care", cueZh: "提供患者护理；provides 的 -s", visualLabel: "照护患者" },
      { text: "and records important clinical information.", cueZh: "并记录重要的临床信息；information 不可数", visualLabel: "记录临床信息" },
    ],
    source, tags: ["Illustrated", "Academic life"], image: "/wfd/images/nursing-clinical.png", visualKind: "scene", animation: "reveal",
  },
  {
    id: "demo-library-meeting", text: "Our study group will meet in the library tomorrow afternoon.",
    translationZh: "我们的学习小组明天下午将在图书馆会面。",
    chunks: [
      { text: "Our study group", cueZh: "我们的学习小组", visualLabel: "学习小组" },
      { text: "will meet", cueZh: "将会面；will + 动词原形", visualLabel: "开会" },
      { text: "in the library", cueZh: "在图书馆；in the", visualLabel: "图书馆" },
      { text: "tomorrow afternoon.", cueZh: "明天下午", visualLabel: "明天 · 下午" },
    ],
    source, tags: ["Illustrated", "Time & place"], image: "/wfd/images/library-meeting.png", visualKind: "sequence", animation: "timeline",
  },
];
