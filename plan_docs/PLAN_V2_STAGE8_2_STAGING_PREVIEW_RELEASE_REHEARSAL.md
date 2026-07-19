# Words Learning App For Mimi V2-8-2：Staging And Protected Preview Release Rehearsal

Created: 2026-07-18 AEST
Last updated: 2026-07-19 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md` 的 `V2-8 Dashboard Insights And Release Gate`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`
- `plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md`
- `plan_docs/PLAN_V2_STAGE5_1_DAILY_EPISODE_SCHEDULING_REPAIR.md`
- `plan_docs/PLAN_V2_STAGE6_ACTIVE_PRACTICE_ENGINE.md`
- `plan_docs/PLAN_V2_STAGE7B_1_FORMAL_AI_LOCAL_ORCHESTRATION.md`
- `plan_docs/PLAN_V2_STAGE7B_2_NONPRODUCTION_PROVIDER_PROOF.md`
- `plan_docs/PLAN_V2_STAGE8_1_DASHBOARD_INSIGHTS.md`
- `plan_docs/PLAN_V2_STAGE8_1_1_LEARNER_COPY_AUDIT.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- 用户在 2026-07-18 对 Staging migration（预发布数据库迁移）、受保护 V2 Preview、独立 Preview secrets、真实 Gemini AI 与最多四次初始证明调用的明确确认
- 用户在 2026-07-18 对阶段收口的修正：V2-8-2 完成后保留受保护 Preview 的完整 AI 能力；Preview Gemini key 只在 V2-8-3 Production 稳定后撤销

Consumer / next stage:

- Future derived plan: `V2-8-3 Production Backup, Migration And V2 Cutover`

Document nature:

本文件是 `PLAN_V2_MASTER.md` 中 V2-8 的派生执行子计划。它负责让完整 V2 在长期 `staging` 与受保护 Vercel Preview 中运行，形成 Production 切换前的正式验收环境。它不授权 Neon `main`、Production data、Production secrets、Production migration 或 Production deployment。

Current operational tier: Tier 3

Target capability tier: Tier 3

Working tier: Tier 3

Status: complete on 2026-07-19 AEST within the approved Staging / protected Preview scope. Production remains unchanged.

## Scope

- 先完成本文件、父计划与安全边界同步，再执行本地代码、credential（凭证）、remote database（远程数据库）、paid provider（付费模型）或 deployment（部署）动作。
- 保持 `db/migrations/0003_v2_schema6_data_model.sql` 不变，在从长期 `staging` 派生的临时子分支上完成 Schema 5 → Schema 6 migration、inspection、child Reset（子分支重置）与再次迁移演练。
- 在长期 `staging` 迁移前创建 Schema 5 recovery checkpoint（恢复检查点），确认它来自 `staging` 且不来自 Production `main`；在 V2-8-3 稳定前保留该检查点。
- 迁移长期 `staging` 到 Schema 6，并验证已有非 Production 行、Recognition 历史、Active guard、Daily Plan、AI accounting、backup parity 与 repository runtime。
- 添加一个 code-owned（代码控制）的 `v2-8-2-preview` 正式运行边界。它与 V2-7B-2 localhost proof 相互独立，并且只在 Vercel Preview、Git branch `V2`、`postgres-preview`、Schema 6、atomic accounting、受保护 Preview 确认和独立 Auth Key 全部匹配时开放。
- 为 `V2` Git branch 配置 branch-specific Preview environment variables（分支专属预览环境变量）。Preview 使用长期 `staging`，不得获得 Production database URL、Production Basic Auth secret、Production study-token secret 或未来 Production Gemini key。
- 为 V2 Preview 创建独立 `MIMI_STUDY_TOKEN_SECRET`，长度至少 32 bytes；它只签发该 Preview 的 Daily Study prompt/cursor token，不复用 Production secret。
- 为 V2 Preview 创建独立 Gemini Auth Key。继续固定 `gemini-3.1-flash-lite`、`store: false`、no tools/grounding、no provider retry、strict structured output、90-second timeout 与现有模型披露。
- 使用 Vercel Authentication（Vercel 部署认证）保护 Preview，并通过可撤销 Shareable Link 给用户和 Mimi 验收。该部署层保护不改变应用内 `person_id` 的数据分离语义，也不属于 V2 application SSO。
- 在首次远程证明部署上启用最多四次 provider attempts 的额外 rollout ceiling（发布初始上限），目标仅使用一次 enrichment 与一次 context explanation；Replay、Cache 和 Kill Switch 不得增加调用。
- 首次证明完成后移除四次 rollout ceiling，并重新部署同一代码。长期受保护 Preview 继续使用现有全局边界：300 attempts / Melbourne day、600,000 input tokens / day、210,000 output/thinking tokens / day、US$0.50 / day、US$2 / month、concurrency 2，无 personal attempt ceiling。
- 完整验收 Schema 6、Daily Learning、Recognition、Active、Dashboard、Library AI enrichment、example-word context explanation、accepted AI content、backup/export、mobile layout、cost ledger、runtime logs 与 no-data-crossover（无数据串线）。
- V2-8-2 完成后保留长期 `staging`、受保护 V2 Preview、Preview study-token secret 和 Preview Gemini Auth Key，使用户与 Mimi 可以持续体验完整 V2，直到 V2-8-3 Production 稳定。

## Non-Scope

- 不连接、迁移、写入、Reset、Restore 或删除 Neon `main` / Production。
- 不读取、覆盖、复制或重新配置现有 Production database URL、Basic Auth、study-token secret、Gemini credential 或真实用户数据。
- 不创建 Production backup；V2-8-3 才负责 Production 独立备份、Schema 5 recovery point、Schema 6 migration 与切换。
- 不部署 Production，不 promote Preview，不修改 Production alias/domain，不替换当前 V1，不执行 V1 rollback。
- 不删除、改写或迁移 Production 中的现有单词、review states、review events、settings、import history 或人员数据。
- 不执行 Git commit、GitHub push、pull request、merge 或 `main` branch change。
- 不引入 application SSO、public registration、personal authentication、confidential tenant isolation 或 personal AI attempt ceiling。
- 不添加 provider failover、Groq、Datamuse、Free Dictionary、Gemini alias、Search grounding、URL/File context、streaming、audio upload、Speech Recognition 或 AI pronunciation scoring。
- 不修改 Recognition / Active FSRS、Daily Episode first-attempt anchor、Dashboard metric definition、键盘控制、当前动画、transition timing 或 reduced-motion behavior。
- 不将 Staging/Preview synthetic rows 或 AI results promote 到 Production；未来 Production 只运行相同 migration/code，并保留自身真实数据。

## Safety / Side Effects

Allowed by the user's 2026-07-18 approval:

- 创建、Reset 和删除从 `staging` 派生的临时 Neon rehearsal branch。
- 创建并在 V2-8-3 稳定前保留一条明确命名、注明 owner/expiry 的 `staging` Schema 5 recovery checkpoint。
- 在临时 branch 与长期 `staging` 上执行现有 `0003` forward-only migration。
- 配置 Vercel Preview-only、Git branch `V2`-specific environment variables 和 Deployment Protection。
- 创建和配置一把新的 Preview Gemini Auth Key 与一条新的 Preview study-token secret。
- 部署受保护 V2 Preview；在初始四次机械上限下最多提交四次 Gemini provider attempts。
- 初始证明后保留 Preview key 并切换到已接受的全局 300 / US$0.50 day / US$2 month 边界，供用户与 Mimi 持续验收。

Always forbidden in this stage:

- 输出、记录、提交、上传到 Git、写入普通文档或发送到浏览器客户端的 secret value。
- 让任何 `NEXT_PUBLIC_*` variable 承载 credential。
- 将 Preview 连接到 `main` 或 `postgres-production`。
- 在 Vercel Authentication 尚未证明生效时开放 Gemini route。
- 关闭全局 atomic accounting、Cache、Idempotency、concurrency、daily/monthly cost boundary 或 Kill Switch。
- 在 migration target、branch parent、data classification、credential scope 或 provider lineage 不明确时继续执行。

## Exit Criteria

- 本文件、`PLAN_V2_MASTER.md`、Architecture、README、AGENTS、CHANGELOG 与 AI Agent Log 同步 V2-8-2 的实际边界和远程证据。
- V2-7B-2 localhost route 仍只接受 loopback；新的 Preview route 只接受精确 `v2-8-2-preview` 状态，且 Production、普通 Preview branch、test、local fixture、错误 storage runtime 和未保护 Preview 全部 fail closed。
- V2 Preview runtime 明确绑定 `VERCEL_ENV=preview`、Git branch `V2`、`MIMI_STORAGE_RUNTIME=postgres-preview`、Schema 6/accounting readiness、Project logging disabled confirmation 与独立 Preview Auth Key。
- `MIMI_STUDY_TOKEN_SECRET` 在 Preview 存在、长度合格、server-only，并且 expired prompt 可自动刷新而不会登出用户或清除学习进度。
- Vercel Authentication 在未授权请求上阻断整站；用户可通过受控访问路径进入，付费 AI route 不存在公开匿名入口。
- 临时 rehearsal branch 可证明来自 `staging`，Schema 5 inspection 通过，迁移到 Schema 6 成功，Reset 回 Schema 5 成功，再次迁移成功，并在证据完成后删除。
- 长期 `staging` 的 Schema 5 recovery checkpoint 已建立并保留到 V2-8-3 稳定；它拥有明确 owner、purpose 与 expiry，不从 `main` 复制 Production 数据。
- 长期 `staging` 为 Schema 6，现有非 Production 行数和 profile/history invariants 通过；migration 没有把 Active 当成 Recognition，也没有复制或混用两套 Review Profile。
- Preview 在 desktop 与 phone width 完成 Home、Study、Recognition、Active 三种模式、Dashboard、Library、AI preview/edit/accept/reject/add-to-learning、backup/export 和 two-gate reset acceptance。
- 初始 proof 最多四次 provider attempts；目标两次成功生成，Replay、Cache 和 Kill Switch 为零新增调用，observed usage/model/cost 可与 `ai_usage_buckets` 对账。
- 初始 proof 后四次 rollout ceiling 被移除；长期 Preview 只受现有 300 attempts/day、token、US$0.50/day、US$2/month、concurrency 2 与 Kill Switch 控制。
- Preview Gemini key、study-token secret、database credential 不出现在 Git diff、tracked file、terminal output、test snapshot、browser bundle 或 user-facing logs。
- Preview AI 保持可用，直到 V2-8-3 Production 稳定后才撤销；该生命周期在下一阶段计划中继续追踪。
- `npm run governance:preflight`、lint、typecheck、focused/full tests、三套 backup dry-run、build、migration inspections、protected Preview smoke、runtime error scan 与 `git diff --check` 全部通过。

## Runtime Activation Contract

| Surface | Required identity | Provider state |
| --- | --- | --- |
| Default local / fixture | no exact execution scope | closed; local fixture only |
| V2-7B-2 localhost proof | `v2-7b-2-local-smoke` + loopback + deleted disposable target contract | retained for historical test coverage; no credential remains |
| V2-8-2 protected Preview | `v2-8-2-preview` + `VERCEL_ENV=preview` + `VERCEL_GIT_COMMIT_REF=V2` + `postgres-preview` + protection/schema/accounting confirmations | open when Kill Switch is off |
| Other Vercel Preview branch | branch mismatch or missing branch-scoped variables | closed |
| Vercel Production | `VERCEL_ENV=production` | closed until V2-8-3 |

Environment variables are server-only and branch-scoped. Exact names may be tightened during implementation, but the semantic checks above cannot be weakened.

## Staging Migration And Recovery Design

```text
read-only staging identity + row inventory
  -> stop if target or data class is unexpected
  -> create temporary full child from staging
  -> inspect Schema 5 and counts
  -> apply 0003 -> inspect Schema 6
  -> Reset temporary child to staging -> inspect Schema 5
  -> re-apply 0003 -> inspect Schema 6
  -> delete rehearsal child
  -> create named Schema 5 recovery checkpoint from staging
  -> migrate long-term staging with the same 0003 file
  -> inspect Schema 6, counts and application invariants
  -> keep checkpoint until V2-8-3 Production is stable
```

`staging` must never be Reset to parent `main`, because `main` now contains formal Production data. If long-term Staging migration fails after commit, Preview is rebound to the preserved Schema 5 checkpoint and execution stops; any in-place recovery requires a separately evidenced route.

## Preview Access And Secret Design

- Vercel Authentication protects Preview before the app receives the request.
- A Shareable Link is treated as a bearer access path: give it only to the trusted testers, do not commit or place it in public documentation, and revoke it when V2-8-3 closes Preview testing.
- `GEMINI_API_KEY` is a new Preview-only Auth Key. It is never copied into `.env.local`, Stage 2 files or Production.
- `MIMI_STUDY_TOKEN_SECRET` is generated independently for Preview and is never reused in Production.
- Existing Preview database variables may be retained only after their target is proven to be long-term `staging`; branch-specific V2 overrides must not silently inherit a Production value.
- Every environment-variable change applies only to a new deployment, so the acceptance record names the exact deployment id and commit.

## AI Cost Envelope

Initial rollout proof:

```text
4 attempts maximum
× (2,000 input tokens × US$0.25 / 1M
   + 700 output/thinking tokens × US$1.50 / 1M)
= US$0.00620 maximum reservation
```

Target proof usage is two attempts: one `enrichment_v1` and one `context_explain_v1`. The remaining two are manual recovery allowance after inspecting a failed attempt; no automatic retry is added.

After proof, the Preview remains available under the accepted global limits:

- 300 submitted provider attempts per Australia/Melbourne budget day;
- 600,000 reserved input tokens per day;
- 210,000 reserved output/thinking tokens per day;
- US$0.50 estimated cost per day;
- US$2 estimated cost per month;
- concurrency 2;
- submitted attempts remain counted after provider/structure failure;
- Cache, Idempotency, Kill Switch and same-Cache ownership remain independent guards.

## Acceptance Matrix

### Environment and access

- Unauthenticated Preview request is blocked by Deployment Protection.
- Authorized Preview request reports `postgres-preview`, Schema 6 and no Production crossover without exposing connection details.
- Production V1 URL remains on its existing deployment and Schema 5 throughout V2-8-2.

### Learning runtime

- Create or use only named synthetic Staging users and entries.
- Set free Recognition and Active goals, including `0` and a non-zero value.
- Complete Recognition New Words/Review with card click, Space, arrows and Enter.
- Complete Active `Say it`, `Spell it` and `Dictation` with independent history.
- Verify first-attempt anchor, same-session recovery and next-day checkpoint contracts through existing deterministic tests plus a bounded Preview smoke.
- Verify Dashboard plan values, Actual rows, Learning rhythm and independent Memory outlook.

### AI runtime

- Confirm `ai-disclosure-v3` in Preview.
- Generate, edit and accept one enrichment; verify lineage label and backup inclusion only after acceptance.
- Generate one exact-span context explanation; exercise `Listen`, `Add to learning` and duplicate protection.
- Verify same-key Replay and different-key Cache without added provider attempts.
- Verify Kill Switch before restoring normal Preview availability.
- Check final usage bucket, submitted/active states, model id, usage and estimated cost.

### Responsive and operational

- Check 320, 390, 768, 1024 and desktop widths with no horizontal overflow or unreachable actions.
- Check light/dark theme and current motion without changing reduced-motion behavior.
- Scan Preview build/runtime logs for route errors and secret-shaped output.
- Keep the protected Preview URL available to the user after completion.

## Immediate Stop Conditions

Stop the affected remote slice and preserve the last safe state if:

- `staging` cannot be distinguished from `main` without exposing a secret;
- a temporary or checkpoint branch is found to derive from Production data;
- Staging contains real learner data that violates the accepted non-Production policy;
- Schema 5 inventory, migration, Reset or Schema 6 inspection differs from the expected contract;
- Preview can be opened anonymously after protection is claimed;
- V2 branch-specific variables inherit or expose a Production credential;
- study-token signing is missing or too short;
- provider model, pricing, usage metadata, Disclosure, Project logging or Auth Key type cannot be confirmed;
- the initial submitted-attempt count reaches 4 before proof closes;
- observed or reserved cost exceeds the approved bound;
- a secret appears in output, tracked files, client code or logs;
- global quota, Cache, Idempotency, concurrency or Kill Switch can be bypassed;
- local validation or Preview smoke fails;
- a remote tool requests a Production action, plan upgrade, payment, auto-reload or broader permission than this stage authorizes.

## Execution Record

### Staging migration and recovery

- Confirmed the long-lived target as Neon branch `staging` (`br-ancient-dawn-a7heegpm`), endpoint `ep-bitter-dew-a71lahle`, database `neondb`, and role `neondb_owner`. Every Stage 8-2 database command required these exact non-Production identifiers plus `postgres-preview` / Preview markers.
- Created temporary child `br-royal-grass-a7pumxxz` from `staging`. It passed Schema 5 inventory, forward migration with the unchanged `0003_v2_schema6_data_model.sql`, Schema 6 inspection, Reset to its Schema 5 parent state, and a second forward migration. The rehearsal child was then deleted.
- Before migrating long-lived `staging`, created the retained Schema 5 recovery checkpoint `v2-8-2-staging-schema5-recovery-20260718` (`br-patient-mud-a7cnc81r`). V2-8-3 Gate 0B rechecked it on 2026-07-19: it still has no compute, its parent remains `staging`, and its expiry remains `2026-08-17T12:00:00Z`; extend it only through a separate approval if V2-8-3 has not reached stable Production by then.
- Migrated long-lived `staging` to Schema 6 and seeded one named synthetic person with four fixed entries: two Recognition and two Active. Final human acceptance added one AI-derived Recognition entry, bringing the synthetic inventory to five.
- Final inspection found Schema Version 6, all 12 expected new tables, all 8 expected constraints, 0 invalid Recognition / Active state or event rows, 0 submitted AI runs, and 0 active provider calls.

### Protected Preview deployment

- Added the independent code-owned `v2-8-2-preview` activation state while preserving the historical loopback-only V2-7B-2 proof state. Production, tests, local fixture mode, other Preview branches, wrong storage runtime, missing protection confirmation, or missing readiness evidence all fail closed.
- Configured branch-specific `V2` Preview variables, an independent Preview study-token secret, a dedicated restricted Gemini Auth Key, `postgres-preview`, Schema 6/accounting confirmations, Project logging disabled confirmation, and the Preview-only UI write flag. No value entered source control, a public document, or a browser bundle.
- Enabled Vercel Authentication for Preview. Anonymous access to the fixed alias returns a protection redirect; the trusted Shareable Link reaches the application. The bearer link is kept out of repository documents and was rotated during final acceptance; the current link has a 30-day lifetime.
- Final deployment is `dpl_FH1TAyEwkcad4qXbhAbDQdujhHkP`, target `preview`, source branch `V2`. The fixed private acceptance alias is `mimi-v2-preview-anoria.vercel.app`. It was never promoted to Production.
- A browser smoke discovered that the first final deployment still inherited `MIMI_ENABLE_STORAGE_UI_WRITES` as disabled. The flag was added only to Preview branch `V2`, the application was redeployed, and real Daily Plan values replaced the disabled `-` state. This correction did not change Production or another Preview branch.

### Learning, Dashboard, mobile and backup acceptance

- Verified free Daily Plan goals by saving Recognition review goal `0`, observing the persisted result, then restoring `20`. Recognition / Active defaults remained `20 / 8` and `12 / 6`.
- Recognition New Words exercised card/Space reveal, first-arrow selection, non-wrapping arrow movement, Enter confirmation, one failed anchor, same-session recovery, and two completed distinct entries. The final Recognition evidence is 2 completed entries from 3 attempts.
- Active exercised `Spell it` with an exact structured match, `Dictation` playback/input surface, and `Say it` self-rating. Recognition and Active updated separate histories; the final Active evidence is 2 completed entries from 2 attempts. No microphone audio or raw typed answer was persisted.
- Dashboard showed `Learned today = 2` for each Track, Recognition `2 entries / 3 attempts`, Active `2 entries / 2 attempts`, and independent Memory outlook values. The two-gate whole-day reset displayed the accepted irreversible Chinese copy and was cancelled before mutation.
- Library opened a real Gemini enrichment, showed the model/inaccuracy notice, allowed an edit, accepted only the edited preview, and added `adjust` to Recognition with `AI added` lineage. An exact-span example action generated a context explanation and correctly disabled duplicate addition because `adjust` was already present.
- Backup displayed 1 synthetic person, 5 vocabulary entries, 4 in-review entries, and 5 review attempts. The three repository backup dry-runs remain the authoritative restore-parity proof; no Production backup or restore occurred in this stage.
- True device emulation passed widths `320`, `375`, `390`, `768`, `820`, `1023`, `1024`, and `1280` with `scrollWidth = clientWidth`. Mobile navigation remained active through `1023`; desktop navigation began at `1024`. Home, Study, Recognition, Practice Lab, Library, Add Words, Settings, and Backup passed at 390 px without a write-disabled state or runtime alert.
- The accepted Motion and reduced-motion implementation was not edited.

### AI usage, resilience and final state

- The initial rollout ceiling allowed at most four provider attempts. The intended enrichment and context calls succeeded; Replay, Cache, and Kill Switch checks added no provider call. The temporary four-attempt ceiling was then removed and the protected Preview returned to the accepted global limits.
- Final UI acceptance added one new exact-span context explanation. Final ledger: 3 submitted/succeeded provider attempts, model `gemini-3.1-flash-lite` on all 3, 1,138 input tokens, 329 output tokens, 0 thinking tokens, 1,467 total tokens, and `US$0.000777` estimated cost. There are 0 submitted/in-flight runs and 0 active provider calls.
- Final runtime health reports `postgres-preview` with the synthetic Staging inventory. Runtime error scan for the final deployment returned 0 error-level records.
- Kill Switch was proved on an intermediate Preview deployment, blocked the request without increasing provider attempts, and was restored to off before the final deployment. Cache was rechecked after restoration.
- The initial rollout key remains Preview-only and stays active solely for the user/Mimi acceptance window. Revoke it after V2-8-3 Production is stable. One older V2-7B-2-named key appeared active during credential inventory despite the earlier cleanup record; it was not used or altered in V2-8-2 and remains a separately owned credential-audit item.
- Neon `main`, Production Schema 5 data, Production environment variables, Production alias/domain, and the live V1 deployment were not connected, migrated, written, promoted, or replaced.

### Final validation

- ESLint and TypeScript passed. Full Vitest passed 64 files / 381 tests; the existing Postgres integration file/test remained intentionally skipped.
- Schema 3, Schema 5, and Schema 6 backup dry-runs passed, as did the Next.js Production build.
- The exact guarded Staging inspector reconfirmed Schema 6, 12 expected tables, 8 expected constraints, 0 invalid profile state/event, 0 submitted AI run, and 0 active provider call. The older `db:inspect:dev` / `db:inspect:schema5:dev` scripts remain valid only for their former Schema 3 / 5 targets and are not used as Schema 6 gates.
- Tier 3 governance preflight, tracked-diff secret-shape checks, `git diff --check`, protected Preview access, runtime-log inspection, and the full responsive browser matrix passed.

## Post-completion Derived Follow-up

V2-8-2 的远程证据与完成状态保持不变。2026-07-19 的真实使用反馈随后派生出 `plan_docs/PLAN_V2_STAGE8_2_1_PERFORMANCE_STABILISATION.md`，只优化 branch-V2 的 runtime data flow（运行数据流）与 Vercel Sydney 区域配置。该子阶段不回移或重新部署 V1，不修改本文件已完成的 Staging / Preview 数据、凭证、AI、Motion 或验收证据。后续 V2-8-3 Gate 0B 通过独立批准验证 exact commit `2e6145386d018968f61a1bee1b6f897feebff627` 的新 protected Preview deployment `dpl_3DeE8BrKcZ9cBdCkPA4jE1UTeHXf`：Functions 在 `SYD1`，warm data-ready median/p95 为 `52/62ms`，没有 route-transition full-data GET 或 AI provider call。固定 V2-8-2 alias 没有重新指向；Production 仍未改变。

## V2-8-3 Handoff

V2-8-2 is complete only when the protected Preview runs the full V2 product with AI and can remain available for human acceptance. V2-8-3 then owns this sequence:

```text
complete V2 Preview acceptance
  -> independent encrypted Production backup
  -> Schema 5 pre-migration Production recovery point
  -> separate Production study-token secret + Gemini Auth Key
  -> migrate Neon main from Schema 5 to Schema 6
  -> deploy V2 to Production and replace the V1 program
  -> verify real data, review history, AI accounting, logs and costs
  -> retain the previous V1 Vercel Deployment and database rollback path
  -> after Production stability, revoke the V2-8-2 Preview Gemini key
```

“Replace V1” means replacing the deployed application and upgrading database structure. It must not delete or replace existing Production vocabulary, review history, settings or user data.
