# Words Learning App For Mimi V2-8-1：Dashboard Insights

Created: 2026-07-18 AEST
Last updated: 2026-07-18 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md` 的 `V2-8 Dashboard Insights And Release Gate`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md`
- `plan_docs/PLAN_V2_STAGE4_MOBILE_FOUNDATION_COPY.md`
- `plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md`
- `plan_docs/PLAN_V2_STAGE5_1_DAILY_EPISODE_SCHEDULING_REPAIR.md`
- `plan_docs/PLAN_V2_STAGE6_ACTIVE_PRACTICE_ENGINE.md`
- `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`
- `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- 用户在 2026-07-18 对 `V2-8-1` 本地 Dashboard Insights（仪表板洞察）拆分计划的明确确认

Scope:

- 将 Home Track 卡片收紧为一个 2×2 日常信息区、两条 Actual（实际）进度和一个明确的下一步操作。
- 为 Recognition Vocabulary（阅读词汇）和 Active Vocabulary（输出词汇）提供完全隔离的 `Today’s progress`、`Learning rhythm` 和 `Memory outlook`。
- `Today’s progress` 只读取当前 Daily Plan（每日计划）的 server-owned / local-engine-owned 指标，不从界面重新推断今日任务。
- `Learning rhythm` 使用当前使用者与所选 Track 的实际 Review Event（复习事件），显示最近 7 或 14 个本地自然日的不同完成词条数和全部尝试次数。
- `Memory outlook` 使用当前 Track 的 Review State（复习状态）和对应 FSRS Parameter Set（参数集），显示当前调度快照下的未来复习负荷区间和 Retrievability（可提取率）分布。
- 使用现有 Next.js / React / Tailwind / CSS 能力实现紧凑图形，不增加 chart package（图表依赖）。
- 保持简短 English-first UI（英文优先界面）、现有配色、现有 Motion 动画、transition timing 和 reduced-motion behavior 不变。
- 增加纯函数测试、UI contract test（界面契约测试）和 320–1280 px 浏览器验收；交付 320 px 与 390 px 手机截图。

Non-Scope:

- 不修改 Schema Version 6、JSON backup version 3、Postgres migration、Postgres repository、`/api/study` 或任何持久化数据形状。
- 不新增 Dashboard 偏好持久化、analytics（分析追踪）、streak（连续打卡）、通知、后台任务或遥测。
- 不调用 Gemini，不启用 Production AI，不读取或创建 credential（凭据）或 `.env` 文件。
- 不连接或修改 Neon `staging` / `main`，不创建 Preview branch，不执行 migration / rollback rehearsal。
- 不部署 Vercel，不创建 Production backup，不 push、merge 或修改远程 Git 状态。
- 不更改 Recognition / Active FSRS 参数、Daily Episode（每日学习回合）调度、评分含义、完成规则、键盘控制、声音或发音功能。
- 不使用 `overdue`、`expired`、`forgotten`, streak loss（连续记录丢失）或红色惩罚状态。
- `V2-8-2` Non-Production rehearsal 和 `V2-8-3` Production release 继续要求各自派生计划和明确授权。

Exit criteria:

- 每个 Track 卡片显示 `Added today`、`Suggested review`、`Review goal`、`New-word goal` 的 2×2 区域。
- `Reviewed today` 与 `Learned today` 显示真实 distinct-entry（不同词条）数量；目标为 `0` 时不产生除零、虚假完成率或 `n / 0`。
- `Learning rhythm` 的每个日桶使用使用者的时区，重复尝试全部进入 Attempts，同一词条一天只进入一次 Entries，只有 `vague` / `remembered` pass 才算完成。
- `Memory outlook` 只消费当前使用者、当前 Track、当前有效词条与对应 Parameter Set；没有 Review State 的新词不进入预测。
- Review load（复习负荷）与 Retrievability 明确标为 `FSRS estimate` / `Current schedule snapshot`，且与 Actual 使用文字、填充方式和图例共同区分，不能只依赖颜色。
- Recognition 与 Active 的状态、参数、事件和计算路径保持隔离。
- 无历史数据时显示诚实 empty state（空状态），加载中显示 `-` 或 loading copy，不用 `0` 冒充尚未读取的数据。
- 320、375、390、768、1024 和代表性桌面宽度无横向滚动；图表标签、Track 切换、主要操作、focus order（焦点顺序）和 touch target（触摸区域）可用。
- 当前动画和 reduced-motion 规则无修改。
- focused/full tests、lint、typecheck、三套 backup dry-run、build、governance preflight 和 `git diff --check` 通过。

Document nature:

本文件是 `PLAN_V2_MASTER.md` 中 V2-8 的第一个派生执行计划，只覆盖本地 Dashboard 数据派生、可视化和响应式验收。它不授权任何远程数据库、凭据、外部 AI、Production backup、migration、deployment 或 GitHub 远程操作。

Status: completed locally on 2026-07-18. `V2-8-2` and `V2-8-3` remain unapproved and unstarted.

## Dashboard Brief

Primary audience:

- Mimi 及当前私人可信使用者。

Primary question:

- 今天实际完成了什么、最近的学习活动是否平稳、按当前 FSRS 状态接下来大约会出现多少复习量。

Delivery surface:

- 现有 Next.js Home Dashboard，不创建平行报告、外部 BI 或独立 HTML dashboard。

Refresh behavior:

- 只从当前已加载的 `VocabularyData` 和 `DailyStudyTodayResponse` 纯派生；词汇、计划、评分或选中使用者变化时随 React state 重新计算。

## Metric Contract

### Today’s progress — Actual

Authoritative source:

- 当前 `DailyStudyTodayResponse.tracks[reviewProfile].metrics`。

Rules:

- `Added today`、`Suggested review`、`Review goal`、`New-word goal` 沿用 V2-1 / V2-5 冻结口径。
- `Reviewed today` 与 `Learned today` 使用 pass-only distinct-entry 口径；短语、固定搭配或单词均按 vocabulary-entry id 计一次。
- 进度视觉以 goal 为参考；goal 为 `0` 时显示 `No goal`，实际数字仍完整显示。
- actual 超过 goal 时，填充宽度最多为 100%，文字保留真实 actual。
- `Suggested review` 不是用户目标，不截断实际复习量。

### Learning rhythm — Actual

Authoritative source:

- 当前使用者的 append-only `reviewEvents`。

Grain:

- selected person × Review Profile × local calendar day。

Rules:

- 默认显示包含今天在内的最近 7 个本地自然日；可切换为 14 天。
- `Entries`：当日存在至少一个 `vague` 或 `remembered` 事件的不同 vocabulary-entry id 数量。
- `Attempts`：当日全部有效 Review Event 数量，包括后续恢复尝试。
- 同一个 event id 最多计一次；同一个词条的多个通过或失败事件不会重复增加 Entries。
- 历史节奏保留原事件的 Review Profile，不因后续 archive 或 Track transition 改写历史。
- 缺少事件的完整自然日是真实 `0`；数据尚未加载时不显示 `0`。

### Memory outlook — FSRS estimate

Authoritative source:

- 当前使用者的 `reviewStates`、当前可用 vocabulary entry、Recognition / Active 各自的 FSRS Parameter Set，以及使用者时区。

Eligibility:

- state 的 `personId`、`reviewProfile`、`parameterSetId` 必须和所选 Track 一致。
- 当前词条必须未 archive，且 `learningTrack` 与所选 Track 一致。
- Review load 需要合法 `dueAt`；legacy state 可参与当前 due schedule。
- Retrievability 还需要 `historyOrigin = recorded`、合法 `lastReviewedAt`、正数 `stability` / `difficulty`，并且 last review 不晚于计算时间。
- 没有 state 的新词、另一 Track 的旧历史、不完整 legacy metrics 和未来时间状态不进入 Retrievability。

Review-load buckets:

- `Ready`：`dueAt` 落在当前本地自然日结束前，包括更早日期，但界面不显示 overdue 分类。
- `Tomorrow`：下一个本地自然日。
- `2–3d`：从后天开始的两个本地自然日。
- `4–7d`：第 4–7 个后续本地自然日。
- `Later`：第 8 个后续本地自然日起。

Retrievability buckets:

- `90–100%`
- `80–89%`
- `<80%`

显示 count（词条数）与 total eligible states（可计算状态总数）。这是当前时点的模型估计，不是测试成绩，也不预测使用者未来会选择哪一种评分。

## Chart Map

| Section | Question | Form | Data points | Actual / estimate distinction | Empty fallback |
| --- | --- | --- | --- | --- | --- |
| Today’s progress | 今日实际是否接近使用者目标 | two horizontal progress bars | 2 per Track | solid fill + `Actual` copy | loaded true zero or loading dash |
| Learning rhythm | 最近每天完成词条与尝试量如何变化 | paired vertical bars | 7 or 14 calendar buckets | both observed; direct legend `Entries` / `Attempts` | `No study activity in this window yet.` |
| Review load | 当前调度下复习量落在哪些未来区间 | five vertical bars | 5 ordered buckets | outlined estimate container + `FSRS estimate` | `No scheduled reviews yet.` |
| Recall estimate | 当前可提取率大致如何分布 | one 100% stacked bar + direct rows | 3 ordered ranges | patterned/open estimate fill + percentage ranges | `Not enough review history yet.` |

Palette and non-color rules:

- 使用现有 sage primary 作为 Entries / progress 主色，现有 muted amber 作为 Attempts 比较色，neutral border / open fill 表示 estimate。
- 不使用红绿正负语义、渐变图表 mark 或彩色背景。
- 图例文字、实心/开放填充、边框样式和直接数值共同承担区分；灰度下仍可读。
- 所有 absolute-count bar 从零开始，bar 高度只用于相同单位内比较。

## Implemented Files

New:

- `src/lib/dashboard/insights.ts`
- `src/lib/dashboard/insights.test.ts`
- `src/components/vocabulary/dashboard-insights.tsx`
- `src/components/vocabulary/learning-rhythm-chart.tsx`
- `src/components/vocabulary/memory-outlook-card.tsx`
- `src/components/vocabulary/dashboard-insights-ui-contract.test.ts`

Modified:

- `src/lib/daily-study/day-window.ts`
- `src/lib/daily-study/day-window.test.ts`
- `src/lib/review/fsrs-recognition.ts`
- `src/lib/review/fsrs-recognition.test.ts`
- `src/lib/review/fsrs-active.ts`
- `src/lib/review/fsrs-active.test.ts`
- `src/components/vocabulary/home-dashboard.tsx`
- `src/components/vocabulary/home-track-card.tsx`
- `plan_docs/PLAN_V2_MASTER.md`
- `ARCHITECTURE.md`
- `README.md`
- `AGENTS.md`
- `CHANGELOG.md`
- `governance/AI_AGENT_LOG.md`

## Validation Matrix

Pure data tests:

- 7 / 14 consecutive local-day buckets across 23-hour and 25-hour DST days;
- duplicate event id, repeated attempts, failed-only day, later pass, single word / phrase identity;
- selected-person and Review Profile isolation;
- archived / Track-transition current-state exclusion without rewriting historical rhythm;
- exact five due buckets and local-day boundaries;
- Recognition / Active independent Retrievability calculation;
- new, legacy-incomplete, mismatched parameter, invalid/future state exclusion;
- empty state, goal `0`, actual above goal, and all-zero chart scale behavior.

UI and browser checks:

- no `fetch`, storage write, provider call, animation-token change or new persistence in Insights components;
- keyboard-operable Track and period controls with visible focus;
- chart value text and accessible labels available without hover;
- widths `320`, `375`, `390`, `768`, `1024`, and `1280` in both themes where practical;
- no horizontal overflow, Next error overlay, console error, clipped chart label or bottom-nav overlap;
- 320 px and 390 px screenshots retained under a local test-artifact path outside Production data.

## Completion Evidence

Implemented behavior:

- Today Track cards now use the accepted four-value 2×2 layout and separate Actual progress rows. `No goal` keeps the exact actual visible and creates no progressbar division.
- `Learning rhythm` derives fourteen person-local days and offers a seven-day view without changing the underlying window. Passing entries are distinct per day; every unique event remains an attempt.
- `Memory outlook` filters current states by person, Track, active vocabulary item and Parameter Set before five due windows and independent Recognition / Active Retrievability calculation.
- Estimate copy, open/outlined marks, direct values and accessible labels distinguish model output from Actual without relying only on color.
- The component clock refreshes once per minute. Future review timestamps remain excluded; an imported future `data.updatedAt` cannot move the FSRS calculation time forward.

Validation passed:

- focused Dashboard/day-window/FSRS/UI tests: 5 files / 23 tests;
- full Vitest: 63 files / 371 tests passed, with the existing Postgres integration file/test skipped;
- `npm run lint`, `npm run typecheck`, all three backup fixture dry-runs, `npm run build`, `npm run governance:preflight`, and `git diff --check`;
- local Production-build browser matrix at 320, 375, 390, 768, 820, 1023, 1024 and 1280 px with no horizontal overflow, framework error overlay, console warning or console error;
- mobile navigation visible and desktop navigation hidden at 1023 px, with the exact inverse at 1024 px;
- Recognition / Active and 7 / 14 day controls update their pressed state and data surface correctly;
- representative non-stitched 390 px Today, Insights and Memory-outlook screenshots saved under `/private/tmp`. The browser tool's 320 px full-page stitch was not used as user-facing evidence because fixed navigation duplicated during stitching; the live 320 px viewport geometry and content checks passed.

Safety result:

- Browser acceptance used the existing Schema Version 6 synthetic backup on the isolated `127.0.0.1:3028` origin. It did not inspect or replace the user's ordinary browser learning data.
- No schema, backup format, repository, API, credential, provider, remote database, Vercel, Production, GitHub remote, Motion or reduced-motion change occurred.

## Stop Conditions

停止并回到计划层，如果：

- 实现需要新增持久化字段、remote query、Production data 或 schema migration；
- 现有状态不足以区分 Actual 与 estimate，必须用猜测补齐；
- Retrievability 需要复用错误 Track 的 FSRS 参数；
- 图表在手机上必须依赖横向滚动或隐藏数值才可容纳；
- 测试发现 Daily Plan actuals 与 Dashboard 重算结果不能对账；
- 任何改动会改变当前 Motion / reduced-motion 行为。
