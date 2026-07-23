# Words Learning App For Mimi V2-8-3 Gate 4：Production Clone Migration, Parity And Recovery

Created: 2026-07-23 AEST  
Last updated: 2026-07-23 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`

Derived from:

- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- `plan_docs/PLAN_V2_STAGE8_3_GATE2_REMOTE_READ_ONLY_INVENTORY.md`
- `plan_docs/PLAN_V2_STAGE8_3_GATE3_ENCRYPTED_LOGICAL_BACKUP_RESTORE_REHEARSAL.md`
- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`
- `ARCHITECTURE.md`
- `AGENTS.md`

Scope:

- 在受限制的 non-empty Production clone（含真实资料的正式数据克隆）演练固定的 Schema 5 → Schema 6 migration（迁移）。
- 验证迁移前后 counts、stable digests、invariants、Schema 结构、V1 read compatibility 与 V2 read-only flow。
- 在同一 clone 上演练 Neon provider restore-from-parent（从父分支恢复）后再次迁移。
- 重新核对 Gate 3 encrypted logical backup（加密逻辑备份）仍可作为与 Neon branch recovery（分支恢复）独立的恢复路径。
- 生成不含 learner rows、connection string、password 或 API key 的 Gate 4 evidence（证据）。

Non-Scope:

- 不迁移、reset、restore 或写入 Neon Production `main`。
- 不部署或 promote V2，不修改 Production domain、Vercel environment、Basic Auth、Gemini、TTS 或其他 credential。
- 不开放 Production AI/TTS，不运行真实学习写入，不发送 provider request。
- 不修改 FSRS、Daily Episode、Recognition / Active、Dashboard、Motion 或 learner-facing UI。
- 不自动删除 clone 或其 recovery branch。清理属于 destructive remote mutation（破坏性远程变更），需在 Gate 4 证据通过后得到新的明确确认。
- Gate 4 不开启 Gate 5。

Exit criteria:

- 两次 Schema 5 → Schema 6 migration 都使用原样固定的 `0003 -> 0004 -> 0005`，并在单一 outer transaction（外层事务）内完成。
- 第一次和第二次 Schema 6 parity manifest（对等性清单）一致且全部通过。
- Neon live control-plane（实时控制面）证明 clone 是 `main` 的 `parent-data` child，且 endpoint、database、role 与连接地址完全匹配。
- Provider restore 后重新证明 Schema 5、non-empty inventory 和 V1 read compatibility。
- Gate 3 archive 的独立本地 restore verification（恢复验证）通过。
- 证据完成 secret scan（密钥扫描）、Git diff review、focused tests 与完整本地 validation。
- 工作停在 Approval Stop 4；Production `main` 与 V1 保持不变。

Current operational tier: Tier 3  
Working tier: Tier 3

Status: Gate 4 已在 2026-07-23 获得用户明确批准；documentation-first（文档先行）和现有 guard review（保护层复核）已开始。当前停在 Gate 4A credential checkpoint（凭证检查点）：本机进程环境及专用 Keychain 条目均没有可用 `NEON_API_KEY`，且未读取任何 `.env` 文件或 secret value。创建或读取 API key 需要独立明确批准。

## 1. Authority Boundary

本次 Gate 4 批准覆盖以下远程数据库演练动作：

1. 从已确认的 Production `main` 创建一个临时 `parent-data` clone 与一个 `read_write` compute；
2. 在 clone 上执行一次固定迁移并运行只读 parity；
3. 将 clone 从 `main` head 恢复为 Schema 5，同时保留迁移后状态供故障核对；
4. 在恢复后的 clone 上再次执行相同迁移与 parity；
5. 将 compute 停止在可自动休眠状态。

本批准没有自动扩大到：

- 创建、查看、保存或撤销 API key；
- 读取仓库 `.env.local`、Vercel Sensitive value 或既有 credential；
- 删除 clone / preserved recovery branch；
- 操作 Production `main`、部署 V2 或进入 Gate 5。

## 2. Credential Checkpoint

现有 `scripts/v2-stage8-3-contract.mjs` 在任何 Postgres connection（数据库连接）前，都要求以 `NEON_API_KEY` 对固定官方 API 做 authenticated live GET（有认证实时读取）。这项保护不能以本地 JSON、截图或手写 branch id 代替。

首选 credential contract：

- 如果项目属于 Neon organization，使用只允许访问该 project 的 project-scoped organization API key；
- 如果 Console 不提供 project-scoped key，必须先说明只能使用 temporary personal API key 的较大权限，再获得用户选择；
- key 只在当前执行窗口使用，不写入 `.env*`、repository、shell history、日志或证据；
- key value 只允许经系统 clipboard（剪贴板）进入专用临时 Keychain 条目，读取后立即清空 clipboard；
- Gate 4 完成后，撤销 key 与删除 Keychain 条目必须另行确认并留下 metadata-only evidence（仅元资料证据）。

Neon 官方当前说明：

- Neon API 使用 Bearer API key；project-scoped organization key 只可访问指定 project，并提供 member-level access：[Authentication](https://api-docs.neon.tech/reference/authentication)。
- 创建 branch 可显式指定 `parent_id`、`name`、`init_source: parent-data` 与 `read_write` endpoint：[Create branch](https://api-docs.neon.tech/reference/createprojectbranch)。
- 恢复 child branch 到 parent head 使用 `POST /projects/{project_id}/branches/{branch_id}/restore` 与 `source_branch_id`；需要时可用 `preserve_under_name` 保留恢复前状态：[Restore branch](https://api-docs.neon.tech/reference/restoreprojectbranch)。
- Mutation request（变更请求）没有收到响应时不能盲目重试；必须先用 GET 查询真实状态。`423` 与 `503` 是官方列出的安全重试例外。

## 3. Fixed Target Contract

### 3.1 Clone labels

- Target mode：`production-clone`
- Runtime marker：`postgres-production-clone`
- Source branch：Gate 2 已确认且 code-owned SHA-256 已固定的 Production `main`
- Clone name：`v2-8-3-production-clone-20260723`
- Preserved migrated-state name：`v2-8-3-schema6-preserved-20260723`
- Database：从 live control-plane 与 connection URI 共同确认的 `neondb`
- Role：clone 实际可用且与 connection URI 一致的 owner role
- Intended retention：Gate 4 验收后最多保留 7 天；删除前再次确认 exact branch ids、无 child、无 active connection 与 main 未变化

若 exact name 已存在，创建动作立即停止。不能自动复用未知旧 clone，也不能在 `POST` timeout 后再次 `POST`；必须先按 name 和 parent 查询。

### 3.2 Migration hashes

- `0003_v2_schema6_data_model.sql`：`ef991928d299a7dfb78483c96fcd7e6fd673a009cd31ca0f0f91c606d2128fba`
- `0004_v2_bilingual_examples.sql`：`9e00e1213366492db90a97709d605d68770a1b80f46caa8b748886bc8bd4e29c`
- `0005_v2_standard_tts_accounting.sql`：`ce0890a59dcf262c38894f865cb249339e95727764c6a98a58b43eba2a4c5367`

任何 hash 漂移、Schema 非 5/6、clone 指向 `main` endpoint、branch 不是 `parent-data` child、role/database 不匹配或 live control-plane 不可用，都必须在建立数据库连接前停止。

## 4. Execution Sequence

### Gate 4A — Local and credential preflight

1. 固定 source commit，确认 branch `V2` 且 application/guard code 没有未提交修改。
2. 运行 focused Gate 4 contract tests、migration hash tests、Schema 5/6 inventory/parity tests 与 governance preflight。
3. 读取 API key 是否存在的 boolean metadata；不读取 `.env`。
4. 若不存在，停在 credential checkpoint 请求独立批准。

### Gate 4B — Create and bind clone

1. 通过 authenticated GET 再次确认 project pin、`main` root、main endpoint、Sydney region 与 Schema 5。
2. 按 fixed name 从 `main` 创建 `parent-data` clone 与 `read_write` endpoint。
3. 等待全部 Neon operation 到 terminal success；未知或 timeout 状态先 GET 查询，禁止盲目重复 POST。
4. 记录 secret-free branch id hash、endpoint id hash、parent hash、created time 和 cleanup deadline。
5. 取得 connection URI 后只在进程内使用；不打印、不写文件。
6. 使用现有 `v2:8-3:db:inventory:clone` 生成 safe Schema 5 before artifact。

### Gate 4C — First forward migration

1. 把 before artifact 的 combined digest 作为 `MIMI_V2_8_3_EXPECTED_CLONE_SCHEMA5_DIGEST`。
2. 运行 `v2:8-3:db:migrate:clone`；runner 必须在同一 outer transaction 内执行 `0003 -> 0004 -> 0005`。
3. 运行 `v2:8-3:db:inspect:clone` 与 `v2:8-3:db:parity:clone -- --before <safe-artifact>`。
4. 运行 V2 authenticated read-only flow，保持 AI/TTS Kill Switch 开启。
5. 不执行 rating、save、accept AI draft、reset-day 或其他学习写入。

### Gate 4D — Provider recovery and second migration

1. 关闭数据库连接并确认无 active session。
2. 对 exact clone 调用 restore-from-parent，source 为当前 `main` head；使用 fixed preserved name 保存第一次迁移后的 Schema 6 状态。
3. 等待 operation 完成后重新 GET branch / endpoint；restore 可能更换 branch identity，旧 id 不得继续复用。
4. 重新取得进程内 connection URI，执行 Schema 5 inventory 与 V1 read-only compatibility。
5. 确认恢复后的 Schema 5 digest 与第一次 before artifact 一致；若期间 `main` 有合法新学习写入，停止并记录 drift，不把新旧 snapshot 强行判为相等。
6. 再次执行固定迁移、Schema 6 inspect 和 parity。
7. 比较两次 Schema 6 safe manifest；相同输入必须得到相同 core digest、counts 与 invariants。

### Gate 4E — Independent logical restore and closure

1. 使用 Gate 3 archive 与 Keychain identity，在新的本机 Unix-socket-only PostgreSQL 17 target 再做一次 decrypt → restore → full parity；不连接 Neon。
2. 对全部 evidence 运行 secret/personal-content scan，仅保留 counts、digests、schema facts、timestamps、durations 与 hashed identities。
3. 确认 clone compute 已可自动休眠，记录保留/清理 deadline；本 Gate 不自动删除 branch。
4. 更新 parent plan、V2 Master、Architecture、README、CHANGELOG 与 governance log。
5. 停在 Approval Stop 4。Gate 5、clone deletion、API key revoke 和 Production `main` mutation 都需要新的明确批准。

## 5. Stop Conditions

- 无法取得符合最小权限边界的 API key，或必须把 secret 写入仓库/`.env` 才能继续；
- Production `main`、project、region、branch parent、endpoint、database 或 role 与固定证据不一致；
- exact clone name 已存在但来源不明；
- Neon mutation 返回未知状态，且无法通过 operation/branch GET 确认结果；
- clone 为空、不是 Schema 5、`main` 在两次演练间发生无法解释的 drift；
- migration hash 不符、transaction 未原子完成、Schema 6 inspector/parity/invariants 失败；
- restore 后 branch/endpoint identity 发生变化但 runner 仍尝试使用旧连接；
- 任何输出包含 learner content、connection string、password、API key 或 private link；
- 操作需要升级付费计划、开启自动续费、扩大 credential 权限或触碰 Production `main`。

## 6. Evidence Shape

Gate 4 evidence 只允许保存：

- exact Git commit 与 clean/dirty code-state；
- approval timestamp 与 approved action set；
- branch / endpoint / parent / project 的 SHA-256，不保存 raw project id 或 connection host；
- clone creation、first migration、restore、second migration、logical restore 的开始/完成时间和 duration；
- Schema version、counts、stable table digests、combined digest、invariants、migration hashes；
- operation terminal status、V1/V2 read-only checks、AI/TTS provider-attempt delta `0`；
- cleanup deadline、compute idle/auto-suspend state；
- secret scan、validation 与 Approval Stop 4 状态。

Learner rows、词条、例句、review event 内容与任何 credential value 不进入 evidence。

