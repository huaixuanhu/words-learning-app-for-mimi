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

Status: complete。Production preparation、maintenance、旧 V1 database credential rotation（数据库凭证轮换）、最终加密备份、Schema 5 recovery branch、Production `main` Schema 6 migration、完整 parity、exact `main` live deployment、真实 Gemini/TTS smoke 与 steady-state accounting 均已完成。Gate 7 post-launch stability observation 由 parent plan 继续管理。

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

## 8. Execution Evidence — 2026-07-24 AEST

### 8.1 Production identities and maintenance

- Exact implementation commit `65f45dae4fbd365781afb45b43c2693cbcd601d3` passed 92 test files / 567 tests, lint, typecheck, three backup dry-runs, Production build, Tier 3 preflight and `git diff --check`, then pushed to `origin/V2`.
- Created the independent restricted Gemini Auth Key `mimi-v2-8-3-production-20260723`; its API restriction is only `generativelanguage.googleapis.com`. The key value and random study-token secret were piped directly into Sensitive Vercel Production variables and were never printed or written to the repository.
- Created the independent Google Cloud identity `mimi-tts-production@for-tts-502913.iam.gserviceaccount.com`, WIF pool `mimi-vercel-production` and provider `mimi-v2-production`. Its condition binds the exact Vercel owner/project and `environment=production`; it has no user-managed key.
- Production deployment `dpl_9gsFP5D4dRf314CYj5sYArdfpYww` placed the canonical domain into `maintenance`. Anonymous access remained HTTP `401`; AI and TTS Kill Switches stayed closed.

### 8.2 Write-free and recovery evidence

- Rotated the exact Neon `main` `neondb_owner` password once through the official API. The new credential connected successfully and replaced all three Vercel Production database variables; the previous credential was then rejected, so retained V1 deployments cannot write.
- Created no-compute Schema 5 recovery branch `v2-8-3-production-schema5-recovery-20260723` from `main`. It is distinct from `main` and has zero endpoints.
- Same-commit synthetic backup proof passed with evidence SHA-256 `e57369a02f692762ed8c9d54b4ee5e62a0403b4570b00ac2de97787eb1ce5eef`.
- Final repository-external encrypted archive `mimi-production-schema5-20260723T140833Z-65f45dae4fbd.dump.age` is `112,253` bytes with SHA-256 `63d4a662e49f27d2ea0eaf9521f2b6e3cb295d3b4b4ed9de5cb47492f7b8e569`. Isolated PostgreSQL 17 restore passed; source/restore combined digest is `6c82ba44caf462051b9579ca90f8a59994c8794649d6e871dd135cf0c23e2aa9`; secret-free evidence SHA-256 is `3494a78fe998f9158929da57a0ecbddd2eeed5431ecb94854022e6b2c057e7c6`.

### 8.3 Production main migration

- Immediately before migration, `main` remained Schema 5 with 1 person, 1,486 vocabulary entries, 38 import batches, 125 review states, 203 review events, 1 settings row and zero orphan invariants. Safe-inventory combined digest remained `c269c3133008cc5ae9c30f54f49c88cd792566397ff3aefca5e5fba551f2e794`.
- The write-free check found zero other active database sessions. The guarded runner revalidated the live Neon project/branch/endpoint, recovery evidence and all three pinned migration hashes before connecting.
- `0003 -> 0004 -> 0005` completed in one outer transaction. Post-migration inspection reports Schema 6, 22 tables, 12 constraints, 21 indexes, 7 triggers, 1,486 vocabulary creation facts and two Daily Study defaults.
- Full parity is `matched=true`, `mismatches=[]`, with all 1,854 legacy core rows retained. All orphan, invalid scheduling, missing creation fact, missing default and AI/TTS in-flight invariants are zero.
- Production main migration completed while maintenance remained active; the later exact `main` deployment and acceptance below closed that window.

### 8.4 Exact V2 live deployment

- Exact cutover commit `84cafac89d22ae7f74b499ddbe59db89c8a0048a` was present on local and remote `main` before runtime opening.
- Canonical deployment `dpl_3w23RXZS7bxXcc6N1FQskPX6eU65` is Ready in Production and serves `https://words-learning-app-for-mimi.vercel.app` from `syd1`.
- Production uses exact `live`、Schema 6、`postgres-production` and the code-owned `v2-schema6` client contract。Anonymous `/`、`/api/storage/health`、`/api/tts` and `/api/ai/enrichment` all return Basic Auth `401` before application/provider logic。
- The secret-free cutover record is `plan_docs/evidence/V2_8_3_CUTOVER_MANIFEST.json`; it validates as `status=live`, records complete write chronology and retains paired V1/Schema 5 recovery material。

### 8.5 Real Production provider acceptance

- A staged Production-target smoke used the same runtime contract without changing the canonical domain or its Basic Auth credential。Both temporary smoke deployments and their temporary local auth items were removed afterward。
- Google Cloud Standard-C: first request returned provider `google-cloud-standard` / Cache miss and 7,872 MP3 bytes；the same text then returned Cache hit with identical audio digest。Ledger: 1 successful provider attempt、8 characters、`US$0.000032`、0 submitted/failed/in-flight。
- Gemini: one enrichment produced 2 additional meanings、2 bilingual examples、1 similar word and 1 confusable word；one context explanation returned the expected five fields。Replay reused the same enrichment resource with no added provider attempt。Ledger: 2 succeeded、0 failed/submitted、1,440 total tokens、`US$0.000887`、0 in-flight。
- The enrichment draft was explicitly rejected after inspection。No AI text was accepted into the vocabulary item and no learning history was changed。

### 8.6 Steady state and post-cutover backup

- After provider ledger reconciliation, `MIMI_AI_PRODUCTION_ROLLOUT_MAX_PROVIDER_ATTEMPTS` was removed and `MIMI_V2_8_3_PRODUCTION_STEADY_STATE_ACCEPTED=true` was set。The long-term 300 attempts/day、600k/210k tokens/day、`US$0.50/day`、`US$2/month`、concurrency 2、Cache、Idempotency and Kill Switch limits remain。
- The final steady-state deployment is `dpl_3w23RXZS7bxXcc6N1FQskPX6eU65`; anonymous protection and canonical alias binding were rechecked after the configuration change。
- Immediate Schema 6 archive `mimi-production-schema6-20260723T150730Z-84cafac89d22.dump.age` is 222,110 bytes with SHA-256 `50cfd666fbed345fe9bdb5403a9b7ca6b1908d29d2e661abcc59a7640a7373cd`。An isolated PostgreSQL 17 restore matched the source Schema/count/invariant snapshot exactly；ignored evidence SHA-256 is `d10eeb7a819ebffb9a3ef2f995f69431c25349665d87f2865a8c7e3a564e331a`。
- Protected Preview、previous V1 deployment、Production Schema 5 recovery branch and encrypted backups remain intentionally retained until the parent Gate 7 natural-day/two-user observation is complete。
