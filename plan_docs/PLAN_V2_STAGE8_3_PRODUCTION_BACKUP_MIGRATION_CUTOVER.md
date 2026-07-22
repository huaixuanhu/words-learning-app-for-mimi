# Words Learning App For Mimi V2-8-3：Production Backup, Migration And V2 Cutover

Created: 2026-07-19 AEST
Last updated: 2026-07-22 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md` 的 `V2-8 Dashboard Insights And Release Gate`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE8_2_STAGING_PREVIEW_RELEASE_REHEARSAL.md`
- `plan_docs/PLAN_V2_STAGE8_2_1_PERFORMANCE_STABILISATION.md`
- `plan_docs/PLAN_V2_STAGE8_2_2_REVIEW_AUDIO_BILINGUAL_EXAMPLES.md`
- `plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md`
- `plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md`
- `plan_docs/PLAN_V2_STAGE8_2_3_2_LEARNING_NAVIGATION_GOAL_HIERARCHY_TYPOGRAPHY.md`
- `plan_docs/PLAN_V2_STAGE7B_1_FORMAL_AI_LOCAL_ORCHESTRATION.md`
- `plan_docs/PLAN_V2_STAGE7B_2_NONPRODUCTION_PROVIDER_PROOF.md`
- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md`
- `ARCHITECTURE.md`
- `AGENTS.md`

Input evidence:

- 用户在 2026-07-19 确认进入 V2-8-3，但当前先完成 documentation-first（文档先行）和 local guard implementation（本地守门实现），不直接操作远程环境。
- V2-8-2 已完成长期 `staging` 的 Schema 5 → Schema 6 演练、受保护 Preview 的完整 V2 / Gemini 验收，并保留独立 Preview credential（凭证）供用户与 Mimi 继续体验。
- V2-8-2.1 已在 branch `V2` 完成共享数据生命周期、请求合并、Daily Study 快速路径和 `syd1` 区域配置；V2-8-3 Gate 0B 已把 exact commit `2e6145386d018968f61a1bee1b6f897feebff627` 作为受保护 Preview 验证，并记录真实区域、请求与性能证据。
- live Production（正式环境）仍运行 V1、`postgres-production` 与 Neon `main` Schema Version 5，并保存真实学习数据。
- 当前 Production Schema 5 inspector（检查器）仍调用 `assertEmptySchema5Counts()`；它不能作为已有真实数据的 V2-8-3 基线工具。
- 当前正式 AI activation（启用）只接受历史 localhost proof 与 `v2-8-2-preview`，Vercel Production 继续 fail closed（默认关闭）。
- `db/migrations/0003_v2_schema6_data_model.sql` 已在非 Production 目标通过演练，尚未在 Production `main` 执行。
- V2-8-2.2 已增加 `0004_v2_bilingual_examples.sql`、JSON backup Version 4、双语例句和新版 AI draft contract；`0004` 已在长期非 Production `staging` 执行并随 PF-001 exact application 在 protected Preview 验证，Production 尚未执行。
- 用户在 2026-07-20 把 V2-8-2.3 插入 Production cutover 前，专门收集并关闭 protected Preview 真实使用问题；整个 V2 明确不包含 SSO。
- 2026-07-22 PF-001 完成：Google Cloud Standard-C、`0005`、Preview-only WIF、`staging` migration、exact deployment 与机器路径验证均完成；使用者在 MacBook + Chrome 通过 Settings、Recognition、Active 与例句词汇朗读，确认原问题解决且音效非常理想。Mimi 后续独立确认音效没有问题，但没有记录其设备/浏览器；iPhone + Safari 尚未测试。Production identity、迁移与部署仍不存在。
- 2026-07-22 PF-002 重新打开 V2-8-2.3：Review/New Learning 导航、两项目标层级、会话文案和桌面面板对齐保留。历史 Instrument Serif 版本完成 exact protected Preview 机器验收后，用户在实际使用中认为字体不舒服；现已恢复 Geist 标题与原有大词 fallback。新 exact commit `54c8ca4492ff9b13d095ea0bd0d3d7ca702c3c2f` 已作为 protected Preview deployment `dpl_EmRVmp5YDTKgnh1VEtVBozwhRp6J` Ready，状态为 `Normal / Preview-ready`，仍需人工复测。
- repository 现有三套 JSON backup dry-run（备份模拟）证明应用资料形状可迁移，但它们不等同于 Production 独立加密 logical backup（逻辑备份）与真实 restore（恢复）证明。

Consumer / next stage:

- 本文件直接约束 V2-8-3 的本地守门实现、远程只读核验、备份恢复演练、Production clone（正式数据克隆）演练、正式切换、验收与收口。
- Gate 0B 与本地 Gate 1 已完成。V2-8-2.3 因 PF-002 再次 active；Gate 2 的 metadata-only remote inventory（仅元资料远程清单）与官方事实刷新暂停到 PF-002 关闭或由人明确接受，之后仍需新的明确批准。
- 如果后续必须派生执行记录或事故恢复文件，新文件开头必须继续引用本文件为 `Source plan`，并写明 `Scope`、`Non-Scope` 与 `Exit criteria`，不得形成无来源的平级计划。
- V2-8-3 全部完成后，V2 替换 V1；multi-user confidential isolation（多用户机密隔离）仍留在 Version-hold 计划。

Document nature:

本文件是 V2 Master Plan 的 Production cutover（正式切换）执行子计划。它把“先保护真实资料，再升级数据库与程序”拆成八个可停下的 Gate（关卡）。本文件记录决策、命令契约、证据要求和 rollback（回退）边界；它自身不包含 secret value（密钥值）、数据库连接串、Shareable Link 或可直接操作账户的内容。

Current operational tier: Tier 3

Target capability tier: Tier 3

Working tier: Tier 3

Status: Gate 0B protected Preview performance verification 与 Gate 1 local guards 已完成；PF-001 为 `High / Closed`，PF-002 为 `Normal / Preview-ready`，Geist 回退的 exact Preview 已 Ready 并等待人工复测。Gate 2 暂停，且在 PF-002 收口后仍须重新批准。Gate 2–7 的远程 Production inventory、备份、credential、Neon/Vercel/Gemini/Google Cloud TTS 变更、Production migration（正式迁移）、正式部署和正式数据写入仍未批准。

## Scope

- 为非空 Production Schema 5 建立只读 inventory（清单）、资料一致性摘要与 exact-target guard（精确目标保护）。
- 为 Production clone 的 Schema 5 → Schema 6 迁移、前后 parity（对等性）、恢复与再次迁移建立可重复工具。
- 在 Production 切换前选择一套独立、加密、可恢复的 logical backup 方法，并在受控临时目标上完成 restore rehearsal（恢复演练）。
- 建立 V2 Production-only runtime（仅正式环境运行）和 AI activation boundary（AI 启用边界），保持默认关闭。
- 建立 write-free cutover window（暂停写入窗口）、旧浏览器写入拒绝、成对 app/database 回退和切换后新写入的 reconciliation（对账处理）规则。
- 在 separately approved（另行批准）的窗口内，将 Neon `main` 从 Schema 5 迁移到 Schema 6，并用 V2 替换 V1 application deployment（应用部署）。
- 使用独立 Production study-token secret、独立 Production Gemini Auth Key、现有 Basic Auth 边界和全局 AI accounting（计数）完成有认证验收。
- 在 PF-001 Preview 验收通过后，把独立 Production TTS identity、local-only `0005` operational accounting、Cache、quota、Kill Switch 和真人试听证据纳入正式切换；它不能复用 Gemini credential 或 ledger。
- 保留 protected Preview 直至 Production 稳定；稳定后再清理 Preview AI key、Shareable Link 和不再需要的恢复资源。

## Non-Scope

- Gate 0B 只批准 exact-commit protected Preview 验证与 Vercel/Neon 的只读状态核验。它不包含 `.env` / secret value 读取、Preview environment variable 或 alias 变更、Shareable Link 操作、Neon branch/expiry 变更、Gemini 调用、Production backup、Production migration、Production write、Production deployment、promote（提升为正式部署）、rollback 或 credential revoke（撤销凭证）。
- 不修改现有 migration `0001`、`0002`、`0003` 或 `0004` 的历史内容；PF-001 新建的 `0005_v2_standard_tts_accounting.sql` 是前向追加迁移，已把 migration order、SHA-256、readiness、clone/main rehearsal 与 rollback evidence 同步到本地门禁。远程迁移仍未批准。
- 不把 Preview / Staging 的 synthetic data（合成资料）、AI draft 或 accounting 行复制进 Production。
- 不把 Production 真实学习资料放入普通 Staging、公开 Preview、本地 fixture、测试日志或仓库文件。
- 整个 V2 都不引入 SSO（Single Sign-On，单点登录）、OAuth、public registration、per-person authorization 或 confidential tenant isolation；V2-8-2.3 的 Preview 反馈也不能改变这一边界。
- 不改变 FSRS-6、Daily Episode first-attempt anchor、Recognition / Active 独立 Profile、Dashboard 定义、Motion、reduced-motion 或 mobile navigation 产品契约。Keyboard 以已经完成的 V2-8-2.2 共用 2×2 规则为正式候选基线，本阶段不再改变。
- 不增加 personal AI attempt limit（个人调用上限）。V2 继续依赖全局请求、token、cost、concurrency、Cache、Idempotency 与 Kill Switch。
- 不设计自动 Schema 6 → Schema 5 down migration（向下迁移）。当前没有经演练的安全 down-conversion（向下转换）路径。
- 不把 Neon point-in-time recovery（时间点恢复）或 branch checkpoint 单独当成独立 logical backup。

## Safety And Fixed Decisions

### 1. V1 / Schema 6 compatibility boundary

- V1 repository 按 Schema 5 写入 `review_states` / `review_events`，不会提供 Schema 6 新增的 non-null Profile、Parameter Set 和活动证据；V1 不得连接 Schema 6。
- V2 repository 依赖 Schema 6 的 Daily Plan、独立 Review Profile、AI lineage/accounting 等表和字段；V2 不得连接 Schema 5。
- Production 不允许出现“V1 app + Schema 6”或“V2 app + Schema 5”的混合状态。
- 数据库开始迁移前，canonical Production domain（正式域名）必须先进入已验证的 maintenance/write-free artifact（维护/暂停写入版本），使旧 V1 页面发出的 mutation（写入）也被服务器拒绝。
- maintenance 只保护当前 artifact 与 canonical alias，不能自动撤销 retained V1 deployment URL 已持有的数据库权限。正式迁移还必须机械关闭旧 V1 runtime 的写入路径，并直接证明旧 deployment URL 的 authenticated mutation 已失败；可选方式必须在 Gate 2/4 通过官方能力和 clone 演练后确定，不能只靠口头停止使用。
- V2 正式写 API 必须携带 code-owned client contract version（代码控制的客户端契约版本）。Schema 6 Production 拒绝缺失或旧版本标记的 mutation，避免切换前已经打开的 V1 tab 在切换后继续写入。

### 2. Paired application and database rollback

- rollback unit（回退单元）始终是 application artifact + database state（应用版本与数据库状态）这一对。
- V1 deployment 只能与已确认的 Schema 5 recovery state 一起恢复；V2 deployment 只能与已确认的 Schema 6 state 一起运行。若切换期间旧 V1 database credential 已旋转或撤销，rollback 需要从 retained V1 artifact/commit 以新批准的 Schema 5 credential 重建，不能把旧 deployment URL 直接重新指向 alias 后假定可写。
- 迁移失败或 V2 写入开放前发现 blocker 时：保持 maintenance，确认数据库已回到 Schema 5，再恢复指定 V1 deployment。顺序与证据必须在 clone 演练中先通过。
- `0003` 与 `0004` 必须按固定顺序在同一 transaction（事务）内执行；仍须以迁移后 inspector 的实际结果判断成功，不能只依赖 command exit code（命令退出码）。

### 3. Post-cutover V2 write reconciliation

- V2 写入开放前，Schema 5 recovery point 与 logical backup 可支持无新增资料的成对回退。
- 第一笔 V2 正式写入之后，不得静默 Reset 到迁移前 Schema 5；这会丢失新 Review event、Daily Plan、Active evidence 或已接受 AI 内容。
- 出现切换后故障时先重新进入 maintenance，保存 incident-time encrypted logical backup（事故时加密逻辑备份）并记录新增资料窗口，再由人选择：
  1. forward repair（向前修复）并保留 Schema 6 新写入；
  2. 明确接受新写入损失后，成对回到 V1 + Schema 5；
  3. 使用另行设计、测试和批准的 reconciliation/import route（对账导入路径）。
- 当前 V2-8-3 不提供自动 Schema 6 → Schema 5 转换，因此默认优先 forward repair。任何 loss-accepting rollback（接受资料损失的回退）需要当次明确批准。

### 4. Credential and confidential-data handling

- 文档、测试 fixture、命令输出、manifest（清单）、Git diff、截图和 runtime logs 不得出现 database URL、password、Auth Key、study-token secret、Basic Auth secret、Shareable Link 或 backup encryption key。
- 工具只能判断 credential 是否存在、类型是否正确、是否属于目标环境；不得输出、hash、复制或重新保存 value。
- 独立 Production Gemini Auth Key 与 Production study-token secret 不得复用 Preview 值。Preview 不得获得 Production key。
- Production clone 包含真实学习资料，只能作为受限制的临时 Production rehearsal target（正式演练目标）；不得接入普通 Preview，不得添加 synthetic tester，也不得留下长期 compute。
- `person_id` 继续用于资料分离，不构成身份认证或授权。

### 5. AI cost boundary

- Production AI 首次打开时保留 Kill Switch，并设置最多 `4` 次 submitted provider attempts（已提交供应商调用）的 rollout ceiling。
- 目标只使用 `2` 次：一次 `enrichment_v1`、一次 `context_explain_v1`；余下两次只用于人工检查失败后决定的恢复，不添加 automatic provider retry（自动重试）。
- 初次证明通过后，移除临时 `4` 次上限，恢复全应用统一边界：Australia/Melbourne 每日 `300` 次、每日 `600,000` input tokens、每日 `210,000` output/thinking tokens、每日估算 `US$0.50`、每月估算 `US$2`、global concurrency `2`，没有个人调用上限。
- 当前 price contract（价格契约）基于 2026-07-14 记录，并在 `2026-08-14T00:00:00.000Z` 后 stale（过期）且 fail closed。若 Production provider activation 发生在该时间点或之后，必须先从 Gemini 官方资料刷新价格、模型和计费方式，更新代码与测试，再获得继续批准。
- pricing、model lifecycle、data terms、Project logging 和 Auth Key restriction 任一项无法确认时，Production AI 保持关闭；学习功能应继续可用。

### 6. Existing recovery and credential lifecycle

- V2-8-2 保留的 Staging Schema 5 checkpoint 是 `v2-8-2-staging-schema5-recovery-20260718`。Gate 0B 于 2026-07-19 只读确认 branch `br-patient-mud-a7cnc81r` 仍存在、parent 是 `staging`、没有 compute，当前自动删除时间仍是 `2026-08-17T12:00:00Z`（Melbourne `2026-08-17 22:00`）。若 Production 尚未稳定且 expiry 临近，延长 expiry 是单独的 Neon mutation approval（变更批准）。
- 该 Staging checkpoint 不替代 Production backup 或 Production Schema 5 recovery point。
- V2-8-2 记录曾发现一把较旧的 V2-7B-2-named key 显示为 active，但历史记录又称临时 key 已清理。Gate 2 进行 metadata-only audit（仅元资料审计），不查看 key value。未确认其 owner、usage 和引用状态前，Production provider 不得启用。
- 如旧 key 被确认 orphaned（无人使用），可在单独 credential-cleanup approval 下撤销；撤销前后都要确认 Preview 与 Production 没有引用它。

## Gate And Approval Map

| Gate | 主要目的 | 当前授权 | 通过后停止点 |
| --- | --- | --- | --- |
| 0 | 记录 protected Preview 性能版本与恢复资源状态；经批准后部署并验证 V2-8-2.1 | 已完成 | 停在 Gate 2 前；未授权 alias/environment/checkpoint mutation |
| 1 | 实现本地 Production guards、inspectors、maintenance/client-version/AI gates 与 tests | 已批准 | 本次 local tranche（本地批次）在此完成并交付 |
| 2 | 远程只读 Production/Vercel/Neon/Gemini inventory 与官方事实刷新 | 未批准；等待 PF-002 当前 Preview 人工复测后关闭或明确接受 | 展示脱敏证据并等待 backup/rehearsal 批准 |
| 3 | 选择独立加密 logical backup 方法并完成 restore rehearsal | 未批准 | 备份和恢复证据通过后等待 clone migration 批准 |
| 4 | 在非空 Production clone 演练 Schema 5 → 6、parity 与 recovery | 未批准 | 删除/保留临时资源须按批准执行；main 仍不变 |
| 5 | 暂停写入、最终备份、Production-only secrets、迁移 `main`、promote V2 | 未批准 | 每个 Production mutation 前按本 Gate 的 stop point 再确认 |
| 6 | 有认证的资料、学习、AI、日志、成本、手机和性能验收 | 未批准 | 移除 AI `4` 次上限及开放长期边界前停止 |
| 7 | 稳定观察、最终备份、Preview/旧 key 与 checkpoint 收口 | 未批准 | 删除恢复资源或撤销 credential 前停止 |

## Gate 0 — Protected Preview Performance State

### Gate 0A：当前本地 inventory

- 记录 branch、exact commit、clean/dirty state、V2-8-2 accepted deployment id，以及 V2-8-2.1 尚未部署的事实。
- 记录 `vercel.json` 的单一 `syd1` contract、Provider 请求合并、本地 browser evidence 和 full validation 状态。
- 将 Preview 当前 5-entry synthetic inventory、Review state/event、AI ledger 和 0 in-flight 状态作为既有证据，不在本地伪装成刚刚重新核验的远程事实。
- 为未来 performance run 固定证据形状：10 次 warm navigation 的 median/p95、首次 bootstrap 请求数、route transition 中 full-data GET 数、repeated Loading、console/runtime error、390px 与 desktop overflow、Function region。

### Gate 0B：已批准并完成的远程验证

1. 只读确认 protected Preview deployment、branch、runtime、Deployment Protection、Staging Schema 6 identity 和现有 AI/accounting 状态。
2. 将 V2-8-2.1 exact commit 部署到 protected Preview；不 promote Production，不更换 Production alias，不使用 Production credential。
3. 确认 Functions 实际位于 `syd1`，并完成 10-run median/p95 与完整学习 smoke（冒烟检查）。
4. 确认性能部署没有改变 accepted Motion、mobile layout、AI disclosure、Daily Episode、Recognition/Active isolation 或 backup behavior。
5. 只读确认 Staging Schema 5 checkpoint 仍存在及当前 expiry；若需要延长，先停止并请求 Neon mutation approval。

**Approval Stop 0:** 本次 exact protected Preview deployment 已获独立批准并完成。任何后续 redeploy、alias/environment change、Shareable Link 操作或 checkpoint expiry 延长仍需要新的明确批准。Gate 0B 通过不自动进入 Gate 2 或 Production cutover。

### Gate 0B execution evidence — 2026-07-19

- Source binding：`HEAD` 与 `origin/V2` 都是 `2e6145386d018968f61a1bee1b6f897feebff627`。当前主工作树包含尚未提交的 Gate 1 文件，因此没有从 dirty workspace（有未提交修改的工作区）发布。Git Integration 已为 exact branch/commit 建立 READY Preview deployment `dpl_3DeE8BrKcZ9cBdCkPA4jE1UTeHXf`，unique URL 是 `https://words-learning-app-for-mimi-7727q99f4-anorias-projects.vercel.app`，branch alias 是 `https://words-learning-app-for-mimi-git-v2-anorias-projects.vercel.app`。没有改动固定 `mimi-v2-preview-anoria.vercel.app` alias，也没有建立 Production deployment。
- Access/runtime：anonymous request 返回 `302` 并进入 Vercel Authentication。Vercel deployment Resources 显示 21 个 Functions，应用与 `/api/storage/data`、`/api/storage/health`、`/api/storage/smoke`、`/api/study` 和 AI routes 均在 `SYD1`。本次观察窗口内 Vercel Warning/Error/Fatal 为 `0/0/0`，受控浏览器 console warning/error 为 `0`。
- Data path：受保护的 unique origin 成功载入既有 synthetic Staging workspace：1 person、5 vocabulary entries、Recognition/Active 为 `3/2`、Review/New 为 `4/1`，并显示 Daily Plan、独立 Track 与已接受 AI 内容。它与 V2-8-2 已接受的 Schema 6 inventory 一致；本次没有重新执行数据库 inspector，也没有把 UI 观察冒充新的完整 Schema/AI ledger 查询。
- Cold observation：一次 hard navigation 的 shell-ready 为 `445ms`，data-ready 为 `1351ms`；它单独记录，不混入 warm run。
- Ten warm Home → Library runs：navigation 为 `53, 42, 39, 47, 38, 51, 38, 45, 50, 44ms`，median `44.5ms`、p95 `53ms`；data-ready 为 `62, 50, 46, 55, 46, 59, 46, 53, 58, 51ms`，median `52ms`、p95 `62ms`。10 次均无 repeated Loading。
- Request collapse：warm route transitions 新增 full-data GET 为 `0`；受控进入 Study 的 `/api/study` delta 为 `0`；首次打开 Active `Say it` queue 的 delta 是恰好 `1` 个 `POST 200`，没有额外 client `resolveToday`。Recognition rating 与 `回退1词` 后均没有紧随的 `/api/storage/data` GET。
- Learning smoke：Recognition New Words 的 `adjust` 通过 Space 翻牌、Arrow 选择与 Enter 提交；`回退1词` 成功恢复为 `1 left / Done 0`。Recognition pronunciation button 存在。Practice Lab 的 `Say it`、`Spell it`、`Dictation` 三种 Active mode 均可进入并保持独立空队列状态。该 synthetic mutation 已回退，Staging 基线未被扩大。
- AI boundary：只打开既有 `AI suggestions` disclosure，确认 model label、最小 outbound lexical context 与人工确认 checkbox；未点 Create。Vercel request-path 日志没有 AI generation route，本轮 provider attempt 增量为 `0`。既有 ledger 数值继续引用 V2-8-2 accepted evidence，不宣称在 Gate 0B 重新查询。
- Responsive/Motion boundary：远程桌面 viewport 无 horizontal overflow，accepted Motion、reduced-motion 与 card interaction 未修改。浏览器的 390px override 没有实际改变远程 Chrome CSS viewport（读取仍为约 `1495px`），因此本记录不伪称生成了新的远程 390px 截图；mobile acceptance 采用同一 exact commit 在 V2-8-2.1 完成的 390/1280px Production-build evidence，加上本次 exact source/deployment binding。后续若要求新的真实手机截图，应使用实体手机或可验证的 device-emulation 会话单独补证。
- Recovery resource：Neon Console 只读确认 checkpoint `br-patient-mud-a7cnc81r`、parent `staging`、0 compute 与 `2026-08-17T12:00:00Z` expiry；没有修改 expiry、branch 或 compute。
- Safety result：没有读取 secret value，没有 environment/alias/Shareable Link/credential change，没有 Gemini call、Production read/write、Neon `main` access、Production deployment、promote、GitHub push 或 commit。

**Gate 0 result:** exact Preview performance、request collapse、learning flow、access/region/log 与恢复点检查通过。Responsive 结论使用 exact-commit composite evidence，并显性保留“未重新取得远程 390px 截图”的证据限制。执行在 Gate 2 前停止。

## Gate 1 — Local Production Guard Tooling

本 Gate 是当前已经批准的实现范围。所有 guard/core logic（保护与核心逻辑）必须能通过 fixture 和 dependency injection（依赖替换）在本地验证；本次执行不连接远程数据库、不读取 `.env`。真正的 inventory/migration 命令刻意不提供会被误当成数据库证明的假 `--dry-run`：它们保持 dormant，只有未来获批并同时完成 live control-plane verification（实时控制面核验）后才会连接。

### 1. Non-empty Schema 5 inspector

- 从现有 Schema 5 structure inspector 复用表、字段、constraint、index 与 trigger 检查。
- 移除 V2-8-3 路径中的 empty-database assumption（空数据库假设）；原有 historical empty-start inspector 不改写为另一种语义。
- 输出 allowlisted（允许列表）摘要：schema version、各表 row count、关键 FK orphan count、invalid Track/state count、操作类型计数与完整 core-row digest。
- 不输出精确的词条建立、复习或 backup-import 时间；cutover 自身的 operation timestamps 只记录在独立 secret-free manifest。
- 多查询 inventory 固定为 UTC 并在一个 `repeatable read read only` snapshot（可重复读只读快照）内完成，避免 count、invariant 与 digest 分别看到不同瞬间。
- 摘要不得输出单词、释义、例句、person name/id、note、typed answer、prompt、accepted AI content 或连接信息。
- 支持 machine-readable manifest，并以 exact target/environment confirmation 防止 Development/Preview/Production 误用。branch/parent/endpoint 的绑定无法只从 Postgres 连接内证明；保存本地 JSON 与同会话 hash 仍是 self-attestation（自我证明），不能作为授权来源。因此每条未来获批的真实命令都必须在连接 Postgres 前，使用独立 `NEON_API_KEY` 对硬编码官方 HTTPS base 发出只读 GET，实时读取目标 endpoint、Production-main endpoint、目标 branch 与 main branch，并核对 project、endpoint→branch、branch parent/name/state、`parent-data` clone 和 `read_write` type。API response、project id 与 credential 不写入 stdout；只保留稳定 target digest 和控制面摘要 hash。
- 操作者输入 project id 也不能单独成为授权来源。Gate 1 的 code-owned approved Production project SHA-256（代码内批准项目摘要）固定为 `null`，因此真实命令在任何控制面请求和 Postgres 连接前都会停止。Gate 2 必须先以获批的只读 account inventory 独立确认 Production project，再通过代码审查把其 SHA-256 写入固定常量并重跑全部验证；环境变量不能覆盖这项 pin（固定值）。
- 当前官方契约依据：[Retrieve compute endpoint details](https://api-docs.neon.tech/reference/getprojectendpoint)、[Retrieve branch details](https://api-docs.neon.tech/reference/getprojectbranch) 与 [Neon API authentication](https://api-docs.neon.tech/reference/authentication)，checked 2026-07-19。官方 base/response contract 变化时必须更新代码与测试，不能改用自定义 API base 或本地 evidence file 绕过。

### 2. Migration and parity guard

- 只接受 inspected Schema 5 target、指定的 Production-clone mode 和未改写的 `0003_v2_schema6_data_model.sql` canonical hash（正式哈希）。
- migration command 需要独立的人类确认 flag，不能因普通 `npm run`、test 或 build 被触发。
- Schema 6 inspector 验证 expected tables/constraints/indexes/triggers、Profile/Parameter Set pairing、Active/Recognition isolation、Daily defaults/plans、creation facts、AI tables 和 0 invalid rows。
- parity manifest 使用 count、stable identifier digest（稳定识别码摘要）和 invariant（不变量）比较；不得以抽样页面截图替代完整检查。
- migration 只允许 forward once（前向执行一次）；已是 Schema 6 时必须停止，不能盲目重跑。

### 3. Write-free and old-client guard

- 增加 Production cutover mode，至少明确区分 `maintenance`、`schema6-readiness` 与 `live`；未知或缺失值 fail closed。
- maintenance artifact 不读取 Schema 5/6 学习资料，所有 mutation 返回稳定的暂不可用响应，页面显示简短维护信息。
- V2 Schema 6 Production mutation 要求固定 client contract version；旧 V1 tab 缺少该版本时被拒绝并提示 reload（重新载入）。GET/readiness 规则与写入规则分开测试。
- Production main migration command 额外要求 `old runtime write path blocked` 的独立确认和 evidence SHA-256；maintenance、client marker 与当前连接的 in-flight query 检查都不能替代这项证明。
- preview、test、local fixture 不能伪装 Production gate；Production gate 也不能在非 Production 打开。

Implemented contract:

- `MIMI_PRODUCTION_CUTOVER_MODE` 只接受 `maintenance`、`schema6-readiness` 或 `live`；Production 缺失或未知值在 Basic Auth 通过后返回维护状态。
- Basic Auth 始终先于维护页面和 client-version 判断；`maintenance` 阻止页面与 API，`schema6-readiness` 允许已认证只读检查但拒绝全部 mutation，只有 `live` 才允许带 `v2-schema6` 标记的 V2 写入。
- 客户端标记已经接入 Storage、Daily Study 与 formal AI 三条实际 mutation sender（写请求发送路径）。旧 V1 tab 缺少标记时会收到 reload 提示。

### 4. Production-only AI gate

- 新增独立 `v2-8-3-production` execution scope，不复用 V2-7B-2 localhost 或 V2-8-2 Preview scope。
- 必须同时满足 Vercel Production、`postgres-production`、Schema 6、atomic accounting、Production target confirmation、Basic Auth、独立 study-token secret、Production Auth Key type、Project logging confirmation、fresh pricing 与 HTTPS request。
- 默认 Kill Switch 为开；首次启用只接受 exact `4`-attempt rollout ceiling。测试证明 Production 缺少任一确认时仍为 resting。
- Production scope 不能由 Preview env、branch name、browser header、person selection 或 client-supplied quota 打开。

### 5. Cutover manifest and rollback packet

- 本地生成不含 secret 的 cutover manifest template：commit、deployment、schema、migration hash、backup checksum、checkpoint、counts/digests、write-free start/end、AI ledger、approver 与 timestamps。
- 生成 paired rollback checklist，明确 V1 artifact/commit、可用的 Schema 5 credential 路径与 Schema 5 recovery id 必须同时匹配；immutable old deployment 若仍引用已撤销 credential，只作为历史 artifact，不冒充可直接恢复的运行版本。
- 生成 post-cutover write reconciliation decision field；未选择时工具拒绝 loss-accepting rollback。

Implemented contract:

- `npm run v2:8-3:manifest:template` 只生成不含 credential value、连接串或学习内容的 draft。
- `npm run v2:8-3:manifest:validate -- --file <repository-json>` 使用 allowlist 重建输出，拒绝 secret-shaped field/value、错误 migration hash、不完整 backup/recovery、未阻断旧 runtime、缺少成对回退或未选择的切换后对账决策。
- `ready-for-main-migration` 与 `schema6-verified` 必须记录 AI ledger baseline（AI 账本基线）、初始 `4` 次 ceiling 和已开启 Kill Switch；初始 `live` 在关闭 Kill Switch 时必须补充 activation 后 ledger digest。进入 steady state（稳定阶段）还需要 before/after ledger digest 与独立接受证据，不能只改一个状态名称。
- 第一笔 V2 写入后的每一种 rollback reconciliation 都必须提供对应证据 SHA-256；`approved-loss` 还要提供另一次人工接受损失的证据。工具不会把“需要回退”推断成“允许丢失或移动新资料”。

### Gate 1 validation

- focused tests：non-empty Schema 5、wrong target、wrong mode、unexpected tables、invalid counts、migration hash drift、already Schema 6、old-client write、maintenance write rejection、Production AI fail-closed、4-attempt ceiling、secret-free output。
- full `npm run lint`、`npm run typecheck`、`npm run test`、三套 backup dry-run、`npm run build`、`npm run governance:preflight` 与 `git diff --check`。
- 审查 changed files、tracked/untracked inventory 和 secret-shaped diff；不运行任何 remote integration test。

**Approval Stop 1:** Gate 1 完成时结束了原始本地批次。后续 Gate 0B 依靠新的明确批准独立执行；本地 tests 与 Gate 0B 结果都不授权进入 Gate 2。V2-8-2.3 已关闭 PF-001；PF-002 的旧字体 Preview 只保留为历史机器证据，Geist 回退 exact Preview 已 Ready，但仍需人工收口。进入 Gate 2 还须再次取得明确批准。

## Gate 2 — Remote Read-only Inventory And Official Fact Refresh

Gate 2 需要单独批准远程账户与 Production 元资料的只读访问。所有输出先脱敏再写入执行记录。

### Vercel inventory

- 确认 team/project、canonical Production domain、当前 V1 deployment id/commit、rollback retention、Production branch、Basic Auth、current Function region 与 Production/Preview environment-variable names/presence；不读取 value。
- 从 Vercel 官方资料重新确认 Production prebuild/promotion、environment-variable binding、deployment rollback、`syd1` placement、Deployment Protection 和 alias 切换的当前语义。
- 任何“promote 后是否复用原 artifact / runtime env”的关键结论只以当前官方资料和一次非 Production proof 为准。

### Neon inventory

- 确认 project、Production `main` branch identity、parent/child topology、region、database/role label、Schema 5、row counts、restore window、branch/reset/expiry 能力和资源限制；不输出 connection string。
- 确认 `main` 没有未知 child、migration、in-flight operation 或 data anomaly。
- 确认 Staging Schema 5 checkpoint 的存在与 `2026-08-17T12:00:00Z` expiry；如实际值不同，以远程事实更新计划并停止自动推进。
- 从 Neon 官方资料重新确认当前 plan 下 point-in-time restore、branch expiration、clone/reset 和 logical backup/restore 限制。

### Gemini inventory

- 从 Google 官方资料确认 `gemini-3.1-flash-lite` 可用性、Standard synchronous pricing、token accounting、`store: false`、data use/retention、Project logging、Auth Key restriction、rate/quota 和 model lifecycle。
- 读取 Project / key metadata 与 usage only；不显示 key value，不发送 Prompt，不产生 provider call。
- 审计 V2-7B-2-named key：owner/purpose、creation/last-use metadata、restriction、引用环境和当前 active state。无法证明 orphaned 时，Production AI 保持关闭并交由人处理。
- 若执行日期达到或晚于 `2026-08-14T00:00:00.000Z`，先更新 price contract 与 tests；只改文档不能解除 stale-price fail-closed。

**Approval Stop 2:** 将脱敏 inventory、官方链接、checked-at 时间和差异交给用户。用户需要分别确认 Production target、backup/rehearsal scope、credential audit 处理方式和下一 Gate；只读结果不授权任何 mutation。

## Gate 3 — Independent Encrypted Logical Backup And Restore Rehearsal

### Method decision

- 当前 backup tool、encryption tool、storage location 与 restore method 均未选择。不得在正式窗口临时拼装，也不得在本计划中虚构为已完成。
- 选择时比较：完整 schema/data 支持、Postgres/Neon 兼容版本、consistent snapshot（一致快照）、checksum、encryption at rest、key custody、restore verification、可重复命令、个人资料最小暴露、安装来源与维护状态。
- 可评估 `pg_dump`/`pg_restore` custom format（自定义格式）配合独立加密容器，但只有安装版本、官方兼容性和一次 restore proof 通过后才能成为选定方法。
- application JSON backup 是额外的语义核验和人工可导出资料，不替代数据库 logical backup；Neon checkpoint 也不替代 logical backup。

### Rehearsal requirements

1. 先在 repository fixture / disposable synthetic database 验证命令、加密、checksum、错误密码/损坏文件失败与 plaintext cleanup（明文清理）。
2. 经批准后，从受限制的 non-empty Production clone 或等价只读快照生成 encrypted logical backup；不把 plaintext dump 留在磁盘、shell history、日志或仓库。
3. 恢复到新的受限制 disposable target，运行 Schema 5 inventory、count/digest、FK/invariant 和 application read parity。
4. 记录工具版本、备份时间、source identity 的非敏感标签、cipher/checksum、restore duration 与结果；encryption key 由用户独立保管，记录中只写 custody confirmation。
5. 完成后删除 restore target 和临时明文；加密备份按 lifecycle policy 保留。

### Stop conditions

- 方法不能证明一致性或恢复完整性；
- 加密 key 与备份文件存放在同一位置且没有独立保护；
- 工具输出 personal content、secret 或完整 connection string；
- restore 只验证“命令成功”，没有通过 counts/digests/invariants；
- 需要升级付费计划、开启自动续费或扩大账户权限但未另行批准。

**Approval Stop 3:** 安装 backup/encryption 工具、读取 Production/clone、创建或删除 remote restore target、保存真实资料备份均需单独批准。restore rehearsal 通过后再申请 Gate 4。

## Gate 4 — Non-empty Production Clone Migration, Parity And Recovery

### Clone boundary

- 从当时的 Production `main` Schema 5 创建 exact child/clone；记录 parent、created-at 和 expiry，不连接普通 Preview，不开放给无关使用者。
- clone 含真实学习资料，继续按 Production confidential-data controls（机密资料控制）处理。
- migration 工具必须同时确认 clone identity、parent=`main`、`target=production-rehearsal`、Schema 5 以及 canonical `0003` / `0004` hashes；任何一项不符立即停止。

### Forward migration and parity

1. 在迁移前运行 non-empty Schema 5 manifest。
2. 在同一 transaction 内依次应用未改写的 `0003_v2_schema6_data_model.sql` 与 `0004_v2_bilingual_examples.sql` 一次。
3. 验证 Schema 6 expected tables、constraints、indexes、triggers 和 invalid-row queries。
4. 验证所有 people、settings、imports、vocabulary、Recognition review state/event 的 count 与 stable digest 保持一致。
5. 验证旧 review history 只迁移为 Recognition；不凭空产生 Active history。`first_rated_at` 来自 retained earliest event，缺少事件的历史使用 `legacy_unknown`。
6. 验证每个既有词条的 legacy creation fact、两套 Daily defaults、Track 归属、等长 `example_translations_zh` 与 Schema 6 backup Version 4 export；旧 English-only 例句只产生明确空翻译位置，不生成或猜测中文，不生成虚假的今日计划、review event 或 AI content。
7. 用 V2 repository 执行 authenticated read-only flow；AI Kill Switch 保持开启，不发送外部请求。

### Recovery rehearsal

- 在 clone 上证明 Schema 6 → pre-migration Schema 5 recovery 的受支持 provider reset/restore 路径；运行 Schema 5 manifest 并证明 V1 read compatibility。
- 再从恢复后的 clone 重新执行一次固定的 `0003` + `0004` sequence，证明相同输入得到相同 Schema 6 parity manifest。
- 独立从 Gate 3 encrypted logical backup 恢复一次 Schema 5 target，证明 branch recovery 与 logical restore 是两条不同的恢复路径。
- 记录 paired application/database rollback 顺序；不需要、也不得在 clone 上产生真实学习写入或 Gemini 调用。

**Approval Stop 4:** 创建、迁移、Reset/Restore、再次迁移或删除 Production clone 都是 remote mutation，需要明确批准和 exact target evidence。Gate 4 通过后仍不得操作 `main`。

## Gate 5 — Write-free Production Cutover

Gate 5 至少分成两个独立批准点：Preparation（准备）与 Live cutover（正式切换）。

### Gate 5A：Production preparation

- 冻结 exact Git commit，要求 clean tree、完整 local/Preview validation 和 Gate 0–4 evidence。
- 记录当前 V1 deployment、canonical domain、V1 artifact/commit，以及 credential rotation 后如何以 Schema 5 target 重建的 paired rollback packet。
- 预构建并验证 maintenance artifact 与 exact V2 Production candidate；candidate 初始为 AI Kill Switch on、`4`-attempt ceiling、`postgres-production` Schema 6 contract。
- 创建独立 Production study-token secret 和 restricted Production Gemini Auth Key，并只配置到 Production scope。为 V2 准备与旧 V1 runtime 分离的 database credential 路径，使旧 deployment 的数据库写入权可以在迁移前机械关闭。配置过程不读取或记录 value，不复用 Preview credential。
- 保留现有 Basic Auth 边界；任何密码轮换单独批准，不与本次迁移暗中合并。
- 从官方证据确认 prebuild/promote 语义。如果 artifact promotion 不能保留已验证的 Production runtime contract，采用已经在非 Production 证明的等价 build/deploy 路径并更新执行记录。

**Approval Stop 5A:** 创建 credential、写入 Vercel Production environment、构建 Production-target artifact 都需要明确批准。完成准备不自动切换 domain 或数据库。

### Gate 5B：Live cutover sequence

1. 宣布 cutover window，确认用户与 Mimi 停止学习；记录 server-owned write-free start time。
2. 确认 AI Kill Switch on、0 submitted/in-flight provider calls、0 active provider call。
3. promote maintenance artifact 到 canonical Production domain；验证匿名访问仍被 Basic Auth 阻挡，canonical alias 上所有 mutation 包括旧 V1 tab 请求均被拒绝。
4. 按已经演练的 credential/permission 路径关闭旧 V1 runtime 的数据库写入能力；用 retained old deployment URL 发出一条无资料变化的 authenticated rejection probe，证明它不能到达写事务。只验证 canonical alias 不足以通过本步骤。
5. 在 write-free 状态下生成 final independent encrypted logical backup，并创建/确认 Production Schema 5 recovery point；比较 final manifest 与 Gate 2 baseline，解释全部合法差异。
6. 再次确认 exact `main`、Schema 5、canonical migration hash、backup checksum、0 in-flight write、old-runtime-blocked evidence 与 paired rollback packet。
7. 只对 Production `main` 在同一 transaction 内执行 `0003` + `0004` 一次；立即运行 Schema 6 inspector 和 full parity manifest。
8. 若 migration/parity 不通过，保持 maintenance，按 Gate 4 已证明路径恢复 Schema 5；确认 Schema 5 与可用的新 credential 后，重建/恢复 V1 artifact。
9. migration/parity 通过后 promote exact V2 candidate；验证 Basic Auth、`postgres-production`、Schema 6 和 client contract version。
10. 先完成只读 acceptance，再允许 V2 mutation。write-free end time 与第一笔 V2 write time 分别记录。
11. AI 继续 Kill Switch on，直到 Gate 6 非 AI 学习与资料验收通过。

**Approval Stop 5B-1:** promote maintenance、创建 final backup/checkpoint 与开始 write-free window 前确认。

**Approval Stop 5B-2:** 对 `main` 执行 migration 前再次展示 exact target、final backup restore proof、recovery id、migration hash 和 expected manifest。

**Approval Stop 5B-3:** promote V2、开放 Production writes 前展示 Schema 6 parity 与 paired rollback 状态。任何旧客户端仍能写入时不得开放。

## Gate 6 — Authenticated Production Acceptance

### Access and real-data continuity

- 未认证请求被 Basic Auth 拒绝；已认证请求显示 `postgres-production`、Schema 6，且不公开 table count、connection identity 或 secret。
- 对每位已有使用者核对 vocabulary、Track、archive、import source、settings、Recognition history 和历史时间；页面与 migration manifest 对得上。
- 通过真实但最小的授权学习动作验证 Today、Recognition、Active 三种模式、first-attempt anchor、same-session recovery、next-day semantics、rollback 和 two-gate reset 的边界。不可逆操作只检查对话框，除非用户单独批准真实执行。
- Dashboard Actual/FSRS、Library、Add Words、Backup export 和 cross-tab sync 与现有资料一致。

### AI initial proof

1. 重新确认 price fresh、`ai-disclosure-v3`、Production Auth Key restriction、Project logging、global ledger baseline 和 `4`-attempt ceiling。
2. 将 Kill Switch 从 on 切换为 off 后，只执行一次 enrichment 与一次 exact-span context explanation；使用普通词汇资料，不发送 person name、history、private notes 或 unrelated vocabulary。
3. 验证 edit/reject/accept/add-to-learning、lineage、backup inclusion、Replay、Cache、Idempotency 与 Kill Switch。Replay、Cache 和 Kill Switch 检查不得增加 provider attempts。
4. 对账 provider model、input/output/thinking tokens、submitted/succeeded/failed、estimated cost、0 in-flight 与 runtime logs。
5. 到达第 4 次 submitted attempt 或 cost/usage 异常时立即停止；不自动重试。

### Long-term AI boundary

- 初始 proof 通过后，单独批准移除 `4`-attempt rollout ceiling；部署/配置后只保留全应用 `300 attempts/day`、`600k/210k tokens/day`、`US$0.50/day`、`US$2/month`、concurrency 2、Cache、Idempotency 和 Kill Switch。
- 不设置 personal limit；浏览器可选 `person_id` 不能分割或重置全局额度。
- provider 不可用、price stale 或 quota exhausted 时只让 AI resting，已保存词汇与学习流程继续工作。

### Mobile, performance and operations

- 320、375、390、768、820、1023、1024 与 desktop width 检查主要学习流程，无 horizontal overflow、unreachable action 或重复 Loading。
- Production region 实际为 `syd1`；10 次 warm navigation 记录 median/p95、data requests 和首次 cold wake，使用真实数值，不用本地结果代替。
- 检查 build/runtime/function logs、Server-Timing、5xx、database errors、secret-shaped output、AI stuck run 与 global accounting。
- 对比 Gate 0 protected Preview，解释 Production 数据量、cold wake 或外部 provider 导致的差异。

**Approval Stop 6:** 第一笔真实学习 mutation、第一笔 Gemini call、移除 `4` 次 ceiling、真实 reset/rollback 或任何数据修正分别需要在已批准 acceptance script 内明确列出。超出脚本范围立即停止。

## Gate 7 — Stability, Final Backup And Preview Cleanup

### Stability evidence

- protected Preview 与 V1 deployment 继续保留，直到 Production 至少跨过一个 Australia/Melbourne natural-day boundary（自然日边界），并由用户与 Mimi 完成各自一段真实学习流程。
- 期间确认 Daily Plan rollover、Review/Active history、Dashboard、AI ledger、logs、cost 和 performance 无异常；没有 unresolved migration、provider、backup 或 authentication blocker。
- 稳定窗口结束时再生成一份 encrypted Production logical backup，完成 checksum 与可恢复性记录。

### Cleanup

- 经明确 credential-cleanup approval 撤销 V2-8-2 Preview Gemini key，移除/关闭 Preview AI activation，并撤销不再需要的 Shareable Link；protected Preview 是否保留为 non-AI 环境由用户决定。
- 完成 V2-7B-2-named key 审计。若确认 orphaned，撤销并记录 metadata-only result；若仍有合法 owner，不擅自处理。
- 检查 Staging Schema 5 checkpoint 的 `2026-08-17T12:00:00Z` expiry。Production 未稳定时先批准延长；稳定且恢复策略已转移到 Production backups 后，才批准删除或自然 expiry。
- 清理 Production rehearsal clone、temporary role/credential、plaintext dump 和本地临时执行文件；保留加密备份、checksum、无 secret manifest 与 previous V1 deployment record。
- V1 application artifact 可保留为历史恢复证据，但不能单独连接 Schema 6 main。长期回到 V1 仍需 Schema 5 数据恢复与切换后写入 reconciliation 决策。

**Approval Stop 7:** revoke key、delete branch/checkpoint、remove Shareable Link、delete backup 或改变 Preview availability 都是外部状态变更，逐项确认后执行。

## Immediate Stop Conditions

- Production target、branch parent、schema、deployment、canonical domain 或 environment identity 无法精确确认。
- secret、connection string、Shareable Link、backup key 或真实词汇内容出现在计划、diff、stdout、日志、manifest、截图或测试 artifact。
- backup 方法未选择、没有独立加密、restore rehearsal 不完整，或 final backup 与 cutover manifest 对不上。
- Production clone parity 发现 count/digest、Profile、Track、history、creation fact、Daily defaults 或约束异常。
- V1 在 Schema 6 上仍可写，V2 在 Schema 5 上仍可运行，或旧 V1 tab 能绕过 client contract guard。
- maintenance artifact 不能阻止全部 mutation，或 write-free window 中出现新 Production write。
- retained V1 deployment URL 仍能使用旧 database credential 到达写事务，或 main migration 只依赖 canonical-alias maintenance / browser client marker 来宣称 write-free。
- 任一 canonical migration hash 变化、migration sequence 被部分执行、transaction 状态不明或 `main` 存在未知 operation。
- paired rollback 缺少 V1 artifact、Schema 5 recovery、logical backup 或 post-cutover reconciliation decision。
- V2 新写入后有人要求直接 Reset 到 Schema 5，但没有保存 incident backup 和明确的数据损失/对账决定。
- Production AI gate 可由 Preview/browser/person_id 绕过，pricing 已在 2026-08-14 后 stale，旧 V2-7B-2 key 状态未解决，或 global quotas/Kill Switch/Cache/Idempotency 可绕过。
- Staging checkpoint 在 Production 稳定前已过 `2026-08-17T12:00:00Z` 且没有经过确认的替代恢复路径。
- official provider facts、plan limits、billing、retention、promotion 或 restore semantics 与本计划假设不一致。
- 任一 remote tool 请求 broader permission、plan upgrade、auto-reload、public access 或未批准的 mutation。

## Expected Local Implementation Files

Gate 1 实际文件与职责：

- `scripts/v2-stage8-3-contract.mjs`、`scripts/v2-stage8-3-db-core.mjs` 与 `scripts/v2-stage8-3-db.mjs`：non-empty inventory、clone/main exact guards、分别固定的 `0003` / `0004` migration sequence、Schema 6 inspect 与 parity artifact。
- `scripts/v2-stage8-3-cutover-manifest.mjs`：secret-free cutover/rollback evidence。
- `src/lib/ai-enrichment/runtime-config.ts` 与 tests：独立 Production AI scope、fresh pricing 和 `4` 次 rollout ceiling。
- `src/lib/security/production-cutover-mode.ts`、Production proxy/security guards 与 tests：三段 cutover mode、Basic Auth 优先、client contract version 与 fail-closed mutation boundary。
- `package.json`：只添加明确命名、不会被 test/build 误触的 dormant V2-8-3 remote-capable commands；Gate 1 的 Production project hash 尚未 pin，故当前命令即使获得环境变量也保持机械关闭。local fixture 测试直接使用依赖替换，不伪装成真实 DB dry-run evidence。
- focused tests：non-empty Schema 5、安全 count/digest、Schema 6 table/column/constraint/index/trigger contract、两份 migration hash/target drift、control-plane endpoint/branch binding、old-client refusal、AI ledger、paired rollback 与 secret-free output。

当前 tranche 不选择或安装 backup/encryption package；Gate 3 选择完成后再记录工具与命令。

## Exit Criteria

### Completed local Gate 1 tranche

- 本文件与 V2 Master/Architecture/README/AGENTS/Changelog/governance log 在主代理完成后保持同步，状态明确写为 local-only。
- Gate 1 guard tooling、focused/full tests、build、backup dry-runs、governance 和 diff review 通过。
- 最终结果为 13 个聚焦文件 / 138 项测试通过；完整 Vitest 为 77 个文件 / 484 项通过，既有 Postgres integration 文件 / 测试各跳过 1 项。Lint、TypeScript、三套备份模拟、manifest template、Production build、Tier 3 governance 与 diff 检查均通过；两轮独立只读复核未留下 P0/P1/P2。
- Gate 1 当时保持所有 Production/Preview/Neon/Gemini 连接、credential、remote inventory、deployment 和 mutation 未执行；后续 Gate 0B 的独立批准与证据记录在本文件前部。
- 向用户提交 changed-file inventory、验证结果和已知限制；Gate 0B、PF-002 历史 Instrument Preview 与当前 Geist rollback exact protected Preview 的机器验收已完成，但当前字体回退仍需人工收口；此前不进入 Gate 2，之后仍需要新的批准。

### Full V2-8-3 completion

- Protected Preview 已运行 V2-8-2.1 exact commit，`syd1` 与真实 network performance 已验证。
- Production official facts 与 non-empty Schema 5 inventory 已刷新并脱敏记录。
- 独立 encrypted logical backup 方法已选择，真实 restore rehearsal 和 final pre-cutover backup 均通过。
- Non-empty Production clone 的 Schema 5 → fixed `0003` + `0004` Schema 6、parity、recovery、logical restore 与再次迁移完整通过。
- write-free window、old-client guard、maintenance artifact、old V1 runtime database-write revocation、Production-only secrets、`main` migration 与 exact V2 promotion 按批准顺序完成。
- 既有单词、Track、settings、imports、Recognition history 和 person-separated data 全部保留；Schema 6 没有虚构 Active history 或丢失事件。
- Production AI 在最多 4 次初始调用内通过 Disclosure、generation、Replay、Cache、Kill Switch、accounting 与 cost 对账；随后才切换到无个人上限的全局 `300 / US$0.50 day / US$2 month` 边界。
- Auth、mobile widths、Dashboard、Daily Study、Active、Backup、logs、cost 与 `syd1` performance 验收通过。
- 至少一个自然日边界与用户/Mimi 实际学习稳定证据通过；最终 backup 完成，Preview key、旧 key、Shareable Link、checkpoint 和临时 clone 按各自批准收口。
- previous V1 deployment、Schema 5 recovery/backup 与 post-cutover reconciliation 决策被保留为可解释的 paired rollback record。
