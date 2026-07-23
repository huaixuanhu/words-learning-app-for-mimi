# Words Learning App For Mimi V2-8-3 Gate 5：Production Runtime, Credentials And Cutover

Created: 2026-07-23 AEST  
Last updated: 2026-07-23 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`

Derived from:

- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- `plan_docs/PLAN_V2_STAGE8_3_GATE4_PRODUCTION_CLONE_MIGRATION_RECOVERY.md`
- `plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md`
- `plan_docs/PLAN_V2_STAGE7B_1_FORMAL_AI_LOCAL_ORCHESTRATION.md`
- `ARCHITECTURE.md`
- `AGENTS.md`

Scope:

- 补齐 Production TTS runtime（正式语音运行环境）与独立 WIF identity gate（无长期密钥身份门禁）。
- 准备独立 Production Gemini Auth Key、study-token secret、TTS WIF、Neon database credential 和 Vercel Production environment。
- 进入 maintenance / write-free window（维护与停止写入窗口），生成最终加密备份和 Schema 5 recovery point。
- 将 Production `main` 原子迁移为 Schema 6，验证 parity，然后以 exact V2 commit 替换 V1。
- 在初始 AI `4` 次上限和 TTS 固定费用边界内完成 Production acceptance。

Non-Scope:

- 不加入 SSO（Single Sign-On，单点登录）或 confidential per-person authorization（个人机密隔离）。
- 不修改 FSRS、Daily Episode、Recognition / Active 完成规则、Dashboard 算法、Motion 或已接受的 UI。
- 不更换 `en-AU-Standard-C`、`0.9` speaking rate、`0` pitch、MP3 voice contract。
- 不复用 Preview Gemini key 或 Preview TTS service account/provider。
- 不自动删除 V1 deployment、Production backups、Schema 5 recovery、Preview、clone 或 preserved branch。

Exit criteria:

- Production TTS 只在 HTTPS、Vercel Production、Git `main`、`live`、Schema 6、`postgres-production` 和独立 Production WIF identity 全部匹配时可用。
- Maintenance 先于 migration 阻止所有旧/新学习写入，旧 V1 artifact 失去数据库写能力。
- Final encrypted backup、Schema 5 recovery point、main migration、Schema 6 parity 与 paired rollback evidence 全部通过。
- Exact V2 Production deployment 在 `syd1` 运行，Basic Auth、资料连续性、Recognition、Active、Dashboard、Cloud TTS 和受控 Gemini smoke 均通过。
- Production 稳定后仍保留 rollback material；任何临时资源清理只在无引用核验后执行。

Current operational tier: Tier 3  
Working tier: Tier 3

Status: Documentation-first（文档先行）和 Production TTS fail-closed runtime implementation 已完成。Focused TTS runtime/provider/route tests、TypeScript、ESLint 与 diff check 通过；当前进入 Production WIF 与 Vercel environment 准备。

## 1. Current Facts And Gap

- Gemini 已有独立 `v2-8-3-production` scope、Production `main`/HTTPS/Schema 6/Basic Auth/Kill Switch 和初始 `4` 次调用门禁。
- TTS route、Cache、Postgres atomic accounting、Standard-C provider adapter 与 Preview WIF 已验收；`0005` 已通过两次 Production-clone migration。
- 当前 TTS runtime 只接受 `v2-8-2-3-local-*` 与 `v2-8-2-3-preview`。把 Preview values 复制到 Production 会被环境检查拒绝，也违反 identity isolation。
- Vercel OIDC token 含 `owner_id`、`project_id` 和 `environment` claims；Production token 的 `sub` 明确包含 `environment:production`。Google WIF 支持 attribute mapping/condition，并建议以专用 service account 和最小权限避免长期 key。

Official references checked 2026-07-23:

- [Vercel OIDC token reference](https://vercel.com/docs/oidc/reference)
- [Vercel OIDC federation](https://vercel.com/docs/oidc)
- [Google Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation)
- [Google Cloud TTS authentication](https://docs.cloud.google.com/text-to-speech/docs/authentication)

## 2. Production TTS Runtime Contract

Exact code-owned values:

- Execution scope：`v2-8-3-production`
- Project：`for-tts-502913`
- Service account：`mimi-tts-production@for-tts-502913.iam.gserviceaccount.com`
- WIF pool：`mimi-vercel-production`
- WIF provider：`mimi-v2-production`
- Credential mode：`vercel-wif`

Required runtime facts:

- `MIMI_TTS_KILL_SWITCH=off`
- `MIMI_TTS_RUNTIME_ENABLED=true`
- `MIMI_TTS_PROVIDER=google-cloud-standard`
- `MIMI_TTS_ACCOUNTING_READY=true`
- `MIMI_TTS_SCHEMA6_READY=true`
- `MIMI_TTS_IDENTITY_TYPE_CONFIRMED=wif`
- `MIMI_STORAGE_RUNTIME=postgres-production`
- `STAGE6B_DATABASE_TARGET=production`
- `MIMI_V2_8_3_PRODUCTION_TARGET_CONFIRMED=true`
- `MIMI_V2_8_3_PRODUCTION_ACCESS_CONFIRMED=true`
- `MIMI_PRODUCTION_CUTOVER_MODE=live`
- HTTPS、`VERCEL=1`、`VERCEL_ENV=production`、`VERCEL_GIT_COMMIT_REF=main`、`NODE_ENV=production`

Missing, wrong or Preview values return resting state and never attempt OIDC exchange, Google TTS or accounting reservation. Production and Preview service instances share code but use separate Vercel deployments, WIF resources, service accounts, attribute conditions and ledger scope.

Implemented in:

- `src/lib/tts/runtime-config.ts`
- `src/lib/tts/runtime-config.test.ts`
- `src/lib/tts/google-cloud-provider.ts`
- `src/app/api/tts/route.ts`
- `src/app/api/tts/route.test.ts`

Focused validation：3 files / 15 tests，TypeScript、ESLint 与 `git diff --check` 全部通过。

## 3. Production WIF Contract

- Dedicated pool/provider trusts the current Vercel OIDC issuer and maps at minimum `google.subject=assertion.sub` plus project/environment attributes needed by the condition.
- Provider condition requires the exact Vercel project ID and `assertion.environment == "production"`; Preview tokens cannot exchange.
- Only the exact Production principal may impersonate `mimi-tts-production`; service account receives only the Text-to-Speech use role required for synthesis.
- No JSON service-account key is created. Vercel stores only non-secret project number, service-account email, pool/provider IDs and confirmation flags.
- One exact Production route smoke proves OIDC → STS → service-account impersonation → TTS. Audio text remains a normal isolated vocabulary token; no person/history/note is transmitted.

## 4. Credential And Environment Preparation

1. Confirm clean/pushed exact commit and current V1 Production deployment/alias.
2. Create restricted independent Production Gemini Auth Key; do not copy Preview key.
3. Generate Production study-token secret locally and pipe it directly into Vercel Production.
4. Create/verify Production TTS service account, WIF pool/provider, IAM binding and API access with metadata-only evidence.
5. Add Production environment names through Vercel CLI; secret values never print or enter `.env`.
6. Configure initial runtime with AI Kill Switch on and `MIMI_AI_PRODUCTION_ROLLOUT_MAX_PROVIDER_ATTEMPTS=4`.
7. Build exact V2 candidate and verify `syd1`, Basic Auth ordering, maintenance behavior and no Production provider calls.

## 5. Live Cutover

1. Set Production maintenance mode and deploy it to the canonical domain.
2. Verify anonymous Basic Auth rejection and authenticated maintenance `503`; all mutation routes reject.
3. Revoke/rotate the old V1 database credential path and prove the retained V1 deployment cannot write.
4. Generate the final encrypted Schema 5 backup and create a fixed Schema 5 recovery branch.
5. Re-inventory `main`, confirm write-free state and execute pinned `0003 -> 0004 -> 0005` in one transaction.
6. Run Schema 6 inspect/full parity. Failure keeps maintenance and uses Gate 4 recovery.
7. Merge exact V2 to Git `main`, push, deploy/promote the exact commit with `schema6-readiness`, then switch to `live`.
8. Complete authenticated read-only checks before the first V2 learning mutation.

## 6. Production Acceptance

- Basic Auth and `postgres-production` health.
- Existing 1,486 Recognition entries, 125 states, 203 events, settings and import counts remain intact.
- Recognition New Learning/Review and Active `Say it` / `Spell it` / `Dictation` load and preserve Track isolation.
- Keyboard Space/Arrow/Enter, bilingual examples, Dashboard and completion feedback remain unchanged.
- Standard-C playback passes Recognition, Active, example word and Settings preview.
- Gemini Kill Switch opens only for one enrichment and one context explanation under the `4`-attempt ceiling; Replay/Cache/Kill Switch probes do not add attempts.
- Runtime logs contain no secret, vocabulary row or provider body; AI/TTS ledger reconciles to zero in-flight.

## 7. Stop Conditions

- Production TTS still depends on Preview identity or accepts Preview OIDC.
- Git `main`, Vercel Production commit, Neon `main`, Schema or migration digests do not match.
- Maintenance or old-runtime credential revocation cannot prove write-free behavior.
- Final backup/restore or Schema 5 recovery point is missing.
- Any provider credential, connection URI, learner row or private backup identity reaches stdout, Git or documentation.
- AI/TTS cost, in-flight, quota or provider status cannot be reconciled.
- External action requires plan upgrade, public access, auto-reload or broader IAM than the exact project/service role.
