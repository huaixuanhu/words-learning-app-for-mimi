# Words Learning App For Mimi V2 Stage 7B-1：Formal AI Local Orchestration

Created: 2026-07-17 AEST
Last updated: 2026-07-17 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md` 的 `V2-7 AI Enrichment And Cost Guard`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE7A_LOCAL_AI_ENRICHMENT_COST_GUARD.md`
- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`
- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md`
- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md`
- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`
- `plan_docs/PLAN_V2_STAGE3_1_REVIEW_INTERACTION_CONTEXT_WORD_ACTIONS.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- 用户在 2026-07-17 对 `V2-7B-1` / `V2-7B-2` 命名与 `V2-7B-1` 直接执行的确认

Scope:

- 先以文档冻结 `V2-7B-1` 的本地正式 AI 路线，再实现仍保持 provider（供应商）关闭的完整服务器编排。
- 将当前 Disclosure（外发说明）升级到 `ai-disclosure-v2`，明确 Google paid Gemini API 的外发字段、排除字段、最多 55 天 abuse monitoring（滥用监测）保留、可能的授权人工复核、模型不准确性和当前应用成本边界。
- 添加短、可读、English-first（英文优先）且在外部数据传输处提供必要双语说明的确认界面。当前确认必须绑定 server-derived person（服务器推导的使用者）、随机 browser session（浏览器会话）、Disclosure version/digest（版本与摘要）和确认时间；它不是登录或 confidential identity（保密身份）。
- 在尚未远程执行的 `db/migrations/0003_v2_schema6_data_model.sql` 中增加 operational-only（仅运行期）Disclosure confirmation、request Idempotency 和同一 canonical Cache request（标准化缓存请求）的 in-flight guard（进行中保护）。这些记录不进入用户 JSON backup、restore 或 CSV。
- 正式请求只接受 server-owned vocabulary id、固定 feature/version、当前 Disclosure version 和 Idempotency Key。服务器重新读取词条，推导 person，拒绝 archived/missing source，并仅构造既有 allowlist 中的 lexical fields（词汇字段）。
- `context_explain_v1` 必须再次按当前 stored example（已保存例句）验证 example index、UTF-16 start/end 和 exact actionable token（精确可操作词段）。
- 使用 server-side SHA-256 canonical hashes（服务器标准摘要）生成 source、request、Idempotency 和 Cache key；浏览器不能提供内部 hash 或 provider 参数。
- 在一个可测试的 orchestration（编排）顺序中连接 current Disclosure evidence、Idempotency claim/replay、formal Cache、same-Cache in-flight guard、atomic global reservation（全局原子预留）、Gemini adapter、strict validation、usage reconciliation（用量对账）和 minimal persistence（最小保存）。
- 将成功 run settlement（运行结算）与 enrichment draft / context Cache 保存放入同一数据库事务；provider 返回后、正式保存前再次重读 source hash，避免并发编辑后的旧结果落库。
- 对 HTTP 200 但 finish/JSON/semantic validation（语义校验）失败的响应，在可靠 usage metadata 已经存在时继续保守对账；missing/invalid usage 或 missing/unexpected model version 继续 fail closed（关闭式失败）。
- 在 Gemini `generateContent` 请求中显式保留 `minimal` thinking、`store: false`、no tools、no grounding、no retry、700 output/thinking token 上限和 90 秒 provider timeout。
- 添加 server-backed draft accept/reject 与 accepted candidate `Add to learning` 事务边界，使 Postgres runtime（数据库运行模式）不再依赖 browser-local whole-snapshot commit；最终保存前继续允许编辑、删除与 Track 确认。
- 保留 Stage 7A local fixture experience（本地固定预览）和现有动态效果不变；local runtime 继续不发送 lexical data。
- 添加 focused tests、Schema/backup parity、mobile/browser regression 和 Tier 3 文档/日志同步。

Non-Scope:

- 不读取、复制、修改或使用 `.env.stage2.local`、`.env.local`、任何 Gemini key、database credential 或 Vercel credential。
- 不发送 Gemini、Neon 或其他外部请求，不产生付费调用。
- 不连接、创建、迁移、写入或删除 Neon branch/database；不执行 `0003_v2_schema6_data_model.sql`。
- 不添加 Vercel Preview/Production environment variable，不修改 WAF、domain、deployment 或 provider account setting。
- 不移除 formal route 的 provider activation hard gate。任何环境变量组合在 `V2-7B-2` 完成前都不能提交真实 Gemini 请求。
- 不把 `person_id`、Disclosure session 或 shared Basic Auth 描述成 SSO、authorization 或 confidential tenant isolation。
- 不增加 per-person AI limit。全局边界继续为 300 attempts / Melbourne day、600,000 input tokens/day、210,000 output/thinking tokens/day、US$0.50/day、US$2/month、concurrency 2。
- 不添加 Datamuse、Free Dictionary、Groq、AI Gateway、provider failover、tools、Search grounding、URL context、File API、chat、streaming、audio upload、Speech Recognition 或 AI pronunciation scoring。
- 不修改 Recognition/Active FSRS、Daily Episode、Dashboard insight、现有动画、transition timing 或 reduced-motion behavior。
- 不提升 JSON backup version；新增 Disclosure、Idempotency、Cache、quota 和 session 记录均为 operational data。
- 不执行 `V2-7B-2`。临时非生产 Schema 6、Auth Key、synthetic provider smoke 和清理需要新的明确批准。

Exit criteria:

- 文档明确采用 `V2-7B-1` / `V2-7B-2`，不存在 A/B 平行命名。
- 当前 Disclosure 使用 `ai-disclosure-v2` 和 server-owned digest；UI 清楚表达仅发送 lexical allowlist、排除个人学习证据、paid content 不用于改进 Google products、abuse monitoring 最多 55 天、可能的授权复核和 AI 不准确性。
- Disclosure confirmation 使用 HttpOnly、SameSite=Strict 的随机 session cookie；数据库只保存摘要。确认按 person/session/version/digest 复核，不能把 request 里的 version 当作确认事实。
- `ai_request_idempotency` 能保存 Cache hit 的新 key、返回 successful replay、稳定表示 in-progress/failed replay，并拒绝同 key/different request hash。
- 不同 Idempotency Key 的相同 Cache request 只能有一个 `processing` owner；其余请求返回低压力 `already_processing`，不会重复预留或调用 provider。
- 服务器重读 source、精确 context span、outbound allowlist 和 SHA-256 hashes 均有测试。source 在 provider 等待期间修改或删除时，结果不会保存为当前建议。
- Cache hit 和 Idempotency replay 均发生在新 quota reservation 前；Cache hit 不增加 provider attempts。
- 新 provider attempt 在调用前完成现有 global atomic reservation；attempt 一旦提交，429、timeout、safety refusal、invalid structure 和 ambiguous network failure 继续保留 request count。
- 成功 settlement、draft/context result 和 Idempotency result 在同一事务完成。可靠 usage 会在 rejected/failed output 中对账；缺失 model/usage、错误结构或超出预留均 fail closed。
- provider adapter 显式发送 `store: false`、`thinkingLevel: minimal`、strict schema、no tools/grounding/retry，并保持 lazy initialization（按需初始化）和 server-only secret。
- Postgres formal UI 使用 Route Handler 生成与 server mutation 完成接受/拒绝/加入学习；local fixture path 继续不调用 `/api/ai/*`。
- learner-visible Gemini result 使用 server-owned lineage 显示：`Generated by Gemini 3.1 Flash-Lite · AI content may be inaccurate. Please review carefully before saving.`
- Stage 7A fixture backup/restore lineage继续 round-trip；operational tables 不进入 backup version 3，且无需 backup version 4。
- formal default runtime 和正式 Route Handler 在无 `V2-7B-2` activation proof 时继续返回 resting/disabled，测试也不能访问真实网络。
- lint、typecheck、全量 tests、三套 backup dry-run、build、governance preflight、diff check 和 320–1280 px 相关浏览器回归通过。
- README、Architecture、AGENTS、V2 master、Changelog 和 AI Agent Log 与实现一致。

Document nature:

本文件是 `PLAN_V2_MASTER.md` 中 V2-7 的派生实现子计划。它只授权 `V2-7B-1` 的本地文档、尚未执行的 forward-only（只向前）Schema 6 草案、应用代码、测试和本地验证。它不授权 `V2-7B-2`、credential、provider call、remote database、Vercel、WAF 或 deployment。

Status: complete locally on 2026-07-17. Provider execution remains closed; `V2-7B-2` is not started.

## Official Provider Baseline Recheck

2026-07-17 只读官方核验确认：

- Stable model id 仍为 `gemini-3.1-flash-lite`；当前 deprecation 表记录 earliest shutdown 为 2027-05-07。
- Standard paid price 仍为 US$0.25 / 1M text input tokens 和 US$1.50 / 1M output including thinking tokens。
- `generateContent` 继续支持 Structured Outputs、`responseJsonSchema`、Thinking Level 和 `usageMetadata`；本项目保持 stateless one-shot（无状态单次）路线。
- Paid prompts/responses 不用于改进 Google products，但 prompts、context 和 output 会因 policy enforcement（政策执行）保留 55 天；flagged content 可能由授权 Google 人员复核。
- Generate Content 的 project logging 默认 `store=false`，本项目仍显式发送 `store: false`，避免项目设置变化扩大保存面。这不取消独立的 55 天 abuse monitoring。
- 新 key 应使用 Gemini Auth Key。现有 Stage 2 key 的类型与当前可用性未检查，不能作为后续执行假设。
- Provider RPM/TPM/RPD 与 account tier 属于 account-specific facts（账户特定事实），留给 `V2-7B-2` 只读确认；应用自身的较低 global guards 继续独立生效。

## Required Server Order

```text
Route auth + same-origin + strict JSON
  -> runtime hard gate
  -> server-owned vocabulary lookup / context span rebuild
  -> current Disclosure confirmation evidence
  -> request Idempotency claim or replay
  -> formal Cache hit or same-Cache in-flight result
  -> global atomic provider reservation
  -> one-shot Gemini generateContent
  -> model / usage / finish / JSON / semantic validation
  -> source re-read and source-hash comparison
  -> atomic run settlement + result persistence + Idempotency completion
  -> server-owned lineage response
```

`V2-7B-1` 的默认正式 runtime 在 `runtime hard gate` 处停止。后续层只能通过 dependency-injected fake provider/database（注入式模拟供应商与数据库）测试；真实 provider 仍不可达。

## Operational Data Contract

### Disclosure confirmation

- 随机 session token 只存在于 HttpOnly cookie；数据库保存 SHA-256 hash。
- confirmation 绑定 person、Disclosure version、Disclosure digest 和 confirmed-at。
- `person_id` 由 source item 推导，不由浏览器声明；它仍不是 authenticated identity。
- Disclosure provider、model family、sent/excluded fields、retention 或 terms 实质变化必须发布新 version/digest 并要求重新确认。
- confirmation 记录不进入用户 backup。Restore 的历史 accepted lineage 不产生当前 confirmation。

### Formal Idempotency and Cache ownership

- Idempotency key 先按 person + server hash 查询；same key/different canonical request 为 conflict。
- Cache hit 仍写一条 operational Idempotency completion，指向原 successful run，所以同 key 后续可稳定 replay。
- processing record 具有 person + cache-key partial uniqueness（条件唯一性），阻止不同 key 对同一结果重复调用。
- failed replay 返回已保存的安全 failure category，不自动重试。
- in-progress owner 超过 bounded lease 后只可由服务器恢复；任何 stale recovery 都不退还已提交 attempt。

### Minimal persistence

- Enrichment success 保存 `ai_runs` 与一个 editable `ai_enrichment_drafts` draft。
- Context success 保存 `ai_runs` 与七天 `ai_context_explanation_cache`。
- raw Prompt、raw provider response、raw session token 和 browser Idempotency Key 不保存。
- terminal provider category、provider response id、validated usage、latency、model lineage 和 estimated cost 属于最小诊断证据。
- accepted content、accepted relation 和 retained successful lineage 继续遵循 backup version 3；其余 operational state 排除。

## V2-7B-2 Gate

`V2-7B-2` 必须另建派生执行计划并重新获得用户确认。建议边界为：

- 从 `staging` 派生临时、可删除的非生产 database target，使用 synthetic data；不提前迁移长期 `staging`。
- 创建或确认一个新的 Gemini Auth Key，只放在 server-only、ignored、non-Production 环境中。
- localhost-only（仅本机）运行完整正式路线；Vercel Preview 在有独立保护前保持 AI disabled。
- 最多两个 provider attempts：`enrichment_v1` 与 `context_explain_v1` 各一个；Cache/Idempotency replay 不增加调用。
- 验证 observed model、finish、usage、thinking、cost、Cache、replay、Kill Switch 和降级状态。
- 完成后重新关闭 provider runtime、清理 synthetic rows，并删除临时 database target。
- 不迁移 Production、不部署 Production；V2-8 继续负责长期 Staging rehearsal、Preview、WAF、Production backup/migration/deployment 和最终 smoke。

## Local Implementation Outcome

V2-7B-1 已按本文件完成本地实现：

- 新增 `ai-disclosure-v2`、随机 HttpOnly / SameSite=Strict session cookie、server-owned disclosure digest 与 person/session/version/digest 确认证据；数据库只保存 session token 的 SHA-256 摘要。
- 完成 server-owned item/context 重建、canonical source/request/idempotency/cache hash、完整 Idempotency replay/conflict、Cache-before-quota、same-Cache processing owner 与 150 秒 bounded lease。
- 完成 global atomic reservation、可靠 failure usage reconciliation、source re-read、terminal category 与 result/settlement 同事务保存边界；fake dependencies 覆盖 provider 成功与失败路径。
- Gemini adapter 使用顶层 `store: false`、`thinkingLevel: minimal`、strict response schema、700 token 上限、无 tools/grounding/retry 与 90 秒 timeout；missing lineage/usage 继续 fail closed。
- Postgres formal UI 已接通 Disclosure、生成、接受、拒绝与 candidate `Add to learning` 的服务器操作；browser-local fixture 路线继续不访问 `/api/ai/*`，现有动画与 reduced-motion 规则未改。
- `db/migrations/0003_v2_schema6_data_model.sql` 增加 Disclosure confirmation、request Idempotency、processing lease 和 terminal category，但仍是未执行草案；JSON backup 保持 version 3，新增 operational records 不进入备份。
- code-owned activation state 在所有环境变量组合下仍要求 `V2-7B-2` proof；正式 Route Handler 继续返回 calm `provider_activation_pending`，真实 Gemini client 不可达。

Local validation：ESLint、TypeScript、61 个 test files / 356 个 tests、三套 backup dry-run、Next.js Production build、Tier 3 governance preflight 和 `git diff --check` 全部通过；现有 Postgres integration file/test 继续跳过。Home 与 Library 在 320、390、768、1024、1280 px 均无横向溢出，浏览器控制台无错误。开发模式曾因本机 `EMFILE` 文件监听上限返回 404，改用同一已通过 build 的本地 Production server 后页面与响应式验收正常；该本机资源问题未触发代码或动画调整。

本阶段没有读取任何环境变量值或凭证，没有发起 Gemini/provider 请求，没有连接远程数据库，没有执行 SQL migration，也没有进行 Vercel、部署或 Production 操作。

## Test Matrix

- stale/missing/wrong-person/wrong-session Disclosure confirmation；
- session cookie absence、tampering、rotation 和 raw-token non-persistence；
- missing/archived source、server-derived person 和 outbound allowlist；
- repeated token exact UTF-16 span reconstruction；
- stable canonical SHA-256 source/request/idempotency/cache hashes；
- Cache hit before quota、same-Cache parallel request suppression；
- successful/in-progress/failed replay 和 same-key/different-request conflict；
- global 300 attempts、600k/210k tokens、US$0.50/day、US$2/month、concurrency 2；
- provider success、429、timeout、safety block、bad finish、invalid JSON、invalid semantic draft、missing/invalid usage、missing/wrong model；
- reliable failure usage reconciliation；
- atomic settlement/result/Idempotency persistence rollback；
- source edit/delete during provider wait；
- formal edit/accept/reject、duplicate reuse、Track confirmation 和 relation lineage；
- local fixture zero-network regression；
- accepted-only backup parity and operational-table exclusion；
- formal route hard-disabled default、lazy client initialization 和 secret-free build；
- mobile dialog、focus、keyboard、light/dark、existing motion/reduced-motion regression。
