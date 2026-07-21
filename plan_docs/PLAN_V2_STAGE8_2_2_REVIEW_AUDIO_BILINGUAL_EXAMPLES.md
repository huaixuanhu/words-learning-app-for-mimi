# Words Learning App For Mimi V2-8-2.2：Review Controls, Voice Quality And Bilingual Examples

Created: 2026-07-19 AEST
Last updated: 2026-07-20 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md` 的 `V2-8 Dashboard Insights And Release Gate`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE3_1_REVIEW_INTERACTION_CONTEXT_WORD_ACTIONS.md`
- `plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md`
- `plan_docs/PLAN_V2_STAGE6_ACTIVE_PRACTICE_ENGINE.md`
- `plan_docs/PLAN_V2_STAGE7A_LOCAL_AI_ENRICHMENT_COST_GUARD.md`
- `plan_docs/PLAN_V2_STAGE7B_1_FORMAL_AI_LOCAL_ORCHESTRATION.md`
- `plan_docs/PLAN_V2_STAGE8_2_STAGING_PREVIEW_RELEASE_REHEARSAL.md`
- `plan_docs/PLAN_V2_STAGE8_2_1_PERFORMANCE_STABILISATION.md`
- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- 2026-07-19 V2 Preview 使用反馈：方向键没有形成可靠的评分选择反馈、默认浏览器朗读音质较差、所有可见 English example（英文例句）都需要对应中文翻译

Scope:

- V2 only（仅 V2）。
- Recognition 与 Active 学习区的键盘评分控制。
- Browser SpeechSynthesis（浏览器文字转语音）的可选 English voice（英语音色）、试听、设备内偏好和安全回退。
- Vocabulary example（词汇例句）的英文与中文成对资料、编辑、导入、AI enrichment（AI 补充）、Postgres/local persistence（持久保存）、备份和学习区显示。
- 为已有 English-only（只有英文）例句提供可审查的 Gemini 翻译草稿与完成度检查；不在学习卡显示时即时请求 AI。

Non-Scope:

- V1 patch、V1 redeployment 或 V1 database change。
- 本地实现阶段不部署 Vercel、不修改 Preview/Production environment、不读取或更换 credential、不连接或迁移远程数据库。
- Cloud TTS、Gemini TTS、音频文件存储、microphone、Speech Recognition、发音评分。
- 修改现有 Motion、rating color scale（评分色阶）、reduced-motion 或 FSRS / Daily Episode 调度语义。
- Production backfill（正式资料补齐）、Production migration 或 Production provider call；它们仍由更新后的 V2-8-3 Gate 单独批准。

Exit criteria:

- 点击学习卡、显示答案、朗读或其他非输入型学习按钮后，Arrow keys（方向键）仍可在 2×2 评分区内选择；Space 与 Enter 保持现有行为。
- Text input、textarea、select、contenteditable、modal dialog（弹窗）与输入法组合状态不会被全局学习快捷键劫持。
- Settings 可列出、试听并保存当前设备的 English voices；所选音色消失时可靠回退，朗读不写学习记录。
- 所有新建、编辑、导入和 AI 接受的 English example 必须带有 non-empty Chinese translation（非空中文翻译）。
- Review、Library 与相关 preview 每个 English example 紧邻显示对应中文翻译；example word action（例句点词操作）继续只使用英文原句的 exact offsets（精确位置）。
- 旧资料与旧 backup 可被读取并显式标记缺少翻译；缺少翻译的资料不能被误报为 bilingual-complete（双语完整）。
- 新的前向 migration、backup compatibility（备份兼容）、Postgres/local parity（本地与数据库一致性）和 AI structured output（结构化输出）均有测试。
- V2-8-3 cutover tooling（上线工具）同步包含新增 migration；既有 `0003` 文件及其固定 SHA-256 不改变。

Consumer / next stage:

- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- Conditional future child plan: `Cloud TTS quality upgrade`，仅在你和 Mimi 完成真实设备试听后仍认为浏览器音色不足时建立。

Document nature:

本文件是 V2 protected Preview 验收期间插入的派生实现计划，不是新的平级 master plan。它先修复真实学习交互，再为上线前的双语例句完整性建立可验证的数据路径。

Current operational tier: Tier 3

Target capability tier: Tier 3

Working tier: Tier 3

Status: local implementation complete on 2026-07-19. Protected Preview / Staging and Production rollout remain separately approved work.

## 1. Accepted Decisions

### 1.1 Keyboard behavior

- 首次有效方向键在尚未选择评分时选中第一个评分。
- `ArrowLeft` / `ArrowRight` 在当前行移动，`ArrowUp` / `ArrowDown` 在当前列移动，不跨边界循环。
- `Enter` 只确认已经选中的评分；`Space` 只控制卡片答案显示或隐藏。
- 学习按钮保留焦点时不再整体关闭这些快捷键；真实文字输入、弹窗和组合输入继续优先。
- Recognition 与 Active 共用同一焦点分类 helper 和同一 2×2 移动函数，避免两套行为漂移。
- 现有 hover/selected 颜色、阴影、Motion 和 reduced-motion 行为不变。

### 1.2 Browser voice route

- 第一代修复继续使用 browser SpeechSynthesis，不引入付费音源。
- `Best available` 是默认选择；应用列出设备实际提供的 English voices，并允许试听后手动选择。
- 选择依据只使用浏览器公开的 voice name、language、default/local information；界面不把无法验证的音色标成 `HD`、`neural` 或 `premium`。
- voice preference（音色偏好）只存于当前浏览器，使用稳定的 `voiceURI + lang + name` 识别；找不到时回到 `Best available`。
- voice list 异步到达时响应 `voiceschanged`，避免首次进入 Settings 得到空列表。
- 朗读继续使用完整词条或用户明确选择的例句词汇，不写入 Review event、Daily actual 或 AI ledger。

### 1.3 Cloud TTS upgrade gate

- 如果真实手机与桌面试听后仍缺少满意音色，下一阶段允许切换到低成本 Cloud TTS。
- Cloud route 必须在开始前选择供应商/模型并重新核验 official pricing、model lifecycle、retention、region 与 API support。
- 实现必须包含 server-only credential、normalized text + voice + model cache key、重复播放 Cache、字符/请求/成本上限、concurrency、timeout、Kill Switch 和 browser fallback。
- Cloud TTS 的单独批准可以复用本阶段的 `Voice` 设置界面，但不能复用普通 Gemini text quota ledger 冒充音频成本控制。
- 2026-07-21 真人试听确认现有浏览器音色仍不合格，本 Gate 已触发并由 `plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md` 接管。用户已选择 `en-AU-Standard-C`（speaking rate `0.9`、pitch `0`、MP3）作为本地候选；本文的 browser SpeechSynthesis 实现保留为使用者明确选择的备用路径，不再是 V2 目标默认音源。

## 2. Bilingual Example Contract

### 2.1 Application shape

- `VocabularyItem.examples` 继续保存独立 English sentence 数组，保护现有点词 exact offsets。
- 新增相同顺序的 `exampleTranslationsZh` 数组；应用通过一个 `ExamplePair { en, zh }` helper 成对读取、编辑和显示。
- 新写入的每个非空 English example 必须有同位置的非空中文翻译。
- legacy item（旧词条）可在迁移边界临时带空翻译，但完整性检查必须准确报告；普通学习 UI 使用明确的 `Chinese translation needed` 状态，不生成或猜测翻译。

### 2.2 Database and backup

- 新增 `db/migrations/0004_v2_bilingual_examples.sql`，为 `vocabulary_items` 添加 `example_translations_zh jsonb`。
- migration 将每个旧 English example 初始化成同位置空字符串，并添加 array type 与 array-length parity constraint（数组长度一致约束）。
- `0003_v2_schema6_data_model.sql` 不重写；V2-8-3 migration manifest 同时固定和校验 `0003`、`0004`。
- Application schema 继续称 Schema Version 6；`0004` 是 V2 final additive migration（最终追加迁移），避免把已经完成的 Schema 6 数据模型冒充未发生。Inspector 必须显式检查该 additive contract。
- JSON backup 升到 Version 4；Version 1–3 restore 继续可解析，并把缺失翻译迁移成可审计的空位置。CSV 增加 paired Chinese-example column（配对中文例句列）。

### 2.3 AI and human decision

- 新 AI enrichment draft 为每条生成 English example 同时返回中文翻译；两数组必须同长度、无空项。
- 编辑 preview 时以 English/Chinese pair 为单位修改；Accept 前再次验证完整性。
- 模型来源和 `AI content may be inaccurate` 提示保持可见，中文翻译允许人工修改。
- 已接受的旧 draft 作为历史证据保留；不能因 output schema 升级而丢失。新生成使用新的 prompt/output schema version，旧版本只读兼容。
- 已有 English-only item 的批量翻译是显式 draft workflow（草稿流程）：生成、预览/编辑、接受后才写回词条；失败或拒绝不会覆盖英文原句。

## 3. Implementation Slices

1. 修复并整合 keyboard focus classification，补 Recognition/Active 组件交互测试。
2. 扩展 speech adapter、voice ranking/selection helper、Settings 试听与浏览器偏好测试。
3. 加入 bilingual example helper 与各学习/Library 显示；保持英文点词 offset 不变。
4. 加入 `0004`、Postgres mapper/query/mutation、local migration、JSON/CSV backup Version 4 与旧版兼容。
5. 升级 import/add/edit/AI draft 的 paired validation 和 UI。
6. 加入 missing-translation inventory/backfill draft path；本地只用 fixture/test，不调用真实 Gemini。
7. 同步 V2 master、Architecture、V2-8-3、Changelog、AGENTS 和 AI Agent Log。

## 4. Validation

- Keyboard component flow：focused answer/listen button、first Arrow、2×2 movement、Enter submit、Space flip、input/dialog/IME exclusion、Recognition/Active parity。
- Voice：delayed `voiceschanged`、manual selection、missing selected voice、no-English-voice fallback、unsupported browser、preference persistence、no study mutation。
- Bilingual examples：pair normalization、length/non-empty validation、English exact-offset stability、Library/Review rendering、manual/import/AI acceptance rejection。
- Data：`0004` static contract、Schema 5 → 6 + additive migration fixture、Postgres mapper/repository parity、backup Version 1–4 parse/export/restore、CSV escaping。
- AI：new response schema、prompt contract、source novelty、English/Chinese pair alignment、legacy accepted draft visibility、disclosure and editable acceptance。
- Full local gates：`npm run lint`、`npm run typecheck`、`npm run test`、backup dry-runs、`npm run build`、`npm run governance:preflight`、`git diff --check`。

## 5. Safety And Stop Conditions

- 本阶段不读取 `.env` 或 secret，不调用 Gemini/Cloud TTS，不连接 remote Postgres，不部署。
- 如果新资料形状会让旧 accepted AI evidence 消失、让英文 exact offsets 改变、让 V1 rollback 无法识别原英文 examples，停止并修正兼容层。
- 如果 V2-8-3 Gate 1 不能同时固定 `0003` 与 `0004`，Production Gate 2 之前必须停下，不能继续使用旧 manifest 宣称可上线。
- 如果 browser voice API 在目标设备没有满意音色，记录真实试听结果并进入 Cloud TTS 子计划；不把 `Best available` 文案当作质量证明。
- 任何 Preview/Production backfill、migration、deployment、credential 或 paid provider call 都需要后续远程执行批准。

## 6. Implementation Result

- Recognition 与 Active 使用同一组 shortcut guard（快捷键保护）和 2×2 non-wrapping movement（不循环移动）规则。普通学习按钮获得焦点后方向键仍可选择评分；文字输入、弹窗、输入法组合和修饰键继续优先。
- Settings 新增 `Best available` 与设备 English voice 列表、试听和浏览器内偏好。整词、Dictation 与例句点词朗读共同使用该偏好；没有网络请求、音频存储或学习记录写入。
- Vocabulary item 新增同位置 `exampleTranslationsZh`。Single add、Batch import、Library edit、Review、AI preview、候选词加入学习、local/Postgres repository、CSV 与 JSON backup 均已接通 English/Chinese pair。
- JSON backup wrapper 升到 Version 4；Version 1–3 可继续读入，并把历史缺失翻译显式迁移为空位置。Library 的 `Needs translation` 只显示真实缺口，不把空翻译视为完成。
- AI enrichment 新生成使用 `v2-ai-enrichment-prompt-v3` / `v2-ai-enrichment-draft-v3`，要求 source examples、generated examples 与 confusable example pairs 都有等长中文翻译。旧 accepted draft 继续只读兼容；Accept 前必须通过人工可编辑的完整性验证。
- `db/migrations/0004_v2_bilingual_examples.sql` 是 Schema Version 6 的 additive migration（追加迁移），SHA-256 为 `9e00e1213366492db90a97709d605d68770a1b80f46caa8b748886bc8bd4e29c`。既有 `0003` 文件与固定 SHA-256 未改变；V2-8-3 工具现在分别校验并依次执行两份 migration。
- 本地实现没有替现有 English-only 真实资料自动生成中文，也没有调用 Gemini。后续在受保护 Preview / Production 中应通过逐词 AI suggestion 预览、编辑、接受来补齐；拒绝或失败不会改写英文原句。
- Browser voice quality 仍以用户和 Mimi 的真实设备试听为最终判断。如果可用音色仍不足，再派生独立 Cloud TTS 计划并重新核验费用、隐私、Cache 与 Kill Switch。
