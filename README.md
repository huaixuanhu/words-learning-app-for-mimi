<p align="center">
  <img src="./public/brand/mimi-cats.png" alt="咪咪 Vocabulary 猫咪头像" width="180" />
</p>

<h1 align="center">咪咪 Vocabulary</h1>

<p align="center">
  一个温和、可自定义、ADHD-friendly（对 ADHD 友好）的私人词汇学习应用。
</p>

## 项目简介

咪咪 Vocabulary 目前是给 **Mimi 和 Anoria** 使用的私人小型词汇学习应用，主要服务于 PTE 备考和长期英语词汇积累。

它重视：

- **自定义能力**：词义、例句、标签、每日复习量和学习轨道都由使用者控制。
- **温和的 UI（用户界面）交互**：减少催促、惩罚感和不必要的信息压力。
- **ADHD-friendly 学习体验**：把任务拆小、保持明确反馈，并允许保守地回退和重新开始。
- **长期数据可控**：正式学习数据保存在云端数据库，同时保留导出和备份能力。

当前 V1 已作为受保护的私人应用上线。V2 主线已经完成每日学习、独立 Active 三种练习、手机端与 Dashboard、第一代付费 AI enrichment（AI 词汇补充）及 V2-only 性能收口。V2-8-2.2 已加入可靠的方向键评分、设备 English voice 备用选项，以及每条英文例句相邻的中文翻译资料链。V2-8-2.3 的 PF-001 已在 protected Preview 关闭；PF-002 的 Geist 回退 exact Preview 已 Ready 并等待人工复测；PF-003 的 Active New Learning/Review 完成音效修复已在 exact protected Preview Ready，等待人工复测。Production 继续运行 V1 / Schema Version 5。V2-8-3 Gate 2 暂停到全部 PF 收口，并且届时仍需新的明确批准。整个 V2 不包含 SSO（Single Sign-On，单点登录）或 confidential per-person authorization（个人机密授权隔离）。

## 正式版本

- 访问地址：[words-learning-app-for-mimi.vercel.app](https://words-learning-app-for-mimi.vercel.app)
- 当前线上版本：cloud-backed V1（云端持久化 V1）
- 当前开发分支：`V2`；PF-002 与 PF-003 均为 `Normal / Preview-ready`；本地 V2-8-3 Gate 1 与 protected Preview Gate 0B 已完成，Gate 2 暂停且仍需重新批准
- 访问方式：私人 Basic Auth（基础认证）；账号信息不会存放在仓库中
- 正式数据：Neon Postgres（关系型数据库）

## V1 能做什么

- 通过单词表单或 Batch JSON（批量 JSON）录入词汇。
- 为每个词保存多个中文释义、多个例句、标签和学习轨道。
- 在词库中搜索、筛选、编辑、归档、恢复和删除词汇。
- 使用四档自评完成 Recognition Vocabulary（阅读词汇）复习。
- 使用 FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）安排跨日复习。
- 当选择“完全忘记了”或“有点忘记了”时，在当前复习局内重新出现该词。
- 支持“回退 1 词”和重置当日复习任务。
- 按人物分别保存词汇、复习历史和每日任务设置。
- 导出 JSON backup（JSON 备份）和 vocabulary CSV（词汇表格）。
- 自定义深浅主题、交互声音和 Recognition / Active 每日数量。

## V2 当前进度与方向

- Recognition 和 Active 仍分别计算 `Added today`、`Suggested review`、`Review goal`、`New-word goal`；Home 与 Study 只把两个可设置目标作为主要卡片，前两项作为对应目标下的轻量参考信息。
- 用户可为 Review 和 New Words 设置任意非负整数目标；`0` 可作为休息日。
- 一个词条无论是单词、短语或固定搭配，都按一个学习单位统计。
- 新词在第一次提交有效记忆评分之后才进入该 Track 的复习状态。
- 上述每日值、Recognition 两个分区、今日/未来目标、学习阶段、读音、回退、整日重置和 Review 键盘操作已经在 Stage 5 本地实现。
- Stage 5.1 已将一次当日学习中的首次作答设为唯一跨日调度依据；后续纠正不会冲淡首次失败，完成数量只在达到“模糊记得”或“完全记得”后增加，未完成词条刷新后仍回到原分区。
- Stage 6 已把同一规则独立接入 Active；`Spell it` / `Dictation` 只保存结构化比对结果，不保存原始输入，`Say it` 不录音。
- Recognition 与 Active 使用同一 FSRS-6 算法家族，但参数、状态、事件和测试完全独立。
- Active 提供 `Say it`、`Spell it` 和 `Dictation`；Recognition 卡片增加浏览器读音按钮。
- Stage 7A 的 Library 已可打开本地固定 AI suggestions，编辑、拒绝或接受后再选择 Track 加入学习；例句中的单词也可打开本地解释并带入原有 `Add to learning` 表单。固定结果保存真实 `local-fixture` 来源并且不会冒充 Gemini。
- 受保护的 V2 Preview 已使用付费 Gemini 提供补充释义、例句、相似词和混淆词草稿；每次正式外发都要求当前 disclosure（数据披露）确认，所有结果仍需使用者审核。Production AI 路线继续保持关闭，直到 V2-8-3 对应的远程 gate、独立凭证和初始 4 次调用窗口分别获批。
- V2-8-1 Dashboard 已加入真实今日进度、Learning rhythm（学习节奏）和 Memory outlook（记忆展望），并通过 320–1280 px 本地响应式检查。Actual 与 FSRS estimate 使用独立文案、数值和视觉样式。
- V2-8-1.1 已移除普通界面的重复副标题、氛围口号、鼓励卡和 `V2 Stage ... Fixture` 内部显示名；安全提示、AI 来源、统计口径、错误恢复与快捷键说明继续保留。
- V2-8-2 已完成 Staging Schema 5 → 6、Reset / 再迁移演练、Schema 5 recovery checkpoint（恢复检查点）、受保护 Preview 和真实 Gemini 验收。最终合成数据包含 5 个词条、4 个独立 Review states、5 次学习事件；Gemini 共 3 次成功调用、1,467 tokens、估算 `US$0.000777`，没有未完成调用。
- V2-8-2.1 让页面切换复用已经加载的词库，合并同时发生的读取，直接使用写入返回值，并让评分/回退后立即继续而不等待整份词库重读。Daily Plan 已存在时不再重复准备同一天。V2-8-3 Gate 0B 已确认 exact commit 的 Vercel Functions 位于 Sydney `syd1`；10 次温热 Home → Library 的 data-ready median/p95 为 `52/62ms`，页面切换新增 full-data GET 为 `0`。V1 保持原样。
- V2-8-2.2 修复了“Space / Enter 可用但 Arrow 无反应”的焦点边界：Recognition 和 Active 都可在 2×2 评分中用方向键移动，文字输入与弹窗不会被快捷键打断；现有卡片 Motion 与评分色阶保持不变。
- Settings 仍可明确选择设备 English voice 作为备用。PF-001 的默认路线固定 Google Cloud `en-AU-Standard-C`（`0.9` 语速、原始音高、MP3），并接入 Recognition、Active revealed answer / Dictation、例句选词与 Settings preview；重复词优先使用无明文 key 的 Cache。Preview-only WIF、`staging` `0004` / `0005`、exact deployment、机器路径和 MacBook + Chrome 人工复测已完成。Mimi 也确认音效没有问题，但其设备/浏览器没有记录；iPhone + Safari 是未来少量使用环境，尚未验证。
- 新建、编辑、导入和 AI 接受的英文例句都需要配对中文翻译。Library 可筛选 `Needs translation`，旧资料的缺口会明确显示并可通过人工审核的 AI suggestion 逐词补齐。JSON backup 已升到 Version 4；Version 1–3 仍可读取。
- V2-8-2.3 使用 `PF-001` 起的连续编号集中处理 Preview 反馈。PF-001 为 `High / Closed`，使用独立 TTS Cache、Kill Switch、全局额度和 additive `0005`，不复用 Gemini ledger；用户与 Mimi 均确认音效可接受，Mimi 的设备环境和 iPhone + Safari 兼容性仍未形成证据。PF-002 为 `Normal / Preview-ready`：桌面入口改为 `Review / New Learning`，手机入口为 `Learn`；Home/Study 使用两项目标层级；Session 文案更明确；桌面面板继续等高。历史 Instrument Serif 版本的 1280/390 px 与运行机器检查均通过，但用户实际使用后要求撤回该字体。Geist 回退 commit `54c8ca4492ff9b13d095ea0bd0d3d7ca702c3c2f` 已作为 protected Preview deployment `dpl_EmRVmp5YDTKgnh1VEtVBozwhRp6J` Ready；桌面字体、保护、区域、溢出与控制台机器检查通过，人工复测仍待完成。该阶段仍不包含 SSO。
- PF-003 为 `Normal / Preview-ready`：Active 在最后一项成功记录且队列清空后，现与 Recognition 一样显示完成弹窗；`Done` 根据既有 `Review complete` 开关播放同一份本地 Mimi 音效。Exact commit `acd009cc3879275dffa1d22c470b6c82fd1f8263` 已作为 protected Preview deployment `dpl_BAYB3tDx1m4ybKFRtw9rdf32jZon` Ready，等待人工音效复测。该行为覆盖 Active New Learning、Review、Say it、Spell it 与 Dictation，不修改完成条件、FSRS、资料、TTS 或动态效果。
- V2-8-3 的本地 Gate 1 使用 `maintenance`、`schema6-readiness`、`live` 三个明确模式；缺失或未知模式会安全停止。Basic Auth 仍先于维护状态执行，只有 `live` 接受带 `v2-schema6` 标记的 Production 写入，旧页面会被要求重新载入。
- Schema 5 / Schema 6 的非空 clone/main 检查和迁移命令目前只是 dormant tooling（未启用工具），必须同时通过 exact target、environment、action 和人工确认。`0003`、`0004`、`0005` migration SHA-256 已分别固定，迁移顺序为 `0003 -> 0004 -> 0005`；切换记录使用不含密钥的 manifest（清单）并要求 V1/Schema 5 与 V2/Schema 6 成对回退准备。
- Production AI 的独立 `v2-8-3-production` scope 只有在 `live`、HTTPS、Vercel Production `main`、`NODE_ENV=production`、Schema 6、明确 Kill Switch 状态和其他正式确认全部满足时才可能打开；首轮最多 4 次供应商调用，进入 300 次/日长期边界还需单独确认。
- Preview 使用独立 study-token secret、独立 Gemini Auth Key、全局 300 次/日与 `US$0.50/日` / `US$2/月` 边界、Cache、Idempotency 和 Kill Switch。私有 Shareable Link 不写入仓库；Preview AI 会保留到 V2-8-3 Production 稳定后再撤销。
- Gate 0B 只读取了受保护 Preview / Neon checkpoint 状态并验证 Git Integration 自动建立的 exact-commit Preview；没有读取 `.env` 或 secret value，没有更改 alias、environment、credential、Shareable Link 或 checkpoint，也没有调用 AI。V1 与 Neon `main` 仍保持线上 Schema Version 5；Gate 2 必须获得新的明确批准。
- 普通界面继续使用简短自然的英文；不可逆操作和重要隐私提示保留中文或双语。

完整范围和阶段顺序见 [V2 Master Plan](./plan_docs/PLAN_V2_MASTER.md)。V2-8-2.2 的键盘、浏览器音色和双语例句契约见 [V2 Stage 8-2.2](./plan_docs/PLAN_V2_STAGE8_2_2_REVIEW_AUDIO_BILINGUAL_EXAMPLES.md)；正式上线前的 Preview 反馈微调与关闭规则见 [V2 Stage 8-2.3](./plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md)，PF-001 的默认音源升级见 [V2 Stage 8-2.3-1 Google Cloud Standard TTS](./plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md)，PF-002 的交互与字体边界见 [V2 Stage 8-2.3-2](./plan_docs/PLAN_V2_STAGE8_2_3_2_LEARNING_NAVIGATION_GOAL_HIERARCHY_TYPOGRAPHY.md)。
Stage 1 的冻结口径、图示和可执行边界见 [V2 Stage 1 Contract](./plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md)。Stage 2 的安全边界、首次测试和第二轮结论见 [V2 Stage 2 Gate](./plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md)、[V2 Stage 2 Evidence](./plan_docs/PLAN_V2_STAGE2_AI_QUALITY_EVIDENCE.md)、[V2 Stage 2-B Refinement](./plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md) 和 [V2 Stage 2-B Evidence](./plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md)。Stage 3 的数据、迁移草案、备份范围和远程执行边界见 [V2 Stage 3 Data Model](./plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md)；Review 交互与例句词汇操作见 [V2 Stage 3.1](./plan_docs/PLAN_V2_STAGE3_1_REVIEW_INTERACTION_CONTEXT_WORD_ACTIONS.md)；手机基础界面与精简文案见 [V2 Stage 4](./plan_docs/PLAN_V2_STAGE4_MOBILE_FOUNDATION_COPY.md)；每日学习运行规则和验收见 [V2 Stage 5](./plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md)，调度修复见 [V2 Stage 5.1](./plan_docs/PLAN_V2_STAGE5_1_DAILY_EPISODE_SCHEDULING_REPAIR.md)，独立 Active 练习见 [V2 Stage 6](./plan_docs/PLAN_V2_STAGE6_ACTIVE_PRACTICE_ENGINE.md)，本地 AI enrichment 与费用保护见 [V2 Stage 7A](./plan_docs/PLAN_V2_STAGE7A_LOCAL_AI_ENRICHMENT_COST_GUARD.md)，正式本地服务器闭环见 [V2 Stage 7B-1](./plan_docs/PLAN_V2_STAGE7B_1_FORMAL_AI_LOCAL_ORCHESTRATION.md)，一次性真实供应商证明见 [V2 Stage 7B-2](./plan_docs/PLAN_V2_STAGE7B_2_NONPRODUCTION_PROVIDER_PROOF.md)，本地 Dashboard 指标、图表与手机验收见 [V2 Stage 8-1](./plan_docs/PLAN_V2_STAGE8_1_DASHBOARD_INSIGHTS.md)，全站学习者文案审查见 [V2 Stage 8-1.1](./plan_docs/PLAN_V2_STAGE8_1_1_LEARNER_COPY_AUDIT.md)，Staging / protected Preview 完整发布演练见 [V2 Stage 8-2](./plan_docs/PLAN_V2_STAGE8_2_STAGING_PREVIEW_RELEASE_REHEARSAL.md)，V2-only 运行性能收口见 [V2 Stage 8-2.1](./plan_docs/PLAN_V2_STAGE8_2_1_PERFORMANCE_STABILISATION.md)，键盘、浏览器音色和双语例句见 [V2 Stage 8-2.2](./plan_docs/PLAN_V2_STAGE8_2_2_REVIEW_AUDIO_BILINGUAL_EXAMPLES.md)，Preview 反馈微调与上线前关闭见 [V2 Stage 8-2.3](./plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md)，Google Cloud Standard TTS 见 [V2 Stage 8-2.3-1](./plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md)，Production 备份、迁移和切换门禁见 [V2 Stage 8-3](./plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md)。

## 两条学习轨道

| 学习轨道 | 当前 V1 | 已确认 V2 方向 |
| --- | --- | --- |
| Recognition Vocabulary | 已启用 FSRS-6 复习 | 已本地实现 Review / New Learning、每日六项资料、读音按钮、Actual 节奏与 Recognition FSRS outlook |
| Active Vocabulary（输出词汇） | 仅保存和展示 | 已本地实现独立 FSRS 参数与状态、Review / New Learning、`Say it`、`Spell it`、`Dictation`、独立 Actual 节奏与 Active FSRS outlook |

V2 的 `Say it` 仅用于单词或词组回忆并由使用者自评；V2 不录制或上传麦克风音频。PTE / IELTS 写作题型、考试口语题型、自由写作评分和外源题库继续留给后续版本。

## 技术概览

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4 + Motion for React
- Neon Postgres + `@neondatabase/serverless`
- `ts-fsrs`，Recognition / Active 使用相同算法家族和独立参数模块
- Vitest + ESLint
- GitHub + Vercel

### 环境划分

| 环境 | 数据位置 | 用途 |
| --- | --- | --- |
| Local（本地） | 浏览器 `localStorage` fallback（后备存储） | 日常开发和无数据库调试 |
| Preview（预览环境） | Neon `staging` Schema 6 | 受保护的完整 V2 验收；只有 `V2` 分支拥有写入和独立 Preview AI 凭证 |
| Production（生产环境） | Neon `main` | Mimi 和 Anoria 的正式学习数据 |

`person_id` 用于区分人物数据，目前不等同于完整的账户权限隔离。Production 入口由 Basic Auth 保护；真正的多人身份与权限系统留给未来 SSO 阶段。

## 本地运行

```bash
npm ci
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。默认本地模式不要求数据库凭证。

常用验证命令：

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
```

数据库迁移、检查、备份导入和清理命令具有更明确的环境边界，不在 README 中展开。执行前请阅读对应的数据库和 Production 计划文档。

## 分支与发布

- `V2`：当前 V2 规划和后续分阶段实现分支。
- `V1`：已上线 V1 的历史维护分支。
- `main`：Vercel Production branch（生产发布分支）。
- V2 推荐流程：在 `V2` 按已确认子计划修改并验证，通过 Staging / Preview 检查，再使用 Pull Request（合并请求）进入 `main`。
- 当前运行、目标能力和日常工作均使用 Tier 3（三级治理）；凭证、Production 数据、数据库结构或部署设置的实质变更继续要求明确的人类批准。

## 数据与产品边界

- 当前产品面向私人熟人小组，不是公开注册服务。
- Production 不接收 Development / Preview 的测试数据。
- Active Vocabulary 在当前线上 V1 中没有调度行为；其独立练习已在受保护 V2 Preview 中实际运行，Production 尚未切换。
- `V2` 分支契约为 Schema Version 6 + additive `0004` / `0005` / JSON backup Version 4。长期非生产 `staging` 已应用 `0004` 与 `0005`；protected Preview 已部署对应程序。Production `main` 继续运行 V1 / Schema Version 5。
- 受保护 `V2` Preview 已配置独立 `MIMI_STUDY_TOKEN_SECRET`，Postgres `/api/study` 可签发和刷新 Daily Study 证据。Local fixture 与 Production 不继承该 secret，缺少时继续安全停止。
- 受保护的 V2 Preview 已使用带硬额度保护的付费 Gemini API；Stage 2 以 120 条非个人测试词条固定验证 `gemini-3.1-flash-lite`，并已从路线中移除 Datamuse、Free Dictionary、Groq 对比和会热切换的 `gemini-flash-latest`。当前线上 V1 / Production 尚未调用任何 AI 服务。
- 当前 V2-7B-1 没有个人 AI 次数上限；全应用按 `Australia/Melbourne` 预算日限制为 300 次、600,000 input tokens、210,000 output/thinking tokens、US$0.50 估算费用，并另设 US$2/月与并发 2。`person_id` 不能拆分或重置这些全局边界。
- V2-7B-2 已把新确认升级为 `ai-disclosure-v3`：界面分别说明可选 Project logging 与付费服务有限期安全/滥用/法律处理，不再写固定 55 天，也不宣称 Zero Retention（零保留）。一次性证明产生 2 次成功请求、1,185 tokens 和 US$0.000677 估算费用；Replay、Cache、第三次上限和 Kill Switch 均未增加调用。临时环境已完整删除，Production 路线仍关闭。
- Stage 2 的本地测试密钥只放在被 Git 忽略的专用环境文件中。V2-8-2 Preview 使用另一把独立受限 Auth Key；正式 V2 上线仍需新的 Production-only（仅生产环境）密钥与审批。
- Stage 2-B 的相同 120 条第二轮测试得到 120 个本地结构有效草稿、0 个供应商失败。Runner（测试执行器）当时用 Batch/Flex 费率记录为 US$0.027943；按同步 Standard `generateContent` 官方费率修正为 US$0.055886。已知释义、例句、顺序和关系分类误差被接受为可编辑 AI 草稿的限制；未来结果会显示 `Generated by Gemini 3.1 Flash-Lite · AI content may be inaccurate. Please review carefully before saving.`，线上 V1 仍不调用 AI 服务。
- Automated Speech Recognition（自动语音识别）、麦克风上传和 AI 发音评分暂缓，不属于已确认 V2 基线。
- PTE / IELTS 持久化考试模式、PWA 和考试题型仍是后续方向。
- 正式 SSO 与多人 confidential isolation（机密隔离）转入 Version-hold；当前 Basic Auth 和 `person_id` 不等于每人安全账户。
- 正式学习数据开始积累后，按当前策略执行定期逻辑备份，并在高风险数据操作前增加备份。

## 项目文档

README 面向第一次看到仓库的人。详细架构、历史决策、执行证据和安全边界保存在以下文档中：

- [Architecture](./ARCHITECTURE.md)：系统结构、数据模型和运行边界
- [V1 Master Plan](./plan_docs/PLAN_V1_MASTER.md)：V1 总体阶段与范围
- [V2 Master Plan](./plan_docs/PLAN_V2_MASTER.md)：已确认的 V2 主线、指标、Active、AI、移动端和发布阶段
- [V2 Stage 1 Contract](./plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md)：每日指标、分区目标、重置、Active 证据和未来数据/API 契约
- [V2 Stage 2 Gate](./plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md)：Gemini 质量、安全、费用和凭证边界
- [V2 Stage 2 Evidence](./plan_docs/PLAN_V2_STAGE2_AI_QUALITY_EVIDENCE.md)：首次 120 条测试结果、限制和后续决策
- [V2 Stage 2-B Refinement](./plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md)：Prompt v2、本地质量规则和一次性第二轮评估边界
- [V2 Stage 2-B Evidence](./plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md)：第二轮 120 条结果、首轮对比、剩余缺陷和有条件接受结论
- [V2 Stage 3 Data Model](./plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md)：Schema Version 6、备份范围、迁移草案和环境执行边界
- [V2 Stage 3.1 Review Interaction](./plan_docs/PLAN_V2_STAGE3_1_REVIEW_INTERACTION_CONTEXT_WORD_ACTIONS.md)：卡片翻面、四档色阶、例句单词操作、上下文 AI 契约和价格修正
- [V2 Stage 4 Mobile Foundation](./plan_docs/PLAN_V2_STAGE4_MOBILE_FOUNDATION_COPY.md)：手机/平板导航、Safe Area、响应式面板和精简英文文案
- [V2 Stage 5 Daily Learning Engine](./plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md)：每日计划、六项数据、Recognition 分区、目标、回退和整日重置
- [V2 Stage 5.1 Daily Episode Repair](./plan_docs/PLAN_V2_STAGE5_1_DAILY_EPISODE_SCHEDULING_REPAIR.md)：首次作答调度锚点、次日巩固、完成统计、刷新恢复和重建规则
- [V2 Stage 6 Active Practice Engine](./plan_docs/PLAN_V2_STAGE6_ACTIVE_PRACTICE_ENGINE.md)：独立 Active 调度、三种练习、结构化答案证据和 Track 从头开始
- [V2 Stage 7A Local AI Enrichment](./plan_docs/PLAN_V2_STAGE7A_LOCAL_AI_ENRICHMENT_COST_GUARD.md)：本地固定预览、严格 AI route、接受/拒绝/加入学习、全局费用保护和真实调用边界
- [V2 Stage 7B-1 Formal AI Orchestration](./plan_docs/PLAN_V2_STAGE7B_1_FORMAL_AI_LOCAL_ORCHESTRATION.md)：正式服务器编排、Disclosure、Cache、Idempotency、费用对账和保存闭环
- [V2 Stage 7B-2 Provider Proof](./plan_docs/PLAN_V2_STAGE7B_2_NONPRODUCTION_PROVIDER_PROOF.md)：一次性 Schema 6、两次供应商调用、硬上限、Kill Switch、证据与清理
- [V2 Stage 8-1 Dashboard Insights](./plan_docs/PLAN_V2_STAGE8_1_DASHBOARD_INSIGHTS.md)：四项 Track 卡片、Actual 今日进度、7/14 天学习节奏、FSRS outlook 和响应式证据
- [V2 Stage 8-1.1 Learner Copy Audit](./plan_docs/PLAN_V2_STAGE8_1_1_LEARNER_COPY_AUDIT.md)：全站学习者文案精简、内部名称清理、保留契约和手机截图
- [V2 Stage 8-2 Staging And Protected Preview](./plan_docs/PLAN_V2_STAGE8_2_STAGING_PREVIEW_RELEASE_REHEARSAL.md)：Staging Schema 6 演练、恢复点、完整受保护 Preview、真实 Gemini、成本与手机验收
- [V2 Stage 8-2.1 Performance Stabilisation](./plan_docs/PLAN_V2_STAGE8_2_1_PERFORMANCE_STABILISATION.md)：V2 共用数据生命周期、重复请求收口、Daily Study 快速路径和下一次部署的 Sydney 区域约束
- [V2 Stage 8-2.2 Review Audio And Bilingual Examples](./plan_docs/PLAN_V2_STAGE8_2_2_REVIEW_AUDIO_BILINGUAL_EXAMPLES.md)：共用键盘评分、设备音色、双语例句、JSON backup Version 4 和 `0004`
- [V2 Stage 8-2.3 Preview Feedback Stabilisation](./plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md)：上线前 `PF` 问题登记、修复、Preview 复测和人工关闭门
- [V2 Stage 8-2.3-1 Google Cloud Standard TTS](./plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md)：PF-001 默认音源升级、独立缓存/费用/身份边界和分段执行门
- [V2 Stage 8-2.3-2 Learning Navigation, Goal Hierarchy And Typography](./plan_docs/PLAN_V2_STAGE8_2_3_2_LEARNING_NAVIGATION_GOAL_HIERARCHY_TYPOGRAPHY.md)：PF-002 学习入口、两项目标层级、会话文案、面板对齐与限定字体契约
- [V2 Stage 8-3 Production Cutover](./plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md)：正式备份、非空迁移演练、write-free 切换、成对回退、Production AI 与分段批准边界
- [Version-hold Multi-User Isolation](./plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md)：暂缓的 SSO 与多人机密隔离边界
- [Stage 8 Review Memory Algorithm](./plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md)：Recognition FSRS 与 Active 隔离设计
- [Stage 8.5 Data Lifecycle](./plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md)：环境、备份和数据生命周期策略
- [Production Execution Record](./plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md)：正式上线执行记录
- [Database Backup Mapping](./db/LOCAL_BACKUP_TO_POSTGRES.md)：备份格式与 Postgres 映射
- [Changelog](./CHANGELOG.md)：按时间记录的重要变更
- [AI Agent Log](./governance/AI_AGENT_LOG.md)：人机协作执行与验证记录

## 未来方向

在 V2 之后再评估：

- 支持 SSO 的多人账户、角色、权限、恢复和删除系统。
- 自动语音识别、云端发音评分和长录音分析。
- PTE / IELTS 写作及口语题型、外源题库和来源授权。
- 分别为 Active 三种模式建立独立 FSRS Profile（复习配置），前提是 V2 数据证明有必要。
- PWA、通知、正式分析追踪和更严格的灾难恢复。

这些方向不会提前写入 V2 正式数据模型；重新启动时需要新的来源计划、风险判断和人类确认。
