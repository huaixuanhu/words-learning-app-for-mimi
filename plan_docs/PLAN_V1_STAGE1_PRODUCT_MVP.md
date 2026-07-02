# Words Learning App For Mimi Stage 1: Product MVP Design

Created: 2026-07-03 01:15 AEST
Last updated: 2026-07-03 01:15 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `/Users/anoria/.codex/skills/human-ai-governance/SKILL.md`
- `/Users/anoria/.codex/skills/human-ai-governance/references/governance-patterns.md`

Input evidence:

- 用户希望为 Mimi 的 PTE 备考做一个移动端友好的 vocabulary flashcard web app。
- 用户确认第一版需要支持 manual entry（手动录入）和 text file import（文本文件导入）。
- 用户明确 `.docx` 和 PDF import（导入）留到后续处理。
- 用户取消 initial proficiency（初始熟练度）区分：新词统一作为生词进入系统，熟练度由第一次 review rating（复习评分）产生。

Consumer / next stage:

- `plan_docs/PLAN_V1_MASTER.md`
- Future Stage 2 app scaffold plan.
- Future implementation tasks for vocabulary CRUD, import parser, review scheduler, storage, and deployment.

Document nature:

This is a derived product design plan for Stage 1. It is not an independent peer plan. It defines the first MVP（最小可行产品）scope before any application code is scaffolded.

## Scope

- 定义第一版产品流程、页面入口、字段、批量导入边界和复习评分规则。
- 第一版支持单词/短语手动添加。
- 第一版支持 `.txt` text file import，也支持 paste text（粘贴文本）作为同一条 import parser（导入解析器）路径。
- 新词不设置 initial proficiency；系统在第一次复习前只知道它是新词。
- 每个词可以保留 self-rated rarity（自评生僻度），但它不是熟练度。
- 四档 review rating 固定为：
  - 完全忘记了
  - 有点忘记了
  - 模糊记得
  - 完全记得

## Non-Scope

- 第一版不解析 `.docx`。
- 第一版不解析 PDF。
- 第一版不做 OCR（光学字符识别）。
- 第一版不自动联网查词、翻译或生成例句。
- 第一版不做多用户社交功能。
- 第一版不做 production deployment（生产部署）、remote database migration（远端数据库迁移）或 paid service（付费服务）配置。

## Safety / Side Effects

- 本阶段是文档设计阶段，不写应用代码。
- 第一版产品设计默认 private single-user（私有单用户）体验。
- Study data（学习数据）包括词条、上下文、导入批次、复习评分和时间戳，属于需要保护的个人学习数据。
- 后续实现 import parser 时必须先在本地解析和 preview，不应直接把未经确认的导入结果写入永久存储。
- 后续接入数据库、账号、Vercel production 或外部 API 前，需要升级到更严格的 governance gate（治理门禁）。

## Exit Criteria

- 首屏工作流已定义。
- 手动添加字段已定义。
- `.txt` 批量导入流程已定义。
- 四档复习评分已定义。
- 新词初始状态规则已定义。
- MVP 数据模型边界已定义。
- 隐私、导出和后续非范围项已记录。

## Product Shape

第一版首页只做真实可用入口，避免 landing page（着陆页）式介绍。建议三个主入口：

- 添加单词
- 批量导入
- 开始复习

辅助入口可以放在底部或设置区：

- 词库
- 导出
- 设置

## Manual Entry

手动添加目标是比手写更快。第一版字段：

- `word_or_phrase`: 英文单词或 phrase（短语），必填。
- `meaning_zh`: 中文释义，建议填写，但 MVP 可以允许暂存空值。
- `example`: 原句、PTE 题目上下文或自己造句，可选。
- `notes`: 备注，可选。
- `rarity_score`: 自评生僻度，1 到 5，可选但推荐。
- `source`: 默认 `manual`。
- `created_at`: 系统自动记录。
- `timezone`: 系统自动记录或由用户设置。

字段原则：

- `rarity_score` 表示“这个词有多生僻”，不表示“我会不会”。
- 新增后不要求用户判断熟练度。
- 允许 word 和 phrase 共存。
- 空白、大小写和首尾标点需要规范化，但原始输入要保留。

## Text File Import

第一版支持读取 `.txt` 文件。为了降低实现和误识别风险，先不处理 `.docx` 和 PDF。

可接受输入形态：

- 每行一个词或短语。
- 逗号分隔的词表。
- 制表符分隔的简单行，例如 `word<TAB>meaning`。
- 可选的行内上下文，例如 `word - 中文释义 - example`，具体 parser 规则在实现前再锁定。

导入流程：

1. 用户选择 `.txt` 文件或粘贴文本。
2. import parser 在本地解析候选词条。
3. 进入 preview 页面。
4. 用户可以删除误识别项、编辑释义、补充上下文、设置生僻度。
5. 系统显示 duplicate candidates（重复候选）。
6. 用户确认后保存为一个 import batch（导入批次）。

Preview 必须显示：

- 总候选数量
- 新词数量
- 疑似重复数量
- 空行或无效行数量
- 每一行解析结果和原始行号

第一版 parser 要保守：

- 不自动拆分完整英文句子里的所有单词。
- 不猜测复杂格式。
- 不覆盖已有词条。
- 不把重复项静默丢弃。

## New Word State

所有手动添加或导入的新词初始状态统一为 `new`。

新词初始记录：

- `created_at`
- `source`
- `import_batch_id`，如果来自批量导入
- `surface_text`
- `normalized_text`
- `meaning_zh`
- `example`
- `notes`
- `rarity_score`

新词在第一次复习前不产生正式熟练度判断。第一次复习时，用户选择四档 rating 后，系统才创建或更新 review state（复习状态）和 next due time（下次到期时间）。

## Review Rating

四档评分固定为：

| UI 文案 | 建议内部值 | 含义 | 调度影响 |
| --- | --- | --- | --- |
| 完全忘记了 | `forgot` | 完全想不起来 | 很快再次复习 |
| 有点忘记了 | `hard` | 需要明显提示或犹豫很久 | 短间隔复习 |
| 模糊记得 | `vague` | 大概记得，但不稳 | 中等短间隔 |
| 完全记得 | `remembered` | 能稳定说出意思 | 拉长间隔 |

第一次 review rating 是该词 review state 的起点。后续每次评分继续调整 due time。

## Review Session

复习模式的推送优先级：

- overdue（已逾期）词
- 今天 due（到期）的词
- `new` 状态但还没有第一次评分的词
- 生僻度高且近期评分差的词

第一版需要避免一次性推送太多词。建议 MVP 先设置每日 session 上限，例如 20 到 40 张卡，具体数值后续让 Mimi 试用后调整。

## MVP Data Model Notes

本节是产品模型，不是最终 schema（数据库结构）。

### Vocabulary Item

- `id`
- `surface_text`
- `normalized_text`
- `meaning_zh`
- `example`
- `notes`
- `rarity_score`
- `source`
- `import_batch_id`
- `created_at`
- `updated_at`
- `archived_at`

### Import Batch

- `id`
- `source_type`: `txt_file` or `pasted_text`
- `file_name`
- `created_at`
- `total_rows`
- `accepted_rows`
- `duplicate_rows`
- `invalid_rows`

### Review State

- `id`
- `vocabulary_item_id`
- `status`: `new`, `learning`, `reviewing`, or `archived`
- `due_at`
- `last_reviewed_at`
- `review_count`
- `lapse_count`
- `difficulty`
- `stability`

### Review Event

- `id`
- `vocabulary_item_id`
- `reviewed_at`
- `rating`
- `previous_due_at`
- `next_due_at`
- `elapsed_ms`

## Validation Ideas For Later Implementation

- `.txt` import with one word per line.
- `.txt` import with comma-separated words.
- pasted text import through the same parser.
- invalid empty file handling.
- duplicate word preview.
- duplicate phrase preview.
- first review creates review state.
- four ratings produce different due times.
- timezone-aware `created_at` and `due_at`.
- export includes imported and manually added words.

## Open Questions

- Mimi 更常用的 `.txt` 格式会是“每行一个词”，还是会带中文释义？
- 生僻度 UI 用 slider（滑块）、segmented control（分段控件）还是五个点？
- 第一版是否允许批量导入时统一设置同一个生僻度？
- 每天默认复习上限应该先设为多少？
- 登录是否放到第一版，还是先用私有部署和单用户数据路径？
