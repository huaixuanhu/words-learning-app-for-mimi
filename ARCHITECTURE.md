# Words Learning App For Mimi Architecture

Created: 2026-07-02 23:30 AEST
Last updated: 2026-09-13 AEST

## Current State

V2.2 is live on the canonical Production domain. The project remains Tier 3 under `human-ai-governance v0.7.5`; material tasks derive their working tier from the higher current/target authority on the affected surface. PF-001 is `High / Closed`; PF-002 and PF-003 are `Normal / Closed by explicit acceptance`. Vercel Production runs exact Git `main` in `syd1`; Neon `main` remains Schema Version 6 with the V2.1 unique `(person_id, normalized_text)` index and the V2.2 V1/V2 Parameter Set constraints from `0007`. The current release inventory retained 282 unique vocabulary items, 125 review states, 441 review events and all 38 import-batch audit rows. Independent Production Gemini and Google Cloud TTS identities continue under their long-term quota, Cache, Idempotency, accounting and Kill Switch guards. The prior recovery points plus independently restore-verified pre/post V2.2 encrypted backups remain available. The whole V2 release excludes SSO（Single Sign-On，单点登录）and confidential per-person authorization. `plan_docs/PLAN_V2_2_PRODUCTION_RELEASE.md` owns the exact committed, pushed, migrated, deployed and activated evidence, including the disclosed absence of a fresh exact-text TTS request.

### V2.3 Local Repair And Open Production Incident

2026-09-13 的只读页面及 Vercel 日志确认 Production Library 读取失败：`/api/storage/data` 返回 500，连接池空闲连接的 WebSocket 错误成为未捕获异常，进程退出码 129；健康检查返回 503。授权后的直接探测确认 Neon 以 SQLSTATE `53000` 拒绝查询，原因是当前 Free 项目网络传输额度超限；本月已传出 6,330,077,483 bytes。原项目/分支身份一致且仍存在，但计数查询被配额阻断，记录完整性尚未核实。旧前端把首次云端读取失败转为本地空词库，造成全零页面。V2.2 仍是当前部署；`plan_docs/PLAN_V2_3_STORAGE_STUDY_DAY_HOME.md` 拥有调查、修复和验证状态。

V2.3 本地候选将云端成功、服务器明确指定的本地运行与加载失败分开。首次加载失败不安装本地数据、不覆盖学习者选择、不显示空词库，并阻止未就绪写入；后续刷新失败保留已加载内容并显示提醒。共享加载边界提供重试、15 秒超时和重新联网恢复；损坏响应和跨页学习者选择竞争也在此边界处理。数据库连接池具有 10 秒连接获取超时、Vercel 生命周期管理、空闲及事务连接错误处理；失败或回滚不确定的连接被丢弃，写入不自动重试。

当前服务端仍在每次卡片提示刷新及评分时读取整份学习者快照，其他打开页面也在评分后全量同步。按卡片只读所需数据的减流改造尚未实施；本轮连接保护不能解除 Neon 配额停用，也不宣称消除了传输放大。原本地损坏存档覆盖、写入成功但响应读取失败、缓存备份一致性等独立风险及下一处理方向由 V2.3 计划统一记录。

新的学习日使用学习者时区的 06:00 边界，AI/TTS 继续使用原自然日和月度额度。旧 Daily Plan（每日计划）的窗口和历史事件保持不变：尚未结束的旧计划继续使用，必要时创建一次通常为 30 小时的衔接计划，然后进入正常 06:00→06:00；夏令时与时区切换通过逐个本地边界解析处理。Home/Study 在存储窗口结束、回到页面或服务器时钟失效时刷新，并保留过期请求拒绝和 reset 的两次确认。

Home 的 Learning rhythm 分别显示新学和复习的成功词数，同词同学习日重复尝试不重复计数；历史记录优先采用保留计划的日期归属。Memory outlook 保留当前日程分组与回忆概率分组，使用服务器时钟和最新已加载数据计算，显示计算时间；读取失败的旧数据另有明确提醒。此本地候选保留 Schema 6、JSON backup Version 4、FSRS 参数及全部鉴权和服务额度，尚未部署。

TTS 路由 `src/app/api/tts/route.ts` 只导出 Next.js 支持的路由字段；原有服务选择辅助函数独立放在同目录 `service-resolver.ts`，服务配置、额度、缓存与请求处理行为保持一致。

### Current Stack And Historical V1 Build Chronology

The package list in this section is current. The Stage 1–8 / Stage 6B paragraphs preserve the then-current build and release path. Phrases such as `current`, `future Production`, or `Production disabled` inside those Stage paragraphs describe their historical stage and are superseded by the C5 live record and the Current V2 Planning Baseline below.

This repository has accepted Stage 8 Review Memory Algorithm（复习记忆算法）and Stage 8.5 Data Lifecycle（数据生命周期）and environment strategy before formal V1 Production（生产环境）launch. It contains collaboration rules, architecture notes, master and stage plans, changelog, AI agent log, a project-tuned Tier 3 governance preflight adapted from `human-ai-governance v0.7.5` with fail-closed exact Git snapshot inspection, and a Next.js App Router application with browser-local vocabulary, review mutations, export, restore preview, selected-person switching, local SQL storage, repository adapter contract, approved development / preview Vercel and Neon setup, a server-only development / preview Postgres runtime adapter, guarded backup import dry-run / rollback / commit tooling, a development / preview-only Postgres UI runtime cutover path, verified Preview UI runtime checks, a local Stage 7 darker sage visual system with Motion for React interaction animation, Stage 7.2 brand refinement, Stage 7.3 ChillRoundF font trial, Stage 7.4 light / dark theme toggle, Stage 7.5 soft click sound audition, Stage 7.6 UI-only sound settings with review-completion feedback, Stage 7.7 final acceptance coverage, Stage 7.8 Today Hub / dual-track information architecture, Stage 7.9 local Recognition Vocabulary（阅读词汇）/ Active Vocabulary（输出词汇）data semantics, Stage 7.10 local hard-delete, batch rollback, and review reset controls, Stage 7.11 one-word Review rollback plus conservative queue auto-refresh, Stage 8-B / 8-C / 8-D / 8-E / 8-F / 8-G Recognition-only FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）review memory behavior, backup compatibility, Postgres Production handoff, and final local acceptance, a Stage 6B plan for formal Production execution, Stage 6B-P1-B local schema version 5 migration/static tests, Stage 6B-P1-C local `postgres-production` runtime / API contract tests, Stage 6B-P1-D local Postgres repository parity, Stage 6B-P1-E local backup import version 5 support, Stage 6B-P1-F non-production database verification, Stage 6B-P1-G-A Production execution handoff documentation, Stage 6B-P1-G-B read-only Production inventory, Stage 6B-P1-G-C-0 human decision packet, Stage 6B-P1-G-C-1 provider supplement, Stage 6B-P1-G-C-2 evidence route decision, Stage 6B-P1-G-C-3 read-only Neon dashboard evidence, and Stage 6B-P1-G-C-4 branch/environment execution decision for the future cloud-backed runtime path. Stage 8.5 defines one Neon project with `main` as future Production, `staging` as the long-lived non-production baseline, temporary logical `preview/*` branches derived from `staging`, weekly independent logical backups after formal data begins, and explicit future isolation/backup upgrade triggers; P1-G-C-4 turns that policy into a documentation-first live execution sequence without performing remote changes.

Current local stack:

- Next.js 16.2.11
- React 19.2.4
- TypeScript 5.9.3
- Tailwind CSS 4.3.2
- ESLint 9.39.5
- Vitest 4.1.11 for vocabulary domain unit tests
- `@neondatabase/serverless` 1.1.0 for minimal database scripts
- `ts-fsrs` 5.4.1 for Recognition and Active FSRS scheduling
- `dotenv-cli` 11.0.0 for explicit `.env.local` loading in database scripts
- npm with `package-lock.json`
- `lucide-react` 0.562.0 for simple interface icons
- npm `overrides` pins PostCSS（CSS 处理器）to 8.5.27 so the Next.js nested PostCSS copy resolves above the current 8.5.23 security floor; its Nano ID dependency resolves to patched 3.3.18.

Stage 7.11 stores local study data in browser `localStorage`（本地浏览器存储）under `mimi-pte-vocabulary-v1`; the 2026-07-07 multi-meaning / multi-example refinement keeps the browser-local and backup shape at schema version 5. Stage 8-E confirmed schema version 5 remains sufficient for FSRS state because the neutral review fields already exist. This enables local single vocabulary input, batch JSON import（批量 JSON 导入）preview, edit, archive, restore, hard delete, batch import rollback, search, recognition-only review sessions, one-word review rollback, review history, reset of today's local review task, per-person Recognition / Active daily limits, multiple Chinese meanings, multiple examples, JSON backup（JSON 备份）, vocabulary CSV（逗号分隔值）export, JSON restore preview, and selected-person switching without remote services. Stage 8 gives Recognition Vocabulary FSRS scheduling and same-session failed-card repeats. Active Vocabulary remains stored, exportable, and importable, but is explicitly excluded from review queue（复习队列）, review state（复习状态）, and review event（复习事件）creation in V1.

Stage 5D added durable storage readiness without connecting to any remote service. The local SQL migration lives at `db/migrations/0001_initial.sql`, the JSON backup to Postgres（关系型数据库）mapping lives at `db/LOCAL_BACKUP_TO_POSTGRES.md`, and the repository adapter contract（仓储适配层接口）lives at `src/lib/storage/durable-repository-contract.ts`.

Stage 5E documented the execution gate for Neon/Vercel work. It defined required human approvals, command sequence, stop conditions, rollback direction, and validation expectations before any remote mutation.

Stage 5F executed the approved development / preview bootstrap. The Vercel project is linked, the Neon resource `words-learning-app-for-mimi-neon` exists for development / preview, ignored `.env.local` values were pulled locally, and `db/migrations/0001_initial.sql` was applied to the non-production development database. Schema inspection verified 8 tables, 11 indexes, 5 key constraints, and zero business rows. A deployment attempt with `--target preview` unexpectedly returned `target: production`; that deployment was removed immediately.

Stage 5G documents a later active Production deployment reported by Vercel: `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD`, with commit ref `V1` and commit `d01719a6bb372c75873d042c657feb7f93d80b3a`. The Vercel API reports the Git link production branch as `main`. The current active Production deployment is not treated as the official V1 production release; formal Production remains deferred until V1 is complete and merged through the agreed branch path. Stage 5G also created and verified Preview deployment `dpl_d5LUb6r1wEXiJBUENb2PACEZMVsu` at `https://words-learning-app-for-mimi-bwfhi5rap-anorias-projects.vercel.app`, and Vercel Git integration later created clean Preview deployment `dpl_EmhfvP8yE9NrxCWPcdK3Qdd8sdk8` at `https://words-learning-app-for-mimi-aczic0spy-anorias-projects.vercel.app`.

Stage 5I implements the runtime Postgres adapter（运行时 Postgres 适配层）for development / preview verification. The app runtime still uses browser `localStorage`; the Postgres adapter is gated by `MIMI_STORAGE_RUNTIME=postgres-preview`, Production（生产）Postgres runtime is rejected, smoke writes are disabled by default, and backup import, production database migration, authentication（认证）, and external integrations have not been implemented.

Stage 5J verifies the runtime Postgres adapter read-only path. Local default `/api/storage/health` returns disabled without Postgres, local `postgres-preview` health reads the development Neon database with zero core rows, and Preview deployment `dpl_CFeC2VwRKtMSAjBiGGtyStsFw2tr` at `https://words-learning-app-for-mimi-dbkkkow3d-anorias-projects.vercel.app` returns read-only health successfully. `MIMI_STORAGE_RUNTIME=postgres-preview` is scoped to Preview only. `MIMI_ENABLE_STORAGE_SMOKE_WRITES` was not added.

Stage 5K verifies the runtime Postgres adapter write path with one controlled smoke write. `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` was added to Preview only, Preview deployment `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv` executed one `/api/storage/smoke` write, and the development database now contains one smoke person, one vocabulary item, one review state, one review event, and one review settings row. The write flag was removed from Preview after the test, follow-up Preview deployment `dpl_BJn1pFAbLiiY4LgCyThKx2vDTSar` at `https://words-learning-app-for-mimi-7bzktk5uc-anorias-projects.vercel.app` verifies `/api/storage/smoke` is disabled again, and the smoke-enabled deployment was removed. Smoke rows remain in the development database under person id `00000000-0000-4000-8000-0000000005f1`.

Stage 5L adds a backup import dry-run harness and cleans the Stage 5K smoke rows from the development database. `scripts/backup-import-plan.mjs` validates schema version 3 JSON backup structure, metadata counts, person-scoped references, and target UUID mapping. `scripts/backup-import-postgres.mjs` can run a fixture dry run, remove the fixed smoke row set, and run a fixture transaction trial that rolls back. The development database fixture trial inserted one person, import batch, vocabulary item, review state, review event, review settings row, backup import row, and six backup import mappings inside a transaction, then rolled back and verified no fixture rows persisted. The development database now has zero rows in core study tables after smoke cleanup.

Stage 5M extends backup import and cuts over the UI runtime for development / preview only. `scripts/backup-import-postgres.mjs` now supports file-backed `--file <backup.json>` dry runs, rollback trials, and guarded development commits with `--i-confirm-development-import`. `test_fixtures/stage5m-backup.json` covers the file-backed path without real user data. `/api/storage/data` reads Postgres snapshots when `MIMI_STORAGE_RUNTIME=postgres-preview` and accepts controlled UI mutations only when `MIMI_ENABLE_STORAGE_UI_WRITES=true` plus `x-mimi-ui-storage-write: allow-dev-preview-ui-write` are present. Browser `localStorage` remains the default runtime and restore target. Production remains disabled. Stage 5M committed a fixture backup to the development database, verified the UI read/write path locally, and cleaned all fixture rows; the development database is empty again.

Stage 5N verifies the Stage 5M UI runtime in Vercel Preview. Stage 5N-A deployed read-only Preview `dpl_HpcPDb5B2su2BLPWJVsYZjPDnWSg` at `https://words-learning-app-for-mimi-kb5b08c5v-anorias-projects.vercel.app`, confirmed `target=preview`, read `postgres-preview` health/data successfully, and confirmed writes were blocked. Stage 5N-B temporarily enabled `MIMI_ENABLE_STORAGE_UI_WRITES=true` in Preview, deployed write-enabled Preview `dpl_JgKNc9zuAqgMsy5w13gbZoqkEhnY`, wrote one controlled UI smoke vocabulary row, cleaned the row set, removed the write flag, deployed disabled Preview `dpl_Athg2hWZK1gV6ereWdbYk1WXG58C` at `https://words-learning-app-for-mimi-6v8azqoaa-anorias-projects.vercel.app`, verified writes are disabled again, and removed the temporary write-enabled deployment. The development database is empty after cleanup.

The confirmed release sequence is Stage 6A Production（生产环境）release gate design, Stage 7 UI（用户界面）/ visual design and optional PWA（Progressive Web App，渐进式 Web 应用）work, accepted Stage 8 Review Memory Algorithm, Stage 6B-P1 Postgres Production runtime implementation, then Stage 6B formal merge（合并）to `main` and Production execution after explicit approval. Formal Production should not proceed before Stage 6B-P1 is accepted.

Stage 6A documents the Production release gate. It confirms that current `person_id` behavior separates learner data but does not provide security isolation, that `postgres-preview` must not be used as a Production runtime mode, and that Stage 6B must either keep first Production browser-local or introduce a separate accepted Production runtime before durable shared writes.

Stage 6B formal Production execution planning is documented in `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`. On 2026-07-08 the user chose shared Postgres Production for formal V1, so Stage 6B-P1 is documented in `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`. It plans schema version 5 Production persistence, `postgres-production` runtime guards, API/repository parity, backup import, non-production Neon branch verification, and later Production execution gates. Stage 8-G accepted the final V1 Recognition scheduler behavior and handoff shape for Stage 6B-P1: neutral `difficulty` / `stability`, exact `dueAt`, application-level natural-day due checks, no V1 `scheduled_days` column, and explicit rejection of Active Vocabulary review state / event rows. Stage 6B-P1-B added `db/migrations/0002_schema5_production_runtime.sql` and static tests for schema version 5, JSON source types, dual review limits, backup schema 5 support, and database-level Active review row guards. Stage 6B-P1-C added local `postgres-production` parsing, Vercel Production-only guards, Production health/data API behavior, client runtime recognition, and route contract tests. Stage 6B-P1-D added local Postgres repository parity for schema version 5 fields, JSON import sources, dual review limits, hard delete, JSON batch rollback, reset-today Review rebuild, and one-word Review rollback rebuild. Stage 6B-P1-E added local backup import version 5 planning, fixture, script, and tests. Stage 6B-P1-F applied `0002_schema5_production_runtime.sql` to the approved non-production development database, verified schema version 5 fields / guards / fixture import paths / repository integration behavior, and cleaned the database back to zero business rows. Stage 6B-P1-G-A documented the empty Production handoff, P1-G-B completed read-only Production inventory, P1-G-C-0 documented the remaining human decision packet in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`, P1-G-C-1 documented the read-only provider supplement in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`, P1-G-C-2 documented the evidence route decision in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md`, P1-G-C-3 documented the approved read-only Neon dashboard evidence in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_3_DASHBOARD_EVIDENCE.md`, and P1-G-C-4 documented the branch/environment execution decision in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_4_BRANCH_ENVIRONMENT_EXECUTION_DECISION.md`. The dashboard shows only one `main` default branch, database / role labels `neondb` / `neondb_owner`, Sydney region, Postgres 17, and a 6-hour restore window; no distinct empty Production branch / database is visible. Stage 8.5 then accepted the single-project `main` / `staging` / logical `preview/*` topology, and P1-G-C-4 records how to execute that topology after separate approval. This work did not merge to `main`, print credential values, mutate Production, import user backup data, or deploy Production.

Stage 7 implements the local UI（用户界面）visual design pass. `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md` records the design guardrails, including the darker soft sage palette, Motion for React dependency, reduced-motion boundary, mobile / desktop layout expectations, and the explicit decision not to implement a PTE / IELTS toggle in V1. `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md` records the accepted brand and interaction refinement: visible brand surfaces now use the local cat avatar and `咪咪 Vocabulary`, desktop dashboard action cards are slightly smaller, and hover / tap feedback is stronger. `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md` records the typography follow-up: the app self-hosts ChillRoundF 寒蝉全圆体 `v3.200` from Warren2060/ChillRound under OFL-1.1 and uses it for CJK（中日韩文字）UI text before system fallbacks. `plan_docs/PLAN_V1_STAGE7_4_THEME_TOGGLE.md` records the local light / dark theme（主题）toggle: `dark` remains the default, `light` is a warm sage paper version, the selected theme is stored only as UI preference under `mimi-ui-theme-v1`, and a body-first boot script applies the stored theme before the main UI renders. `plan_docs/PLAN_V1_STAGE7_5_SOFT_CLICK_SOUND_TRIAL.md` records the sound audition: the app stores one Kenney CC0 click sound in OGG（Ogg Vorbis 音频格式）and M4A（MPEG-4 音频格式）forms, keeps the license note in `public/sounds/`, and exposed a low-volume Settings preview through a low-pass filter（低通滤波器）before global use. `plan_docs/PLAN_V1_STAGE7_6_SOUND_DESIGN.md` records the accepted sound layer: the generated soft click is used for normal button feedback through a client sound provider, Settings stores separate button / review-completion sound preferences under `mimi-ui-sound-v1`, and the review flow shows a calm `已完成今日复习任务` modal whose `确定` button can play the user-provided Mimi completion sound from `public/sounds/mimi-review-complete.m4a`. `plan_docs/PLAN_V1_STAGE7_7_FINAL_ACCEPTANCE.md` records the local final acceptance pass: core local validation, route / asset checks, API safety smoke checks, and a focused in-app browser Settings check passed. `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md` records the dual-track UI refinement: dashboard becomes a Today Hub with Recognition Vocabulary and Active Vocabulary cards, navigation（导航）centers daily learning, `/study` and `/practice-lab` become presentational route entries, Library prepares track filters and mastery labels, and the cat avatar becomes an accessible Home Brand Button. `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md` records the accepted local data refinement: `learningTrack` and nullable `tags` became schema version 4 vocabulary fields, then the multi-meaning / multi-example correction upgrades browser-local data to schema version 5 with `meaningsZh` and `examples`; `/import` is the parent page for Single input and Batch JSON import, `/add` remains a compatibility redirect, Review settings store separate Recognition / Active daily limits, and the current review scheduler uses Recognition Vocabulary only. `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md` records the local Library / Review control follow-up: Review side-panel rating cards are now real buttons, Library can hard-delete vocabulary items, Library can rollback JSON import batches, JSON source chips display `Batch imported`, and Review can reset today's local review task after confirmation. `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md` records the Review refinement: the confusing regenerate/new-session buttons were removed, the empty Review queue refreshes conservatively after local Recognition Vocabulary data changes, and `回退1词` can roll back the previous completed card during a multi-card local session. Theme and sound preferences remain UI-only and are not part of vocabulary data, review history, review settings, JSON backup, CSV export, Postgres tables, API payloads, or Production（生产环境）state. Stage 7.11 did not add AI API（人工智能接口）, dictation, spelling, writing feedback, external vocabulary sources, PTE / IELTS persisted classification, remote database migration, Production import, or Production deployment.

The GitHub repository URL was provided by the user:

- `https://github.com/huaixuanhu/words-learning-app-for-mimi.git`

The local `main` branch now tracks `origin/main`. Remote repository settings have not been audited beyond the local Git connection.

## Current V2 Planning Baseline

The cloud-backed V1 chronology above remains historical evidence. Stage 1 through V2-8-2 built and rehearsed the complete V2; V2-8-2.1 stabilised runtime performance and V2-8-3 Gate 0B verified its exact commit on protected Preview in `SYD1`. V2-8-2.2 adds reliable keyboard rating selection, device-selectable fallback voices, paired English/Chinese examples, JSON backup Version 4 and additive Schema 6 migration `0004`. PF-001 is `High / Closed` with exact Standard-C playback, additive `0005`, local corpus evidence, keyless WIF, exact deployment and human acceptance. PF-002 and PF-003 are `Normal / Closed by explicit acceptance`. V2-8-3 Gates 0B–6 are complete: Production left maintenance, old V1 database access is blocked, independently restorable Schema 5 and Schema 6 backups exist, `main` is Schema 6, V2 serves the canonical domain, and real Gemini/TTS calls reconcile to zero in-flight. Gate 7 now owns the natural-day and two-user stability observation plus later cleanup.

The V2.2 product plan is `plan_docs/PLAN_V2_2_REVIEW_CADENCE_CARD_AUDIO.md`. It introduces `recognition-fsrs-v2` with `request_retention = 0.929` and `active-fsrs-v2` with `0.93`; V1 parameter objects remain available only to replay and interpret V1 history. New ratings write V2 identifiers, while rebuild selects the scheduler recorded on each event. The first new-word `vague` rating still stops at the next local-day boundary. `0007_v2_2_fsrs_parameter_sets.sql` changes only the matching-profile constraints to accept the four explicit V1/V2 identifiers and refuses unknown retained rows; it does not rewrite Review state, Review events or `dueAt`. The pinned migration completed before V2.2 activation on both Staging and Production with unchanged migration-time table digests.

V2-8-2.1 moves browser workspace ownership into one root `VocabularyDataProvider` that persists across App Router navigation. Concurrent refresh requests share one in-flight Promise; route changes reuse the last accepted snapshot; a late read cannot replace a newer mutation or person selection; and only vocabulary/person/sync storage keys trigger cross-tab revalidation. Remote helpers are side-effect free until a guarded snapshot is accepted. Postgres storage mutations are serialized and their returned full snapshot becomes the immediate client state, so the same tab no longer emits a self-triggering full GET. Frequent rating and rollback responses apply idempotent Review event/state deltas keyed by event id plus `personId + vocabularyItemId + reviewProfile`; an active-mutation patch journal and stable-queue revalidation prevent a slower full response from erasing those deltas. Broad Study and formal AI changes emit one non-looping cross-tab marker. Temporary network or truncated-response failure after successful Postgres bootstrap keeps the last-known-good snapshot.

The Daily Study client first runs the existing pure resolver against the shared snapshot and a server-owned clock anchor. When both current Track plans already exist, Home, Study and queue preparation require no preliminary `resolveToday` request. Sleep or device-clock drift invalidates the anchor and returns to the server; browser wall time cannot silently own a Postgres learning day. Delayed Today responses are merged by plan version and current learner before visible state is derived. The Postgres resolver now builds one selected-person snapshot and returns immediately when no defaults/plans need persistence, skipping the empty transaction and second snapshot. First-of-day creation retains the transaction, `ON CONFLICT DO NOTHING`, and canonical reread so concurrent requests return the database winner's plan id. `/api/storage/data` and `/api/study` add allowlisted `Server-Timing` metrics containing duration only; no learner, lexical, prompt or credential content enters the header.

The root `vercel.json` pins V2 Vercel Functions to the single Sydney region `syd1`, beside Neon `ap-southeast-2`; static assets remain CDN-served. Separately approved Gate 0B deployment `dpl_3DeE8BrKcZ9cBdCkPA4jE1UTeHXf` proves the earlier performance commit and observed application/API Functions in `SYD1`. The fixed historical Preview alias was not repointed. Local V2-8-2.2 keeps accepted Motion/reduced-motion and scheduling rules unchanged, but advances the local backup wrapper to Version 4 and requires `0004` before a future deployment can use the bilingual example data path.

V2-8-2.2 centralizes Review shortcut eligibility and 2×2 rating movement for Recognition and Active. Buttons such as the card, answer toggle, and pronunciation no longer suppress Arrow selection; text entry, dialogs, IME composition and modified shortcuts remain excluded. PF-001 keeps the browser-provided English `SpeechSynthesisVoice` list only for an explicit `Use device voice` fallback. Cloud voice is the new client default and shares one facade with every learning playback entry; failures remain visible and never silently invoke a device voice. No playback result writes learning evidence.

Vocabulary keeps English `examples` unchanged for exact-span word actions and adds a parallel `exampleTranslationsZh` array. All new manual/import/AI-accepted examples require non-empty aligned Chinese text; legacy items may carry aligned blanks and are visibly discoverable through `Needs translation`. AI output V3 produces editable translation pairs and updates the source item only after explicit acceptance. JSON backup Version 4 preserves the paired array; Version 1–3 remain readable. `0004_v2_bilingual_examples.sql` adds the Postgres column and parity constraints without rewriting `0003` or changing the Schema Version 6 name.

V2-8-2.3 owns the release-quality process contract for protected Preview findings. PF-001 is `High / Closed`: required `staging` migrations, exact application refresh, Kill Switch, machine routes and MacBook + Chrome human retest passed; Mimi later confirmed the audio without an exact environment record. PF-002 is `Normal / Closed by explicit acceptance`: desktop navigation uses `Review / New Learning`, mobile uses `Learn`, both Tracks expose accessible zone links, Home/Study use a two-goal hierarchy, and session summaries distinguish Daily goal, today’s distinct actual and Ready now. Historical exact commit `52942b412d0a2281c4dded2f5b9bd716d7fd0131` runs as protected Preview deployment `dpl_DxQWHVspQuukaeR6LTCjKp15a3zp` in `SYD1` and passed machine checks, but the user rejected its Instrument Serif typography after real use. The replacement exact commit `54c8ca4492ff9b13d095ea0bd0d3d7ca702c3c2f` runs as deployment `dpl_EmRVmp5YDTKgnh1VEtVBozwhRp6J`: it no longer loads Instrument Serif, display titles compute to Geist semibold, large vocabulary restores the earlier Georgia fallback, and desktop protection/region/overflow/console checks pass. Component sizing, body/control/data fonts and ChillRoundF remain unchanged. The user explicitly accepted this candidate without a new comfort retest; no fresh remote 390 px claim is made.

PF-003 keeps completion feedback inside the existing client-only sound layer. After Active successfully records a rating and its resolved queue becomes empty, it opens the same `ResponsiveDialog` pattern used by Recognition. `Done` owns the user gesture, skips the global soft click, closes the dialog and conditionally calls the same local `playReviewCompleteSound()` when the existing `Review complete` preference is enabled. The shared Active component makes this behavior apply to New Learning/Review and Say it/Spell it/Dictation. Session initialization and rollback clear the dialog. No scheduling, completion criterion, event/state, persistence, API, TTS or Motion path changes.

The PF-001 implementation keeps one client speech facade across Recognition pronunciation, Active revealed answers, Dictation, selected example words and Settings preview. Strict `POST /api/tts` accepts only versioned same-origin JSON, a server-owned purpose, request UUID and normalized English text up to 240 Unicode characters; clients cannot choose a voice, provider, encoding or SSML. Runtime Cache is checked before an atomic reservation, equal misses are coalesced, and TTS attempts/characters/list-price cost/concurrency remain independent from the Gemini ledger. Current code enforces 2,000 provider attempts/day, 100,000 characters/day, 1,000,000 characters/month, `US$0.50/day`, `US$4/month`, concurrency 4 and no per-person limit. `0005_v2_standard_tts_accounting.sql` stores only environment scope, digests, counts, state and timestamps. Local fixture mode is visibly `local-fixture`; local Google mode is exact-loopback, user-ADC-only and pinned to project `for-tts-502913`. Protected Preview uses Vercel Team OIDC and Google WIF bound to the exact team/project/Preview subject, plus a runtime Git-ref `V2` check; it uses Runtime Cache and Postgres accounting. The OIDC subject-token audience is the provider HTTPS URL while the Google STS request uses the `//iam.googleapis.com/...` resource audience. The immutable `google-en-au-standard-c-v1` contract owns `en-AU-Standard-C`, `en-AU`, speaking rate `0.9`, pitch `0` and MP3. No service-account key exists. Exact Preview commit `deab32f3ab96025116597881b7b69c9dde84b8f4` passed Settings, Recognition, example-word and Active Dictation playback; its Gate E ledger ended at 7 attempts / 170 characters / `US$0.000680`, including three safely retained diagnosis failures and four successful calls. A same-text Settings replay added no provider attempt, and active concurrency returned to zero. V2.2 keeps the same facade and provider contract: every newly active Recognition card and Active Dictation card requests one automatic playback, while Active Say/Spell stay silent before reveal and every manual sound button remains. Starting any new playback or changing the Settings source cancels the prior Cloud request/audio and device speech. `Cloud voice` alone uses `/api/tts`; `Use device voice` alone uses browser speech. A browser playback-policy rejection remains visible and asks the learner to tap the sound button again; there is still no silent source fallback. The Cloud disclosure now includes automatically shown eligible card text as well as manual replay.

Stage 4 establishes the responsive application shell reused by later V2 stages. Below 1024 px, a five-item bottom navigation exposes `Home`, `Study`, `Learn`, `Library`, and an accessible `More` bottom sheet; at 1024 px and above, the desktop rail is the sole primary navigation and names the combined route `Review / New Learning`. One shared responsive dialog owns focus containment/restoration, Escape/backdrop handling, background scroll lock, dynamic viewport limits, and Safe Area padding for `More`, Review, and Library confirmations. Batch import renders one candidate state as touch-friendly cards below 1024 px and a scroll-contained table from 1024 px. Normal motion retains short fluid transitions, while reduced-motion styling removes spatial lift/travel and keeps brief opacity, color, border, and surface feedback.

Stage 5 turns the accepted V2 daily contract into application behavior. One resolver creates or reuses both profile-specific Daily Plans for the same timezone-owned natural day. Home and Study read six values per Track: four plan values plus `Reviewed today` and `Learned today`. Recognition has separate `Review` and `New Words` queues; a valid first rating moves one entry to `In review`, while failed ratings can return through newly issued prompt evidence without consuming another distinct target. Study owns today-only goals and the two-gate whole-day reset. Settings owns future Recognition/Active review and new-word defaults plus timezone. Library derives `New` / `In review` from each Review Profile rather than lifecycle state.

Stage 5.1 separates same-day recovery from cross-day memory scheduling. One persisted Daily Plan window defines one Learning Episode per Recognition entry. Every rating remains an immutable event, while only the earliest attempt updates FSRS state. A `hard` anchor retains its raw value but uses unsuccessful-recall scheduling, matching the product rule that it cannot complete the card. A new entry without immediate `remembered`, and any existing Review entry with a failed anchor, receives a next-local-day checkpoint at the frozen plan's `dayEndsAt`. Daily actuals require a later `vague` / `remembered` pass; failed-only episodes remain available in their original daily zone after refresh. Failure counts provide stable priority among equal checkpoints. Events without a matching Daily Plan keep legacy sequential replay, and Schema Version 6 remains unchanged.

Stage 6 applies that Daily Episode rule independently to Active Vocabulary. Its historical `active-fsrs-v1` Parameter Set（参数集）remains isolated from Recognition. V2.2 makes `active-fsrs-v2` the current write-time set while retaining V1 for historical replay; `Say it`, `Spell it`, and `Dictation` continue to share one Active Review Profile and each event retains its activity type. The first attempt inside the persisted Active plan window remains the only cross-day input, so a required later pass completes the daily episode without replacing the earlier failure signal. Typed modes use deterministic `active-answer-v1` comparison and persist only the result category; raw typed text stays in component state and is cleared. PF-001 routes Dictation and revealed answers through the shared Cloud client by default, with explicit device fallback and no microphone. Prompt/cursor evidence binds the chosen activity and a non-lexical target revision. A history-bearing Track transition requires explicit `Start fresh`, keeps source history read-only, refuses an already history-bearing target, and copies no scheduler state.

V2-8-1 derives Dashboard Insights from the already loaded `VocabularyData` snapshot without a new route, schema, storage write, provider, or dependency. Each Track card keeps the four plan values in one 2-by-2 grid and shows `Reviewed today` / `Learned today` as separate progress rows; a goal of zero is rendered as `No goal` and never becomes a division operation. `Learning rhythm` owns 14 person-local calendar days and can display seven or fourteen: a vocabulary entry counts once per day after at least one passing event, while every valid unique event remains an attempt. Missing complete days are real zeroes; loading and invalid timezone data are never presented as zero activity.

`Memory outlook` is a current FSRS estimate, calculated independently for Recognition and Active. Current, non-archived, profile-matching state is grouped into `Ready`, `Tomorrow`, `2–3d`, `4–7d`, and `Later` from exclusive person-local day boundaries. Recall bands use the matching profile scheduler and include only state with retained review time plus valid positive stability/difficulty; new items, incomplete legacy state, a future last-review timestamp, or a mismatched Parameter Set are excluded rather than assigned an invented score. The snapshot is recalculated from a component-owned clock and current data revision. V2-8-1 preserves the accepted Motion and reduced-motion behavior; V2-8-2 reused it unchanged in protected Preview.

V2-8-1.1 adds no route, schema, state, dependency, scheduler, or write. The application shell now presents one page title without atmospheric subtitles; learner pages keep only copy that changes an action, explains a learning value, reports a state, or protects a safety decision. Batch import starts with an empty paste field and keeps JSON requirements under collapsed `Example format`. Synthetic fixture records retain stage-specific technical identifiers while exposing the natural display name `Mimi`. A repository-wide Learner Copy Contract prevents removed development labels and duplicate phrases from returning while asserting the continued presence of `Batch imported`, AI lineage/disclosure, `Actual`, `FSRS estimate`, keyboard guidance, destructive-action warnings, and person-separation boundaries. Motion and reduced-motion remain byte-for-byte outside this slice.

V2-8-2 adds a second exact formal-provider activation state: `v2-8-2-preview`. It requires `VERCEL_ENV=preview`, Git ref `V2`, `postgres-preview`, Schema 6 and accounting readiness, protected-Preview confirmation, Project logging confirmation, a dedicated restricted Gemini Auth Key, and a Preview-only study-token secret. Other Preview branches and all Production requests fail closed. Vercel Authentication protects the fixed Preview alias before the application; a 30-day bearer Shareable Link is managed out of band and never stored in the repository. Preview UI writes are enabled only for branch `V2` so Daily Plans and study events persist to synthetic Staging data.

Long-lived Neon `staging` is now Schema 6. A temporary child proved Schema 5 → 6, Reset → 5, and a second forward migration before deletion. Gate 0B rechecked the retained no-compute Schema 5 checkpoint `v2-8-2-staging-schema5-recovery-20260718` (`br-patient-mud-a7cnc81r`): it still exists under `staging` and expires on `2026-08-17T12:00:00Z` unless separately extended. Final V2-8-2 Staging inspection reports 12 expected new tables, 8 constraints, 0 cross-profile invariant violation, 0 submitted AI run, and 0 active provider call. The synthetic acceptance state contains 1 person, 5 entries, 4 Review states, and 5 Review events.

The protected Preview completed Recognition recovery, all three Active modes, independent Dashboard insights, editable/accepted Gemini enrichment, exact-span context explanation, AI candidate addition, duplicate protection, backup counts, the two reset gates, and 320–1280 px responsive checks. Final provider usage is 3 successful `gemini-3.1-flash-lite` attempts, 1,467 total tokens, and `US$0.000777`; Cache, Replay and Kill Switch evidence added no provider attempt. The accepted global 300-attempt/day, token, `US$0.50/day`, `US$2/month`, concurrency 2, Cache, Idempotency and Kill Switch boundaries remain active.

The browser-local adapter keeps operational prompt and replay records in session-only/in-memory storage, outside `VocabularyData` and JSON backup. The Postgres path maps the same behavior to Schema Version 6 tables and transactional commands. `POST /api/study` accepts only strict operation shapes, rechecks the existing auth/runtime gates, and delegates trusted server time and person scope. Server-backed cursor/prompt evidence is HMAC-authenticated and loads `MIMI_STUDY_TOKEN_SECRET` only at request time; missing/unconfigured environments fail closed. V2-8-2 configures an independent secret only for protected branch `V2` Preview. Local fixture mode and Production do not inherit it.

The Stage 5 prompt-expiry follow-up keeps Basic Auth（基础认证）independent from per-card evidence. When one Recognition card becomes active, the client requests refreshed evidence for that card while keeping the same server-owned `promptId`. If submission still receives the explicit `prompt_expired` category, the client refreshes that exact card and retries once with a new Idempotency Key（幂等键）; invalid, stale, consumed, and ambiguous failures are not retried. Refresh never navigates to login or clears completed session progress. Postgres refresh/rating transactions lock the matching plan row before checking same-`promptId` consumption, so concurrent old and refreshed tokens cannot both create ratings. Browser-local expired evidence is retained only in a bounded operational registry long enough to refresh and remains outside formal data and backup.

The accepted V2 architecture direction is:

```text
Recognition Vocabulary
  -> separate Review / New Words zones
  -> Recognition FSRS parameter set
  -> browser pronunciation playback

Active Vocabulary
  -> Say it / Spell it / Dictation
  -> independent Active FSRS parameter set

Both Tracks
  -> Added today / Suggested review / Review goal / New-word goal
  -> distinct-entry actuals
  -> Today’s progress / Learning rhythm / Memory outlook

Lexical enrichment
  -> allowlisted current term / meanings / examples
  -> pinned Gemini 3.1 Flash-Lite structured draft
  -> strict local validation
  -> human edit / reject / accept
  -> accepted enrichment or separate learning entry
```

Key accepted boundaries:

- A `VocabularyItem` counts as one learning entry whether it is a single word, phrase, or fixed collocation.
- `Review goal` and `New-word goal` are independent per person and Review Profile. They accept `0..2,147,483,647`; invalid values are rejected without rounding or silent clamping, while internal queue pages remain bounded to at most 100 entries.
- Review and New Words are separate zones. Remaining goals use distinct actual entries, and same-session retries do not consume another distinct goal.
- An append-only, non-lexical creation ledger owns `Added today`: ordinary hard delete preserves the stable item/action fact, while a full `Batch imported` rollback appends one immutable action reversal and removes that action from visible history.
- A newly saved entry remains `New` until the first valid rating creates state for its Track-specific Review Profile（复习配置）. A legacy V1 state with no retained event uses `historyOrigin = legacy_unknown` and `firstRatedAt = null`; no first-rating timestamp is invented.
- Daily plans freeze the person timezone, inclusive start, exclusive end, goals, recommendation version, calculation time, and `Suggested review`; `planVersion` separately protects concurrent goal edits.
- Review and New Words use separate bounded keyset queries. Public requests bind the current plan version and carry only opaque server-issued cursors; the server derives remaining goals from trusted plan/actual data and stops a cursor after the remaining distinct target is selected.
- Recognition and Active share the FSRS-6 algorithm family but never share parameter sets, state rows, event histories, or rebuild tests.
- Active typed answers use versioned deterministic normalization and persist the outcome rather than the raw answer. Answer outcome and the learner's four-choice memory rating remain separate evidence. A server-issued prompt token binds the displayed target revision to the eventual rating; `Say it` stores no audio or transcript.
- Whole-day reset keeps the accepted two visible confirmation gates and becomes one transactional, idempotent command across both profiles. A same-key/different-payload replay is a conflict, and operational replay records stay outside user backups.
- Recognition pronunciation and first-generation Active Dictation use browser SpeechSynthesis（浏览器文字转语音）without an AI call.
- Stage 3.1 adds the same browser-only playback boundary to a user-selected actionable word inside a revealed example. It also adds a manually editable, duplicate-guarded `Add to learning` sheet; this path stores `source = manual` and creates no AI relation.
- Automated Speech Recognition（自动语音识别）, microphone upload, and AI pronunciation scoring are deferred and send no audio in the accepted V2 baseline.
- The paid AI candidate remains behind an evidence gate, server-only adapter, atomic global quotas, Cache（缓存）, provider billing cap, and Kill Switch（紧急关闭开关）. Stage 2 uses paid `gemini-3.1-flash-lite` as the only live candidate and a fixed 120-entry non-personal corpus; Datamuse, Free Dictionary, Groq comparison, and `gemini-flash-latest` are outside the active V2 route.
- Stage 7A supersedes the earlier Stage 2 proposal with no per-person attempt ceiling and server-owned `Australia/Melbourne` global boundaries of 300 provider attempts, 600,000 input tokens, 210,000 output/thinking tokens, and US$0.50 estimated cost per day; the monthly estimated-cost ceiling is US$2 and global concurrency is 2. A submitted provider attempt keeps its request count even when it later fails. `person_id` cannot divide or reset this global security and cost boundary.
- Paid-provider limited safety / abuse / legal retention is acceptable when accurately disclosed; V2 must not claim Zero Retention（零保留）.
- Before the first outbound AI call, a versioned disclosure must name the provider, outbound lexical fields, excluded personal fields, limited content retention, separate technical / usage metadata, and quota / cost boundary, then require explicit user confirmation.
- The user confirmed the intended users and app purpose satisfy the current Gemini age / professional-purpose conditions. The user also reports AUD 20 Prepay with Auto-reload disabled; this limits provider-side exposure but does not replace application quotas or prevent a leaked key from consuming the prepaid balance.
- The 2026-07-14 official-price recheck corrected the synchronous Standard Gemini 3.1 Flash-Lite rate to US$0.25 / 1M text-input tokens and US$1.50 / 1M output / thinking tokens. US$0.125 / US$0.75 are Batch/Flex rates and do not describe the REST `generateContent` runner. Stage 2 retains its historical 400,000 / 140,000 and US$0.40 design evidence. The current Stage 7A 600,000 / 210,000 daily reservation is US$0.465 before the independent US$0.50 daily and US$2 monthly app ceilings.
- Stage 2 keeps its user-approved test credential only in ignored `.env.stage2.local`, never in Git, `.env.local`, Vercel, Preview, Production, logs, or browser code. Its runner pins the stable model, allows at most 120 one-shot calls at concurrency 1, disables tools and retries, and writes raw evidence only to an ignored local directory.
- The first Stage 2 run submitted all 120 fixed fixtures: 114 drafts passed local validation, 6 duplicate/self-candidate drafts were rejected, and no provider/network failure occurred. The 95% structural rate did not pass the 100% gate. The runner originally recorded US$0.034275–0.038925 with the wrong Batch/Flex rate; repricing the retained/reserved evidence at Standard gives US$0.068550–0.077850. `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_EVIDENCE.md` keeps both historical and corrected values.
- Stage 2-B is derived in `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md`. Prompt v2 preserves the four-field output shape, asks for genuinely new material, limits `similarWords` plus `confusableWords` to three entries in total, and excludes malformed/error forms from learnable candidates. The local validator also rejects meta labels, URLs, visible wrong-answer examples, exact duplicate supplied content, and explanations that identify their own candidate as incorrect. These checks improve conservative rejection but do not prove dictionary validity or lexical usefulness.
- The Stage 2-B evidence runner version 4 preserves HTTP 200 usage/model/finish context before JSON/draft validation, locks the unchanged corpus plus Prompt/schema v1 hashes, hashes Prompt/schema v2, and keeps rejected parsed output only inside ignored artifacts. Current local runner version 5 keeps that evidence logic and applies the corrected Standard price: its 120-attempt reservation is US$0.186, above the retained US$0.10 evaluation ceiling, so another live batch fails closed. It still accepts only `STOP`, requires the local secret file to remain mode `600`, and halts on provider Prompt blocks, other finish reasons, or missing candidate/content contracts.
- The one approved Stage 2-B rerun completed all 120 fixed entries with 120 locally valid drafts and no provider failure. Its historical runner estimate is US$0.027943; the corrected Standard estimate from retained usage is US$0.055886. Candidate density and output tokens fell, and the first malformed/meta candidate classes did not recur. `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md` retains remaining lexical defects and records the user's conditional acceptance for supplementary, editable AI drafts. No third run, Production credential, route activation, migration, or deployment is authorized.
- V2-7 result presentation must derive the readable model label from server-owned result lineage and show `Generated by {modelLabel} · AI content may be inaccurate. Please review carefully before saving.` beside the draft or save controls. This small quality notice does not replace the separate first-outbound-call provider/data/retention/cost disclosure.
- Stage 7A now provides browser-local `enrichment_v1` and exact-span `context_explain_v1` fixture experiences. Library suggestions can be edited, rejected, accepted, and then added to a chosen Track; example-word explanation can prefill the word and exact example in the existing manual form, while local fixture mode deliberately leaves Chinese meaning blank for human checking. Fixture results use `provider = local-fixture`, `model = fixture-v1`, and `Local preview · No AI request was made.` Accepted fixture lineage/content can round-trip through JSON backup. Restore treats accepted content as historical evidence and repeats standalone safety/shape validation without reapplying generation-time novelty against a later-edited source. Postgres import remaps the matching creation action to the accepted draft; a source edit blocks new relation creation until a fresh preview, and deleted lineage displays `Suggestion added`. Pending or rejected drafts and operational quota/Cache state remain excluded.
- Formal `/api/ai/enrichment` and `/api/ai/context-explain` handlers re-check Basic Auth or protected Preview access, same-origin, JSON body size, exact public request shape, runtime mode, and Disclosure Version. V2-7B-1 adds server-owned item lookup, session-bound current-disclosure evidence, canonical SHA-256 hashes, Cache and complete Idempotency, same-Cache in-flight protection, atomic quota reservation, source revalidation, transactional result persistence, and server mutations for accept/reject/`Add to learning`. The historical `v2-7b-2-local-smoke` scope remains loopback-only; V2-8-2 adds the independent protected-Preview scope described above. The Gemini adapter stays lazy, server-only, pinned, tool-free, retry-free, sends top-level `store: false`, and is guarded by a 90-second timeout. Production stays closed until V2-8-3.
- Removing external lexical sources means every similar/confusable item is visibly an AI suggestion. Strict validation can prove shape and limits, while final lexical usefulness remains a human review decision.
- SSO（Single Sign-On，单点登录）and confidential multi-user isolation remain in `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md` and are not V2 scope.

V2-1 freezes the logical data and API contract, including Daily Defaults, versioned Daily Plans, append-only Creation/Reversal Facts, separate Review/New Words keyset queues, profile-scoped review state/event evidence, and strict rating/reset commands.

V2-3 established the persisted boundary as Schema Version 6 and JSON backup Version 3. V2-8-2.2 keeps that schema name, adds forward-only `0004_v2_bilingual_examples.sql`, and advances JSON backup to Version 4 for aligned Chinese example translations. PF-001 adds forward-only operational migration `0005_v2_standard_tts_accounting.sql` without changing learner backup Version 4. Existing `0001` / `0002` / `0003` / `0004` remain immutable. `0004` and `0005` are present on non-Production `staging` and Production `main`.

V2-3.1 reserves `context_explain_v1` as a second bounded AI feature. Its public request carries only a vocabulary id, example index, exact selected offsets, fixed feature/disclosure versions, and an Idempotency Key; the trusted path must re-read and re-segment the stored example before building provider material. Stage 7A activates this interaction with an honest browser-local fixture and keeps the formal route fail-closed. A temporary context-explanation Cache requires seven-day expiry and stays outside `VocabularyData`, `/api/storage/data`, backup, restore, CSV, and import mappings. Context runs cannot back enrichment drafts or vocabulary relations, which require matching succeeded/valid `enrichment_v1` lineage. No Stage 7A Structured Output was sent to Gemini.

### V2-8-3 Local Production Cutover Guard

`plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md` is the canonical Production backup, migration and cutover plan. Local Gate 1, protected Preview Gate 0B, remote read-only Gate 2 and encrypted backup/restore Gate 3 are complete; Gate 3 evidence is recorded in `plan_docs/PLAN_V2_STAGE8_3_GATE3_ENCRYPTED_LOGICAL_BACKUP_RESTORE_REHEARSAL.md`:

- Production has exactly three cutover modes: `maintenance`, `schema6-readiness`, and `live`. Missing or unknown values fail closed. Basic Auth runs first, so an unauthenticated request never learns maintenance state; an authenticated maintenance request receives a short `503` response.
- Production writes are refused outside `live`. In `live`, every mutation must carry `x-mimi-client-contract-version: v2-schema6`; an old V1 tab receives a reload response. Read methods remain separate from this client marker.
- Non-empty Schema 5 inventory, Schema 5 → 6 migration, Schema 6 inspection, and full parity commands exist for a Production clone and `main`. They are dormant until exact target, database, role, action and human-confirmation guards agree with authenticated live GETs to Neon's fixed official control-plane API. The response must bind project, endpoint, branch, parent, state and clone source before any Postgres connection; local JSON/hash self-attestation is rejected. Gate 2 independently confirmed the Production project and pinned only its code-owned SHA-256; the raw id remains outside source control. Clone mode explicitly refuses the live confirmed `main` endpoint; `main` migration additionally requires verified backup, recovery point, clone rehearsal, write-free evidence and mechanical blocking of the retained V1 runtime write path.
- `db/migrations/0003_v2_schema6_data_model.sql` is pinned to SHA-256 `ef991928d299a7dfb78483c96fcd7e6fd673a009cd31ca0f0f91c606d2128fba`. Digest drift fails before a connection or migration.
- `db/migrations/0004_v2_bilingual_examples.sql` is independently pinned to SHA-256 `9e00e1213366492db90a97709d605d68770a1b80f46caa8b748886bc8bd4e29c`.
- `db/migrations/0005_v2_standard_tts_accounting.sql` is independently pinned to SHA-256 `ce0890a59dcf262c38894f865cb249339e95727764c6a98a58b43eba2a4c5367`. The forward sequence is `0003` then `0004` then `0005` inside one outer transaction; partial readiness is rejected.
- The cutover manifest is machine-readable and secret-free. It records commit/deployment labels, Schema 5/6 counts and digests, backup/recovery evidence, write-free timestamps, AI ledger and the paired V1/Schema 5 plus V2/Schema 6 rollback choices. Initial migration requires a ledger baseline and enabled Kill Switch; live/steady-state transitions and every post-write reconciliation path require their corresponding evidence digests.
- Gate 3 uses PostgreSQL 17 custom archives streamed directly through `age`; no plaintext dump is written. The private age identity stays in macOS Keychain, the encrypted archive is stored outside the repository, and restore uses a disposable PostgreSQL 17 cluster reachable only by a private Unix socket.
- Both source and restore inventory set the read-only transaction timezone to UTC before serializing rows for SHA-256. This makes identical `timestamptz` instants stable across Neon and the local restore server without changing stored values.
- Vercel Sensitive Environment Variable values cannot be read back through its CLI/API, so Gate 3 does not use Vercel as a credential source. After clean Git and exact approval checks, the runner consumes one unpooled Production `main` connection string copied from the signed-in Neon Console, clears the system clipboard before parsing or connection, and requires the code-pinned endpoint SHA-256, Sydney region, `neondb` / `neondb_owner`, TLS, a current same-commit synthetic proof and the fixed `postgres-production` authorization label.
- Gate 3A–3B pass tool, encryption, wrong-identity, corruption, Schema 5 restore, digest parity and cleanup checks. After two safe repair checkpoints for libpq mapping and cross-timezone digest serialization, exact commit `88ddb1c2c96437ca3cc4a8f2103990ae70e79eac` passed the strengthened synthetic proof and the first real Production read-only backup/isolated restore. Gate 4 then used a Keychain-held project-scoped Neon API key to bind one `main` child clone, run fixed `0003 -> 0004 -> 0005` twice around restore-from-parent, and prove both Schema 6 inventories preserve the same 1,854 core rows and combined digest. Gate 5 repeated the exact-commit encrypted backup, created a no-compute Schema 5 recovery branch, blocked the old V1 database credential and migrated Production `main` in one transaction; post-migration parity is complete with no mismatches.
- Gate 5 adds the previously missing Production TTS scope. It pins `v2-8-3-production`, a dedicated `mimi-tts-production` service account and separate Production WIF pool/provider labels. Runtime availability additionally requires HTTPS, Vercel Production from Git `main`, `live`, `postgres-production`, Schema 6, accounting readiness and explicit Production target/access confirmations. Preview identities and `schema6-readiness` remain resting, so Production cannot silently reuse the accepted Preview WIF.
- Production AI has the independent `v2-8-3-production` execution scope. It requires `live`, HTTPS, Vercel Production on `main`, `NODE_ENV=production`, `postgres-production`, Schema 6, atomic accounting, explicit target/access/key/logging confirmations, a valid study-token secret, explicit Kill Switch state, and the initial four-attempt provider ceiling. Removing that ceiling is possible only with a separately accepted steady-state marker.

The Gate 1 items above are local guard contracts, not Production evidence. Gate 0B independently verified exact commit `2e6145386d018968f61a1bee1b6f897feebff627` on protected Preview: `SYD1`, 10-run navigation median/p95 `44.5/53ms`, data-ready median/p95 `52/62ms`, zero transition full-data GET, one queue POST, successful rating/rollback, zero provider call and zero observed runtime/browser error. No fresh remote 390px screenshot is claimed because the connected viewport override did not change the CSS viewport; responsive acceptance remains tied to the same exact commit's local 390/1280px evidence. Gate 3 Production backup/restore stays within its approved read-only/isolated scope; Gate 4 and later work still require fresh approval.

## Product Goal

Build a mobile-first vocabulary web app for PTE preparation. The app should make it easy to add new words during practice, preserve context, and review cards according to Spaced Repetition（间隔重复）and a practical Forgetting Curve（遗忘曲线）model.

The product should optimize for daily use:

- quick word capture
- low-friction flashcard review
- transparent scheduling
- safe persistence of personal study data
- easy export and backup
- calm daily separation between review and first learning
- optional evidence-backed lexical enrichment with mechanically bounded cost

## Planned Architecture

```text
app shell / routing
  -> word capture
  -> text file import
  -> import preview
  -> vocabulary list
  -> flashcard review
  -> review scheduler
  -> storage adapter
  -> import / export
  -> deployment boundary
```

## Planned Modules

### App Shell

Implemented as a Next.js App Router scaffold under `src/app`.

Responsibilities:

- mobile-first layout
- navigation between dashboard, study, review, library, practice lab, import, and settings views
- private-group study experience with future person switching

Current routes:

- `/`
- `/study`
- `/add`
- `/import`
- `/review`
- `/library`
- `/practice-lab`
- `/export`
- `/settings`
- `/api/study` for guarded server-backed daily-study commands

### Word Capture

Responsibilities:

- add word or phrase
- add one or more Chinese meanings, one or more examples, PTE context, and notes
- record self-rated rarity
- explicitly choose Recognition Vocabulary or Active Vocabulary at input time
- allow nullable soft tags such as PTE, IELTS, Listening, Writing, and Spelling Risk
- normalize duplicate candidates without losing original user input
- record `created_at` and timezone-aware dates automatically by default
- allow the user to modify added time when backfilling older words, while keeping system-maintained write/update timestamps
- do not ask for initial proficiency; new words start as `new`

Current route: `/import`, Single input. It saves manual vocabulary items into local browser storage, requires an explicit Recognition / Active track choice, accepts nullable tags, records device timezone automatically, and keeps `createdAt` system-maintained by default. `/add` remains as a compatibility route that redirects to `/import`.

### Batch JSON Import

Responsibilities:

- read `.json` files in the current Stage 7.9 import path
- accept pasted JSON through the same import parser
- require each batch item to declare `track` as `recognition` or `active`
- accept `tags` as an array, `null`, or omitted input normalized to `null`
- provide a JSON sample that can be given to conversation AI（对话式 AI）so the returned file can be directly read and stored by the app
- create an import preview before saving
- preserve row number and raw JSON fragment for correction
- report invalid JSON, unsupported track values, invalid tags, invalid rows, and duplicate candidates
- defer `.docx`, PDF, OCR, and complex document parsing to later stages

Current route: `/import`, Batch JSON import. It accepts `.json` files or pasted JSON, shows preview rows, reports total/new/duplicate/invalid counts, lets the user correct track / tags / fields before saving, and saves accepted candidates into a recorded import batch. The older text parser remains in code for backward compatibility, but the user-facing batch entry is JSON.

### Vocabulary Store

Responsibilities:

- persist vocabulary items
- preserve multiple examples for the same word when needed
- support search, filter, edit, archive, and export
- preserve import batch metadata for batch-created vocabulary items
- keep schema migration behavior explicit once a real database is introduced

Current route: `/library`. It reads from the current runtime snapshot and supports search, `All`, `New`, `In review`, Recognition, Active, Needs care, and Archived filters, plus edit, archive, restore, hard delete, and JSON batch rollback. `New` / `In review` is derived from retained profile evidence and stays separate from active/archived lifecycle state. Hard delete and rollback also remove matching review states and review events for the selected person. In Postgres runtimes, Stage 6B-P1-D routes lifecycle controls through `/api/storage/data`; Stage 5 daily learning uses the guarded `/api/study` path after Schema Version 6 and its dedicated token secret are separately enabled.

### Review Scheduler

Responsibilities:

- calculate review due time
- prioritize overdue cards
- adjust intervals from user feedback
- smooth backlog after missed study days
- expose scheduling decisions in a debuggable way
- treat the first review rating as the starting point for review state

Stage 8-D replaces the Stage 4 fixed interval table with Recognition-only FSRS-6 scheduling through `ts-fsrs`. The app stores exact `dueAt` timestamps for audit（审计）and compatibility, while Review queue eligibility compares local date buckets in the selected person's timezone（时区）so daily review is not blocked by the exact previous-review clock time. Embedding（向量嵌入）for semantic similarity, confusing pairs, and queue ordering remains future scope.

Stage 8-B installed `ts-fsrs@5.4.1` and added an isolated `src/lib/review/fsrs-recognition.ts` calibration adapter. Stage 8-C adds same-session repeat behavior: `完全忘记了` and `有点忘记了` record the attempt and requeue the word later in the same local Review session, while only `模糊记得` and `完全记得` count as session passes. Stage 8-D wires the real scheduler through `src/lib/review/scheduler.ts`, local review repository rebuild, and the Postgres repository path without changing the schema.

Current branch-V2 route: `/review?zone=review|new`. It resolves the selected person's Recognition Daily Plan and reads only the requested bounded zone. Tapping anywhere in the full muted card surround, including the inner card, or pressing `Space` reveals/hides the answer; buttons, links, editable controls, text selection and pointer drags remain protected. Handled Space prevents page scrolling. Once the answer is visible, the first Arrow key selects the first memory choice and later Arrow keys move within the visible non-wrapping 2-by-2 grid; `Enter` submits the selected enabled rating. Mouse click still submits immediately, while mouse hover and Arrow movement share one transient visual selection. Inputs, editable controls, ordinary focused controls, open dialogs, modifier combinations, and IME composition are excluded from global shortcuts. Keyboard selection reuses the accepted hover brightness/shadow without changing current transition, motion, or reduced-motion rules. Each newly active card requests pronunciation once; rerenders do not repeat it, a card that legitimately returns later receives a new activation, and the whole-entry sound button remains available for replay. Playback does not write scheduling data. The currently visible card refreshes its bounded prompt evidence without route or login navigation; an explicit expiry at rating time receives at most one transparent retry and shows `This card was refreshed.` after recovery. Every rating appends one Recognition event; only the first attempt in that Daily Plan-owned episode updates cross-day FSRS state. First ratings change the Library learning stage, while an unfinished failed entry remains recoverable in its original daily zone. `完全忘记了` and `有点忘记了` return the card later in the same session through a new prompt token. `回退1词` removes only the previous current-day Recognition event, rebuilds that entry from retained history, and receives replacement prompt evidence. The former Review-page whole-day control has moved to Study's accepted two-gate reset.

### Flashcard Review

Responsibilities:

- show front and back of a card
- collect four fixed ratings: 完全忘记了, 有点忘记了, 模糊记得, 完全记得
- write review events
- update review state
- avoid overwhelming the user with too many cards in one session

Current implementation uses the Stage 7 soft sage UI and Stage 4 responsive shell, exposes session/completion counts, card-body/explicit/Space answer reveal, guarded 2-by-2 Arrow selection plus Enter confirmation, calm four-tone mouse controls, browser pronunciation, example-word actions, bounded `回退1词`, same-session failed-card return, and a completion modal. The whole-day reset entry now lives on Study and requires both accepted confirmations.

### Review Settings

Responsibilities:

- store legacy `sessionLimit` for compatibility
- store `recognitionSessionLimit`
- store `activeSessionLimit`
- store local timezone used by review settings
- normalize invalid limits into safe bounds
- make Recognition review queue selection obey the saved Recognition limit

Current route: `/settings`. It saves four future defaults—Recognition/Active Review goals and New-word goals—plus timezone. Values are exact decimal integers from `0` through `2,147,483,647`; they do not rewrite an already-resolved plan. Study separately edits today's goals and uses optimistic plan-version checks.

### Storage Adapter

Development storage can use browser `localStorage`（本地浏览器存储）through `src/lib/vocabulary/local-storage-repository.ts`. The local migration path upgrades schema versions 1–5 to Schema Version 6. It retains the earlier person-scoped vocabulary/settings and dual-track fields, then adds daily defaults/plans, creation/reversal facts, explicit Review Profiles and Parameter Sets（参数集）, first-rating evidence, accepted AI lineage/drafts, and vocabulary relations. Existing vocabulary items still default to `learningTrack: "recognition"` when the older source lacks a Track. Existing V1 review rows migrate only to Recognition; no Active history is inferred. Production `main` now uses the same Schema Version 6 after the guarded Gate 5 migration and parity verification.

Stage 5B storage decision:

- Preferred provider: Neon Postgres through Vercel Marketplace.
- Fallback: Supabase Postgres only if Neon is unavailable or later requirements need Supabase-native auth（认证）, realtime（实时）, or storage（文件存储）.
- Rejected for new work: `@vercel/postgres`, because Vercel Postgres is no longer available for new projects.
- Database client initialization must be lazy in any future implementation, so `next build` does not require database environment variables at module evaluation time.
- Future database implementation must add `person_id` to every learning-data repository method and query.

Stage 5D local readiness:

- `db/migrations/0001_initial.sql` is the current SQL migration. It has been applied to the non-production development Neon database only.
- The draft uses UUID database primary keys, while local backup string ids are mapped during import.
- `db/LOCAL_BACKUP_TO_POSTGRES.md` documents v3 JSON backup import validation, id mapping, count checks, and failure behavior.
- `src/lib/storage/durable-repository-contract.ts` defines future adapter boundaries and requires explicit person context for learning-data operations.
- `src/lib/storage/durable-schema.test.ts` statically checks `person_id`, person-scoped foreign keys, review uniqueness, indexes, and absence of credential/package coupling.

Stage 6B-P1-B local schema draft:

- `db/migrations/0002_schema5_production_runtime.sql` is the current schema version 5 Production runtime migration draft.
- It adds `learning_track`, nullable `tags`, `meanings_zh`, `examples`, separate Recognition / Active review limits, JSON import source types, backup schema version 5 support, and database-level Active review row guards.
- It has been applied and validated only on the approved non-production development database. Production execution still requires explicit approval, an exact Production target, a Production-specific command guard, and the Stage 6B handoff ladder.

Stage 6B-P1-C local runtime / API contract:

- `src/lib/storage/runtime-mode.ts` accepts `local`, `postgres-preview`, and `postgres-production`.
- `postgres-preview` remains development / Preview only and is rejected in Vercel Production.
- `postgres-production` is accepted only when `VERCEL_ENV=production`.
- `/api/storage/health` can run a Production readiness probe without returning public table counts when `postgres-production` is configured.
- `/api/storage/data` can read/write through the guarded `postgres-production` runtime, while Preview writes still require the development / preview-only write flag and confirmation header.
- Browser runtime state now distinguishes `postgres-production` from `postgres-preview`.
- The runtime/environment contract has been validated with local unit tests and route mocks. Shared repository behavior has been validated against the migrated non-production development database, but the `postgres-production` route itself has not been exercised in Vercel Production.

Stage 6B-P1-D local repository parity:

- Postgres mappers and repository SQL now read/write schema version 5 vocabulary arrays, learning track, tags, JSON import source types, and separate Recognition / Active daily limits.
- `/api/storage/data` now routes hard delete, JSON batch rollback, reset-today Review, and one-word Review rollback mutations to Postgres repository methods.
- Postgres reset / rollback rebuilds replay remaining Recognition review events through the accepted Stage 8 scheduler and use Mimi's local timezone date bucket for reset-today selection.
- Library hard delete, JSON batch rollback, Review reset-today, and Review `回退1词` are no longer blocked purely because the current runtime is Postgres.
- This parity was first validated with local mapper, route mock, and static source tests, then exercised against the migrated non-production development database in Stage 6B-P1-F.

Stage 6B-P1-E local backup import version 5:

- `scripts/backup-import-plan.mjs` now accepts schema version 3 / 4 / 5 workspace backup files and preserves schema version 5 `learningTrack`, nullable `tags`, `meaningsZh`, `examples`, JSON import source types, and dual Recognition / Active daily limits.
- `scripts/backup-import-postgres.mjs` now has `--schema5-fixture` and schema version 5 insert SQL for `learning_track`, `tags`, `meanings_zh`, `examples`, `recognition_session_limit`, and `active_session_limit`.
- `test_fixtures/stage6b-p1e-schema5-backup.json` covers a JSON import batch with one Recognition item that has review state / event history and one Active item that has no review rows.
- Active Vocabulary review state / event rows are rejected during import planning before any database write attempt.
- This import path was first validated with local no-database dry runs and tests, then exercised against the migrated non-production development database in Stage 6B-P1-F.

Stage 6B-P1-F non-production database verification:

- `db/migrations/0002_schema5_production_runtime.sql` has been applied to the approved non-production development database only.
- `scripts/inspect-database-schema5.mjs` verifies schema version 5 columns, constraints, index, Active-review guard triggers, and counts without printing credentials.
- `scripts/verify-schema5-active-review-guard.mjs` verifies the database rejects direct review state / event writes for Active Vocabulary and rolls back the attempted rows.
- Schema version 3 and schema version 5 fixture transaction rollback trials both inserted expected rows and returned to zero rows after rollback.
- The guarded schema version 5 fixture commit path inserted the expected fixture rows, then `npm run db:cleanup-fixture:dev` removed them.
- `src/lib/storage/postgres/repository.integration.test.ts` verifies actual Postgres repository behavior against the migrated development database, including dual limits, schema version 5 vocabulary fields, Active review rejection, review rollback/reset, JSON import rollback, hard delete, and schema version 5 snapshot export.
- Final development database counts are zero for core learning tables and backup import tables.
- No Production database migration, Production import, Production env var change, Vercel command, Neon management command, or Production deployment has been performed.

Stage 6B-P1-G-A / P1-G-B / P1-G-C-0 / P1-G-C-1 / P1-G-C-2 / P1-G-C-3 Production execution handoff:

- `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md` records the accepted P1-F evidence and separates documentation, read-only account inventory, human decisions, and live Production actions.
- The 2026-07-10 initial-data decision requires a separately confirmed empty Production target, copies no development data, skips formal first-launch backup import, and begins formal data creation only after cloud-backed V1 launch.
- A database with zero `people` rows returns the empty/default Mimi workspace shape; the first valid Postgres mutation can create the first durable learner row. Production acceptance must verify empty-state read, first real write, refresh persistence, and `person_id` separation without silently falling back to browser-local runtime.
- Development-only database commands must not be repointed at Production. Formal execution needs a Production-specific exact-target guard and independent approval.
- P1-G-B confirmed Vercel team/project identity, `main` as Production branch, a Ready current-commit Preview, the historical non-official Production deployment, zero Production env vars, Development / Preview-only Neon keys, and a publicly reachable canonical domain.
- No Neon Production target is configured. Stage 5F / 5J / 5K / 5L / 5N and P1-F prove the existing Development / Preview Neon resource supports migration, read, write, cleanup, Preview UI persistence, and schema version 5 repository behavior.
- The attempted Vercel SSO provider-management route displayed an email-activation screen, but prior evidence does not support treating email activation as a prerequisite for the existing resource. Later dashboard evidence established branch/recovery capability, Stage 8.5 selected the policy topology, and P1-G-C-4 documented the branch/environment execution sequence. P1-G-C remains open for separately approved live branch/environment actions, access-boundary choice, and merge/deployment/write-acceptance decisions.
- P1-G-C-0 adds `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md` as the decision packet for provider-management evidence, Production target, access boundary, merge path, deployment mechanism, Production write acceptance, and treatment of the historical non-official Production deployment. It is documentation only and does not authorize live provider inspection, env var changes, database migration, merge, deployment, or Production writes.
- P1-G-C-1 adds `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md` as the read-only Vercel Marketplace provider supplement. It confirms the Neon resource is owned, available, Free-plan, and connected only to Development / Preview, but it still does not expose Neon branch names, database labels, role labels, restore window, or an exact empty Production target.
- P1-G-C-2 adds `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md` as the evidence route decision. It recommends human dashboard evidence as the next safest route and defines the metadata checklist plus redaction rules. It does not inspect provider dashboards or close target selection.
- P1-G-C-3 adds `plan_docs/PLAN_V1_STAGE6B_P1_G_C_3_DASHBOARD_EVIDENCE.md` as the approved read-only Neon dashboard evidence capture. It confirms the current resource has only one `main` default branch, `neondb` / `neondb_owner`, no child branches, no visible distinct Production target, and a 6-hour restore window. Stage 8.5 later uses this evidence to close the policy topology.
- Stage 8.5 adds `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md` as the canonical lifecycle policy. It selects the existing Neon project, future Production `main`, long-lived non-production `staging`, and temporary logical `preview/*` children of `staging`.
- P1-G-C-4 adds `plan_docs/PLAN_V1_STAGE6B_P1_G_C_4_BRANCH_ENVIRONMENT_EXECUTION_DECISION.md` as the documentation-first branch/environment execution decision. It records the live sequence for verifying clean schema-ready `main`, creating `staging`, moving Development / Preview away from `main`, preventing managed Preview branches from deriving from Production `main`, reserving `main` for Production, and avoiding blind reruns of already-applied migrations. No branch or environment was changed by Stage 8.5 or P1-G-C-4.
- P1-G-C-5 adds `plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md` as the explicitly approved live release record. `staging` now exists as a long-lived child of clean schema-ready `main` and is the Neon Default; Development / Preview resolve to `staging`, Production resolves to `main`, and the two environments use distinct credentials. The Marketplace resource remains owned but is disconnected from this Vercel project after retargeting failed to prove the required separation. Production application and storage routes are guarded by application-level Basic Auth for the private trusted-group phase; this does not turn `person_id` into authorization.
- Formal Production visual acceptance keeps dashboard/library copy cloud-neutral. Runtime-specific status comes from the guarded storage APIs; user-facing empty-state and scheduler descriptions must not claim browser-local storage when `postgres-production` is active.
- Stage 6B-P1-G-C-5 completed the formal V1 runtime cutover: `main` is the Production data branch, `staging` is the non-production/default branch, and the canonical application is protected by Basic Auth. A separately approved password-only rotation rebuilt the current `main` artifact as Ready Production deployment `dpl_Af25vm8v896iAgzNbb5whyAmLF2v`; authenticated checks still report `postgres-production` and schema version 5. Its launch-time read-only snapshot recorded 1 person/settings state and zero vocabulary/import/review rows; that snapshot is historical evidence and must not be used as the current Production inventory. Future Production credentials, writes, migrations, backups, or access-model changes remain Tier 3 work.

Stage 5E execution gate:

The Stage 5E–5N and Stage 5H–5I notes below are historical implementation evidence. Their then-current statements about Development-only Neon, browser-local default runtime, disabled Production Postgres, and a non-official deployment are superseded by P1-G-C-5.

- Current operational, target-capability, and working tiers are all Tier 3. Future Production, credential, migration, deployment, or destructive-data work stays at Tier 3 and requires the approval boundary recorded in `AGENTS.md`.
- The user must explicitly approve Vercel project, Vercel account scope, Neon account/project path, environment variable handling, package installation, migration execution, backup import, and deployment scope.
- A fresh JSON backup from `/export` is required before any remote import.
- Migration must be run against a non-production branch first.
- Any `person_id` leak, count mismatch, missing env var, wrong project, failed validation, or user pause request stops execution.

Stage 5F development / preview bootstrap:

- Vercel project: `anorias-projects/words-learning-app-for-mimi`.
- Neon resource: `words-learning-app-for-mimi-neon`, development / preview only.
- Local env file: `.env.local`, ignored by Git and never committed.
- Env example file: `.env.example`, placeholder names only.
- Database packages: `@neondatabase/serverless` and `dotenv-cli`.
- Database commands:
  - `npm run db:migrate:dev`
  - `npm run db:inspect:dev`
- Deployment status: Vercel currently has an active non-official Production deployment from branch `V1`, a manual verified Preview deployment, and a clean Git integration Preview deployment. Standard `vercel deploy` without `--prod` produced `target=preview`.
- Production migration, production deployment, runtime storage cutover, and authentication remain out of scope until later explicit approvals. First-launch Production import is intentionally skipped under the P1-G-A empty-start decision.

Stage 5H runtime Postgres adapter design:

- Adapter must be server-only.
- App runtime remains `localStorage` by default.
- Development / preview can opt into Postgres after adapter tests.
- Production Postgres runtime remains disabled until formal V1 Production and access-boundary planning.
- Public write endpoints must not be exposed on the current non-official Production deployment.

Stage 5I runtime Postgres adapter implementation:

- `src/lib/storage/runtime-mode.ts` keeps `localStorage` as the default runtime and accepts only `local` or `postgres-preview`.
- `src/lib/storage/postgres/client.ts` lazily creates a Neon `Pool` only after runtime checks pass.
- `src/lib/storage/postgres/mappers.ts` maps snake_case Postgres rows into current domain types.
- `src/lib/storage/postgres/repository.ts` implements `DurableRepositoryPort` for people, review settings, vocabulary, imports, review queue, review events, and review states.
- `/api/storage/health` is a read-only development / preview health route.
- `/api/storage/smoke` is an opt-in write-path smoke route requiring `MIMI_STORAGE_RUNTIME=postgres-preview`, `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true`, and `x-mimi-storage-smoke: allow-dev-preview-write`.
- The Stage 5I implementation does not switch the UI runtime from browser `localStorage`.

Stage 5J read-only verification:

- `MIMI_STORAGE_RUNTIME=postgres-preview` is configured in Vercel Preview only.
- New verified Preview deployment: `dpl_CFeC2VwRKtMSAjBiGGtyStsFw2tr`.
- Preview health URL: `https://words-learning-app-for-mimi-dbkkkow3d-anorias-projects.vercel.app/api/storage/health`.
- Preview health returned `status=ready`, runtime `postgres-preview`, and zero counts for `people`, `vocabularyItems`, and `reviewEvents`.
- Development database inspection after verification still showed zero core business rows.
- `/api/storage/smoke` was not called and no write flag was enabled.

Stage 5K controlled write smoke:

- `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` was temporarily configured in Vercel Preview only.
- Smoke-enabled Preview deployment: `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv`.
- The smoke route wrote one fixed smoke person, one vocabulary item, one review state, one review event, and one review settings row.
- The smoke person id is `00000000-0000-4000-8000-0000000005f1`, slug `storage-smoke`.
- Person-scoping checks confirmed the smoke vocabulary, review state, and review event share the smoke `person_id`.
- `MIMI_ENABLE_STORAGE_SMOKE_WRITES` was removed from Preview after the write.
- Current verified disabled Preview deployment: `dpl_BJn1pFAbLiiY4LgCyThKx2vDTSar`.
- Current disabled Preview URL: `https://words-learning-app-for-mimi-7bzktk5uc-anorias-projects.vercel.app`.
- `/api/storage/smoke` on the disabled Preview returns reason `smoke-writes-not-enabled`.
- Smoke-enabled Preview deployment `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv` was removed.
- Production env vars, Production deployment, backup import, UI runtime cutover, and smoke row cleanup were not performed.

Stage 5L backup import harness and smoke cleanup:

- `scripts/backup-import-plan.mjs` builds a schema version 3 JSON backup import plan without database access.
- `scripts/backup-import-postgres.mjs` provides guarded fixture dry run, smoke cleanup, file-backed import dry run, rollback trial, guarded development commit, and fixture cleanup commands.
- `scripts/backup-import-plan.test.mjs` covers fixture mapping, metadata count rejection, and cross-person review reference rejection.
- New commands:
  - `npm run backup:dry-run:fixture`
  - `npm run backup:dry-run:schema5-fixture`
  - `npm run db:cleanup-smoke:dev`
  - `npm run db:import-fixture-trial:dev`
  - `npm run db:import-fixture-commit:dev`
  - `npm run db:cleanup-fixture:dev`
- File-backed user backup command shape:
  - `STAGE5F_DATABASE_TARGET=development dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file <backup.json> --dry-run`
  - `STAGE5F_DATABASE_TARGET=development dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file <backup.json> --trial-rollback`
  - `STAGE5F_DATABASE_TARGET=development dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file <backup.json> --commit --i-confirm-development-import`
- Stage 5K smoke rows under person id `00000000-0000-4000-8000-0000000005f1` were cleaned from the development database.
- Fixture transaction trial inserted and rolled back `people=1`, `import_batches=1`, `vocabulary_items=1`, `review_states=1`, `review_events=1`, `review_settings=1`, `backup_imports=1`, and `backup_import_mappings=6`.
- Stage 5M file-backed fixture dry run and rollback trial inserted and rolled back the same shape, using `test_fixtures/stage5m-backup.json`.
- Stage 5M guarded file-backed commit required an empty development database and explicit `--i-confirm-development-import`.
- Stage 5M local UI runtime verification read the committed fixture through `/api/storage/data`, wrote one manual item through the same route, and then cleaned the fixture rows.
- Final development database inspection reports zero rows in core study tables.
- Production env vars, Production deployment, Production import, and Vercel Preview env mutation were not performed.

Stage 5M UI runtime cutover:

- Browser `localStorage` remains the default runtime.
- `useVocabularyData()` attempts `/api/storage/data` and switches to `postgres-preview` only when the server route reports ready.
- In `postgres-preview`, UI writes require mutation metadata and are sent to `/api/storage/data`.
- The Postgres UI write path is disabled unless `MIMI_ENABLE_STORAGE_UI_WRITES=true`.
- The API requires `x-mimi-ui-storage-write: allow-dev-preview-ui-write` for mutations.
- Vercel Production rejects the Postgres UI runtime.
- If the Postgres database is empty, the first write can create the default `Mimi` person; if people already exist, mutations require a valid selected database UUID.
- `/export` can still download the current runtime snapshot. JSON restore remains browser-local only; in `postgres-preview`, formal backup import should use the Stage 5M script path.

Stage 5N-A Preview read-only verification:

- Deployment: `dpl_HpcPDb5B2su2BLPWJVsYZjPDnWSg`.
- Preview URL: `https://words-learning-app-for-mimi-kb5b08c5v-anorias-projects.vercel.app`.
- Vercel inspect reported `target=preview`.
- Preview env still contains `MIMI_STORAGE_RUNTIME` and Neon variables, and still lacks `MIMI_ENABLE_STORAGE_UI_WRITES`.
- Production env remains empty.
- Preview storage health returned zero counts.
- Preview UI write attempt was blocked before request-body parsing because UI writes are disabled.
- Final development database inspection still reports zero rows in core study tables.

Stage 5N-B Preview controlled UI write smoke:

- Temporary write-enabled Preview deployment: `dpl_JgKNc9zuAqgMsy5w13gbZoqkEhnY`.
- Temporary write-enabled URL: `https://words-learning-app-for-mimi-8r2cn2jko-anorias-projects.vercel.app`.
- Controlled write created one person, one vocabulary item, and one review settings row.
- Smoke vocabulary item text: `stage five n preview ui write`.
- Cleanup command: `npm run db:cleanup-stage5n-ui-smoke:dev`.
- Cleanup removed one vocabulary item, one review settings row, and one person.
- Disabled Preview deployment after cleanup: `dpl_Athg2hWZK1gV6ereWdbYk1WXG58C`.
- Disabled Preview URL after cleanup: `https://words-learning-app-for-mimi-6v8azqoaa-anorias-projects.vercel.app`.
- `MIMI_ENABLE_STORAGE_UI_WRITES` was removed from Preview after the write.
- The temporary write-enabled deployment was removed.
- Production env remains empty and existing non-official Production deployment remains untouched.

### People And Person Switching

The app is intended for a small trusted private group, not only one learner. The future durable model should include:

- `people`
- `vocabulary_items.person_id`
- `import_batches.person_id`
- `review_states.person_id`
- `review_events.person_id`
- `review_settings.person_id`
- `backup_imports.person_id`
- `backup_import_mappings.person_id`

There is no accepted password, OAuth, or credential-isolation requirement yet. A future UI can offer a simple person switch. Every durable read/write must filter by selected `person_id`. This prevents mixing study histories while keeping the private-project workflow lightweight.

Current local implementation:

- `VocabularyData.schemaVersion` is 5.
- Local data includes `people` and `selectedPersonId`.
- Vocabulary items, import batches, review states, and review events include `personId`.
- Vocabulary items include required `learningTrack`, nullable `tags`, `meaningsZh`, and `examples`.
- Legacy `meaningZh` and `example` remain as first-entry compatibility display fields for existing views and Postgres preview mapping.
- Review settings are stored in `settingsByPerson` with legacy `sessionLimit`, `recognitionSessionLimit`, and `activeSessionLimit`.
- `/settings` includes a minimal person switch and add-person control.
- Local repository helpers filter active, archived, all-library, duplicate detection, review queues, and review writes by selected person.
- Schema version 1 / 2 / 3 / 4 local data migrates into version 5 by assigning existing data to the default person, defaulting existing words to Recognition Vocabulary with `tags: null`, and deriving `meaningsZh` / `examples` from legacy `meaningZh` / `example` strings.
- JSON backup export uses version 5; JSON backup restore still accepts version 2 / 3 / 4 backups and migrates them to version 5.

### Import And Export

Responsibilities:

- export vocabulary and review data to CSV or JSON
- support user-facing single vocabulary input and batch JSON import from `.json` files or pasted JSON
- defer `.docx` and PDF import until a later document-parsing stage
- protect against duplicate imports, malformed rows, and timezone drift

Current route: `/export`. It can download a complete schema version 5 JSON backup with metadata（元数据）, download a vocabulary CSV that includes `learningTrack`, `tags`, `meaningsZh`, and `examples`, parse JSON backup files locally, show restore counts, and restore schema version 2 / 3 / 4 / 5 data after explicit confirmation when runtime is browser-local. JSON restore rejects malformed files, unsupported backup shapes, incomplete required fields, invalid review references, unsupported track / tag values, invalid multi-meaning / multi-example fields, missing metadata counts, and V1-impossible Active Vocabulary review state / review event records before mutating local browser storage. In `postgres-preview`, UI restore is disabled and formal backup import uses the guarded Stage 5M script path.

V2.1 duplicate repair:

- `plan_docs/PLAN_V2_1_DUPLICATE_IMPORT_DEDUPLICATION.md` is the accepted local child plan for repeated vocabulary and `Batch imported` rows.
- Preview remains parse-only. Duplicate and invalid Preview rows cannot be selected, the save action has an immediate pending lock, and local/Postgres import commits recompute status against the current selected-person snapshot. Zero-new imports create no batch.
- Manual add, surface-text edit and import share the identity `(person_id, normalized_text)`. Postgres rechecks that identity inside serialized transactions; the forward-only `0006_v2_1_vocabulary_unique_normalized_text.sql` adds the final unique index only after a zero-duplicate precheck.
- Library builds a deterministic selected-person cleanup plan. It keeps the item with the strongest review/content evidence, displays exact destructive counts and binds confirmation to the current keeper/loser fingerprint. Postgres recomputes that plan inside the deleting transaction.
- Loser items use existing hard-delete propagation: review state/events and item-scoped AI records are removed, AI run source references become `null`, and historical creation facts remain. Independent FSRS histories are not merged.
- Empty import-batch audit rows remain in storage/backups but are hidden from normal Library history after they own no retained item.
- The implementation passed protected Preview human acceptance and is live from `main`. The completed Production gate is `plan_docs/PLAN_V2_1_PRODUCTION_DUPLICATE_REPAIR_RELEASE.md`.
- That gate adds source-pinned Neon target discovery, Schema 6 encrypted backup/isolated restore evidence, aggregate duplicate inventory and exact `0006` migration guards. The connection URI, API key and private backup identity stay outside output and Git.
- Long-lived Staging has applied the pinned `0006`, verified the unique index and removed only the fixed V2.1 synthetic person. Its retained baseline is 1 person / 8 items / 14 review events with zero duplicate groups.
- Production completed the exact separately confirmed cleanup: 75 duplicate identities and 1,204 removable copies became zero duplicate identities and 282 retained unique items. `0006` removed the historical non-unique index and installed the unique index only after the zero-duplicate check. Library now shows 282 total, four non-empty historical batch rows and no cleanup action; all 38 batch audit rows remain stored.
- Both repository-external Production `age` backups passed isolated PostgreSQL 17 restore: the pre-change 222,110-byte archive protects the 1,486-item baseline, while the post-change 180,803-byte archive protects the 282-item unique state. Forward repair remains the default after cleanup/migration.

### Backup Format

Stage 5A uses a local backup envelope:

- `format`
- `backupVersion`
- `metadata`
- `data`

The `data` field contains the current `VocabularyData` schema version 5 shape. The metadata records app name, exported time, timezone, schema version, and counts for people, vocabulary items, archived items, import batches, review states, and review events. Schema version 5 vocabulary items include `learningTrack`, `tags`, `meaningsZh`, and `examples`, while legacy `meaningZh` / `example` remain for compatibility. Review settings include separate Recognition / Active daily limits. Recognition review states may carry FSRS `difficulty` and `stability`; Active Vocabulary must round-trip without review state or review event records in V1.

### Deployment Boundary

Formal Production remains behind application Basic Auth. Vercel Production uses `postgres-production` against Neon `main`; Development / Preview use Neon `staging` and must not promote non-production business rows. `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md` is the current cutover source of truth; the V1 release plan is retained as historical rollback evidence. Production is in Gate 5 maintenance with `main` already at Schema 6, while exact Git `main` readiness/live deployment and runtime acceptance proceed.

### Data Lifecycle And Environment Topology

`plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md` is the canonical cross-stage policy. `plan_docs/PLAN_V1_STAGE6B_P1_G_C_4_BRANCH_ENVIRONMENT_EXECUTION_DECISION.md` is the documentation-first execution decision for this topology.

```text
words-learning-app-for-mimi-neon
├── main                 -> Production; real durable study data only
├── staging              -> long-lived non-production baseline; test data only
└── preview/*            -> temporary branches derived from staging
```

- This single-project topology is intentionally proportionate to the current private trusted-group app. It favors operational convenience and future adaptability while keeping branch roles and environment-variable scope explicit.
- `main` is Production. `staging` exists as the long-lived non-production/default branch, and Development / Preview no longer point to `main`.
- `staging` is the stable Development / pre-production database baseline. It contains only synthetic, fixture, or disposable test rows.
- Logical `preview/*` branches derive from `staging`, use test data only, close with their review/PR, and have a seven-day cleanup backstop. Provider-generated labels may differ.
- P1-G-C-5 completed the branch separation; managed per-feature Preview branch automation remains deferred.
- Versioned code and migrations move across environments; non-production business rows do not promote into Production.
- Production began empty. Real learning data and future accepted V2 AI-derived data stay in Production.
- After formal data begins, the V1 target is one encrypted logical backup per week plus an additional backup before high-risk Production data changes. Increase frequency when the product leaves the trusted-group phase or its recovery/AI-data requirements tighten.
- A separate Neon Production project remains a future upgrade option when authentication, unfamiliar users, multiple maintainers, higher-sensitivity data, or stricter recovery/blast-radius requirements appear.

## Draft Data Model

The schema listing below originated as the development database model. Schema Version 6 is live on Production `main` and non-production `staging`; the V2/V2.1 cutover records and V2.2 `0007` release evidence supersede the historical V1 C5 snapshot.

Stage 5F first applied `db/migrations/0001_initial.sql` in non-production. Later approved V1 execution verified the already-present schema on `main` / `staging` and did not blindly rerun non-idempotent migrations.

Stage 7.9 updated browser-local and backup JSON to schema version 5. `db/migrations/0002_schema5_production_runtime.sql` later added `learning_track`, `tags`, `meanings_zh`, and `examples` to Postgres and is present in the verified live V1 schema. Any V2 change begins with a new migration; `0001` and `0002` remain immutable historical migrations.

### Vocabulary Item

- `id`
- `person_id`
- `surface_text`
- `normalized_text`
- `language`
- `meaning_zh`
- `context`
- `notes`
- `rarity_score`
- browser-local schema version 5 field: `learningTrack`
- browser-local schema version 5 field: nullable `tags`
- browser-local schema version 5 field: `meaningsZh`
- browser-local schema version 5 field: `examples`
- `source`
- `import_batch_id`
- `created_at`
- `updated_at`
- `system_created_at`
- `timezone`
- `archived_at`

### Import Batch

- `id`
- `person_id`
- `source_type`
- `file_name`
- `created_at`
- `total_rows`
- `accepted_rows`
- `duplicate_rows`
- `invalid_rows`

### Review State

- `id`
- `person_id`
- `vocabulary_item_id`
- `status`
- `due_at`
- `last_reviewed_at`
- `review_count`
- `lapse_count`
- `interval_minutes`
- `difficulty`
- `stability`
- `updated_at`

### Review Event

- `id`
- `person_id`
- `vocabulary_item_id`
- `reviewed_at`
- `rating`
- `previous_due_at`
- `next_due_at`
- `previous_interval_minutes`
- `next_interval_minutes`
- `elapsed_ms`

### Review Settings

- `person_id`
- `session_limit`
- `timezone`
- `updated_at`

### People

- `id`
- `display_name`
- `slug`
- `is_active`
- `created_at`
- `updated_at`

### Backup Import

- `id`
- `person_id`
- `source_file_name`
- `source_exported_at`
- `imported_at`
- `schema_version`
- `item_count`
- `review_event_count`
- `notes`

### Backup Import Mapping

- `id`
- `person_id`
- `backup_import_id`
- `entity_type`
- `source_id`
- `target_id`
- `created_at`

## Safety And Privacy

- Study data is private by default.
- Durable study data should be separated by `person_id` for each private learner.
- Person switching is convenience separation, not security isolation.
- Current V2 contains no analytics or tracking. Its only cloud AI/TTS data-sharing paths are the bounded, disclosed Gemini enrichment/context and Google Cloud TTS routes defined in the canonical V2 plans; a new provider or outbound field requires separate approval.
- Credentials and database URLs must stay out of source control.
- Export should be available before the project depends on production-only persistence.
- Paid-provider copy must disclose limited provider safety / abuse / legal retention and must not claim Zero Retention.
- No V2 microphone audio or Speech Recognition data is collected or sent under the accepted baseline.
- Shared Basic Auth plus `person_id` remains trusted-group access and data separation, not confidential per-person authorization.

## Known Edge Cases

- duplicate words with different meanings
- phrase cards and fixed collocations versus single-word cards; each vocabulary entry counts once in distinct daily metrics
- `.txt` files with mixed delimiters
- JSON import files with unsupported `track` values
- JSON import files with unsupported or non-array `tags`
- invalid, empty, or duplicated import rows
- case, punctuation, plural forms, and verb tenses
- missed review days and large overdue backlog
- local migration from version 1 to version 2
- local migration from version 1 / 2 to version 3
- local migration from version 1 / 2 / 3 to version 4
- local backup string ids needing UUID mapping during future Postgres import
- self-rated rarity that conflicts with review performance
- backfilled added time that differs from actual write time
- timezone changes between Australia and other regions
- accidental deletion or destructive migration
- invalid, stale, or manually edited JSON backup files
- review history entries pointing to missing vocabulary items
- accidental cross-person reads or writes if `person_id` is not filtered
- person switching without password isolation being misunderstood as security
- offline or slow mobile usage
- a goal larger than the available queue or large enough to cause unbounded allocation if pagination is missing
- recommendation snapshots across local-midnight or timezone changes
- same entry receiving repeated attempts but only one distinct actual count
- Track changes after a Review Profile already has history
- duplicate AI suggestions that already exist as vocabulary entries
- AI quota replay, concurrent double submission, provider failure, or stale Cache lineage
- mobile navigation absence between current `md` and `lg` breakpoints

## Validation Boundary

Current local validation commands:

- `npm run governance:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run backup:dry-run:fixture`
- `npm run backup:dry-run:schema5-fixture`
- `npm run backup:dry-run:schema6-fixture`
- `npm run build`
- `npm audit --json`
- `npm run dev` plus browser smoke check

`db:inspect:dev` and `db:inspect:schema5:dev` are legacy environment-specific checks for their older Schema 3 / 5 Development baselines. They are not a valid current-schema gate when `.env.local` targets Schema 6 `staging`. The V2-8-2 Staging gate is `npm run v2:8-2:db:inspect`, executed only with its exact guarded non-Production target identity.

Current unit tests cover the V1 repository/scheduler/backup boundaries, Schema Version 6 migration and backup parity, V2 AI contracts, Stage 3.1 interactions, Stage 4 mobile contracts, and the V2-5/5.1/6 daily and Active engines. Stage 5 coverage includes timezone-safe 23/25-hour day windows, exact free goals, Track-separated metrics/plans, separate queue selection, first-rating learning stage, reset/rebuild and Active fail-closed behavior, opaque token tamper/expiry checks, browser-local operational-data exclusion, strict API routing/auth gates, bounded rollback routing, and guarded keyboard control. Stage 5.1 coverage adds first-attempt anchors, raw failure retention, direct-new and mature scheduling cases, pass-only actuals, failed-only refresh recovery, failure-priority cursor pages, timezone-overlap plan ownership, rollback/reset replay, and shared local/Postgres policy checks. Stage 6 covers independent Active parameters, the same first-attempt scheduling rule, three practice modes, structured outcomes, prompt binding, two-profile reset, and Track transition. Stage 7A covers strict resting AI routes, local/Gemini lineage separation, deterministic bounded fixtures, editable acceptance, exact context spans, accepted-only backup, source-edit/delete/rollback lifecycle, provider timeout, and dormant global accounting. V2-7B-1 covers Disclosure session evidence, canonical request hashes, Idempotency/Cache ordering and ownership, provider result categories and usage reconciliation, source revalidation, transactional formal actions, provider-off default routing, and formal/local UI separation. V2-7B-2 adds `ai-disclosure-v3`, exact localhost activation, two-attempt accounting, pinned-model lineage, real Replay/Cache/cap/Kill Switch evidence, and disposable Schema 6 inspection. V2-8-1 adds DST-safe local-date offsets, distinct passing entries versus attempts, current state/Track/Parameter-Set isolation, independent FSRS Retrievability, zero-goal behavior, and accessible Dashboard UI contracts. V2-8-1.1 adds repository-wide removed/preserved learner-copy checks, collapsed technical examples, and natural fixture display names with technical IDs retained. V2-8-2 adds exact protected-Preview activation, guarded Staging identity/migration inspection, and Preview-global accounting coverage. V2.2 adds legacy/current parameter replay, matching-profile backup/import checks, constraint-only `0007`, whole-surface card tapping, one-shot autoplay, exact source routing, cancellation, and visible autoplay-policy failure coverage. The final candidate suite passes 98 files / 607 tests with the Postgres integration file/test skipped. Pinned `0007` completed on Staging and Production with unchanged migration-time table digests. Later validation should cover:

V2-8-2.1 supersedes the earlier suite-count snapshot above: current validation passes 71 files / 403 tests, with the existing Postgres integration file/test skipped. It adds persistent-Provider, request-coalescing, mutation-order, delayed Today, server-clock, selected-person fast-path, timing-header, and `syd1` contracts. Local Production-build browser acceptance at 390 and 1280 px used a browser-only local response stub and repository fixture, observed one bootstrap data GET plus no transition GET, and reported no overflow, framework overlay, warning, or error. Gate 0B now confirms the protected exact deployment's `SYD1` placement and warm data-ready median/p95 `52/62ms`; it does not claim a new remote 390px capture.

V2-8-3 Gate 1 adds focused local coverage for cutover-mode and Basic-Auth ordering, old-client mutation refusal, non-empty Schema 5/6 inventory and parity, exact target/action/project guards, pinned migration digest, secret-free manifest, paired rollback readiness, Production AI fail-closed behavior and the four-attempt ceiling. Final local validation passes 13 focused files / 138 tests and 77 full-suite files / 484 tests, with the existing Postgres integration file/test skipped. Lint, typecheck, all three backup dry-runs, manifest-template generation, Production build, Tier 3 governance and diff checks pass; independent read-only re-audit found no remaining P0/P1/P2. These local results are not Production evidence.

V2-8-2.2 supersedes only the current suite-count and forward-migration details: 11 focused files / 104 tests and the full 80 files / 506 tests pass, with the existing Postgres integration file/test skipped. Lint, typecheck, all three backup dry-runs, the two-hash cutover manifest template, script syntax and Production build pass. HTTP checks returned 200 for Home, Settings and Review on an isolated local-storage server. No automated browser screenshot or subjective browser-voice quality claim is made because the optional browser CLI was unavailable.

- duplicate card behavior
- empty deck behavior
- timezone scheduling
- browser-level download and restore interaction checks
- cross-person data separation once Neon persistence is implemented
- Production database migration dry run once the Production target and Stage 6B execution plan are explicitly approved
- embedding or FSRS migration safety when those later stages are explicitly approved
- Production provider/accounting integration after later release work is separately approved

## Documentation Responsibility

- `README.md` is the user-facing repository entrance. It leads with the product purpose, intended learners, daily experience, current V2.2 capabilities, private-access/privacy boundary and data control in a form suitable for someone seeing the repository for the first time. Internal release chronology, migration evidence, provider accounting, deployment identities and exhaustive plan indexes stay in their canonical technical records. README keeps only a compact developer Quick Start and documentation map.
- `ARCHITECTURE.md` owns system structure, data models, runtime boundaries, edge cases, and validation expectations.
- `plan_docs/` owns stage scope, decisions, execution gates, and detailed release evidence. `plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md` is the canonical source for the completed isolated V2-1 contract; later stage documents must cite it under `Derived from` rather than redefining its rules as peer plans.
- `CHANGELOG.md` owns chronological change history.
- `governance/AI_AGENT_LOG.md` owns human-AI execution, validation, and safety records.
- Historical Preview URLs, deployment ids, migration commands, credential procedures, and provider evidence should stay in their specialized documents instead of accumulating in the README.
