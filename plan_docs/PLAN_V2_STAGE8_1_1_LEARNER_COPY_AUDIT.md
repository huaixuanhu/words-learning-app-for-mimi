# Words Learning App For Mimi V2-8-1.1：Learner-facing Copy Audit

Created: 2026-07-18 21:42 AEST
Last updated: 2026-07-18 21:58 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md` 的 `V2-8 Dashboard Insights And Release Gate`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE4_MOBILE_FOUNDATION_COPY.md`
- `plan_docs/PLAN_V2_STAGE8_1_DASHBOARD_INSIGHTS.md`
- `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`
- `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- 用户在 2026-07-18 对插入 `V2-8-1.1`、先完成全站学习者文案审查再进入 `V2-8-2` 的明确确认

Scope:

- 检查 `src/app` 与 `src/components` 中普通学习流程可见的界面文案，删除与学习、操作、状态理解无关的氛围性表达。
- 删除重复页面标题、重复操作说明和面向开发过程的内部命名；保留完成当前操作所需的最短提示。
- 将可进入本地验收界面的固定测试使用者显示名统一为自然显示名 `Mimi`，同时保留技术 `id`、`slug`、文件名和内部测试来源，确保可追踪性不丢失。
- 缩短 Home、Insights、Practice Lab、Review 完成态、Settings、Batch import 和 AI resting / local-preview 状态中的冗余表达。
- 保留 English-first（英文优先）的沉浸式普通界面；不可撤销操作、隐私和数据边界继续采用最清楚的英文或中文。
- 增加 Learner Copy Contract（学习者文案契约）测试，阻止已清理的开发阶段名称、氛围文案和重复副标题重新进入普通界面。
- 同步 V2 主计划、Architecture、README、AGENTS、Changelog 和 AI Agent Log。

Non-Scope:

- 不修改页面信息架构、路由、布局断点、图表含义、Track、Daily Plan、FSRS、Review / Active 调度、评分、完成规则、快捷键、发音或声音行为。
- 不修改任何 Motion 动画、transition timing、hover / press 位移、阴影反馈或 reduced-motion behavior。
- 不修改 Schema Version 6、JSON backup version 3、SQL、repository、API、持久化数据形状或真实使用者显示名。
- 不删除 AI 模型来源、AI 可能不准确提示、外发字段、Provider retention（供应商保留）和用户确认。
- 不删除两道整日清空确认、备份替换警告、person switching（使用者切换）不等于安全隔离的说明、错误/重试、Actual / estimate 区分、统计口径、键盘提示和可访问性文字。
- 不连接 Neon `staging` / `main`，不读取或修改 `.env`、凭据或 Provider 设置，不调用 Gemini，不执行 migration、Vercel Preview、Production、GitHub remote 或 deployment。
- `V2-8-2` Non-Production rehearsal 与 `V2-8-3` Production release 继续使用各自派生计划和独立授权。

Exit criteria:

- 普通页面不再显示 `Calm mind. Clear words.`、侧栏鼓励卡、页面氛围副标题、完成页泛化鼓励语或 `V2 Stage ... Schema ... Fixture` 一类内部测试名称。
- Home、Study、Review、Library、Add Words、Practice Lab、Settings、Backup 与 Insights 各自保留一个明确标题；说明只在会改变操作、数据理解或安全决策时出现。
- Batch import 的普通流程只呈现选择、粘贴、预览和保存动作；JSON field（字段）要求继续收在折叠的 `Example format` 内，不把技术规则铺在主流程。
- `Batch imported` 原词保持不变。
- AI fixture（固定样例）仍明确说明没有外部 AI 请求；正式 AI 仍显示 server-owned model lineage（服务器持有的模型来源）、不准确性、外发字段和 retention 说明。
- `FSRS estimate`、`Actual`、Review / New Words 目标、distinct-entry（不同词条）口径、错误/重试、快捷键、整日清空和备份替换信息保持可见且语义不变。
- 测试固定资料的显示名为 `Mimi`，而技术 `id` / `slug` 继续保留原有阶段标识；任何真实用户数据均不改写。
- Learner Copy Contract 测试同时覆盖禁止回归文案和必须保留文案。
- React 组件复核、focused/full tests、lint、typecheck、三套 backup dry-run、build、governance preflight 和 `git diff --check` 通过。
- 320、375、390、768、820、1023、1024 与 1280 px 无横向滚动、framework overlay 或新增 console error；输出至少一张 320 px 与一张 390 px 手机截图供用户检查。

Document nature:

本文件是 `PLAN_V2_MASTER.md` 的本地插入式派生计划。它只负责在远程 Preview 演练前冻结更短、更贴近学习的可见文案，不授权任何远程数据库、凭据、外部 AI、migration、deployment 或 Production 操作。

Status: complete. The documentation baseline was created before application changes; the local implementation, tests, responsive browser acceptance, and documentation synchronization are complete.

## Copy Decision Rules

### Remove

- 只营造情绪、不会帮助学习或操作的口号与鼓励语。
- 与当前页面标题、按钮或相邻控件重复的副标题和说明。
- 对学习者无决策价值的 Cache、fresh/local flow、V2 stage、schema 或 fixture 内部状态。
- 操作已经由清楚标签完整表达时的第二段重复说明。

### Shorten

- loading、unavailable、empty 和 completed 状态改为直接事实。
- 保留必要统计口径时使用短标签，例如 `Completed entries · All attempts`。
- 设备本地偏好只在需要说明保存范围时使用 `This device only.`。

### Preserve

- 学习目标、Actual / estimate、FSRS 来源和不同词条计数语义。
- AI 模型、准确性、外发字段、retention 和确认。
- 破坏性操作范围、不可撤销性、备份替换及 person separation 边界。
- 错误原因、恢复/重试动作、键盘/鼠标操作方式和 accessibility（可访问性）标签。
- `Batch imported`。

## Expected Files

Documentation:

- `plan_docs/PLAN_V2_STAGE8_1_1_LEARNER_COPY_AUDIT.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `ARCHITECTURE.md`
- `README.md`
- `AGENTS.md`
- `CHANGELOG.md`
- `governance/AI_AGENT_LOG.md`

Application and fixtures:

- `src/components/app-shell.tsx`
- `src/components/app-nav.tsx`
- `src/app/*/page.tsx`
- `src/components/vocabulary/home-dashboard.tsx`
- `src/components/vocabulary/dashboard-insights.tsx`
- `src/components/vocabulary/learning-rhythm-chart.tsx`
- `src/components/vocabulary/memory-outlook-card.tsx`
- `src/components/vocabulary/import-workspace.tsx`
- `src/components/review/review-session.tsx`
- `src/components/review/example-word-actions.tsx`
- `src/components/practice/active-practice-session.tsx`
- `src/components/settings/theme-settings-form.tsx`
- `src/components/settings/sound-settings-form.tsx`
- `src/components/settings/person-settings-form.tsx`
- `test_fixtures/*.json`
- `scripts/backup-import-plan.mjs`
- focused Learner Copy Contract test

Inspection may omit an expected file when its visible copy is already functional or safety-critical.

## Validation Plan

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
git diff --check
```

Browser acceptance uses an isolated forced-local origin with synthetic Schema Version 6 fixture data. No existing browser origin or remote runtime is used.

## Stop Conditions

停止并回到计划层，如果：

- 精简文案需要改变功能、数据含义、页面层级或按钮行为；
- AI、不可撤销操作、备份、person separation、Actual / estimate 或统计口径无法在更短文案中保持准确；
- 固定测试显示名修改会改变真实用户数据或备份兼容性；
- 任何改动触及 Motion / reduced-motion 行为；
- 浏览器验收不能严格保持本地、synthetic（合成）和无外部请求。

## Completion Evidence

- 删除了全局口号、页面氛围副标题、侧栏鼓励卡、重复页面说明和完成页泛化鼓励语；普通页面继续以一个明确标题和当前操作为主。
- Home、Insights、Practice Lab、Settings、Review、Active、Batch import 与 AI preview 的重复文案已缩短；`Batch imported`、`Actual`、`FSRS estimate`、键盘提示、破坏性操作、person separation、正式 AI 模型与外发/保留说明均由契约测试确认保留。
- Batch import 默认输入区为空，技术格式收进默认折叠的 `Example format`；固定测试资料只把可见显示名改为 `Mimi`，阶段化技术 `id` / `slug` 仍保留。
- 新增 `src/components/learner-copy-contract.test.ts`，并同步既有 AI 与 Dashboard UI contract（界面契约）测试。
- 通过 focused tests（4 files / 14 tests）、ESLint、TypeScript、full Vitest（64 passed files / 375 passed tests；既有 Postgres integration file/test skipped）、三套 backup dry-run、Next.js Production build、Tier 3 governance preflight 与 `git diff --check`。
- 320、375、390、768、820、1023、1024、1280 px 均无横向滚动、framework overlay（框架错误遮罩）或新增 console error；移动/桌面导航继续在 1024 px 精确切换。
- 手机验收截图保存在 `/Users/anoria/.codex/visualizations/2026/07/12/019f5666-33bb-7b00-9a86-f9f416237386/learningWordsformimi-v2-8-1-1/`：`mobile-320-today.png`、`mobile-390-today.png` 与 `mobile-390-batch-import.png`。
- 浏览器验收使用独立 loopback origin（回环地址）、合成 Schema Version 6 fixture 与仅验收时使用的本地 storage response；没有连接 Neon、Gemini、Vercel 或 Production。
- Schema Version 6、backup version 3、Motion、reduced-motion、学习规则、API 与持久化行为均未改变。`V2-8-2` 仍需独立确认。
