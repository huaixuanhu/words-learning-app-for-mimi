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

当前 V1 已作为受保护的私人应用上线。未来可能扩展为支持 SSO（Single Sign-On，单点登录）的多人开放应用，但这不属于当前 V1 的功能范围。

## 正式版本

- 访问地址：[words-learning-app-for-mimi.vercel.app](https://words-learning-app-for-mimi.vercel.app)
- 当前版本：cloud-backed V1（云端持久化 V1）
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

## 两条学习轨道

| 学习轨道 | V1 状态 | 当前用途 |
| --- | --- | --- |
| Recognition Vocabulary | 已启用复习调度 | 识别单词、词义和例句；使用 FSRS-6 与自然日到期判断 |
| Active Vocabulary（输出词汇） | 仅保存和展示 | 可录入、导入、导出和筛选；V1 不创建复习状态或复习事件 |

Active Vocabulary 未来可发展为听写、拼写、造句、写作和口语练习。它会使用独立的训练与评分维度，不与 Recognition 的记忆状态共用一条调度记录。

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

- `V1`：当前 V1 维护和后续小版本开发。
- `main`：Vercel Production branch（生产发布分支）。
- 推荐流程：在 `V1` 修改并验证，通过 Preview 检查，再使用 Pull Request（合并请求）进入 `main`。
- 凭证、Production 数据、数据库结构或部署设置的变更继续使用 Tier 3（三级治理）流程。

## 数据与产品边界

- 当前产品面向私人熟人小组，不是公开注册服务。
- Production 不接收 Development / Preview 的测试数据。
- Active Vocabulary 在 V1 中没有调度行为。
- AI API（人工智能接口）、写作评分、口语评分和外部词典不属于 V1。
- PTE / IELTS 持久化考试模式、PWA（Progressive Web App，渐进式 Web 应用）和正式 SSO 账户系统仍是未来方向。
- 正式学习数据开始积累后，按当前策略执行定期逻辑备份，并在高风险数据操作前增加备份。

## 项目文档

README 面向第一次看到仓库的人。详细架构、历史决策、执行证据和安全边界保存在以下文档中：

- [Architecture](./ARCHITECTURE.md)：系统结构、数据模型和运行边界
- [V1 Master Plan](./plan_docs/PLAN_V1_MASTER.md)：V1 总体阶段与范围
- [Stage 8 Review Memory Algorithm](./plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md)：Recognition FSRS 与 Active 隔离设计
- [Stage 8.5 Data Lifecycle](./plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md)：环境、备份和数据生命周期策略
- [Production Execution Record](./plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md)：正式上线执行记录
- [Database Backup Mapping](./db/LOCAL_BACKUP_TO_POSTGRES.md)：备份格式与 Postgres 映射
- [Changelog](./CHANGELOG.md)：按时间记录的重要变更
- [AI Agent Log](./governance/AI_AGENT_LOG.md)：人机协作执行与验证记录

## 未来方向

在不破坏现有 V1 数据边界的前提下，未来可逐步考虑：

- 支持 SSO 的多人账户、角色和权限系统。
- 独立的 Active Vocabulary 训练与记忆调度。
- 听写、拼写、造句、写作和口语任务。
- 带 prompt version（提示词版本）和评分依据的 AI 反馈。
- 更丰富的个性化学习设置与可访问性支持。

这些方向需要独立规划和数据结构设计，不会提前写入当前 V1 的正式学习状态。
