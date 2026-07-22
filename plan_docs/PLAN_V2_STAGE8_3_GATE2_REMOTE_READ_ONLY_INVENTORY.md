# Words Learning App For Mimi V2-8-3 Gate 2：Remote Read-only Inventory

Created: 2026-07-22 AEST
Last updated: 2026-07-22 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md` 的 `Gate 2`

Derived from:

- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- `plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md`
- `plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md`
- `plan_docs/PLAN_V2_STAGE7B_1_FORMAL_AI_LOCAL_ORCHESTRATION.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md`

Scope:

- 执行用户在 2026-07-22 明确批准的 Vercel、Neon、Gemini 与 Google Cloud TTS 远程只读清单。
- 刷新与上线直接相关的官方事实，并只记录脱敏 metadata（元资料）、数量、状态和摘要。
- 关闭用户明确接受的 PF-002 / PF-003，固定已独立确认的 Production Neon project SHA-256（项目摘要），完成上线前本地收口。

Non-Scope:

- 不读取或保存 secret value（密钥值）、数据库连接串、Shareable Link 或个人词条内容。
- 不创建、撤销或旋转 credential（凭证），不修改环境变量、alias（域名指向）、Firewall（防火墙）或账户设置。
- 不建立备份、恢复目标或 Production clone，不迁移 Neon `main`，不部署或提升 V2，不产生 Gemini/TTS 调用，不写 Production 资料。

Exit criteria:

- Production target、当前 Schema/资料基线、托管平台状态、AI/TTS 身份边界与官方能力均有 checked-at（核验时间）记录。
- 代码只保留 Production project SHA-256，不保留原始 project id；focused/full local gates 通过。
- 明确列出 Gate 3 前必须处理的差异，并停在 Approval Stop 2。

Status: `Complete / Approval Stop 2`. Gate 3 及之后的任何 mutation（变更）均未批准。

## 1. Human Decisions

- 用户明确接受 PF-002 与 PF-003。两项以 `Closed by explicit acceptance` 收口；这不伪装成一次新的人工字体舒适度复测或 Active 完成音效试听。
- iPhone + Safari 仍没有形成兼容性证据；如果未来出现设备特定问题，登记新的 PF，不静默改写本次接受记录。
- 用户批准 Gate 2 远程只读清单与上线前本地收口。批准没有延伸到 Gate 3 备份/恢复、credential cleanup（凭证清理）、Production clone、迁移或部署。

## 2. Execution Boundary

Checked at: 2026-07-22 AEST.

- 通过已登录控制台读取 Vercel、Neon、Google AI Studio 与 Google Cloud metadata；没有提交设置表单。
- 在 Neon SQL Editor（SQL 编辑器）中只运行结构、数量、引用完整性和只读事务状态查询；没有显示词条内容，没有执行 DDL/DML（结构或资料写入）。
- 没有读取 `.env`、Vercel secret value、数据库 URL、API key value 或私有访问链接。
- 没有调用 Gemini 或 Cloud TTS provider（供应商），也没有改变现有 Kill Switch（紧急关闭开关）。

## 3. Release Target Binding

- Local branch `V2`、`origin/V2` 与 Gate 2 开始时的 clean HEAD 一致：`78064c3c406eceaeedd672f795d85822e9356354`。
- Production Neon project 通过已登录控制台独立确认。仓库只固定其 SHA-256：
  `70b4a70d6cfcd6a872c5d9be7649be69332266624fb3cfec3aa6b32143caa880`。
- 原始 project id 未写入本文件、source code（源代码）、测试输出或 Git diff。
- `scripts/v2-stage8-3-contract.mjs` 仍要求 live Neon control-plane（控制面）交叉验证 project、endpoint、branch、parent、state、database、role、target、action 与人工确认；固定摘要本身不能建立连接或执行迁移。

## 4. Vercel Inventory

### Current Production

- Project/team：`anorias-projects/words-learning-app-for-mimi`，Hobby plan。
- Canonical domain：`https://words-learning-app-for-mimi.vercel.app`。
- Current Production deployment：`dpl_4oVt6ctZXcEoAbFGGWEDCJasLnGf`，source commit
  `6837d8c7c3b8c974afd7f86b9dd6fb9219b19b10`，状态 `Ready / Current / Production`。
- Source 仍是 V1 的 `main` merge；15 个 Functions 显示在 `IAD1`。Production 尚未运行 V2 的 code-owned `syd1` contract。
- Production environment 只确认这些名称存在：Basic Auth 两项、`MIMI_STORAGE_RUNTIME` 与三项 Postgres URL 名称。未查看 value。
- Production 尚无 V2 cutover mode、Schema 6 confirmation、AI accounting/provider 或 Cloud TTS/WIF 变量。

### Current V2 Preview

- Latest clean `V2` deployment：`dpl_A4e8QV1VeqTof9i1j6eeUyH9k6o1`，source commit
  `78064c3c406eceaeedd672f795d85822e9356354`，状态 `Ready / Preview`。
- V2 branch Preview 继续拥有独立的 Preview-only study token、Gemini、Schema/accounting 与 TTS/WIF variable names；没有读取 value，也没有把它们复制到 Production。
- Deployment retention（部署保留）已启用。

### Official contract refresh

- Vercel 当前文档说明：直接把 Preview promote（提升）到 Production 会以 Production 环境重新 build（构建）；Preview 环境值不会原样成为 Production 值。
- `vercel --prod --skip-domain` 可先生成不接管域名的 Production build，再经独立检查后 promote。Gate 5 应采用这一 staged Production（分阶段正式部署）路径，避免把 Preview artifact 当成可原样提升的正式版本。
- Hobby Instant Rollback（即时回退）只保证立即前一个 Production deployment。即使应用回退可用，V1 artifact 也不能连接已迁移的 Schema 6；应用与数据库仍必须成对回退。

Official sources:

- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/cli/promote
- https://vercel.com/docs/deployments/promoting-a-deployment
- https://vercel.com/docs/instant-rollback

## 5. Neon Production Inventory

### Project and branch topology

- Region：AWS Asia Pacific 2 (Sydney)；PostgreSQL 17；Free plan。
- `main` 是无 parent 的 Production root branch；`staging` 是 `main` 的 child，且当前为 Neon Console default branch。Default 标记不改变应用的 Production target。
- 旧 `v2-8-2-staging-schema5-recovery-20260718` 仍存在、parent=`staging`、无 compute；控制台确认到期时间为 `2026-08-17T12:00:00Z`，即 Melbourne `2026-08-17 22:00`。只打开并取消 expiry dialog，没有保存变更。
- 三个已知 branch 完整对应控制台的 `3 / 10 Branches`；没有发现额外未知 child。

### `main` Schema 5 baseline

- Database label：`neondb`；role label：`neondb_owner`；未读取 connection string。
- Schema 6 marker columns：`0`，因此当前仍是 Schema Version 5。
- Public tables：`8 / 8` expected；Schema 5 constraints：`9 / 9` expected；required index：`1 / 1`。
- 两个 expected trigger names 均存在。`information_schema.triggers` 因每个 event 展开而返回 4 行，不能误记为 4 个独立 trigger。
- Counts：people `1`；vocabulary_items `1486`；import_batches `38`；review_states `125`；review_events `203`；review_settings `1`；backup_imports `0`；backup_import_mappings `0`。
- Track counts：Recognition `1486`；Active `0`；archived `0`。
- 六组 orphan/reference invariants（孤立或引用异常）均为 `0`；检查时 assigned transaction id（已分配事务编号）的并发事务为 `0`；`pgcrypto` extension 未安装。
- 本 Gate 没有导出个人 row，也没有生成 `safe-inventory-v1` 全表 digest。完整 digest 需要在 Gate 3/4 的受控、加密、credentialed（使用获批凭证）流程中生成，不能用控制台截图或本地自证替代。

### Restore and resource facts

- `main` Backup & Restore 页面明确显示 `6 hour history window`。Gate 2 观察时最早可恢复点约为当天 16:30 Melbourne。
- Free plan 当前公开边界为每 project 每月 100 CU-hours、0.5 GB storage、5 GB network transfer 与 6 小时 history。控制台显示项目约 0.07 GB storage、2.98 CU-hours、0.14 GB network transfer；这些用量可能延迟。
- 六小时窗口不足以替代独立 encrypted logical backup（加密逻辑备份），也不足以单独支撑跨日 rollback。

Official sources:

- https://neon.com/pricing
- https://neon.com/docs/introduction/branching
- https://neon.com/docs/introduction/branch-expiration
- https://neon.com/docs/guides/branch-restore

## 6. Gemini Inventory

### Model, price and quota

- Google AI Studio project 为 Tier 1 / Prepay；模型 `gemini-3.1-flash-lite` 当前显示为 stable（稳定版）。
- AI Studio 的当前 project-level（项目级）限额：`4,000 RPM`、`4,000,000 TPM`、`150,000 RPD`。过去 28 天峰值显示 `42 RPM`、`32.33K TPM`、`240 RPD`。
- 官方 Standard synchronous price（标准同步价格）仍为 text/image/video input `US$0.25 / 1M tokens`、output/thinking `US$1.50 / 1M tokens`。现有应用 `US$0.50/day`、`US$2/month`、300 attempts/day、token 与 concurrency 2 的边界远低于供应商 quota，必须继续由应用自己执行。
- 现有 price contract 在 `2026-08-14T00:00:00.000Z` 后 fail closed；本次 checked-at 尚未到期，且官方价格未变，因此不改写版本化价格常量。

### Logging and data boundary

- GenerateContent project logging 当前关闭；Interactions API logging 当前开启并使用默认 55 日 project-log retention。应用只调用 GenerateContent，并显式发送 `store: false`。
- AI Studio Logs 当前显示 `0` entries。Project logging 与 paid-service abuse monitoring（付费服务滥用监测）继续分别描述，不作 Zero Retention（零保留）承诺。
- Google 当前条款说明 paid services 的 prompts/responses 不用于改进产品；仍只发送最小词汇上下文。

### Credential metadata and incident boundary

- 三把 Gemini Auth Key 的清单 metadata 显示为 Available、绑定 service account 且限制到 Gemini API；清单本身没有展示 value，后续详情页发生的意外显示按下项单独记录。
- 较旧的 `mimi-v2-7b-2-proof-2-20260718` 仍为 Available，无法从 Vercel variable name-only 清单证明它已无人引用。因此 Production AI 保持关闭。
- 控制台详情交互意外让该旧 proof key 的 value 在自动化会话中短暂可见。该值没有被复制、使用、写入文件或提交；从安全角度它应视为需要 rotation/revocation（轮换/撤销）的旧凭证。任何撤销前仍须先确认 Preview 未引用，并获得单独 credential mutation approval（凭证变更批准）。
- Production 必须创建独立的 Auth Key；不得复用 Preview 或 proof key。

Official sources:

- https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/logs-policy
- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/terms

## 7. Google Cloud TTS Inventory

- Project `For TTS` 的 Cloud Text-to-Speech API 已启用。过去 1 日控制台显示 9 requests、0 errors、median 288 ms、p95 500 ms。
- Preview service account `mimi-tts-preview` 为 enabled，显示 `没有密钥`；没有长期 service-account key。
- Workload Identity Pool `mimi-vercel-preview` 与 OIDC provider `Mimi V2 Preview` 均 enabled，并关联 `mimi-tts-preview`。这是 Preview-only identity，不是 Production identity。
- IAM Service Account Credentials API 与 Security Token Service API 各显示 4 requests、0 errors，与已完成的 Preview WIF 证明一致。
- Production 尚无独立 TTS service account、WIF pool/provider 或 Vercel Production variables；Gate 5 前必须单独设计和批准，不复用 Preview subject binding。
- 官方 Standard voice 当前前 4,000,000 characters/month 免费，之后 `US$4 / 1M characters`；默认 project request quota 为 1,000 requests/minute，单次 content limit 为 5,000 bytes。应用自己的 TTS Cache、daily/monthly character/cost、attempt、concurrency 4 与 Kill Switch 继续作为更小边界。

Official sources:

- https://cloud.google.com/text-to-speech/pricing
- https://cloud.google.com/text-to-speech/quotas

## 8. Local Closeout And Drift Repair

- 将 Production project SHA-256 写入 code-owned constant，并更新 focused test，证明不同 project 在任何 control-plane request 前被拒绝。
- 统一 V2-8-3 文档与工具的 migration sequence 为 immutable（不可变）`0003 -> 0004 -> 0005`，三份 SHA-256 独立固定并在同一 outer transaction（外层事务）执行。
- PF-002 / PF-003 更新为 `Normal / Closed by explicit acceptance`；V2-8-2.3 再次 complete。接受不扩大 Motion、FSRS、Daily Episode、Schema、TTS 或资料契约。
- 本文件不声称已经生成 Production encrypted backup、恢复证明、clone parity、Production credential 或可部署的 Production V2 artifact。

## 9. Differences Requiring A Later Approval

1. Gate 3 必须选择并演练独立 encrypted logical backup；Neon `main` 只有 6 小时 history。
2. 在任何 AI Production activation 前，确认 Preview 当前 key 引用，随后单独批准清理旧 proof key，并建立独立 Production Gemini Auth Key。
3. Production 需要独立 study-token secret、cutover/Schema/accounting variables、Gemini 与 TTS identity；当前只有 V1 基础变量。
4. Gate 4 必须创建非空 Production clone，生成完整 `safe-inventory-v1` digest，演练 `0003 -> 0004 -> 0005`、parity、恢复与再次迁移。
5. Gate 5 必须先建立 maintenance/write-free（维护/暂停写入）窗口和旧 V1 runtime 写入拒绝证据，再执行 final backup、`main` migration 与 staged Production deployment。

## 10. Approval Stop 2

Gate 2 只读清单与本地收口到此结束。Production target 已由摘要固定，当前资料基线没有发现异常；上线仍未获准。

下一项需要用户另行批准：

- Gate 3 encrypted logical backup method selection（加密逻辑备份方法选择）与一次隔离 restore rehearsal（恢复演练）；
- 与 Gate 3 分开列明的 Gemini 旧 proof key 引用确认和 credential cleanup 处理方式。

在取得批准前，不运行任何 `v2:8-3:db:*` 远程命令，不创建/修改 Neon branch，不修改 Vercel/Google 环境或凭证，不迁移 `main`，不部署 Production。
