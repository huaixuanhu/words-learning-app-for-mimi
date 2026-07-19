# Words Learning App For Mimi V2-8-2.1：V2 Runtime Performance Stabilisation

Created: 2026-07-19 AEST
Last updated: 2026-07-19 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md` 的 `V2-8 Dashboard Insights And Release Gate`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE8_2_STAGING_PREVIEW_RELEASE_REHEARSAL.md`
- `plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md`
- `plan_docs/PLAN_V2_STAGE5_1_DAILY_EPISODE_SCHEDULING_REPAIR.md`
- `plan_docs/PLAN_V2_STAGE6_ACTIVE_PRACTICE_ENGINE.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- 用户在 2026-07-19 对 V2-only performance work（仅 V2 性能工作）的确认：不修复、不回移、不重新部署 V1；以 V2 即将替换 V1 为前提，让 V2 达到持续使用时的流畅状态

Scope:

- V2 only（仅 V2）。

Non-Scope:

- V1 application patch、V1 backport（回移）、V1 redeployment 或 V1 database change。
- 本计划原始本地实现范围不含 Production deployment、Production database migration、Production data write、Production secret、Preview redeployment 或远程环境修改。后续 V2-8-3 Gate 0B 以独立批准完成了 exact-commit protected Preview 验证；它没有扩大本计划的实现范围。
- Schema Version 6、JSON backup version 3、AI provider、AI quota、authentication、Motion、transition timing 或 reduced-motion 行为修改。

Exit criteria:

- 首次数据可用后的页面切换持续复用已加载词库，不反复回到空白或 Loading workspace。
- 普通 V2 写入与评分完成后直接使用 authoritative response / delta（正式返回值 / 变化集），不立即重复 GET 整份工作区。
- 当日计划已存在时，进入 Recognition / Active queue 不先发送额外的 client `resolveToday`；服务端不打开空 transaction 或读取第二份相同快照。
- focused/full validation、Production build、React review 与本地 browser flow 通过，且 FSRS、Daily Episode、Track isolation、Motion、phone layout、AI gate、Schema 与 backup 无回归。
- 原始本地阶段未经另行批准不 redeploy protected Preview；本地完成状态与后续 V2-8-3 Gate 0B 的 `syd1` / latency evidence 继续分开记录。

Consumer / next stage:

- Future derived plan: `V2-8-3 Production Backup, Migration And V2 Cutover`

Document nature:

本文件是完成 V2-8-2 后、进入 V2-8-3 前的插入式派生计划。它修复已经在真实 V1 / V2 使用中暴露出的等待问题，但只在 V2 分支实现。V1 的慢速现象仅作为发展履历与诊断证据保留，不形成 V1 修复工作。

Current operational tier: Tier 3

Target capability tier: Tier 3

Working tier: Tier 3

Status: complete locally on 2026-07-19; the separately approved V2-8-3 Gate 0B exact-commit protected Preview verification also completed on 2026-07-19.

## 1. Confirmed Baseline And Root Causes

2026-07-19 的同一浏览器会话基线显示：

- V1 首次可用约 `1.95s`，Home → Library 约 `3.06s`；
- V2 protected Preview 首次可用约 `3.21s`，warm reload（温热重载）约 `2.93s`，Home → Library 约 `3.07s`；
- V2 测试资料只有 5 个词条，仍接近 V1 的 125 个词条表现，因此等待并非由词条数量单独造成。

已确认的主要原因：

1. 修复前的 V2-8-2 Preview Functions 运行在 `iad1`，长期 Neon `staging` 位于 AWS `ap-southeast-2`；每次 server request（服务端请求）需要跨区域访问 Sydney 数据库。后续 Gate 0B exact deployment 已确认改为 `SYD1`。
2. 每个页面组件各自建立 `useVocabularyData()` 状态；App Router 页面切换后会重新 GET 整份 workspace snapshot（工作区快照）。
3. Postgres 写入已经返回 authoritative snapshot（正式快照），客户端随后仍发送同页 change event 并再次 GET 全量数据。
4. Daily Study 进入队列前，客户端先 `resolveToday`，服务端 `readQueue` 又重复 resolve；现有 resolver 即使计划已存在，也会打开空 transaction（事务）并读取第二份完整快照。
5. Navigation prefetch（导航预取）只加载 route payload / code，有助于点击反馈；它不执行 Client Component 的数据 effect，因此本阶段不关闭。
6. Neon scale-to-zero（缩容至零）的 cold wake（冷唤醒）可能增加首次等待，但无法解释每次页面切换都接近三秒，作为单独观测项保留。

## 2. Code-owned Sydney Region Contract

- 根目录 `vercel.json` 将全部 Vercel Functions 固定到单一 `syd1`。
- `syd1` 与 Neon `ap-southeast-2` 同处 Sydney 区域；静态资源继续由 Vercel CDN 全球分发。
- 不添加 Enterprise-only failover region，不修改 Fluid Compute（流式计算）设置，不在每个 Route Handler 重复声明 region。
- 该代码变更在原始本地阶段不会改变已部署 Preview。后续获批 Gate 0B 已通过 Git Integration 的 exact deployment 使它在新 protected Preview artifact 生效；固定历史 alias 没有被重新指向。

## 3. Shared Browser Data Lifecycle

- 根 `layout.tsx` 只挂载一个 persistent Vocabulary Data Provider（持久词汇数据提供器）。
- Home、Library、Study、Review、Active、Settings、Import、Backup 在 client-side navigation（客户端页面切换）中共享同一份已加载快照。
- 初始化和同时触发的 refresh 共用一个 in-flight Promise（进行中的请求），避免 React effect、多个消费者或事件并发产生重复 GET。
- 第一次远程读取失败时仍可进入现有 browser-local fallback；已有成功 Postgres 快照后发生临时读取失败时，保留 last-known-good snapshot（最近一次有效快照），不把界面替换为空的本地资料。
- `storage` event 只响应词汇数据、使用者选择或明确的跨 tab 同步 marker；主题与声音偏好不得触发工作区重读。
- late response（较晚返回的响应）不得覆盖其后已经成功的 mutation（写入）或使用者切换。
- remote read / write helper 不得在版本检查前更新人物偏好；只有真正被 Provider 接受的 snapshot 才能写入当前人物。
- truncated JSON（截断响应）或临时 GET 失败按 transient read failure（临时读取失败）处理；已经成功进入 Postgres 模式后保留最近有效快照。

## 4. Mutation Read-your-writes Contract

- Postgres mutation response 是本次操作的 authoritative result；客户端立即装入它，不再发出同 tab 自触发 GET。
- `people.select` 只更新浏览器选择与共享 Provider，所有当前页面消费者同步更新。
- 高频 `recordRating` 使用服务端返回的 `{ event, state }` 对共享快照做 idempotent patch（幂等更新）：event 按 `id` 去重，state 按 `personId + vocabularyItemId + reviewProfile` 替换。
- `rollbackRating` 根据服务端返回值移除被回退 event，并只替换或删除对应 Track 的 state。
- Recognition 与 Active 的 state/event 永不跨 Profile 更新；Idempotency replay（幂等重放）不得复制 event。
- whole-day reset（整日清空）、未来默认目标或其他 broad mutation 在缺少完整 delta（变化集）时继续使用正式 refresh；不以猜测数据换取速度。
- ordinary storage mutation 继续串行；如果评分 delta 在较慢的全量写入返回前完成，临时 patch journal（变更日志）会把它重放到旧响应上。跨 tab 或 formal AI refresh 必须先等待 mutation queue 稳定，避免新状态被较晚响应盖回。
- Today goals、defaults、whole-day reset 和 formal AI accept/add 完成后只发出跨 tab marker；由其他 tab 自己 GET，当前 tab 不再形成 self-refetch loop（自触发重读循环）。

## 5. Daily Study Request Collapse

- 浏览器已有完整当日两 Track 计划时，先用同一 pure runtime engine（纯运行引擎）计算 Today；只有计算会创建计划或默认值时才调用 server `resolveToday`。
- Postgres 快速路径使用 `/api/storage/data` / `/api/study` 返回的 server clock anchor（服务器时间锚点）。设备休眠或本地时钟跳变使 monotonic / wall elapsed（单调时间 / 墙上时间经过量）明显不一致时，锚点失效并重新请求服务器，浏览器时间不能自行决定学习日。
- 延迟的 `resolveToday` 必须先合并进当前 snapshot，再从合并后资料派生 visible Today。旧 `planVersion` 或旧人物响应不能直接写入组件；人物在请求中切换时，对当前人物作有界重试。
- `readQueue` 继续由服务端验证 person、Track、activity、planId、planVersion、cursor 与 prompt evidence；客户端缓存不能放宽这些边界。
- Postgres resolver 只读取所选使用者。已有两套 defaults 与当天两套 plan 时，直接返回第一份解析结果，不打开空 transaction，也不读取第二份快照。
- 首次建计划时继续使用现有 transaction 和 `ON CONFLICT DO NOTHING`，并在写入后重新读取正式行。并发请求中失败的一方必须返回数据库 winner 的正式 `planId`。
- FSRS-6、Daily Episode first-attempt anchor（每日学习首次尝试锚点）、same-session recovery（同次学习恢复）、next-day checkpoint（次日检查点）、Recognition / Active 独立参数与 lock order（锁顺序）全部保持不变。

## 6. Privacy-safe Timing Evidence

- `/api/storage/data` 与 `/api/study` 成功或应用错误响应可添加标准 `Server-Timing`，只使用固定 metric name（指标名）与 duration（耗时）。
- timing header 不包含 person ID、词条、例句、prompt、request body、credential、database identity 或 AI 内容。
- Neon cold wake 单独记录；不得将一次冷启动平均到 warm navigation（温热页面切换）后宣称正常流程流畅。

## 7. Performance Acceptance Matrix

功能性验收优先于机械百分比：

- initial bootstrap（首次启动）只发送一次 `/api/storage/data` GET；同时消费者共享同一请求。
- 首次数据可用后，普通 client-side route transition 不重新进入空白/Loading workspace，也不再发送全量数据 GET。
- 普通 Postgres storage mutation 为一次 POST、零次紧随其后的 full-data GET。
- 已有当日计划时，进入 Recognition / Active queue 只发送一次 `/api/study` queue POST；客户端不先发送 `resolveToday`。
- 普通 rating 为一次 POST；卡片可立即继续，不等待 full workspace refresh。
- 390px 手机与桌面连续切换 Today、Library、Study、Review、Active、Settings 时，无明显反复等待、横向滚动、新 console error 或 interaction lock（交互锁死）。
- protected Preview redeployment 后，以 10 次 warm run 记录 navigation 与 data-ready 的 median / p95，并检查是否仍有反复 Loading、明显交互停顿或请求瀑布。记录实际数值，不再使用固定百分比或任意毫秒门槛代替“持续使用流畅”的验收判断。
- 部署检查必须确认 Node Functions 在 `syd1`；本地代码完成不能冒充远程区域已经改变。

## 8. Expected Files

Documentation:

- `plan_docs/PLAN_V2_STAGE8_2_1_PERFORMANCE_STABILISATION.md`
- `plan_docs/PLAN_V2_STAGE8_2_STAGING_PREVIEW_RELEASE_REHEARSAL.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `ARCHITECTURE.md`
- `README.md`
- `AGENTS.md`
- `CHANGELOG.md`
- `governance/AI_AGENT_LOG.md`

Application:

- `vercel.json`
- `src/app/layout.tsx`
- `src/components/vocabulary/use-vocabulary-data.ts`
- `src/components/study/use-daily-study.ts`
- `src/lib/vocabulary/local-storage-repository.ts`
- `src/lib/vocabulary/client-snapshot-updates.ts`
- `src/lib/storage/postgres/repository.ts`
- `src/app/api/storage/data/route.ts`
- `src/app/api/study/route.ts`
- focused contract and pure behavior tests

## 9. Validation Plan

- pure snapshot update tests：rating replay、rollback、Profile isolation。
- Provider source contract：single root Provider、one in-flight refresh、no same-tab refetch loop、filtered cross-tab storage events、late-response guard。
- Daily resolver contract：second pure resolve reuses the same data reference；Postgres existing-plan fast path skips transaction/second snapshot；first-create conflict still re-reads canonical rows。
- strict `/api/study` and `/api/storage/data` auth/runtime/shape tests continue passing；timing header contains only allowlisted static metric and numeric duration。
- region config test parses `vercel.json` and requires exactly `syd1` without failover/Fluid drift。
- focused tests, `npm run lint`, `npm run typecheck`, full `npm run test`, three backup dry-runs, `npm run build`, React review, local Production-build browser flow, `npm run governance:preflight`, `git diff --check`。
- 现有 Postgres integration test 只在明确 Development credential target 下运行；本阶段不读取 `.env`，因此继续按现有 suite 规则 skip。

## 10. Stop Conditions

- 任何优化需要改写 FSRS / Daily Episode 语义、Schema、backup shape、AI gate、credential、remote database 或 Production 才能继续。
- cached snapshot 无法证明不会覆盖更新的数据。
- first-of-day concurrent plan creation 可能把 provisional plan ID 暴露给客户端。
- rating delta 无法保持 Recognition / Active Profile isolation 或 Idempotency replay。
- region config 会影响 Production before V2-8-3 approval，或需要立即 redeploy 才能验证。
- 现有 Motion、reduced-motion、keyboard、phone layout、AI disclosure 或 irreversible confirmation 出现回归。

## 11. Completion And Handoff

Local completion requires code, focused/full validation, documentation sync and browser evidence. The original stage did not authorize a Vercel deployment; V2-8-3 Gate 0B later received separate approval and now owns the real `syd1`/latency evidence below. Gate 0B has stopped before the still-unapproved Gate 2.

## 12. Completion Evidence

2026-07-19 local completion evidence:

- one root Provider、coalesced GET、mutation serialization、delta patch、stable-queue revalidation、server clock、selected-person Daily resolver fast path、privacy-safe `Server-Timing` 和 `syd1` contract 已实现；React review 的并发复核无剩余 blocker。
- focused performance / route / resolver coverage 通过 `11 files / 63 tests`；full Vitest 通过 `71 files / 403 tests`，现有 Postgres integration file/test 继续按范围 skip。
- `npm run lint`、`npm run typecheck`、三个 backup dry-run、Next.js Production build 和 `git diff --check` 通过。Build 只报告 ignored `.env.local` 的存在，没有读取或复制其值。
- 隔离的 local-mode Production-build browser flow 使用 repository-owned Schema 6 fixture 和 browser-only storage-response stub；没有 database/provider 请求。390px 与 1280px 无横向溢出、framework overlay 或 console warning/error。
- 同一页面生命周期只观察到一次 `/api/storage/data` bootstrap；10 次 Home ↔ Library 连续切换没有新增 full-data GET 或 Loading workspace。去掉第一次 route-code / animation settle 后的 8 次温热切换中位数约 `64.5ms`；该本地数值只证明交互链路已经收口，不能替代未来 protected Preview 的 10-run median / p95。
- 390px Today 与 1280px Library 图像在本地验收时写入非仓库目录 `learningWordsformimi-v2-8-2-1/`；该目录不是当前仓库中的持久 artifact，因此 durable evidence（持久证据）以本文件记录和测试契约为准。现有 Motion、reduced-motion、keyboard、FSRS、Schema、backup、AI gate 与 V1 均未修改。

### Separately approved protected Preview evidence

2026-07-19 V2-8-3 Gate 0B used exact commit `2e6145386d018968f61a1bee1b6f897feebff627` and deployment `dpl_3DeE8BrKcZ9cBdCkPA4jE1UTeHXf`:

- Deployment is READY, target Preview, source ref `V2`, protected by Vercel Authentication, and exposes all observed application/API Functions from `SYD1`. Anonymous access redirects to Vercel sign-in. No Production alias, deployment, environment or credential changed.
- One hard navigation measured shell-ready `445ms` and data-ready `1351ms`.
- Ten warm Home → Library runs measured navigation `53, 42, 39, 47, 38, 51, 38, 45, 50, 44ms` and data-ready `62, 50, 46, 55, 46, 59, 46, 53, 58, 51ms`. Navigation median/p95 are `44.5/53ms`; data-ready median/p95 are `52/62ms`.
- Warm route transitions added `0` full-data GET and showed no repeated Loading. Controlled Study entry added `0` `/api/study` calls when Today was already resolved; first Active `Say it` queue opening added exactly one `/api/study` `POST 200`. Recognition rating and rollback added no full-data GET.
- Space/Arrow/Enter rating, `回退1词`, whole-entry Listen, the three independent Active modes, existing AI disclosure, Track metrics and accepted content all remained available. The synthetic rating was rolled back. No AI generation route or provider attempt was triggered.
- Vercel Warning/Error/Fatal and browser warning/error were all zero in the observed run.
- Desktop remote layout had no horizontal overflow. The connected Chrome viewport override did not actually switch the remote page to 390 CSS pixels, so no new remote-phone screenshot is claimed. Responsive acceptance remains based on the same exact commit's already completed 390/1280px Production-build evidence; a fresh real-phone screenshot is a separate optional evidence task, not hidden as a pass from a 1495px viewport.
- The retained Staging Schema 5 checkpoint remains present with no compute and the same `2026-08-17T12:00:00Z` expiry. Production V1, Neon `main`, AI ledger and accepted Motion/reduced-motion behavior were not changed.
