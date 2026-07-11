# Words Learning App For Mimi Stage 7.9: Dual-Track Data And Import Workflow

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`, the 2026-07-07 user acceptance of Stage 7.9, the user's corrections that `/import` should be the parent input entry, `tags` may be `null`, and the JSON sample should guide conversation AI（对话式 AI）formatting so the app can directly read and store the result, plus the later 2026-07-07 correction that batch JSON meanings and examples must support at least one and unlimited entries.
Scope: make Recognition Vocabulary（阅读词汇）and Active Vocabulary（输出词汇）real local V1 data fields; migrate existing local study data safely; split `/import` into Single input（单个输入）and Batch JSON import（批量 JSON 导入）directions; require explicit learning track（学习轨道）choice for single input and JSON items; allow nullable tags（标签）; support multiple Chinese meanings and example sentences in batch JSON; add separate Recognition / Active daily limits in Review settings; update UI（用户界面）, local validation, backup/export, and docs to reflect the new data semantics.
Non-Scope: no AI API（人工智能接口）integration, no dictation engine（听写引擎）, no spelling checker（拼写检查器）, no writing feedback model, no external vocabulary source, no remote database migration, no Vercel command, no Neon command, no Production（生产环境）deployment, no Production data mutation, no merge（合并）to `main`, no authentication（认证）, no analytics（分析追踪）, no notification, no background audio, no PWA（Progressive Web App，渐进式 Web 应用）implementation, and no 付费/扣款 feature.
Exit criteria: existing local schema version 1 / 2 / 3 / 4 data migrates to schema version 5 with `learningTrack: "recognition"`, `tags: null`, `meaningsZh`, `examples`, and dual review limits; `/import` contains Single input and Batch JSON import directions; batch import accepts a JSON file / pasted JSON format the app can directly parse; batch JSON requires at least one meaning and one example per item while allowing unlimited entries; single input requires choosing Recognition or Active; Dashboard, Study, Library, Review settings, backup JSON, CSV export, tests, architecture docs, changelog, and AI log all reflect the V1 dual-track and multi-meaning / multi-example semantics; local validation passes.

## Product Decisions

- `/import` is the parent input entry. It owns both Single input and Batch JSON import.
- `/add` remains only as a compatibility route. Main navigation, dashboard, and Study should direct users to `/import`.
- Single input must explicitly choose Recognition or Active before saving.
- Batch JSON import replaces `.txt` file import for the current UI. JSON can be pasted or uploaded as a `.json` file.
- Batch JSON import provides a sample JSON shape that the user can give to conversation AI（对话式 AI）to organize vocabulary. The returned JSON should be readable by this app and directly saveable after preview.
- Batch JSON item meanings use `meaningsZh: string[]` and examples use `examples: string[]`. Each array must contain at least one non-empty string. There is no product-imposed maximum count.
- For compatibility, the app may still accept legacy `meaningZh` and `example` input, including single strings, and normalize them into `meaningsZh` and `examples`.
- `tags` may be `null`, omitted, or an array of supported soft tags. The app normalizes omitted tags to `null`.
- `rarityScore` is optional and may be `null` or omitted. When present, it is normalized into a 1-5 integer as a user self-rated rarity / difficulty hint. It does not currently drive the review scheduler, mastery labels, or proficiency state.
- Existing V1 review scheduling remains focused on Recognition Vocabulary. Active Vocabulary receives its own daily limit in settings for Today Hub / Practice Lab readiness, but no active-practice scheduler is implemented in this stage.

## Data Shape

Vocabulary item additions:

```ts
learningTrack: "recognition" | "active"
tags: string[] | null
meaningsZh: string[]
examples: string[]
```

Review settings additions:

```ts
recognitionSessionLimit: number
activeSessionLimit: number
```

Backward compatibility:

- Legacy `sessionLimit` is kept for migration compatibility and existing code compatibility where needed.
- Legacy `meaningZh` and `example` remain as first-entry compatibility display fields while `meaningsZh` and `examples` carry the full list.
- Schema version 1 / 2 / 3 / 4 data migrates to schema version 5.
- Existing vocabulary items default to Recognition Vocabulary, `tags: null`, and arrays derived from old `meaningZh` / `example` strings.
- Existing review settings copy `sessionLimit` into `recognitionSessionLimit` and set `activeSessionLimit` to the new Active default.

## JSON Import Format

Example:

```json
{
  "items": [
    {
      "word": "allocate",
      "track": "recognition",
      "meaningsZh": ["分配", "拨出时间或资源"],
      "examples": [
        "The tutor allocated extra practice time.",
        "The budget allocates more money to language support."
      ],
      "tags": ["PTE"],
      "rarityScore": 3
    },
    {
      "word": "coherent",
      "track": "active",
      "meaningsZh": ["连贯的", "条理清楚的"],
      "examples": ["Write a coherent paragraph using this word."],
      "tags": null,
      "rarityScore": null
    }
  ]
}
```

Rules:

- `word` is required and should be a word or short phrase.
- `track` is required and must be `recognition` or `active`.
- `meaningsZh` is required as an array with at least one non-empty Chinese meaning. It may contain unlimited entries.
- `examples` is required as an array with at least one non-empty sentence. It may contain unlimited entries.
- `tags` may be an array, `null`, or omitted.
- `rarityScore` may be `null`, omitted, or a number/string that normalizes to 1-5.
- Legacy `meaningZh` and `example` strings remain accepted as compatibility input and are normalized into arrays.

## Validation Plan

Local validation:

```bash
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run build
git diff --check
npm run governance:preflight
```

Focused checks:

- Existing schema version 3 / 4 fixture migrates to schema version 5.
- Single input saves Recognition and Active items with explicit track.
- Batch JSON import accepts `meaningsZh` / `examples` arrays, rejects missing or empty meaning/example arrays, accepts nullable tags, accepts nullable `rarityScore`, and rejects unsupported track values.
- Review settings save separate Recognition and Active daily limits.
- Review queue continues to use Recognition items.
- Backup parse / export accepts schema version 5 while continuing to restore schema version 2 / 3 / 4 backups through migration.
- CSV export includes `learningTrack`, `tags`, `meaningsZh`, and `examples`.
