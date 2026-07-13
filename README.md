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

当前 V1 已作为受保护的私人应用上线。V2 的文档基线已在 `V2` 分支确认，主线包括每日学习分区、独立 Active 练习、手机端改造、学习情况可视化和第一代付费 AI enrichment（AI 词汇补充）。V2 Stage 1 已完成产品、指标与数据契约，以及未接入 Runtime（运行时）的 TypeScript 契约测试；可见页面、Schema Version 5、外部服务和线上 V1 行为尚未改变。

## 正式版本

- 访问地址：[words-learning-app-for-mimi.vercel.app](https://words-learning-app-for-mimi.vercel.app)
- 当前线上版本：cloud-backed V1（云端持久化 V1）
- 当前开发分支：`V2`；V2 Stage 1 契约已在本地实现并通过测试，尚未接入页面、存储或 Production
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

## V2 已确认方向

- Recognition 和 Active 分别显示 `Added today`、`Suggested review`、`Review goal`、`New-word goal`。
- 用户可为 Review 和 New Words 设置任意非负整数目标；`0` 可作为休息日。
- 一个词条无论是单词、短语或固定搭配，都按一个学习单位统计。
- 新词在第一次提交有效记忆评分之后才进入该 Track 的复习状态。
- Recognition 与 Active 使用同一 FSRS-6 算法家族，但参数、状态、事件和测试完全独立。
- Active 提供 `Say it`、`Spell it` 和 `Dictation`；Recognition 卡片增加浏览器读音按钮。
- 付费 AI 提供补充释义、例句、相似词和混淆词草稿；保存前必须由使用者预览、修改或拒绝。
- Dashboard 将增加真实今日进度、Learning rhythm（学习节奏）和 Memory outlook（记忆展望），并进一步优化手机界面。
- 普通界面继续使用简短自然的英文；不可逆操作和重要隐私提示保留中文或双语。

完整范围和阶段顺序见 [V2 Master Plan](./plan_docs/PLAN_V2_MASTER.md)。
Stage 1 的冻结口径、图示和可执行边界见 [V2 Stage 1 Contract](./plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md)。

## 两条学习轨道

| 学习轨道 | 当前 V1 | 已确认 V2 方向 |
| --- | --- | --- |
| Recognition Vocabulary | 已启用 FSRS-6 复习 | 分离 Review / New Words、四维每日信息、读音按钮和学习预测 |
| Active Vocabulary（输出词汇） | 仅保存和展示 | 独立 FSRS 参数与状态；`Say it`、`Spell it`、`Dictation` |

V2 的 `Say it` 仅用于单词或词组回忆并由使用者自评；V2 不录制或上传麦克风音频。PTE / IELTS 写作题型、考试口语题型、自由写作评分和外源题库继续留给后续版本。

## 技术概览

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4 + Motion for React
- Neon Postgres + `@neondatabase/serverless`
- `ts-fsrs` Recognition scheduler（阅读词汇调度器）
- Vitest + ESLint
- GitHub + Vercel

### 环境划分

| 环境 | 数据位置 | 用途 |
| --- | --- | --- |
| Local（本地） | 浏览器 `localStorage` fallback（后备存储） | 日常开发和无数据库调试 |
| Preview（预览环境） | Neon `staging` | 合并前验证；默认不开放写入 |
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
- Active Vocabulary 在当前线上 V1 中没有调度行为；其独立练习属于已确认但尚未实现的 V2。
- V2 计划使用受硬额度保护的付费 AI API、Datamuse 和 Free Dictionary API；当前线上 V1 尚未调用这些服务。
- 首次付费 AI 外发前会显示并要求确认：服务商、将发送的词汇字段、不会发送的个人字段、有限内容保留、单独的技术 / 用量 metadata（元数据）及费用边界；界面不宣称 Zero Retention（零保留）。
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
