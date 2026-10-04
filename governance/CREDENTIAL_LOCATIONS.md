# 密钥位置与快捷入口

用户 2026-10-04 指定：**密钥本体留在原位，项目根目录 `local_key` 只放快捷指针**。不要把秘密复制进项目、日志或回复。该目录已从 Git 和 Vercel 上传排除；0700 限制本机其他用户访问。符号链接的权限以父目录和目标文件权限为准。

| 用途 | 原始位置 | local_key 入口 |
| --- | --- | --- |
| Development 数据库与现有 Vercel 临时环境值 | 根目录 `.env.local`，仅当前用户读写 | `Development.env` |
| Stage 2 Gemini | 根目录 `.env.stage2.local`，仅当前用户读写 | `Stage2-Gemini.env` |
| Production Neon API | macOS Keychain，服务名 `mimi-v2-8-3-neon-api-key` | `Keychain Access.app`，打开后搜索该服务名 |
| Production Neon 固定项目身份 | macOS Keychain，服务名 `mimi-v2-8-3-neon-project-id` | 同上 |
| age 备份解密密钥 | macOS Keychain，服务名 `mimi-vocabulary-backup-age-identity-v1` | 同上；恢复加密备份需要这一项 |
| 本项目专用 R2 | `~/.config/mimi-vocabulary/r2-backup.json`，目录 0700、文件 0600 | `R2-backup.json`，只链接原文件 |
| 已有 Production/Preview 应用环境变量 | Vercel 各自环境设置 | 保持原位，不下载/合并到本机 |

`local_key/00-密钥位置说明.md` 指向本文件。运行 `node scripts/local-key-links.mjs` 可重建非秘密快捷指针；它不读取密钥内容、不移动或复制密钥，不覆盖未知文件。这个目录不是密钥的新保管地，也不是沙盒：同一 macOS 用户下获准读取文件的程序仍有相应权限。

R2 文件使用字段 `endpoint`、`bucket`、`accessKeyId`、`secretAccessKey`。2026-10-04 经用户明确确认，已建立 `mimi-vocabulary-monthly-backup` 专用凭据，仅限 `words-learning-app-for-mimi` bucket 的 Object Read & Write，长期有效直至撤销。只保存 S3 客户端需要的密钥对，不保存账户管理 token 或其他项目密钥。备份脚本通过固定原始路径读取，拒绝链接目标、过宽权限、错误账户或 bucket；真实读写与回读验收见 V2.3 Stage 2.3.13。

解密密钥与加密归档分开保管。R2 副本无法代替解密密钥；换机前应确认上述 Keychain 项也能安全迁移。不得将解密密钥放进同一个 R2 bucket。
