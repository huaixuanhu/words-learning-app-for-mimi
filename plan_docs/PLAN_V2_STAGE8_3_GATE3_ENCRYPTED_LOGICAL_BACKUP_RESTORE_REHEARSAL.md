# Words Learning App For Mimi V2-8-3 Gate 3：Encrypted Logical Backup And Restore Rehearsal

Created: 2026-07-23 AEST
Last updated: 2026-07-23 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md` 的 `Gate 3`

Derived from:

- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- `plan_docs/PLAN_V2_STAGE8_3_GATE2_REMOTE_READ_ONLY_INVENTORY.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`

Scope:

- 选择并固定 PostgreSQL 17 `pg_dump` / `pg_restore` custom format（自定义格式）与 `age` 的独立加密逻辑备份方法。
- 先以本机 synthetic fixture（合成样本）证明加密、checksum（校验摘要）、恢复、失败拒绝与明文清理。
- 从已登录的 Neon Console（控制台）以只读方式复制 Production `main` 的 unpooled Neon connection（非连接池地址），由 runner 单次读取并立即清空系统剪贴板，再对 Schema 5 执行只读一致快照备份。
- 把真实加密备份恢复到本机隔离的临时 PostgreSQL 17，验证 Schema、数量、引用完整性、核心资料摘要与应用读取形状。
- 在仓库外保留已验证的加密备份和独立受保护的解密身份；仓库只保留不含个人资料或密钥的证据。

Non-Scope:

- 不修改 Production data（正式资料）、Schema、Neon branch、database、role、Vercel environment、alias、deployment 或 provider credential（供应商凭证）。
- 不创建 Gate 4 Production clone，不运行 `0003`、`0004` 或 `0005`，不部署 V2，不开放 Production AI/TTS。
- 不处理 Gemini 旧 proof key，不改变 Preview，不建立自动定时备份；自动化与八周保留轮转留在上线稳定后的独立工作。
- 不把 application JSON backup、Neon history 或本机临时数据库单独描述为 Production logical backup。

Exit criteria:

- 固定工具版本和命令路径；synthetic fixture 的成功、错误 identity（身份密钥）、损坏 archive（归档）及 cleanup（清理）测试通过。
- Production 来源通过 exact environment、unpooled host、database、role、Schema 5、非空资料与 Gate 2 baseline（基线）检查；任何 secret 或词条内容不进入 stdout、文档、Git diff 或 manifest。
- `pg_dump` 输出直接进入 `age`，磁盘上只出现加密 archive；解密输出直接进入 `pg_restore`，不生成明文 dump 文件。
- 本机恢复后的 counts、核心 table SHA-256、FK/reference invariants（引用完整性）和应用读取形状与备份前一致。
- 临时 PostgreSQL、socket、解密流和失败产生的残缺 archive 已清理；加密备份、独立密钥保管与 secret-free evidence（无敏感资料证据）完整。
- Gate 3 完成后停在 Approval Stop 3；Gate 4 仍需新的明确批准。

Status: `Approved / Gate 3A–3B complete; Gate 3C connection mapping repaired locally; corrected exact commit pending`. 用户于 2026-07-23 明确批准 Gate 3，包括工具安装、Production unpooled 只读连接、本机临时恢复数据库、仓库外真实加密备份和独立密钥材料。PostgreSQL 17.10、`age` 1.3.1、Keychain identity 与 synthetic backup/restore/negative-test 已通过。第一次 clean-commit Production runner 在 inventory 前因错误的 libpq environment（连接环境）映射安全停止；最小只读诊断随后证明修复后的远程连接与 Schema 5 安全元资料可读。尚未产生真实 Production backup 或 restore evidence。

## 1. Accepted Method

### Backup format

- PostgreSQL server 与工具使用 major version 17。`pg_dump -Fc` 建立 portable custom archive（可移植自定义归档）；`pg_restore` 负责恢复。
- `pg_dump` 运行在 repeatable/consistent snapshot（可重复读取的一致快照）语义下，并额外使用 `PGOPTIONS=-c default_transaction_read_only=on` 限制连接为只读。
- 只接受 `DATABASE_URL_UNPOOLED` 或 `POSTGRES_URL_NON_POOLING`。host 含 `-pooler`、database/role 不符、非 Neon TLS endpoint 或 Schema 不是 5 时立即拒绝。
- Vercel 已标记为 Sensitive Environment Variable（敏感环境变量）的 value 创建后不可回读；只读 REST/CLI 只能确认 metadata（元资料），不能作为 Gate 3 credential source（凭据来源）。
- 不使用 `vercel env pull`，不写 `.env`。实际探测发现 Vercel CLI 56.5.0 的 `env run` 在 repository 内会继续看见已有 `.env.local`，而在全新 linked temporary directory 又没有注入 sensitive Production values；因此也拒绝该路径。
- Gate 3 只从已登录 Neon Console 的 `main` Connect 对话框复制一次 unpooled connection string。runner 在完成 clean Git 与 exact approval 检查后读取系统剪贴板，在任何解析或连接前立即清空剪贴板，并核对固定的 Production-main endpoint SHA-256、Sydney region、`neondb`、`neondb_owner`、TLS 与非 pooled host。URL、host 和 password 不写入文件、日志或 evidence。

### Encryption and key custody

- `age` 使用专门的 recipient（公开加密身份）加密；private identity（私有解密身份）只保存在 macOS Keychain（钥匙串），与 repository 和 backup directory 分离。
- private identity 不放入 shell argument、environment、stdout、日志、manifest 或 source control；恢复时只写入权限 `0600` 的短期临时文件，并由 cleanup 删除。
- repository 只允许保存 recipient/fingerprint 的摘要和 custody confirmation（保管确认）；加密 archive 与解密身份不在同一储存位置。

### Storage and restore target

- 加密 archive 保存到 `$HOME/Documents/Mimi Vocabulary Backups/`，目录权限目标为 `0700`，文件权限目标为 `0600`。
- restore rehearsal 使用 `/private/tmp` 下唯一、权限 `0700`、只开放 Unix socket 的 PostgreSQL 17 cluster；不启动 Homebrew background service（后台服务），不监听 TCP。
- restore database 从 `template0` 创建。恢复使用 `--exit-on-error --single-transaction --no-owner --no-acl`；完成后运行 `ANALYZE`、结构/资料核验，再关闭并删除整个临时 cluster。

## 2. Execution Gates

### Gate 3A — Local implementation

1. 新增 backup contract、runner 与 focused tests。
2. 工具未安装、版本 major 不为 17、`age` 不可用、路径或权限不安全时 fail closed（安全关闭）。
3. 所有 child process（子进程）使用参数数组，不通过 shell 拼接 secret。
4. stderr 经过固定 allowlist/secret redaction；Production URL 和 personal row 不打印。

### Gate 3B — Synthetic proof

1. 创建本机临时 Schema 5 fixture，写入非真实 person、vocabulary、review state/event 与 settings。
2. 生成临时 `age` identity；执行 stream backup、checksum、restore 和 parity（对等）检查。
3. 用错误 identity 证明 decrypt 必须失败；修改 archive 单一 byte 证明损坏必须失败。
4. 证明成功、失败和中断路径均不留下明文 dump 或运行中的临时 PostgreSQL。

### Gate 3C — Production encrypted backup

1. 确认 clean Git HEAD、当前 branch `V2` 和用户批准记录。
2. 在已登录 Neon Console 的 Production `main` Connect 对话框关闭 Connection pooling 后复制 connection string；backup runner 单次读取并清空系统剪贴板，只接受已固定 endpoint SHA-256 对应的 unpooled URL。
3. 连接后先确认 PostgreSQL 17、`neondb`、`neondb_owner`、Schema 5、non-empty inventory（非空资料）和 Gate 2 counts。合法的学习增量必须明确记录；结构或引用异常直接停止。
4. 生成 pre-backup safe digest，执行 `pg_dump | age`，只在两端同时成功后原子 rename（原子重命名）为最终 `.dump.age`。
5. 记录 archive SHA-256、字节数、工具版本、UTC/AEST 时间和 source endpoint SHA-256；不记录 endpoint、URL、词条或 secret。

### Gate 3D — Isolated restore and verification

1. `age --decrypt | pg_restore` 恢复到本机临时数据库；不产生解密 archive 文件。
2. 运行同一组 Schema 5 structure、counts、core-table SHA-256 和 reference invariants。
3. 运行 application read parity（应用读取对等）检查，至少覆盖 people、vocabulary、review state/event 与 settings 的可读数量和字段形状。
4. 只有 source/restored digest 完全一致、错误路径测试通过、cleanup 完成后，backup 才标记为 `restoreVerified=true`。

## 3. Secret-Free Evidence

Gate 3 evidence 仅允许：

- artifact kind/version、exact commit、工具版本、方法版本；
- source target 的固定安全标签与 endpoint SHA-256；
- Schema version、非敏感 row counts、table digest、combined digest、invariant counts；
- encrypted archive filename、size、SHA-256、创建/恢复时间与 duration；
- encryption recipient SHA-256、custody confirmed、restore verified、cleanup verified；
- synthetic negative-test results。

以下内容一律拒绝：database URL、host、password、API/Auth key、private identity、passphrase、完整 row、surface text、meaning/example、raw `pg_dump`/`pg_restore` verbose output 或 provider error body。

## 4. Stop Conditions

- Production unpooled connection string 无法通过已登录 Neon Console 单次复制、runner 无法立即清空剪贴板，或任何工具要求把 secret 写入 repository/local env file；
- exact source identity、unpooled contract、Schema 5、PostgreSQL 17 或 Gate 2 baseline 无法确认；
- `pg_dump`、`age`、checksum、decrypt、`pg_restore`、parity、negative test 或 cleanup 任一失败；
- key/passphrase 无法独立于 backup 保存，或 secret 可能进入 command argument/history/stdout；
- 需要创建/修改 remote resource、升级付费计划、扩大权限或执行任何 Production write；
- 发现 Production in-flight write、结构漂移、引用异常或无法解释的 count/digest 差异。

## 5. Handoff

完成时同步：

- 本文件与 `PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`；
- `PLAN_V2_MASTER.md`、`ARCHITECTURE.md`、`CHANGELOG.md`、`governance/AI_AGENT_LOG.md`；
- focused/full tests、lint、typecheck、三套 application backup dry-run、Production build、governance preflight 与 `git diff --check`。

Gate 3 完成只证明 Schema 5 independent encrypted logical backup（独立加密逻辑备份）可恢复。Gate 4 的 non-empty Production clone、Schema 6 migration/parity/recovery 仍需新的批准。

## 6. Local Checkpoint — 2026-07-23 AEST

- Installed and pinned local execution tools: PostgreSQL 17.10 and `age` 1.3.1. Homebrew PostgreSQL service remains stopped; rehearsals use a unique temporary Unix socket only.
- Created one dedicated `age` private identity in macOS Keychain service `mimi-vocabulary-backup-age-identity-v1`; the public recipient lives outside the repository with `0700/0600` directory/file permissions. No private identity or passphrase was written to source, `.env`, shell arguments, evidence or logs.
- Synthetic Schema 5 rehearsal passed encryption, archive checksum, wrong-identity rejection, single-byte-corruption rejection, isolated PostgreSQL 17 restore, core-table digest parity and full temporary cleanup.
- Read-only probes confirmed that the relevant Vercel Production variable names exist, but their Sensitive values are not recoverable through Vercel CLI or API. The earlier per-id decrypted-value design was therefore removed.
- The signed-in Neon Console independently exposed the current `main` unpooled connection string through its Connect dialog. A bounded clipboard probe confirmed the expected scheme, password presence, unpooled Sydney endpoint, `neondb` and `neondb_owner`; the raw value was not printed or persisted and the clipboard was cleared immediately. Source now pins only the endpoint SHA-256.
- Production command was deliberately exercised while Git was dirty and failed before credential retrieval or database connection with `V2_8_3_BACKUP_GIT_DIRTY`.
- After correcting the credential source, focused Gate 3 coverage passes 1 file / 10 tests and full Vitest passes 92 files / 564 tests with the existing Postgres integration file/test skipped. Script syntax, lint, typecheck, all three application backup dry-runs, Production build, Tier 3 governance preflight and diff checks pass.
- The refreshed local synthetic proof again records parity, wrong-identity rejection, corruption rejection and cleanup as true. It is deliberately not sufficient for Gate 3C after the implementation is committed: the runner requires a new proof whose embedded commit matches the resulting clean exact HEAD.
- Gate 3C remains pending because Production backup evidence must bind to a clean exact commit and a synthetic proof generated from that same commit. The current local changes must be reviewed and committed first; this stop is part of the accepted contract, not a Production failure.

## 7. Gate 3C Attempt 1 And Connection Repair — 2026-07-23 AEST

- Commit `644bdc006c792a67efc5c7c1f9057d7d295c8cd7` was clean on branch `V2`. PostgreSQL/`age`, the existing Keychain identity and a new same-commit synthetic proof all passed before Production credential access.
- The first Production runner consumed and cleared the approved Neon Console clipboard value, passed endpoint/role/database/TLS guards, then stopped as `V2_8_3_BACKUP_INVENTORY_FAILED`. It did not create an archive, restore database or evidence file.
- A bounded diagnostic confirmed the copied credential was real, unpooled and pinned to Production `main`. The failure was local: putting the full URI in `PGDATABASE` made this `psql` invocation fall back to the local Unix socket.
- The corrected implementation separates the already-validated URL into `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE` and `PGCHANNELBINDING`. These values remain process-local; the password is not placed in a command argument, file, log or evidence.
- A second minimal read-only diagnostic with the corrected mapping succeeded and returned only safe metadata: `neondb`, `neondb_owner`, PostgreSQL 17, eight public tables and four expected Schema 5 vocabulary columns. It did not read or emit learner rows.
- Focused coverage now asserts both the explicit libpq mapping and mandatory channel binding. Because this repair changes the runner, the real backup remains blocked until the correction is committed and the synthetic proof is regenerated against that new exact commit.
- Connection-repair validation passes 1 focused file / 11 tests and 92 full-suite files / 565 tests, with the existing Postgres integration file/test skipped. Script syntax, lint, typecheck, all three application backup dry-runs, Production build, Tier 3 governance and diff checks form the repaired checkpoint gate.

## 8. Current Primary References

- PostgreSQL 17 `pg_dump`: <https://www.postgresql.org/docs/17/app-pgdump.html>
- PostgreSQL 17 `pg_restore`: <https://www.postgresql.org/docs/17/app-pgrestore.html>
- `age` project and format: <https://age-encryption.org/>
- PostgreSQL 17 libpq connection parameters: <https://www.postgresql.org/docs/17/libpq-connect.html>
- PostgreSQL libpq environment variables: <https://www.postgresql.org/docs/current/libpq-envars.html>
- Vercel Sensitive Environment Variables: <https://vercel.com/docs/environment-variables/sensitive-environment-variables>
- Neon connection strings and pooled/unpooled connections: <https://neon.com/docs/connect/connect-from-any-app>
