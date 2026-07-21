# Words Learning App For Mimi V2-8-2.3-1：Google Cloud Standard TTS

Created: 2026-07-21 AEST
Last updated: 2026-07-21 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md` 的 `PF-001`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE8_2_2_REVIEW_AUDIO_BILINGUAL_EXAMPLES.md`
- `plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md`
- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- 用户在 2026-07-21 确认：现有 browser SpeechSynthesis（浏览器文字转语音）在所有朗读入口的实际音质不可接受，V2 改用 Google Cloud Text-to-Speech Standard voices；用户已经试听 Standard 并认为质量足够
- 用户在 2026-07-21 确认：项目内部 TTS 额度可以适当放宽，优先避免正常学习被过小额度打断

Scope:

- 把 Google Cloud Text-to-Speech API 的 Standard voice family（标准音色系列）作为 V2 默认朗读来源。
- 覆盖 Recognition 整词/词组朗读、Active revealed answer、Active Dictation 和例句选词朗读；四个入口共用一个服务端协议、声音选择和失败处理。
- 使用当前官方 `voices:list` 结果建立小型 server allowlist（服务端允许清单）；用户已在 `en-AU-Standard-A/B/C/D` 中选择 `en-AU-Standard-C`，固定为 V2 的 exact default voice（精确默认音色）。
- 每次只向 Google Cloud 发送使用者明确点击或当前 Dictation 所需的英文单词、短语、固定搭配或例句选词，不附带中文释义、`person_id`、学习历史、评分、Track、AI draft、prompt token 或 credential。
- 建立 Runtime Cache（运行缓存）、同请求合并、独立原子用量计数、费用估算、并发、timeout（超时）、Kill Switch（紧急关闭开关）和明确的设备音色备用选项。
- 保留现有学习调度、评分、Motion、键盘、触控和 bilingual example（双语例句）行为；朗读成功、失败或重放都不写 Review event、Daily actual 或 FSRS state。
- 本地代码、fixture（固定样例）、用户 ADC 供应商证明与 exact voice 选择已经完成；Preview identity、远程迁移、部署和 Preview 真人复测仍按后续批准执行。

Non-Scope:

- 不选用 Chirp 3 HD、WaveNet、Neural2、Gemini TTS 或自动供应商切换；本阶段固定为 Google Cloud Standard。
- 不加入 microphone、Speech Recognition（语音识别）、发音评分、自动口语判定或上传使用者音频。
- 不把整句例句、中文释义或学习记录自动发送给 TTS；例句操作只朗读使用者明确选中的英文词汇。
- 不增加 SSO、OAuth、public registration、per-person authorization 或 confidential tenant isolation；整个 V2 继续排除这些能力。
- 不改变 FSRS-6、Daily Episode first-attempt anchor、Recognition/Active Profile isolation、rating color scale、Motion 或 reduced-motion。
- 当前批准不建立 Workload Identity Federation（工作负载身份联合）或长期 service-account key，不连接远程数据库，不远程执行 `0005`，也不部署 Preview/Production。专用项目的 API/Billing、用户 ADC 与有界本地供应商证明已按用户明确批准完成。
- 不以 Google Cloud free tier（免费额度）、Billing budget（账单预算提醒）或浏览器 Basic Auth 单独代替应用内部的请求、字符、费用、并发、Cache 与 Kill Switch 保护。

Exit criteria:

- 当前官方资料已重新核验 Standard voice 可用性、价格、字符计费、资料处理、API 鉴权和输出格式，并在供应商证明时记录日期与链接。
- 由当前 `voices:list` 得到的少量 Standard 候选经过用户与 Mimi 真人试听，exact voice name、language code、speaking rate 和 pitch 被固定到版本化服务端 allowlist；自动测试不被描述为音质证明。
- 四个现有朗读入口默认使用同一 Cloud TTS route；页面导航、卡片切换和评分后不会退回不同的浏览器音色。
- Cache key 不包含明文词汇，并绑定规范化英文、exact voice、language、speaking rate、pitch、audio encoding 与 adapter contract version；重复播放优先命中缓存。
- 全局原子用量控制、并发、timeout、Kill Switch、失败计数和公开标价折算费用均有测试；`person_id` 不能重置或分割全局边界。
- Provider（供应商）不可用、额度关闭或请求失败时不伪装成成功，也不静默切换到音质较差的设备声音；学习者可重试，或明确选择临时 `Use device voice`。
- 朗读调用与计数不会写入学习事件、学习完成数、FSRS state、Gemini AI ledger 或用户 backup；TTS operational ledger（运行计数记录）不保存原始文本或音频。
- 50 条代表性语料的功能与人工试听通过，至少包含常用/PTE 词、长词与罕见词、短语/固定搭配、易混音词和短句试听样本。
- 本地聚焦测试、完整测试、lint、typecheck、三套 backup dry-run、build、治理预检和 diff 检查通过。
- 经单独批准后，protected Preview 使用 exact commit、独立非 Production identity、`0005`、独立 TTS Kill Switch 和脱敏 ledger 完成真实设备验收；PF-001 由用户或 Mimi 明确关闭。
- V2-8-3 在 Gate 2 前同步 `0005` 顺序和固定 SHA-256；没有该同步时不得把候选描述成可正式迁移。

Consumer / next stage:

- `plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md` 的 PF-001 closure
- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`

Document nature:

本文件是 V2-8-2.3 PF-001 的派生计划，不是新的平级 master plan。它冻结已选供应商、费用边界、资料最小化、缓存、失败体验和分段批准规则；实现及所有外部动作仍按下列 Gate 单独进行。

Current operational tier: Tier 3

Target capability tier: Tier 3

Working tier: Tier 3

Status: `High / Fixed locally`. Gate B 本地实现、Gate C 用户 ADC 供应商证明和 exact voice 选择已完成；`en-AU-Standard-C`、`0.9` speaking rate、`0` pitch、MP3 已固定。50 条本地试听、protected Preview identity/`0005` 迁移、部署和用户/Mimi Preview 复测仍未完成。

## 1. Accepted Provider Decision

### 1.1 Fixed route

| Item | Accepted V2 decision |
| --- | --- |
| Provider | Google Cloud Text-to-Speech API |
| Voice family | Standard only |
| Exact voice | `en-AU-Standard-C`，Voice Contract `google-en-au-standard-c-v1` |
| Locale / delivery | `en-AU`；speaking rate `0.9`；pitch `0` |
| Output | MP3，24 kHz mono in the current provider proof |
| Default route | Cloud TTS |
| Emergency route | 使用者明确选择的 device voice；不静默回退 |
| AI disclaimer | 不使用 Gemini AI 免责声明；Settings 显示简短的外发资料说明 |

普通学习界面继续使用简短英文。Settings 的必要说明使用：

> Cloud voice sends only the English text you play to Google Cloud. / 云端朗读只发送你点击播放的英文内容。

不在每次点击时弹出确认框。首次启用、Settings 与隐私说明保持可见，避免在高频学习中制造重复中断。

### 1.2 Current official facts

截至 2026-07-21，设计依据为：

- Google Cloud Text-to-Speech pricing：Standard voices 每月前 4,000,000 字符免费，之后为 `US$4 / 1,000,000 characters`；使用免费额度仍需启用 Billing，超出后自动计费。
- Google Cloud Text-to-Speech data logging：官方说明该服务是 stateless（无状态）并且不记录使用者提交的 TTS text 或产生的 audio。
- Google Cloud voice/API documentation：Standard voices 与 MP3 output 由正式 API 支持；2026-07-21 `voices:list` 返回 `en-AU-Standard-A/B/C/D`，用户试听后选择 C。
- Google Cloud authentication 与 Workload Identity Federation 支持短期凭证；Vercel OIDC（OpenID Connect，开放身份连接）可作为无长期 service-account key（服务账号密钥）的首选连接方式。
- Google Cloud Billing budget 是提醒机制，不是硬费用上限；应用内部 hard stop（硬停止）必须独立存在。

Official references:

- <https://cloud.google.com/text-to-speech/pricing>
- <https://docs.cloud.google.com/text-to-speech/docs/data-logging>
- <https://cloud.google.com/text-to-speech/docs/voices>
- <https://docs.cloud.google.com/text-to-speech/docs/create-audio>
- <https://docs.cloud.google.com/text-to-speech/docs/authentication>
- <https://cloud.google.com/iam/docs/workload-identity-federation>
- <https://vercel.com/docs/oidc>
- <https://cloud.google.com/billing/docs/how-to/budgets>

这些事实会在首次真实供应商证明和 V2-8-3 正式启用前各重新核验一次。价格或产品条款变化时，先更新本计划与费用常量，再启用调用。

## 2. Learner Experience Contract

### 2.1 One consistent playback path

以下入口全部调用同一个 `speakEnglishText()` client facade（前端统一入口），由它请求 `/api/tts`：

1. Recognition card 的整词、短语或固定搭配 `Listen`；
2. Active revealed answer 的朗读；
3. Active Dictation 的隐藏目标朗读；
4. English example 中使用者明确选择的单词朗读；
5. Settings 的 voice preview（音色试听）。

调用方不得各自选择 voice、provider 或 fallback。组件只传递规范化 text 与用途标签；用途标签用于可观测性，不影响学习资料。

### 2.2 Loading, retry and fallback

- 第一次未缓存播放可以显示短暂的 loading state，并在请求成功后自动播放；同一播放按钮防止连续点击产生重复 provider call。
- 切换卡片、路由或 person 时，过期响应不得播放到新的当前词条。
- 网络/供应商失败显示简短 `Voice unavailable · Try again`，并保留学习进度。
- Dictation 在没有可用音频时不允许把“没听到”当成记忆失败；使用者可以重试或显式启用 `Use device voice`。
- 设备音色备用是当前浏览器的本地设置。它不改变 Cloud 默认，也不被描述成与 Cloud 同等音质。
- Cache hit、重复播放、取消播放和失败都不写学习记录。

### 2.3 Text limits

- 普通词条/短语上限：240 Unicode characters；例句选词继续只发送选中的英文 token/phrase。
- trim、Unicode normalization、内部空白合并与允许字符检查在 client/server 两侧一致；服务端结果为最终权威。
- 空文本、控制字符、markup、URL、超长输入和非允许用途被拒绝，不进入 provider ledger。
- 不接受任意 SSML（Speech Synthesis Markup Language，语音合成标记语言）输入；服务端固定 speaking rate 与 pitch，防止客户端扩大输出或注入行为。

## 3. Server, Cache And Authentication Contract

### 3.1 Route and provider adapter

- 新增严格 `POST /api/tts`；只接受版本化 JSON、受限 text、用途标签与客户端 request id。
- route 沿用应用访问保护和同源要求，不增加会在单次学习中强制重新登录的短时 card token。
- 服务端 provider adapter 固定 Standard allowlist、MP3、speaking rate、pitch 和 timeout；客户端不能提交任意 voice name、model 或 encoding。
- Provider request 与 response 不写普通日志；错误日志只记录 request id、状态类、耗时、字符数和脱敏 cache digest。
- 浏览器只接收音频 bytes、content type、cache status 和不含词汇的 request id，不接收 Google credential 或 provider metadata。

### 3.2 Authentication

首选正式路线：

```text
Vercel Function short-lived OIDC token
  -> Google Cloud Workload Identity Federation
  -> least-privilege TTS caller identity
  -> Text-to-Speech API
```

- 不把 service-account JSON key 放入 Vercel environment、`.env`、仓库、文档或下载目录。
- 本地/一次性供应商证明优先使用已登录开发身份的 Application Default Credentials（应用默认凭证）或 service-account impersonation（服务账号模拟）；不得复制长期 key。
- Preview 与 Production 使用可区分的 identity/attribute condition（身份与属性条件）、provider scope、ledger 和 Kill Switch。
- 建立 WIF pool/provider、service account、IAM role、API、Billing 或 Vercel environment relationship 都是外部账户变更，必须单独批准并保留脱敏证据。

### 3.3 Cache layers

Cache key：

```text
SHA-256(
  normalizedText
  + exactVoiceName
  + languageCode
  + speakingRate
  + pitch
  + audioEncoding
  + ttsAdapterContractVersion
)
```

- key 只保存 digest（摘要），不包含明文词汇。
- 服务端先查 Vercel Runtime Cache；它按 project/environment 隔离并在部署之间保留，但属于可被移除的运行缓存，不能作为持久资料来源。
- 相同 cache miss（缓存未命中）共享一个 in-flight request（进行中请求），避免快速重复点击重复计费。
- 服务端缓存条目包含音频、content type、exact voice contract、创建时间和 digest，不包含 `person_id`、学习记录或原始 text。
- 单条音频设置严格 response-size ceiling（响应大小上限）；超过上限不写缓存、不返回不完整音频。
- 浏览器页面内保留小型 memory cache（内存缓存）用于立即重放；刷新页面后可以消失，不写 backup。
- 更换 voice、rate、pitch、encoding 或 adapter version 会自然产生新 key；无需批量删除旧条目。
- Cache 故障降级为受全局 ledger 保护的 provider call；不能因 Cache 不可用而绕过额度。

## 4. Internal Quota And Cost Guard

### 4.1 Accepted global boundary

用户确认项目内部额度可以适当放宽。V2 初始边界为：

| Guard | Global limit | Meaning |
| --- | ---: | --- |
| Provider attempts / day | 2,000 | 仅实际提交给 Google 的请求；Cache hit 不计 |
| Characters / day | 100,000 | 按服务端提交的计费字符计算 |
| Characters / calendar month | 1,000,000 | 低于当前 Standard 4,000,000 free-tier characters |
| Estimated list-price cost / day | US$0.50 | 不扣除 free tier 的保守折算 hard stop |
| Estimated list-price cost / month | US$4.00 | 按 `US$4 / 1M characters` 折算 |
| Global provider concurrency | 4 | 防止同时突发调用 |
| Per-person limit | none | `person_id` 不形成身份或独立额度 |

- 额度日界按 `Australia/Melbourne` natural day；月界按同一时区 calendar month。
- Cache hit 与浏览器内 memory replay 不占 provider attempt/character/cost；它们仍受单一播放、输入长度和访问保护约束。
- 一旦请求已提交给 Google，attempt 与请求字符数即保留，即使随后 timeout、网络中断或 provider failure。
- 费用使用不扣除 free tier 的公开完整标价计算；这样即使免费额度规则变化，应用仍保守停止。
- 当前边界没有个人上限。增加真正可执行的个人上限仍需要 authenticated identity（已认证身份），不在 V2。
- Google Cloud quota 与 Billing alert 可作为第二层提醒/限制，不能放宽应用内部边界或代替原子计数。

### 4.2 Atomic accounting

本地已经新增 forward-only additive migration（只前进追加迁移）：

```text
db/migrations/0005_v2_standard_tts_accounting.sql
```

它只增加 TTS operational accounting 所需的 bucket/run 资料，不改变 Vocabulary、Review、Daily Plan、AI draft 或 JSON backup Version 4：

- `tts_usage_buckets`：环境/范围、自然日/月、attempts、characters、estimated list cost、in-flight；
- `tts_runs`：server request id、cache digest、voice contract id、character count、status、latency class、created/completed timestamp；
- 不保存 raw text、audio、`person_id`、vocabulary id、review event id 或学习历史；
- Cache hit 默认只进入 privacy-safe aggregate metric（不进入永久逐条记录）；
- reservation、concurrency、completion/failure reconciliation 使用单一数据库 transaction（事务），拒绝先调用供应商再补计数；
- 过期 in-flight reservation 通过有界 reconciliation（对账）释放并保留 attempt/character/cost，不假设未收费。

Schema Version 仍为 6，`0005` 是 additive contract。固定 SHA-256 为 `ce0890a59dcf262c38894f865cb249339e95727764c6a98a58b43eba2a4c5367`；V2-8-3 已按 `0003 -> 0004 -> 0005` 同步本地门禁。`0005` 尚未在任何远程数据库执行。

## 5. Data Lifecycle And Privacy

- Outbound text 是使用者主动播放的英文词、短语、固定搭配或 Dictation target；不自动发送整份词库。
- Google Cloud 当前官方资料说明 TTS 不记录 customer text 或 audio；正式供应商证明和上线前再次核验，不能写成泛化的 Zero Retention 承诺。
- 应用普通日志、Vercel logs、database ledger、Server-Timing 和错误画面不得包含 raw text 或 audio。
- 生成音频仅存在于供应商响应、运行缓存和短期浏览器内存；不写 Postgres learner data、不进入 JSON/CSV backup，也不上传 Blob storage。
- Cache 可以随时丢失并安全重建；清除 Cache 不影响学习资料或备份恢复。
- TTS ledger 是 operational/security data（运行与安全资料），使用独立 retention policy（保留期限）；实现时先建立清理与对账测试，再允许正式调用。
- 本阶段不采集、录制、上传或保存 microphone audio、speech transcript 或 pronunciation score。

## 6. Implementation Gates

### Gate A — Documentation and exact contract

本文件、PF-001、V2 Master、Architecture、README、AGENTS、V2-8-3、Changelog 与 AI Agent Log 同步。此 Gate 只允许本地文档改动。

### Gate B — Local implementation with fixture audio

- 建立 route、provider interface、fixed MP3 fixture、Cache、atomic ledger、UI states 与 tests。
- 默认 provider 保持关闭；本地演示不得把 fixture 声音标成 Google Cloud 结果。
- 创建 `0005` 后同步 V2-8-3 migration order 与 SHA-256 guard。
- 不读取 credential、不调用 Google、不连接 remote Postgres。

### Gate C — Separately approved provider and identity proof

- 重新核验官方价格、voice list、资料处理、API lifecycle、quota 与认证方式。
- 经明确批准后建立/检查最小权限 WIF route、TTS API/Billing 与非 Production identity。
- 最多使用 50 条版本化语料生成候选，记录 attempts、characters、cache behavior、latency 与按标价估算费用。
- 试听并固定 exact Standard voice allowlist；清理一次性 proof 资源或记录保留理由。
- 任何 secret value 不进入证据文件。

### Gate D — Local complete acceptance

- 使用确定的 exact voice contract 完成四个入口、Settings、fallback 和完整回归。
- 运行聚焦/完整验证，检查 diff、migration digest、backup exclusion 与 secret scan。
- 由用户完成本地或受控样本试听；标记 `Preview-ready` 不等于已部署。

### 6.1 Execution record — 2026-07-21

- Gate B：严格 `POST /api/tts`、固定 fixture、Google provider interface、无明文 Cache key、同请求合并、页面内音频缓存、独立内存/Postgres accounting、timeout、Kill Switch、明确 device fallback 和四类学习入口已接线。
- Gate C：专用项目 `for-tts-502913` 的 Billing、Text-to-Speech API 与当前 `voices:list` 已验证；本机 Google Cloud CLI 使用用户 ADC，未建立或下载 service-account JSON key。
- Candidate proof：`en-AU-Standard-A/B/C/D` 共 4 次、324 characters；用户明确选择 C。随后真实 `/api/tts` route 使用 C 完成 2 次 8-character provider miss 和 1 次 Cache hit。合计 provider proof 为 6 attempts、340 characters、公开完整标价折算 `US$0.00136`；实际账单可能由免费额度抵消，本记录不把免费额度当 hard stop。
- Voice Contract：`google-en-au-standard-c-v1` 固定 `en-AU-Standard-C`、`en-AU`、speaking rate `0.9`、pitch `0`、MP3。客户端不能覆盖这些字段。
- Route proof：真实响应为 `audio/mpeg`，24 kHz mono、64 kbps；相同规范化英文的第二次请求返回 `x-mimi-tts-cache: hit`，没有第二次供应商调用。
- Local command：先运行 `npm run build`，再运行 `npm run v2:8-2-3:tts:start`。该命令只在 loopback、本机 ADC、固定项目和 exact execution scope 全部匹配时打开。
- Safety：没有读取或输出 credential value，没有 `.env` 写入，没有远程 Postgres 连接/迁移，没有 Vercel environment、Preview/Production deployment 或 Production 资料变更。Google Cloud API/Billing 检查、ADC 建立、quota project 设置与本地有界调用属于用户明确批准的 Gate C。
- Automated closeout：10 个 TTS/interaction focused files / 35 tests 与完整 88 files / 536 tests 通过，既有 Postgres integration file/test 保持 skipped；lint、typecheck、三套 backup dry-run、Production build、script syntax、manifest template、production dependency audit（0 vulnerabilities）和 diff check 通过。
- Remaining：50 条代表性试听、Preview WIF identity、远程 `0005`、exact deployment 与用户/Mimi Preview 复测仍在 Gate D/E；PF-001 不能据此关闭。

### Gate E — Separately approved protected Preview

- 迁移顺序必须为 `0003 -> 0004 -> 0005`，再部署 exact application commit。
- 使用独立 Preview WIF identity、provider scope、Kill Switch 与 ledger；不能使用 Production credential。
- 先用 Kill Switch closed 验证 fallback/resting path，再在明确批准的窗口内打开。
- 用户与 Mimi 在真实设备完成 Recognition、Active Dictation、例句选词与重复 Cache 试听。
- 记录 exact deployment、环境、voice、attempts、characters、estimated cost、cache hit 与 runtime error，不记录词汇。

### Gate F — PF-001 closure and V2-8-3 handoff

- 人工确认音质与交互满足预期后关闭 PF-001。
- V2-8-2.3 完成时把 exact `0005`、identity/credential inventory requirement、Production Kill Switch、quota baseline 与 rollback 写入 V2-8-3。
- Gate 2 仍需新的明确批准；本子计划关闭不授权 Production。

## 7. Validation Matrix

Focused automated coverage:

- input normalization、text/purpose/length rejection、no SSML、server allowlist；
- cache digest determinism、voice/contract invalidation、cache hit before reservation、in-flight coalescing；
- atomic daily/monthly character/request/cost/concurrency reservation；
- failed/timeout attempt retained、stale in-flight reconciliation、Kill Switch、environment isolation；
- no raw text/audio in database ledger, log payload, headers, backup or error response；
- Recognition / Active / Dictation / example-word / Settings 共用 route；
- stale card response cancellation、double-click suppression、retry、explicit device fallback；
- no Review event、Daily actual、FSRS state 或 Gemini AI ledger write；
- keyboard、input、dialog、IME、Motion 与 bilingual example regression；
- local/Postgres accounting parity、`0005` order、Schema 6 readiness、Backup Version 1–4 compatibility。

Human audio corpus:

| Group | Count | Purpose |
| --- | ---: | --- |
| Common and PTE words | 20 | 日常学习自然度与重音 |
| Long or uncommon words | 10 | 音节与清晰度 |
| Phrases / fixed collocations | 10 | 连读与停顿 |
| Sound/confusable pairs | 5 | 可辨识度 |
| Short preview sentences | 5 | Settings 试听与稳定性 |
| Total | 50 | 用户/Mimi 真人试听 |

Required local closeout:

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
git diff --check
```

## 8. Stop Conditions

- 当前官方 `voices:list` 没有可接受的 Standard voice，或用户/Mimi 试听不通过；
- 供应商价格、计费字符定义、API lifecycle、资料处理或认证事实不能从官方资料确认；
- 必须使用长期 service-account key 才能继续，但没有单独风险批准；
- Cache 或数据库不可用时 route 会绕过原子计数；
- 任意 client input 可选择 voice/model/SSML、扩大文字长度或跨环境重置额度；
- raw text/audio 出现在数据库 ledger、日志、错误、header、backup 或仓库；
- Cloud TTS 失败会静默产生错误音色、错误词条音频或把 Dictation 记为失败；
- `0005` 未同步到 V2-8-3 的 migration digest/readiness/rollback contract；
- Preview 需要 Production credential、Production database 或真实 Production learning data；
- 任一实现或外部动作超出当次明确批准。

命中停止条件时关闭 provider route 或保持 Kill Switch closed，学习资料和非朗读流程继续可用；不得用未验证的成功文案掩盖失败。
