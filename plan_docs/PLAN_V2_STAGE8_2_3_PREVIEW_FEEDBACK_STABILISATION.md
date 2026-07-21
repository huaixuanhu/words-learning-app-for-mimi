# Words Learning App For Mimi V2-8-2.3：Preview Feedback Stabilisation

Created: 2026-07-20 AEST
Last updated: 2026-07-21 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md` 的 `V2-8 Dashboard Insights And Release Gate`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE8_2_STAGING_PREVIEW_RELEASE_REHEARSAL.md`
- `plan_docs/PLAN_V2_STAGE8_2_1_PERFORMANCE_STABILISATION.md`
- `plan_docs/PLAN_V2_STAGE8_2_2_REVIEW_AUDIO_BILINGUAL_EXAMPLES.md`
- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- 用户在 2026-07-20 确认：V2 正式上线前插入一个专门处理 protected Preview 使用反馈的微调修复阶段；整个 V2 不包含 SSO（Single Sign-On，单点登录）

Scope:

- 集中记录、复现、修复和复测用户与 Mimi 在 protected Preview 中发现的 V2 问题。
- 覆盖已经进入 V2 的学习逻辑、键盘/鼠标/触控交互、手机与桌面布局、可达性、普通文案、朗读、AI enrichment（AI 词汇补充）结果呈现、性能、Backup（备份）与环境一致性。
- 以小批次完成 `问题记录 → 本地复现 → 有界修复 → 本地验证 → protected Preview 复测 → 人工关闭`。
- 在进入 V2-8-3 Gate 2 前冻结一个经过用户与 Mimi 验收的 exact release candidate（精确候选版本）。

Non-Scope:

- 整个 V2 都不引入 SSO、OAuth、public registration、独立账户、角色权限、per-person authorization 或 confidential tenant isolation。相关内容继续由 `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md` 持有，Preview 反馈不能把它重新归入 V2。
- 不把新的大型功能、考试题型、外部题库、Speech Recognition（语音识别）、发音评分或新的学习 Track 作为“小修复”加入。
- 新外部服务不作为普通小修复直接加入。PF-001 已依此规则派生 `plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md`，固定 Google Cloud Standard、费用、隐私、Cache（缓存）、额度、Kill Switch（紧急关闭开关）与分段批准边界；其他新供应商仍须另行计划和批准。
- 不在本阶段文档批准 Production backup、Production database migration（正式数据库迁移）、Production credential、Production deployment（正式部署）、Production AI activation（正式 AI 启用）或真实 Production 写入。
- 不自动把 Staging/Preview migration、Vercel deployment、environment variable、credential 或 paid provider call 视为普通修复步骤；每次外部动作仍需独立批准。
- 不修改已接受的 FSRS-6、Daily Episode first-attempt anchor、Recognition/Active Profile isolation、Motion 或 reduced-motion 原则，除非 Preview 证据证明存在缺陷并先形成明确的修复范围。

Exit criteria:

- protected Preview 已运行包含 V2-8-2.2 与本阶段全部已接受修复的 clean exact commit，并且数据库先满足该 commit 所需的完整 Schema Version 6 additive migration（追加迁移）契约。
- 所有 `Blocker` 与 `High` 问题关闭；`Normal` 与 `Cosmetic` 问题已关闭、由人明确接受，或转入有来源的后续/Version-hold 计划。
- 用户与 Mimi 各完成至少一段代表性学习流程；如果某位使用者无法参与，执行记录必须写明证据限制，不能把单人验收描述成双人通过。
- 如果修复涉及跨日调度、Daily Plan 或 Dashboard 日期归属，至少跨过一个 `Australia/Melbourne` natural-day boundary（自然日边界）复测。
- Recognition / Active、Review / New Words、键盘/鼠标/触控、手机/桌面、朗读、Library、Add Words、Backup 与 AI resting/degraded path（AI 关闭或不可用路径）均没有未解释的回归。
- PF-001 的 Google Cloud Standard TTS 已通过派生计划的本地/Preview/真人试听退出条件；在此之前不得仅凭文档选择把它标为关闭。
- 当前完整 validation（验证）、治理预检、diff 检查和 protected Preview runtime/log 检查通过；所有真实远端证据绑定 exact commit 与 exact environment。
- 发布候选版本、已接受限制和剩余远期事项写回 V2 Master、Architecture、README、AGENTS、Changelog 与 AI Agent Log。
- 只有本阶段明确标记 `complete` 后，V2-8-3 Gate 2 才重新成为下一项远程工作；完成本阶段不自动批准 Gate 2。

Consumer / next stage:

- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md` Gate 2
- `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md`
- `plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md`

Document nature:

本文件是 V2 Master Plan 的上线前稳定子计划。它是 protected Preview 真实使用反馈的唯一 canonical register（规范问题清单）与收口契约，避免把零散聊天反馈分散成多个平级计划。它不授权任何远端或 Production 操作。

Current operational tier: Tier 3

Target capability tier: Tier 3

Working tier: Tier 3

Status: active. PF-001 is `High / Preview-ready`: its child plan owns the exact `en-AU-Standard-C` Voice Contract, local code, additive `0005`, the user-approved ADC provider proof and accepted local human listening evidence. Staging/Preview migration, Preview identity, deployment and remote retest remain unapproved and incomplete.

## 1. Stage Position And Release Effect

Accepted order:

```text
V2-8-2 protected Preview rehearsal
  -> V2-8-2.1 performance stabilisation
  -> V2-8-2.2 keyboard / voice / bilingual examples
  -> V2-8-2.3 Preview feedback stabilisation
       -> V2-8-2.3-1 PF-001 Google Cloud Standard TTS
  -> V2-8-3 Gate 2–7 Production cutover work
```

- V2-8-3 Gate 0B 与 local Gate 1 保留为已完成历史，不撤销、不重新编号。
- V2-8-3 Gate 2 在本阶段关闭前暂停。此前的“Gate 2 是下一步”被本文件更新为“V2-8-2.3 完成后，Gate 2 才是下一步”。
- 当前 protected Preview 尚未包含 V2-8-2.2 的 `0004` 与应用变更。首次 Preview refresh（预览更新）必须遵守 `migration first, application second`，并获得独立远端执行批准。
- 本阶段允许多轮本地修复和 Preview 复测，但每一轮必须绑定问题编号、exact commit、验证结果和人工结论。

## 2. What Counts As A Preview Feedback Item

可以进入本阶段：

- 已有功能与预期不一致，或在真实浏览器/设备中不能可靠使用；
- 核心流程可以完成，但存在明显等待、误触、不可达、布局遮挡或信息不清；
- Preview 与本地行为、Schema、Backup、AI lineage（来源记录）或 cost guard（费用保护）不一致；
- AI 输出通过结构验证但实际学习质量、中文表达或例句呈现需要微调；
- 现有 V2 范围内的遗漏状态、错误恢复、空数据、大量资料、跨日或兼容性边界。

需要转出本阶段：

- 新身份/权限系统，包括整个 V2 明确排除的 SSO；
- 新供应商、新付费服务或新的外发资料类型，除非先建立像 PF-001 一样来源明确、边界完整并获人确认的派生计划；
- 新题型、新 Track 或大幅改变学习方法的产品需求；
- 无法保持现有 backup/migration/rollback 契约的结构性重建；
- 只能依靠 Production 真实资料才能首次验证的高风险变更。

转出时在本文件记录去向和原因，不在本阶段留下含糊的“以后处理”。

## 3. Priority And Status

### Priority

| Priority | 含义 | Release rule |
| --- | --- | --- |
| `Blocker` | 数据可能丢失/串用、核心学习无法完成、安全或费用边界失效 | 必须修复并复测；未关闭不得上线 |
| `High` | 主要学习流程错误、重要设备无法使用、调度/统计明显不可信 | 必须修复并复测；未关闭不得上线 |
| `Normal` | 功能可完成但有明显摩擦、质量不足或恢复路径不清 | 修复或由人明确接受 |
| `Cosmetic` | 不影响学习结果的轻微视觉、间距或措辞问题 | 可修复、接受或有来源地延后 |

### Status

```text
New
  -> Reproduced
  -> Planned
  -> Fixed locally
  -> Preview-ready
  -> Retest passed
  -> Closed
```

允许的旁路状态：

- `Needs evidence`：当前资料不足，等待截图、设备、时间边界或可重复步骤；
- `Accepted limitation`：使用者明确接受，记录影响与原因；
- `Version-hold`：超出 V2，链接到来源明确的远期计划；
- `Not reproducible`：完成合理核验仍无法复现，保留环境和尝试证据；它不等同于已修复。

## 4. Canonical Issue Record

每个问题使用连续编号 `PF-001`、`PF-002`……，并直接追加在本节。最低记录字段：

```text
ID:
Reported at / reporter:
Area / route / device / browser:
Observed behavior:
Expected behavior:
Reproduction steps and evidence:
Priority / status:
Scope decision:
Files or contracts affected:
Local validation:
Preview deployment / exact commit:
User or Mimi retest:
Resolution or accepted limitation:
```

### Open register

#### PF-001 — Browser voice quality is not acceptable

```text
ID: PF-001
Reported at / reporter: 2026-07-21 / user
Area / route / device / browser: Recognition Listen, Active revealed answer, Active Dictation,
  example-word Listen and Settings preview / exact device-browser inventory to be recorded at retest
Observed behavior: every current playback route uses browser SpeechSynthesis; real-device listening
  sounds poor and insufficiently human for learning and Dictation.
Expected behavior: one consistent, natural-enough English voice across all playback routes, with
  reliable retry/cache behavior and no learning-state side effect.
Reproduction steps and evidence: play representative words through current Preview/local voice
  selector and the four learning entry points; user listening is accepted as subjective quality
  evidence. Code inspection confirms all routes share the browser speech helper. Exact device,
  browser and installed voice list remain required in the final comparison record.
Priority / status: High / Preview-ready
Scope decision: replace the default route with Google Cloud Text-to-Speech Standard voices under
  plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md. User auditioned the Standard family
  and accepted its quality. Current voices:list returned en-AU-Standard-A/B/C/D; the user selected
  en-AU-Standard-C with speaking rate 0.9, pitch 0 and MP3 as google-en-au-standard-c-v1.
Files or contracts affected: shared speech facade, all playback callers, Settings, /api/tts,
  provider adapter, Runtime Cache, independent TTS accounting, additive 0005, tests,
  V2-8-3 migration/cutover contract and learner privacy copy.
Local validation: strict route, fixture/provider adapters, explicit device fallback, Cache-before-ledger,
  in-flight coalescing, independent local/Postgres accounting, migration hash/order and Google adapter
  are implemented. User-ADC route proof returned a valid 24 kHz MP3 for en-AU-Standard-C and the
  second identical word was a Cache hit. The versioned 50-entry 20/10/10/5/5 corpus generated
  50 valid MP3 files through the real route (858 characters, US$0.003432 list-price equivalent);
  five replay probes were Cache hits. Full repository closeout passes 89 files / 538 tests plus
  all three backup dry-runs after the corpus tranche.
Preview deployment / exact commit: none; separately approved after local completion.
User or Mimi retest: user selected C from four current en-AU Standard candidates. The local result
  records 48 of 50 entries: 46 Good, 2 Review, 0 Bad. The two Review entries are interdisciplinary
  and photosynthesis; the user accepts the minor stress weakness and explicitly approves this voice.
  Whereas and adapt/adopt have no recorded rating. Real-device protected Preview flow remains pending.
Resolution or accepted limitation: local audio quality is accepted with two minor stress observations
  and two unrecorded entries retained as an evidence limitation. PF-001 remains open at Preview-ready
  until the separately approved protected Preview deployment and human retest satisfy the child plan.
```

## 5. Bounded Fix Loop

1. **Record**：先写 `PF` 记录，不从聊天摘要直接猜测原因。
2. **Reproduce**：优先在 exact local candidate 复现；记录浏览器、viewport、person、Track、zone、资料状态和时间边界。
3. **Classify**：确认 priority、是否属于既有 V2、是否影响数据/Schema/AI/费用/部署边界。
4. **Plan**：说明 scope、non-scope、预计文件、测试、资料副作用与停止条件；涉及持久资料或外部动作时先等人工确认。
5. **Fix locally**：只处理与该 `PF` 直接相关的最小改动，保留用户已有修改和 accepted Motion。
6. **Validate locally**：运行聚焦测试与受影响路径；阶段批次结束时运行完整 V2 gate。
7. **Prepare Preview**：只有本地 clean exact commit、Schema/Backup 兼容和回退路径清楚时，才标记 `Preview-ready`。
8. **Execute remotely with approval**：迁移 Staging、修改 environment、部署或调用付费 AI 分别按当次批准执行。
9. **Retest**：用户或 Mimi 按原始复现步骤检查；开发者自测不能替代人工使用结论。
10. **Close**：记录 exact commit/deployment、验证、人工结果和剩余限制，再把问题标为 `Closed`。

## 6. Validation Matrix

每个问题选择最小相关项，阶段收口执行全部适用项：

- Data/learning：Recognition 与 Active 独立、Review/New Words、first-attempt anchor、same-session recovery、rollback、two-gate reset、day rollover。
- Interaction：卡片点击、Space/Arrow/Enter、鼠标、触控、输入框/弹窗/IME、focus、screen reader labels。
- Responsive：320、375、390、768、820、1023、1024 与 desktop；Safe Area、dialog、bottom navigation、无 horizontal overflow。
- Performance：cold/warm 区分、重复 GET/POST、重复 Loading、mutation 后继续学习、Server-Timing 与 runtime error。
- Voice：Google Standard current voice list、exact allowlist、preview、Cloud/default 与 explicit device fallback、Recognition/Dictation/example-word playback、Cache/timeout/Kill Switch；音质由人试听。
- Bilingual examples：Add/Import/Edit/Review/AI/CSV/JSON、legacy gap、`Needs translation`、English exact offsets。
- AI：Disclosure、minimal outbound data、editable acceptance、lineage、Cache/Replay/Idempotency、Kill Switch、quota/cost ledger、AI unavailable 时学习功能继续可用。
- Persistence：local/Postgres parity、Backup Version 1–4 compatibility、`0003` + `0004` order、no partial readiness、no synthetic-to-Production copy。
- Repository gate：`npm run governance:preflight`、`npm run lint`、`npm run typecheck`、`npm run test`、三套 backup dry-run、`npm run build`、`git diff --check`。

## 7. Remote And Data Safety

- 本文件创建阶段只改文档。
- Preview 使用 synthetic/test data；Production 真实学习资料不进入本地 fixture、普通 Staging、截图、日志或仓库。
- 每次 Staging migration 或 Preview deployment 都必须先确认 exact target、exact commit、backup/recovery、Schema readiness 与 rollback direction。
- 当前候选要求 `0004` 先于应用部署；只部署新程序到旧 Preview Schema 会导致数据库读取失败，属于 stop condition。
- Preview Gemini 继续使用已有全局 300 attempts/day、token、`US$0.50/day`、`US$2/month`、concurrency 2、Cache、Idempotency 与 Kill Switch；一次问题复测不能扩大这些边界。
- PF-001 TTS 使用完全独立的全局边界：2,000 provider attempts/day、100,000 characters/day、1,000,000 characters/month、按完整公开标价折算 `US$0.50/day` / `US$4/month`、concurrency 4、Cache 与 Kill Switch；Cache hit 不计 provider attempt。它不复用 Gemini AI ledger，也不设置个人上限。
- `person_id` 仍是资料分离字段，不是身份。整个 V2 不用 SSO 修饰或掩盖这一限制。
- 不在 issue 记录中保存 secret、Shareable Link、真实数据库连接、完整真实词汇清单或可识别的个人学习历史。

## 8. Stop Conditions

- 问题不能稳定复现，修复只能依靠猜测且可能改变学习资料；
- 修复要求改变 FSRS/Daily Episode 核心语义，但没有独立计划和回归证据；
- 发现 data loss、cross-person leakage（跨人物资料混用）、credential exposure、cost guard bypass 或 Production crossover；
- Staging/Preview Schema 与候选应用不匹配，或 `0004` 只能部分执行；
- Preview 需要 Production credential、Production database 或真实 Production data 才能继续；
- 修复实际属于 SSO、新题型、未规划的新外部服务或大型新功能；PF-001 只能在其已确认的 Google Cloud Standard TTS 派生计划内继续；
- 自动测试通过但用户/Mimi 的原始问题仍可复现；
- 任一工具请求超出当次明确批准的远端或付费权限。

命中停止条件时，保留证据、标记状态并回到人工决策，不用“已改善”代替通过。

## 9. Completion Handoff To V2-8-3

本阶段完成时，向 V2-8-3 Gate 2 提供：

- closed/open/accepted/held `PF` inventory（问题清单）；
- exact release-candidate commit 与 protected Preview deployment；
- 当前 Staging Schema/migration 状态和 Backup Version；
- 用户/Mimi 复测结果与任何证据限制；
- 完整测试、浏览器、runtime/log、AI ledger 与费用边界结果；
- 已接受限制、Version-hold 去向和 paired rollback（成对回退）注意事项。

Gate 2 只在这些资料完整后恢复为下一项工作，并继续遵守自己的 fresh approval（重新批准）。
