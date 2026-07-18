# Words Learning App For Mimi V2-7B-2：Non-Production Provider Proof

Created: 2026-07-18 AEST
Last updated: 2026-07-18 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md` 的 `V2-7 AI Enrichment And Cost Guard`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE7B_1_FORMAL_AI_LOCAL_ORCHESTRATION.md`
- `plan_docs/PLAN_V2_STAGE7A_LOCAL_AI_ENRICHMENT_COST_GUARD.md`
- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`
- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md`
- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- 用户在 2026-07-18 对临时 Neon child branch（子分支）、新 Gemini Auth Key（认证密钥）、最多两次合成词汇调用、完整清理和 `ai-disclosure-v3` 的明确确认

Scope:

- 先完成本文件及父计划同步，再开始任何 credential（凭证）、remote database（远程数据库）或 provider call（供应商调用）。
- 将当前外发说明升级为 `ai-disclosure-v3`，准确区分 paid-service limited safety / abuse / legal logging（付费服务有限期安全、滥用与法律日志）和可选 Project logging（项目日志）。界面保持短、可读，并继续说明发送字段、排除字段、AI 不准确性与成本边界。
- `generateContent` 继续显式发送 `store: false`；本次 smoke 前必须确认可选 Project logging 没有启用。无法确认时停止真实调用。
- 添加 code-owned localhost-only（代码控制、仅本机）激活证明。仅当专用执行标记、临时 Postgres Preview runtime、Schema 6、accounting、provider enable 和 Kill Switch 状态全部匹配，并且不存在 Vercel runtime 标记时，Route Handler 才能装载正式 runner。
- 添加独立于长期全局 300 次额度的 `V2-7B-2` provider-attempt ceiling（供应商尝试上限）：临时目标最多两次，`enrichment_v1` 与 `context_explain_v1` 各一次。一次请求提交给 provider 后，无论成功、超时或被拒绝，都占用一次。
- 从 Neon `staging` 创建一个有到期时间、完成后删除的 schema-only temporary child branch（仅结构临时子分支），避免复制任何长期分支数据；使用专用 temporary role（临时角色），执行当前未落远端的 forward-only Schema 6 migration，并只写 synthetic vocabulary（合成词汇）与运行证据。
- 新建一个本阶段专用 Gemini Auth Key，只写入 ignored（Git 忽略）、mode `600` 的 `.env.v2-7b-2.local`，不复用或读取 `.env.stage2.local`、`.env.local` 或 Vercel secrets。
- 在 localhost 正式路线中各执行一次 enrichment 与 exact-span context explanation，核对 observed model、finish、usage、thinking/output token、estimated cost、lineage、Disclosure evidence、source revalidation 与 atomic settlement。
- 使用同一 Idempotency Key（幂等键）验证 replay，再使用不同 key 的同 canonical request 验证 Cache；两者都不得增加 provider attempt。开启 Kill Switch 验证请求在调用前关闭。
- 完成后重新关闭代码运行门、撤销 Auth Key、删除临时 Neon branch/role、删除 `.env.v2-7b-2.local`，同步计划、Architecture、README、Changelog、AGENTS 和 AI Agent Log。

Non-Scope:

- 不连接、迁移、写入或删除 Neon `main` / Production。
- 不迁移或写入长期 Neon `staging`；`staging` 只作为只读 branch parent（分支父级）和结构来源。
- 不使用真实学习记录、真实姓名、复习历史、typed answer（输入答案）、audio、personally identifying data（个人识别信息）或现有用户词库进行 smoke。
- 不配置或读取 Vercel Preview / Production environment variable，不部署、不修改 domain / WAF / Firewall，不进行 Production smoke。
- 不修改长期全局 300 attempts/day、600,000 input tokens/day、210,000 output/thinking tokens/day、US$0.50/day、US$2/month、concurrency 2 的边界；本阶段额外两次上限只会收紧它们。
- 不引入 personal attempt limit；`person_id` 继续不能拆分全局安全与成本边界。
- 不添加 retry、provider failover、Gemini alias、Datamuse、Free Dictionary、Groq、Search grounding、tools、URL/File context、streaming、audio upload、Speech Recognition 或 AI pronunciation scoring。
- 不修改 Recognition / Active FSRS、Daily Episode、Dashboard、键盘控制、现有动画、transition timing 或 reduced-motion behavior。
- 不把本次 private personal app（个人私有应用）的必要披露扩展为 public-app compliance（公共应用合规）项目；未来公开发布或用户范围变化时再单独复核。
- 不执行 Git commit、GitHub push、pull request、merge 或 Vercel deployment。

Exit criteria:

- `ai-disclosure-v3` 的 server-owned version/digest、UI、Route Handler、backup validator 和测试一致；历史 v1/v2 lineage 仍可读取，但新的正式确认只接受 v3。
- Disclosure 文案不再声称 abuse monitoring 固定为 55 天；optional Project logging 与 limited safety / abuse / legal logging 分开说明。
- 只有明确的 localhost smoke scope 能装载正式 Postgres/Gemini runners；默认、本地 fixture、test、Vercel、Preview 和 Production 均继续 fail closed。
- 临时 Neon target 可证明为 `staging` 的 schema-only child branch，使用专用临时 role，迁移前核心表为空，Schema Version 6 inspection 通过，且只含 synthetic data。
- 本次运行最多存在两条 submitted provider attempts；失败尝试也计数，第三次在 provider call 前被数据库原子拒绝。
- 一次 enrichment 与一次 context result 都报告固定 `gemini-3.1-flash-lite` lineage、有效 finish/usage、可对账成本和最小持久化结果；出站 payload 仅含既有 lexical allowlist。
- Idempotency replay、Cache hit 和 Kill Switch 验证均不增加 provider attempt；相同 key/different request 仍冲突。
- 两次调用的 reservation 上界为 US$0.0031；observed estimated cost 不超过 reservation，也不突破现有日/月总边界。
- 新 Auth Key 从未出现在 tracked file、terminal output、test snapshot、browser client bundle、Git diff 或 Vercel；临时环境文件权限为 `600`。
- 结束时 Auth Key 已撤销、临时 branch/role 已删除、`.env.v2-7b-2.local` 已删除，默认 provider gate 重新关闭；无法可靠确认清理时不得把阶段标记为 complete。
- lint、typecheck、focused/full tests、三套 backup dry-run、Schema 6 inspect、build、governance preflight 和 `git diff --check` 通过。

Document nature:

本文件是 `PLAN_V2_MASTER.md` 中 V2-7 的派生执行子计划。它只授权一次短暂、可清理、使用合成词汇的 localhost provider proof。它不授权长期 Staging、Vercel、Production、部署或真实学习数据外发。

Status: complete on 2026-07-18 with one contained credential-output incident. The disposable non-Production proof, cleanup, and final local validation passed. The first unused temporary key did not satisfy the original no-output criterion; it was treated as compromised before any call, manually revoked, and replaced. Production activation remains outside this plan.

Exit-criteria exception:

- The planned statement that every new Auth Key would remain absent from all tool output is not literally true for the first, unused key. It appeared once in browser-structure output, so execution stopped before provider use and the key was never saved to the environment file.
- This exception is closed operationally: the exposed key and the replacement proof key were both manually revoked, their names were confirmed absent in AI Studio, the temporary environment file and in-memory values were removed, and the disposable database target was deleted. The incident remains recorded here, in `CHANGELOG.md`, and in `governance/AI_AGENT_LOG.md`; it is not rewritten as a fully met criterion.

## Execution Evidence And Outcome

### Temporary database target

- Neon project: `words-learning-app-for-mimi-neon` (`lucky-bread-29481598`).
- Read-only parent: `staging` (`br-ancient-dawn-a7heegpm`).
- Disposable schema-only child: `v2-7b-2-smoke-20260718` (`br-jolly-morning-a7z0he8c`), endpoint `ep-spring-cherry-a73qydpd`.
- Migration preflight found `0` people, vocabulary items, review states, review events, and review settings. No long-term learning row was copied.
- Schema-only objects retained ownership under `neondb_owner`, so the dedicated runtime role could inspect but could not execute `ALTER TABLE`. The owner password was rotated only on the disposable branch, used once for the forward migration, removed immediately, and never reused. The migration then granted the dedicated role only schema usage plus table/sequence application access.
- Schema 6 inspection passed all 11 Stage 6 table additions and the current `ai-disclosure-v3` constraint.
- Fixed synthetic seed: one synthetic person, `adapt`, and `mitigate`; no review history, typed answer, audio, real name, or real learning evidence.

### Provider and accounting proof

- AI Studio showed Project logging `Disabled` for `Default Gemini Project`; the project used prepaid Tier 1 billing.
- The app used a newly created Auth Key, an ignored mode-`600` file, generated local-only Basic Auth, and `http://localhost:3001`. Existing `.env.local`, `.env.stage2.local`, Vercel, Production credentials, and learner Basic Auth values were not read.
- `enrichment_v1`: one provider result, one Idempotency replay, and one Cache hit.
- `context_explain_v1`: one provider result, one Idempotency replay, and one Cache hit.
- A third new request returned `stage7b2_smoke_attempt_limit` before another `ai_runs` insert or provider request.
- With `MIMI_AI_KILL_SWITCH=true`, a later request returned `kill_switch`; provider attempts remained `2`.
- Final database evidence before deletion:
  - provider attempts `2`; succeeded `2`; submitted/rejected/failed `0`;
  - expected model lineage `2/2`, `ai-disclosure-v3` `2/2`, valid structure `2/2`, provider response id `2/2`;
  - input tokens `881`, output tokens `304`, thinking tokens `0`, total tokens `1,185`;
  - estimated cost `US$0.000677`, below the `US$0.00310` two-call reservation;
  - one enrichment draft, one context Cache row, zero active provider calls.

### Credential incident and cleanup

- The first human-created temporary key was exposed once in browser-structure tool output before any provider request. It was treated as compromised immediately, never written to the environment file, never used, and manually revoked after automated deletion was rejected by Google.
- A second temporary Auth Key completed the proof. Google also rejected automated deletion of that key; the user manually revoked it, and the refreshed AI Studio list confirmed both temporary key names absent.
- The Neon child branch was permanently deleted; its endpoint, dedicated role, Schema 6 data, synthetic rows, and AI ledger disappeared with it. The branch name and id were confirmed absent from the refreshed branch list.
- `.env.v2-7b-2.local` was deleted. Gemini, Neon, and generated local Basic Auth values were cleared from the active browser-automation memory.
- No Production/Staging data write, Vercel environment change, deployment, GitHub remote action, real-user transmission, or accepted animation/reduced-motion change occurred.

### Final validation

- Passed `npm run lint` and `npm run typecheck`.
- Passed full Vitest: `61` files / `360` tests; the existing Postgres integration file/test remained intentionally skipped.
- Passed all three backup dry-runs and the Next.js Production build.
- Passed focused AI runtime/accounting/Schema/UI tests, script syntax, Tier 3 governance preflight, and `git diff --check`.

## Verified Provider Baseline

2026-07-18 的只读官方复核确认：

- Stable model id 为 `gemini-3.1-flash-lite`；本项目不使用可变化的 `latest` alias。
- Standard paid synchronous pricing 为 US$0.25 / 1M text input tokens 和 US$1.50 / 1M output including thinking tokens。
- Gemini Auth Key 是当前新 key 路线；本阶段创建新 key，不检查或复用历史 Stage 2 key。
- Paid Services content 不用于改进 Google products。Google 可能因 prohibited-use detection、abuse prevention 与法律/监管要求，在有限期间记录 prompts / context / output；optional Project logging 是另一项用户可控设置。
- `generateContent` 的 `store: false` 与 Project logging 关闭共同限制可选项目日志保存面；它们不应被描述为取消 provider 的安全/滥用处理。

本应用当前仍是 private personal app。披露的目的，是让实际外发数据和运行边界对使用者透明；本阶段不增加面向公开产品的法律流程。

## Fixed Cost Envelope

每次新 provider attempt 的现有保守 reservation 为：

```text
2,000 input tokens × US$0.25 / 1M
+ 700 output/thinking tokens × US$1.50 / 1M
= US$0.00155
```

两次总 reservation：`US$0.00310`。Cache、Idempotency replay 和 Kill Switch rejection 必须为零新增调用。

## Execution Order

```text
docs + focused tests
  -> default/provider-off regression
  -> create schema-only temporary Neon child branch + temporary role
  -> execute Schema 6 migration + inspect synthetic-only target
  -> create new Gemini Auth Key + write ignored mode-600 env
  -> verify optional Project logging remains disabled
  -> localhost disclosure confirmation
  -> one enrichment_v1 provider attempt
  -> one context_explain_v1 provider attempt
  -> replay + Cache + Kill Switch zero-call checks
  -> reclose runtime
  -> revoke Auth Key
  -> delete temporary branch/role and secret file
  -> full validation + evidence/document sync
```

## Immediate Stop Conditions

立即停止且不继续真实调用，如果：

- 无法确认 key 类型、Project logging 状态、临时 branch parent 或 temporary target identity；
- `staging` 被发现包含当前不应复制的真实学习数据；
- Schema 6 migration / inspection 不一致；
- 已提交 provider attempts 达到 2；
- provider response 缺少可靠 model lineage、finish 或 usage；
- 任何 secret 出现在 tracked file、输出、客户端或 Git diff；
- estimated cost 超过 reservation；
- Auth Key 或 temporary database target 无法可靠撤销/删除。
