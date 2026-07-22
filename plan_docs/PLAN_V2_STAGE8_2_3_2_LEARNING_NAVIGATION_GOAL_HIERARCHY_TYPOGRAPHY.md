# Words Learning App For Mimi V2-8-2.3-2：Learning Navigation, Goal Hierarchy And Typography

Created: 2026-07-22 AEST
Last updated: 2026-07-22 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md` 的 `PF-002`

Derived from:

- `plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md`
- `plan_docs/PLAN_V2_STAGE8_1_DASHBOARD_INSIGHTS.md`
- `plan_docs/PLAN_V2_STAGE8_1_1_LEARNER_COPY_AUDIT.md`
- `plan_docs/PLAN_V2_STAGE4_MOBILE_FOUNDATION_COPY.md`
- `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`
- `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`
- 用户与 Mimi 在 2026-07-22 对 protected Preview 的交互反馈，以及用户对本计划的明确确认

Scope:

- 让 Recognition 的 `Review` 与 `New Learning` 在桌面导航、手机导航、Study、Home 和学习会话内形成一致入口。
- 让 Active 的 `Review` 与 `New Learning` 使用同一命名层级，同时保留 `Say it`、`Spell it`、`Dictation` 三种现有练习。
- 把 Home 每个 Track 的四个同权统计框重组为两个主要目标卡：`Review goal` 与 `New learning goal`；`Suggested review` 与 `Added today` 分别作为较轻的辅助信息。
- 在 Study 中使用相同信息层级：目标输入下显示对应辅助信息，今日实际完成量继续独立显示。
- 把学习会话的 `Goal / Done / Left` 改为含义明确的 `Daily goal / Reviewed today` 或 `Learned today / Ready now`。
- 把 `Save today` 改为 `Save today’s goals`。
- 让桌面 Home 的 `Library at a glance` 与左侧 `Today’s plan` 面板等高；手机端保持自然内容高度。
- 使用 `next/font` 自托管 Instrument Serif，仅应用于已确认的英文显示标题：页面标题、Section 标题、Track 标题、Session / dialog 标题、信息卡标题和大号词汇；正文、导航、按钮、数值、小标签、输入和状态说明继续使用 Geist，中文继续使用 ChillRoundF。

Non-Scope:

- 不修改 FSRS-6、Daily Episode、队列选择、首次作答锚点、评分、回退、整日重置、Track/Profile 隔离或任何统计口径。
- 不修改 Motion、transition timing 或 reduced-motion 行为。
- 不修改 Schema Version 6、migration、JSON backup、CSV、Postgres、API payload、TTS、Gemini、费用边界、凭证或环境变量。
- 不引入 SSO、身份权限、Production 数据操作、Vercel deployment、Neon 操作、Provider 请求、GitHub push、PR 或 merge。
- 不把所有英文文字改成衬线字体；导航、按钮、数据读数和学习正文的读取速度优先。
- `Add Words` 继续表示录入动作，`Batch imported` 保留；代码内部的 `zone: "new"` 和 `newWordGoal` 等稳定契约不重命名。

Exit criteria:

- 桌面左栏显示 `Review / New Learning`，手机底栏显示紧凑的 `Learn`；两者仍进入现有 Recognition 学习路线。
- Recognition 与 Active 学习页都提供持续可见、可访问的 `Review / New Learning` 分区切换；当前分区有明确状态。
- Home 和 Study 只把两个目标作为主要信息，辅助量在各自目标下方，实际完成量仍保留且口径不变。
- Recognition 与 Active 会话不再显示容易混淆的 `Goal / Done / Left`，也不保留重复的 Recognition 右侧分区跳转按钮。
- Instrument Serif 只加载 `latin`、`normal`、weight `400`，使用 `display: swap`，并且 learner UI 没有把按钮、数字、小标签和正文改成衬线字体。
- 320–1280 px 无横向溢出；桌面双面板等高，390 px 面板自然堆叠；现有交互动效未改变。
- 聚焦 contract tests（契约测试）、lint、typecheck、完整 test、三套 backup dry-run、Production build、governance preflight 与 `git diff --check` 通过。
- 本地完成只把 PF-002 标为 `Fixed locally`。protected Preview deployment、exact commit 绑定与人类复测须另行批准，完成后才能 `Closed`。

## 1. Problem Statement

protected Preview 的功能可以完成，但当前 Information Architecture（信息架构）存在四类摩擦：

1. 左侧只有 `Review`，进入后却同时承载 Review 与 New Words，第一次使用时不容易预测页面内容。
2. Home 与 Study 把目标、系统建议、当日加入和实际完成显示为同等重量，使用者要自己判断哪些可设置、哪些只是参考。
3. 学习会话中的 `Done` 是当前会话值，Dashboard/Study 的完成量是今日 distinct entry（不同词条）值；同时 `Left` 可能为 0 而 Daily goal 仍大于 0，容易被理解成资料冲突。
4. 当前 Geist 易读，但标题层级的个性较弱。用户希望参考 Tradermath 的 display-serif（展示衬线）层级，同时明确要求保持普通信息与数字的读取速度。

## 2. Accepted Interaction Contract

### 2.1 Navigation

- Desktop sidebar：`Review / New Learning`
- Mobile bottom navigation：`Learn`
- Recognition zone tabs：`Review`、`New Learning`
- Active zone tabs：`Review`、`New Learning`
- `New Words` 继续用于资料状态或“新词”这种对象含义；学习行为与页面入口使用 `New Learning`。
- Recognition 右侧 `Open Review / Open New Words` 被持续可见的 zone tabs 取代。
- Active 的 `Change practice mode` 保留，因为它切换的是三种题型，不与 zone tabs 重复。

### 2.2 Goal hierarchy

Home 每个 Track：

```text
Review goal        New learning goal
Suggested review  Added today

Today’s progress · Actual
Reviewed today / goal
Learned today / goal
```

Study 每个 Track：

- `Reviewed today` 与 `Learned today` 保留为 Actual。
- `Review goal` 输入下显示 `Suggested review · N`。
- `New learning goal` 输入下显示 `Added today · N`。
- 保存按钮为 `Save today’s goals`。

### 2.3 Session summary

- `Daily goal`：当前 Track/zone 的今日计划目标。
- `Reviewed today` 或 `Learned today`：该 Track 今日已通过的 distinct entries，不使用当前会话次数冒充今日值。
- `Ready now`：当前队列还可继续学习的词条数。它可以小于 Daily goal，属于正常情况。

## 3. Typography Contract

Instrument Serif 的目的为形成类似 Tradermath 的标题层级，不复制其付费 Teodor 字体或整站视觉。

- Source：Instrument Serif 官方仓库，SIL Open Font License 1.1。
- Loading：Next.js `next/font/google` 在 build 时取得并由应用自身托管；浏览器不向 Google Fonts 发起字体请求。
- Payload：仅 `latin`、weight `400`、normal、`display: swap`。
- Applied：页面/Section/Track/Session/dialog/信息卡英文标题与大号词汇。
- Preserved：Geist 用于 navigation、button、metric label、number、input、helper/status/body；ChillRoundF 用于中文 fallback。
- Styling：标题使用正常字重与轻微负字距，不人为合成 bold；现有字号只做必要适配，避免手机溢出。

Verified references on 2026-07-22:

- Next.js Font Optimization: `https://nextjs.org/docs/app/getting-started/fonts`
- Instrument Serif: `https://github.com/Instrument/instrument-serif`
- SIL Open Font License 1.1: `https://openfontlicense.org/open-font-license-official-text/`

## 4. Files And Validation

Expected application surfaces:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/lib/stage-two-data.ts`
- `src/components/app-nav.tsx`
- `src/components/app-shell.tsx`
- Home / Study / Recognition / Active components and focused UI contract tests

Expected governance surfaces:

- this child plan and its parent register
- V2 Master, Architecture, README, AGENTS, Changelog and AI Agent Log
- V2-8-3 handoff wording because Gate 2 pauses while PF-002 remains open

No remote side effect belongs to this implementation batch.

## 5. Local Implementation Record — 2026-07-22

Status: `PF-002 Normal / Fixed locally`.

Implemented:

- Desktop navigation now reads `Review / New Learning`; mobile uses `Learn`.
- Recognition and Active share one accessible two-tab `Review / New Learning` component. Recognition removes the duplicate right-side zone button; Active retains `Change practice mode` for its independent activity choice.
- Home uses two goal cards per Track with lighter `Suggested review` / `Added today`, preserves both Actual progress rows, and provides direct Review/New Learning actions.
- Study shows only both Actual values before the goal form; each input owns its matching reference line, and the save action reads `Save today’s goals`.
- Session summaries use `Daily goal`, zone-specific `Reviewed today` / `Learned today`, and `Ready now` from the current queue.
- Desktop Home stretches its two top panels to the same grid-row height while the mobile layout keeps content-driven height.
- Instrument Serif is loaded through `next/font` with the agreed one-weight Latin contract and applied only to semantic English display headings and large vocabulary text. Geist and ChillRoundF ownership is unchanged elsewhere.

Validation:

- Focused contracts: 6 files / 24 tests passed.
- Full suite: 91 files / 553 tests passed; the existing Postgres integration file/test remained skipped.
- Passed: ESLint, TypeScript, all three backup dry-runs, Production build and `git diff --check`.
- Local browser at 1280 px: no overlay/overflow, Instrument Serif computed on the page title, and both top Home panels measured 488 px high at the same top position.
- Local browser at 390 px: Home, Study, Recognition New Learning and Active New Learning had no horizontal overflow or framework overlay; `Learn`, both zone tabs, `Save today’s goals`, the two-goal hierarchy and session labels rendered as intended.
- React quality review found no new effect-owned derived state, data-fetching loop, unstable provider boundary or expanded client bundle dependency; the shared zone list is module-scoped.

Safety and remaining gate:

- No FSRS, Daily Episode, Motion, TTS, AI, schema, backup shape, environment, credential, remote database, Preview or Production state changed.
- PF-002 is not `Preview-ready`, `Retest passed` or `Closed`. A later protected Preview deployment must bind an exact commit and receive human acceptance under a fresh approval.
