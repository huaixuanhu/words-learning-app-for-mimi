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

Status: Gate 4 已完成。用户随后明确授权继续执行至 V2 完全上线；在该授权下创建了 project-scoped Neon organization API key，并仅存入 macOS Keychain。固定 Production clone 已完成两次 Schema 5 → 6 migration、一次 restore-from-parent、两次完整 parity，以及同一 exact commit 的独立 encrypted logical backup / isolated restore。Production `main` 在本 Gate 内保持 Schema 5 且没有 migration。下一步进入 Gate 5 的 Production credential、maintenance、最终备份和 `main` cutover 准备。

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

## 5. Execution Evidence — 2026-07-23

### 5.1 Exact source and credential custody

- Source commit：`16acd9102b77bf01565b2d963099ef3c819a0add`，执行前 `HEAD == origin/V2` 且工作树 clean。
- Neon project pin：`70b4a70d6cfcd6a872c5d9be7649be69332266624fb3cfec3aa6b32143caa880`。
- Project-scoped organization API key 由已登录 Console 创建，使用本机 loopback bridge（回环转存页）直接写入 Keychain service `mimi-v2-8-3-neon-api-key`。浏览器临时变量、Chrome clipboard 和系统 clipboard 随后清空；key value、connection URI 和 host 没有进入 stdout、文件或 Git。
- 最初一次 Keychain 转存读取到了旧的系统 clipboard 内容，live GET 返回 `401`；没有发生远程 mutation。该条目随后被正确值覆盖，并通过 `napi_` prefix、69-byte length 和 metadata-only SHA-256 检查。

### 5.2 Clone identity and operation results

- Clone name：`v2-8-3-production-clone-20260723`；preserved migrated state：`v2-8-3-schema6-preserved-20260723`。
- Clone branch SHA-256：`b63dc17bbdde97b0d8eb50e05aafa0ac3f020484f78009987a2876704f6f9f6c`。
- Clone endpoint SHA-256：`db53ee609bb158d9ac04a97a8196a44decdf67cf4f008549c29a4790f2678c7d`。
- Preserved branch SHA-256：`3bbda4c99e34301eea5b7eddac22e220feea925f4d95db0d388c2f50c0f00155`。
- `main` parent SHA-256：`45b96691ad36f57a4d9505651a8aff337280c8b4e3a7401297c10a61983a5174`；`main` endpoint SHA-256：`46d0bacffc82ed1b0b8793a31f6b7669c2f17871889c868c46f19c5f8c953ad3`。
- Create branch、start compute、restore suspend 与 preserved-branch create operations 均到达 `finished`。Clone 建立时间为 `2026-07-23T13:28:41Z`；restore 于 `2026-07-23T13:32:05Z` 完成。
- Endpoint 保持 `read_write`、0.25 CU，并使用 `suspend_timeout_seconds=0` 的 Neon 默认五分钟 scale-to-zero（自动休眠）设置。

### 5.3 Schema 5 baseline and two forward migrations

- 两次 Schema 5 before inventory 完全一致：people `1`、vocabulary items `1,486`、import batches `38`、review states `125`、review events `203`、review settings `1`、backup imports/mappings `0/0`；Recognition/Active/archived vocabulary 为 `1,486/0/0`。
- 六项 Schema 5 orphan invariants 均为 `0`；两次 core combined digest 均为 `c269c3133008cc5ae9c30f54f49c88cd792566397ff3aefca5e5fba551f2e794`。
- 第一次 migration、inspect 与 parity 通过。`npm` 前缀曾被 `tee` 写入 before artifact，parity runner 在 local JSON guard 停止；机械提取同一 safe JSON 后，只读重试通过，没有重复 migration。
- Restore-from-parent 后 Schema 5 counts、逐表 digests 与 combined digest 无 drift。第二次 `0003 -> 0004 -> 0005` 同样在一个 outer transaction 内通过。
- 两次 Schema 6 均为 22 tables、15 checked columns、12 constraints、21 indexes、7 triggers；新增 operational counts 中 AI/TTS runs、usage buckets、submitted/active provider calls 全部为 `0`。
- 两次 parity 均为 `matched=true`、`mismatches=[]`，保留 `1,854` 行 core rows。三个 migration SHA-256 与固定值完全一致。

### 5.4 Independent encrypted logical restore

- 当前 exact commit 重新通过 PostgreSQL `17.10`、`age 1.3.1`、wrong-identity rejection、corrupt-archive rejection、parity 与 cleanup synthetic rehearsal；evidence SHA-256 为 `ffdb046dcaa4ed7d16e409dbd679d49666a4831d9086becaabf79ad1cf92eeb7`。
- 新的 repository-external archive 为 `mimi-production-schema5-20260723T133451Z-16acd9102b77.dump.age`，`112,253` bytes，SHA-256 `8393d36e675a77878a9e5b14be4783419083287250ebb922e52c2e6c5daeee93`。
- Source 与 isolated local restore combined digest 同为 `6c82ba44caf462051b9579ca90f8a59994c8794649d6e871dd135cf0c23e2aa9`；`restoreVerified=true`。Secret-free evidence SHA-256 为 `76afae35953d891255649c72582e8fed552290c89f53ad76293e2e6ee264532d`。
- Archive permissions 为 `0600`，private age identity 仍只在 Keychain；system clipboard 为 0 bytes。

### 5.5 Result and retained resources

- Gate 4 exit criteria 全部通过。V1 storage tables 的完整只读 inventory 与 Schema 6 inventory/parity 同时证明旧资料可读和 V2 core-row preservation；没有执行 rating、reset、AI accept、TTS/provider 或其他学习写入。
- Clone 与 preserved branch 暂时保留，intended cleanup deadline 为 `2026-07-30T13:28:41Z`；清理安排在 Production 稳定验收后。
- 用户在 Gate 4 执行期间进一步明确授权“直接执行到 V2 完全上线”，因此 Approval Stop 4 已由新的总授权取代；后续仍保留代码内 exact-target、backup、maintenance、write-free、migration 和 rollout ceilings。

## 6. Stop Conditions

- 无法取得符合最小权限边界的 API key，或必须把 secret 写入仓库/`.env` 才能继续；
- Production `main`、project、region、branch parent、endpoint、database 或 role 与固定证据不一致；
- exact clone name 已存在但来源不明；
- Neon mutation 返回未知状态，且无法通过 operation/branch GET 确认结果；
- clone 为空、不是 Schema 5、`main` 在两次演练间发生无法解释的 drift；
- migration hash 不符、transaction 未原子完成、Schema 6 inspector/parity/invariants 失败；
- restore 后 branch/endpoint identity 发生变化但 runner 仍尝试使用旧连接；
- 任何输出包含 learner content、connection string、password、API key 或 private link；
- 操作需要升级付费计划、开启自动续费、扩大 credential 权限或触碰 Production `main`。

## 7. Evidence Shape

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
