<p align="center">
  <img src="./public/brand/mimi-cats.png" alt="咪咪 Vocabulary 猫咪头像" width="180" />
</p>

<h1 align="center">咪咪 Vocabulary</h1>

<p align="center">
  一个温和、可自定义、ADHD-friendly（对 ADHD 友好）的私人词汇学习应用。
</p>

<p align="center">
  把真正想学的单词、短语和固定搭配，变成每天可以轻松完成的小任务。
</p>

## 这是什么

咪咪 Vocabulary 是为 **Mimi 和 Anoria** 设计的私人词汇学习应用，主要服务于 PTE 备考和长期英语积累。

它不提供一套固定词库。使用者可以保存自己在阅读、练习和生活中遇到的词汇，补充真正有帮助的释义与例句，再通过每天少量、明确的任务逐步记住它们。

我们希望学习过程具有这些感受：

- **温和**：没有连续打卡压力，也不会因为某天完成得少而惩罚使用者。
- **可控制**：词义、例句、标签、学习方式和每日数量都可以自行调整。
- **任务明确**：把 Review 和 New Learning 分开，让使用者知道今天只需要完成什么。
- **允许犯错**：忘记的词会在当前学习过程中再次出现，也可以安全回退上一项。
- **长期可用**：学习资料可以搜索、整理、备份和导出。

## 一次日常学习

1. 把今天遇到的单词、短语或固定搭配加入自己的 Library。
2. 为 Recognition 和 Active 分别设置 Review 与 New Learning 数量。
3. 在 Study 中完成当天的小任务；目标可以设为 `0`，给自己一个休息日。
4. 根据真实记忆情况选择四档反馈，系统据此安排之后的复习。
5. 在 Home 查看今天的进度、近期学习节奏和接下来的记忆任务。

## 可以做什么

### 建立自己的词库

- 单独添加词汇，或一次导入一批整理好的学习资料。
- 一个词条可以保存多个中文释义、多个中英配对例句和自定义标签。
- 单词、短语和固定搭配都按一个完整学习单位处理。
- 在 Library 中搜索、筛选、编辑、归档、恢复或删除词条。
- 自动阻止重复新增；历史资料出现重复时，可以在确认影响范围后一次去重，每组只保留一份。

### 用两条独立轨道学习

| 学习轨道 | 适合练习什么 | 主要方式 |
| --- | --- | --- |
| **Recognition Vocabulary** | 看到英文时能够理解 | 阅读词义和例句后，用四档反馈记录记忆程度 |
| **Active Vocabulary** | 需要时能够主动想起并使用 | `Say it`、`Spell it` 和 `Dictation` |

两条轨道拥有各自的学习进度和复习安排。一个已经积累学习历史的词条如果要切换轨道，需要明确选择从另一条轨道重新开始，旧历史会继续保留。

### 获得辅助，但保留最终决定

- 使用自然的 Australian English（澳大利亚英语）云端发音，也可以选择设备自带音色作为备用。
- AI 可以提供补充释义、例句、相似词和容易混淆的词。
- AI 内容始终以可编辑草稿出现；只有使用者检查并明确接受后，才会进入正式学习资料。
- 例句中的陌生词可以直接查看上下文解释，再决定是否加入自己的词库。
- `Say it` 由使用者自行判断，不录制或上传麦克风音频。

### 掌握自己的学习资料

- 每个人物分别保存词汇、复习历史和每日目标。
- 可下载完整 JSON backup（JSON 备份）和 vocabulary CSV（词汇表格）。
- 正式学习资料保存在云端数据库，保留每日云端快照和每月独立加密副本；重要数据操作前后另行建立可恢复的加密备份。
- 普通学习页面使用简短英文；不可逆操作、隐私和外部 AI 数据传输会显示更明确的中文或双语提示。

## 当前版本

V2.3 已在 Production 正式运行。

- 访问地址：[words-learning-app-for-mimi.vercel.app](https://words-learning-app-for-mimi.vercel.app)
- 当前版本：V2.3
- 使用方式：私人 Basic Auth（基础认证），仅供受邀使用者访问
- 数据位置：Neon Postgres

V2.3 将学习日刷新改为凌晨 06:00，让跨午夜的学习继续计入同一个学习日。读取异常会明确提示并保留已加载内容；Home 更清楚地区分新学和复习词数，并显示最新的复习负担与回忆估计。重复保存保护和备份能力也得到加固。

V2.2 的复习间隔与卡片交互继续保留：新单词第一次“模糊记得”在下一学习日复习，复习卡外围区域也能翻面。Recognition 和 Active Dictation 的新卡会自动播放一次读音，声音按钮继续保留；`Cloud voice` 与 `Use device voice` 也会按各自选项使用云端或设备声音。V2.1 的重复资料保护、复习历史、导入记录和备份能力继续保留。

这个项目目前没有公开注册功能。界面中的人物切换用于分开学习资料，不等同于每个人拥有独立、安全的账户权限。

## 隐私与使用边界

- 产品面向私人熟人小组，不公开展示词库、复习历史或 AI 草稿。
- AI 补充功能只发送完成当前草稿所需的最少词汇上下文，并在发送前显示数据披露。
- AI 可能出错，所有生成内容都需要人工检查。
- 当前产品不收集或传输语音录音，也不进行 AI 发音评分。
- Basic Auth 和人物切换不提供正式的多人机密隔离；SSO（Single Sign-On，单点登录）与独立账户权限留给未来版本。

## 给开发者

应用基于 Next.js、React、TypeScript、Tailwind CSS、Neon Postgres 和 Vitest 构建。

本地启动：

```bash
npm ci
npm run dev
```

然后打开 [http://localhost:3000](http://localhost:3000)。默认本地模式不需要数据库凭证。

修改代码前请先阅读 [AGENTS.md](./AGENTS.md)。Production 数据、数据库结构、凭证、外部服务和部署均有单独的人工确认边界。

## 进一步了解

- [Architecture](./ARCHITECTURE.md)：系统结构、数据模型和安全边界
- [V2 Master Plan](./plan_docs/PLAN_V2_MASTER.md)：V2 产品方向与阶段设计
- [V2.1 Duplicate Repair](./plan_docs/PLAN_V2_1_DUPLICATE_IMPORT_DEDUPLICATION.md)：重复资料修复的产品与数据规则
- [V2.1 Production Release](./plan_docs/PLAN_V2_1_PRODUCTION_DUPLICATE_REPAIR_RELEASE.md)：V2.1 正式发布与恢复记录
- [V2.2 Product Plan](./plan_docs/PLAN_V2_2_REVIEW_CADENCE_CARD_AUDIO.md)：复习周期、卡片点击与读音改造
- [V2.2 Production Release](./plan_docs/PLAN_V2_2_PRODUCTION_RELEASE.md)：V2.2 正式发布、迁移与恢复记录
- [V2.3 Repair And Release](./plan_docs/PLAN_V2_3_STORAGE_STUDY_DAY_HOME.md)：学习日、存储恢复、Home、备份与发布记录
- [Changelog](./CHANGELOG.md)：重要版本变化
- [AI Agent Log](./governance/AI_AGENT_LOG.md)：人机协作、验证和安全记录

更细的阶段计划与历史证据保存在 [`plan_docs`](./plan_docs/) 中。
