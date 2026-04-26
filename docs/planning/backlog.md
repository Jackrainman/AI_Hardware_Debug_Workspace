# 待办池（Backlog）

> Backlog 只存**未开做候选与串行认领队列**。当前唯一主线任务看 `docs/planning/current.md`；机读顺序、依赖、验证要求与详细执行边界看 `.agent-state/handoff.json.pending_task_queue`。v0.2.0 前历史专项输入已移入 `docs/archive/v0.2-closeout/`，默认不读。

## 当前阶段与总路线
- 当前版本：v0.2.0 release。
- 当前真实状态：本地 HTTP + SQLite 主链路、workspace 创建与切换、issue / investigation record / closeout / archive / error-entry 主路径、本地 release smoke、S4 version / health / backup / restore dry-run、AI-ready prompt/schema 已完成；真实服务器部署、systemd 自启、服务器 LAN 持久化验证、真实 AI、仓库代码上下文分析均未完成。
- 总路线：先服务器安全部署，再 operability / data safety，再 AI-ready 产品边界，再最小真实 AI 草稿，最后 code context bundle 与代码上下文 AI 分析。
- 服务器部署安全分层：先 `/home/hurricane/probeflash` no-sudo 验证；再准备 `probeflash.service`；用户授权后才写 `/etc/systemd/system/probeflash.service` 并验证 systemd；最后才考虑 `/opt`、反向代理、`.local` 或 80/443 美化。

## 认领规则
1. AI 只能从下列队列中认领 **第一个依赖已满足且未完成** 的原子任务。
2. 每次只允许一个任务处于执行中；完成前必须做最小验证、planning sync、单任务 commit。
3. 若发现队列顺序、依赖或约束与真实仓库状态脱节，先修 `current.md` / `handoff.json` / 本文件，再继续。
4. 服务器任务不得默认 SSH / sudo / 上传 / systemd 已授权；涉及真实服务器动作前必须先由用户确认。
5. AI 任务不得跳过 AI-ready；真实 AI 只返回草稿，不自动写库；code context 只分析用户显式提供的 bundle。
6. `pending_task_queue` 只保留剩余未完成任务；已完成任务只保留在 `.agent-state/handoff.json.completed_atomic_tasks` 中。
7. 夜跑 / 无人值守模式只能执行 repo-local、可自动验证、可回滚任务；遇到真实服务器、SSH、sudo、systemd、外部账号、API key、删除 / 迁移数据或用户拍板问题必须停止。
8. `docs/archive/v0.2-closeout/` 只在需要 v0.2 前历史背景、专项实现追溯或归档审计时读取，不作为默认认领输入。

## 近期 3 个任务

### 1. S3-SERVER-USER-DIR-DEPLOY-VERIFY
- **目标**：在服务器 `/home/hurricane/probeflash` 下完成 v0.2.0 no-sudo 用户目录部署验证。
- **前置依赖**：v0.2.0 release asset 已生成并完成本地 smoke；本地 HTTP + SQLite E2E 已完成；服务器事实已确认；用户授权 SSH / 上传 / 在 `/home/hurricane` 写入。
- **夜跑状态**：`blocked_by_user_confirmation`；必须等用户白天确认 SSH、上传方式、写入路径、启动进程与 4100 端口边界后执行。
- **输入文件**：`AGENTS.md`、`docs/planning/current.md`、`.agent-state/handoff.json`、本文件、v0.2.0 release assets、`apps/server/deploy/*` 参考材料、目标服务器 `192.168.2.2`。
- **允许改动**：服务器 `/home/hurricane/probeflash/releases`、`/home/hurricane/probeflash/current`、`/home/hurricane/probeflash/runtime/node`、`/home/hurricane/probeflash/shared/data`、`/home/hurricane/probeflash/shared/logs`、`/home/hurricane/probeflash/shared/env`；仓库内仅 planning sync 或必要 deployment note。
- **明确不做**：不 sudo；不 systemd；不写 `/opt`；不碰 80；不升级系统 Node；不使用系统 Node v10；不影响 filebrowser / vnt-cli / docker / Portainer；不做反向代理 / `.local`。
- **验证要求**：`curl http://127.0.0.1:4100/api/health`；`curl http://192.168.2.2:4100/api/health`；创建 workspace / issue；停止重启后读回；确认 `/home/hurricane/probeflash/shared/data/probeflash.sqlite` 存在且由 ProbeFlash 使用；确认 filebrowser:80 仍正常。
- **完成定义**：ProbeFlash 使用独立 Node runtime 在用户目录运行；4100 可本机与 LAN 访问；SQLite 重启后可读回；filebrowser:80 不受影响；没有执行 sudo / systemd / `/opt` 操作。
- **下一个任务**：`S3-SERVER-SYSTEMD-AUTOSTART-PREP`。

### 2. S3-SERVER-SYSTEMD-AUTOSTART-PREP
- **目标**：在 no-sudo 部署验证成功后，准备与 `/home/hurricane/probeflash` 布局一致的 `probeflash.service`。
- **前置依赖**：`S3-SERVER-USER-DIR-DEPLOY-VERIFY` 完成；用户目录 runtime / current / shared 路径已确定。
- **夜跑状态**：`blocked_by_external_dependency`；等待真实服务器用户目录部署验证完成，不能在夜跑中越过该事实。
- **输入文件**：`apps/server/deploy/probeflash.service.template`、`apps/server/deploy/env.example`、用户目录部署记录、systemd 事实、filebrowser.service 已知风格。
- **允许改动**：planning 文件；必要时更新 `apps/server/deploy/*` 的模板 / 示例以匹配用户目录部署，但不得改 server 业务逻辑。
- **明确不做**：不执行真正 `systemctl`；不写 `/etc/systemd/system/probeflash.service`；不 sudo；不占 80；不用 root 跑 ProbeFlash；不切 `/opt`。
- **验证要求**：unit 内容静态检查；确认 `User=hurricane`、`Group=hurricane`、`WorkingDirectory=/home/hurricane/probeflash/current/apps/server`、`EnvironmentFile=/home/hurricane/probeflash/shared/env/probeflash.env`、`ExecStart=/home/hurricane/probeflash/runtime/node/bin/node src/server.mjs`、`Restart=always`、`RestartSec=3s`；如环境允许，对临时 unit 文件运行 `systemd-analyze verify` 或等价静态检查。
- **完成定义**：`probeflash.service` 草案可被用户审阅；路径均指向 `/home/hurricane/probeflash`；未执行 sudo / systemctl；下一轮可在用户授权后安装验证。
- **下一个任务**：`S3-SERVER-SYSTEMD-AUTOSTART-VERIFY`。

### 3. S3-SERVER-SYSTEMD-AUTOSTART-VERIFY
- **目标**：用户授权后安装并验证 `probeflash.service` 开机自启。
- **前置依赖**：`S3-SERVER-SYSTEMD-AUTOSTART-PREP` 完成；用户明确授权 sudo、写 `/etc/systemd/system/probeflash.service`、执行 daemon-reload / enable / start / status。
- **夜跑状态**：`blocked_by_user_confirmation`；涉及 sudo、systemd 与 `/etc/systemd/system` 写入，夜跑不可执行。
- **输入文件**：已审阅的 `probeflash.service`、`/home/hurricane/probeflash/shared/env/probeflash.env`、用户目录部署结果、sudo 授权边界。
- **允许改动**：服务器 `/etc/systemd/system/probeflash.service`；systemd unit enable/start 状态；仓库 planning sync。
- **明确不做**：未确认前不 sudo；不改 filebrowser / vnt-cli / docker / Portainer；不占 80；不升级系统 Node；不迁移到 `/opt`；不做反向代理 / `.local`。
- **验证要求**：写 unit 前复述并确认路径；`systemctl daemon-reload`、`systemctl enable probeflash`、`systemctl start probeflash`、`systemctl status probeflash`；`journalctl -u probeflash`；`curl http://127.0.0.1:4100/api/health`；`curl http://192.168.2.2:4100/api/health`；restart 或 reboot 后读回；确认 filebrowser:80 正常。
- **完成定义**：ProbeFlash 由 systemd 以 `hurricane:hurricane` 拉起并可开机自启；服务日志可诊断；SQLite 数据保留；旧服务不受影响。
- **下一个任务**：`S3-SERVER-RELEASE-UPDATE-FLOW`。

## 中期任务队列

### 4. S3-SERVER-RELEASE-UPDATE-FLOW
- **目标**：定义并验证后续服务器如何从 release tarball 更新和回滚，而不是用 `git pull` 作为主部署方式。
- **前置依赖**：`S3-SERVER-SYSTEMD-AUTOSTART-VERIFY` 完成。
- **夜跑状态**：`blocked_by_external_dependency`；依赖真实服务器目录与 systemd 结果，当前不可夜跑。
- **输入文件**：v0.2.0 release assets、后续 release tarball 约定、服务器 `/home/hurricane/probeflash` 布局、systemd service、`apps/server/deploy/*`。
- **允许改动**：部署文档 / 脚本；服务器 `releases/vX.Y.Z` 目录与 `current` symlink；planning sync。
- **明确不做**：不把 `shared/data` 放进 release 目录；不删除 DB；不依赖服务器 `git pull`；不碰 80；不升级系统 Node；不做公网发布。
- **验证要求**：解压新 release；切换 `current` symlink；restart；health；DB 保留；回滚到上一个 release；确认 `shared/data/probeflash.sqlite` 不随 release 删除。
- **完成定义**：有可重复的 release tarball 更新流程；失败可回滚；服务版本与 DB 持久化可验证。
- **下一个任务**：`S4-DATA-BACKUP-EXPORT`。

### 5. S4-DATA-BACKUP-EXPORT
- **目标**：提供 SQLite 备份 / 导出机制，保证运行中不破坏 DB。
- **前置依赖**：`S4-OPERABILITY-HEALTH-STATUS` 完成；本地 SQLite 主链路可用。真实服务器持久化路径稳定后需复用同一命令验证服务器路径。
- **夜跑状态**：completed；已新增 `npm run backup:export` 与 `npm run verify:s4-data-backup-export`，可生成 timestamped SQLite backup 与 JSON export。
- **输入文件**：`/home/hurricane/probeflash/shared/data/probeflash.sqlite`、server storage 代码、SQLite schema、部署路径约定。
- **允许改动**：server-side 备份脚本或 npm script；导出 JSON 的最小工具；部署文档；planning sync。
- **明确不做**：不做云同步；不做增量备份系统；不在运行中直接复制半写入 DB 而不校验；不备份 secrets；不改业务 schema 语义。
- **验证要求**：生成带时间戳的 SQLite backup；生成 JSON export；备份文件可列出；运行中执行不破坏主 DB；执行后 health 与主流程仍正常。
- **完成定义**：有明确命令生成 timestamped backup 与 JSON export；备份位置与保留边界清楚；不会破坏运行中 DB。
- **下一个任务**：`S4-DATA-RESTORE-DRY-RUN`。

### 6. S4-DATA-RESTORE-DRY-RUN
- **目标**：验证备份能恢复到临时 DB 并读回关键实体。
- **前置依赖**：`S4-DATA-BACKUP-EXPORT` 完成。
- **夜跑状态**：completed；已新增 `npm run restore:dry-run` 与 `npm run verify:s4-data-restore-dry-run`，只恢复到临时 DB，不覆盖生产 DB，可本地自动验证。
- **输入文件**：timestamped SQLite backup、JSON export、SQLite schema、server storage 读路径。
- **允许改动**：restore dry-run script、验证脚本、部署文档、planning sync。
- **明确不做**：不覆盖生产 DB；不自动执行真实恢复；不删除原备份；不在未确认情况下停服务。
- **验证要求**：从备份恢复到临时 DB；读取 workspace / issue / record / archive / error-entry；校验计数或样例 ID；dry-run 完成后生产 DB 未改动。
- **完成定义**：备份可被独立恢复并读回；恢复流程可演练；生产数据安全不受影响。
- **下一个任务**：`AI-READY-PROMPT-TEMPLATE-SYSTEM`。

### 7. S4-OPERABILITY-HEALTH-STATUS
- **目标**：提供更清楚的 server status / storage status / version info，便于部署后诊断。
- **前置依赖**：`S4-RELEASE-VERSION-ENDPOINT` 完成；本地 HTTP + SQLite 主链路可用。
- **夜跑状态**：completed；已增强 `/api/health` 的 server/storage/workspace/release 可诊断状态，并在前端统一 banner 展示摘要。
- **输入文件**：`apps/server/src/*`、server health endpoint、storage adapter、部署 env、前端连接状态 UI。
- **允许改动**：server health/status endpoint；前端最小状态展示；verify 脚本；planning sync。
- **明确不做**：不做复杂监控平台；不做权限系统；不暴露 secrets / 绝对敏感路径；不做公网可观测性。
- **验证要求**：health/status 返回 server ready、storage ready、DB path class 或 redacted path、workspace seed、错误状态；前端可显示可理解状态；断 DB 或错误 env 时状态可诊断。
- **完成定义**：部署后能一眼确认 server/storage 是否正常；失败态有明确错误，不 silent fallback。
- **下一个任务**：`S4-DATA-BACKUP-EXPORT`。

### 8. S4-RELEASE-VERSION-ENDPOINT
- **目标**：让 server `/api/health` 或 version endpoint 返回版本、commit、release tag，便于确认服务器跑的是哪版。
- **前置依赖**：本地 HTTP + SQLite 主链路可用；不依赖真实服务器部署结果。
- **夜跑状态**：completed；已新增 `/api/version` 与 `/api/health.data.release`，并接入 `npm run verify:s4-release-version-endpoint`。
- **输入文件**：release metadata、package version、git commit / tag 注入方式、server health endpoint、deploy flow。
- **允许改动**：server version metadata 读取；release packaging metadata；verify 脚本；planning sync。
- **明确不做**：不读取 `.git` 作为服务器运行时必需依赖；不暴露 secrets；不引入复杂 release registry。
- **验证要求**：本地与服务器 health/version 能返回 version、commit、release tag；release 更新后值变化；回滚后值对应旧 release。
- **完成定义**：部署验证可通过 endpoint 确认实际运行版本；release update / rollback 可被版本信息佐证。
- **下一个任务**：`AI-READY-PROMPT-TEMPLATE-SYSTEM`。

## AI-ready 任务队列

### 9. AI-READY-PROMPT-TEMPLATE-SYSTEM
- **目标**：沉淀 prompt template 与输入输出 schema，为后续 AI 接入准备边界，但不调用模型。
- **前置依赖**：`S4-DATA-RESTORE-DRY-RUN` 完成；server / storage / version 可诊断，备份与恢复演练已完成。
- **夜跑状态**：completed；已新增 `src/ai/prompt-templates.ts` 与 `npm run verify:ai-ready-prompt-template-system`，只落地 deterministic 模板 / schema，不调用外部模型，不需要 API key。
- **输入文件**：domain schemas、issue / record / closeout 数据结构、closeout UI、后续 AI 草稿需求。
- **允许改动**：prompt template 模块、`PromptInput` / `PromptOutput` 类型或 schema、规则模板测试、文档、planning sync。
- **明确不做**：不保存 API key；不调用外部 AI；不新增 provider SDK；不做 RAG / embedding；不自动写库。
- **验证要求**：`polish_closeout`、`summarize_records`、`suggest_prevention` 模板可生成确定性输入；schema 校验覆盖必填字段和无效输出；现有 closeout 流程不回归。
- **完成定义**：AI 草稿输入输出边界清楚；模板可被规则生成器和未来 server AI provider 复用；无外部调用。
- **下一个任务**：`AI-READY-CLOSEOUT-DRAFT-PANEL`。

### 10. AI-READY-CLOSEOUT-DRAFT-PANEL
- **目标**：在 closeout 流程里增加“草稿辅助面板”，先用规则模板生成草稿。
- **前置依赖**：`AI-READY-PROMPT-TEMPLATE-SYSTEM` 完成。
- **夜跑状态**：`current_night_safe`；只生成可审阅规则草稿，不调用外部 AI，不自动写库。
- **输入文件**：closeout UI、issue / records / closeout input、prompt template schema、existing closeout orchestration。
- **允许改动**：前端 closeout panel、规则草稿生成器、UI smoke / verify 脚本、planning sync。
- **明确不做**：不调用外部 AI；不自动写入；不改变原 closeout 必填规则；不做 RAG / embedding；不保存 API key。
- **验证要求**：规则生成问题描述优化、根因总结草稿、解决方案草稿、预防建议草稿；用户可复制或应用；closeout 原路径不回归；UI smoke 通过。
- **完成定义**：用户能在 closeout 旁看到可解释草稿，并手动复制 / 应用；主流程仍由用户确认写库。
- **下一个任务**：`AI-ASSIST-POLISH-CLOSEOUT-MINIMAL`。

### 11. AI-ASSIST-POLISH-CLOSEOUT-MINIMAL
- **目标**：接入真实 AI 的最小措辞优化，只返回 closeout 草稿。
- **前置依赖**：`AI-READY-CLOSEOUT-DRAFT-PANEL` 完成；server 可安全持有 env；prompt schema 已稳定。
- **输入文件**：server env、server API、prompt templates、closeout draft panel、error state UI。
- **允许改动**：server-side AI provider 最薄 adapter、server env 文档、前端请求草稿接口、timeout / error state、verify 脚本、planning sync。
- **明确不做**：browser 不持有 API key；AI 不直接写库；AI 失败不阻断 closeout；不做 RAG / embedding；不做多 provider 复杂抽象；不把草稿当事实结论。
- **验证要求**：无 API key 时主流程正常并显示配置缺失；mock / test provider 返回草稿；timeout / provider error 有可见状态；用户确认后才应用；closeout 原路径不回归。
- **完成定义**：真实 AI 能生成措辞优化草稿；安全边界在 server；失败可降级到手写 / 规则草稿。
- **下一个任务**：`AI-ASSIST-SUGGEST-PREVENTION`。

### 12. AI-ASSIST-SUGGEST-PREVENTION
- **目标**：基于 issue + records + resolution 生成预防建议草稿。
- **前置依赖**：`AI-ASSIST-POLISH-CLOSEOUT-MINIMAL` 完成。
- **输入文件**：issue / records / resolution 数据、`suggest_prevention` prompt、AI provider adapter、closeout draft panel。
- **允许改动**：预防建议草稿 prompt、server draft endpoint 扩展、前端草稿展示、verify 脚本、planning sync。
- **明确不做**：不自动写 `ErrorEntry.prevention`；不把 AI 建议标记为事实；不做 RAG / embedding；不扫描代码仓库。
- **验证要求**：有 records / 无 records / provider 失败三类路径；草稿可复制或应用；`ErrorEntry.prevention` 非空规则仍由用户确认路径保证。
- **完成定义**：AI 可辅助生成预防建议草稿，用户确认后才能进入 closeout 数据。
- **下一个任务**：`CODE-CONTEXT-BUNDLE-CLI`。

## AI 代码上下文任务队列

### 13. CODE-CONTEXT-BUNDLE-CLI
- **目标**：提供本地 CLI / script，让用户在 WSL 项目目录生成可上传或粘贴到 ProbeFlash 的 code context bundle。
- **前置依赖**：`AI-ASSIST-SUGGEST-PREVENTION` 完成，AI 草稿边界已验证；不依赖服务器扫描仓库。
- **输入文件**：目标仓库路径、git CLI 输出、用户 allowlist 文件、build/typecheck/verify 输出、错误日志。
- **允许改动**：本仓库中的 dev tool / script、bundle schema、文档、verify 脚本、planning sync。
- **明确不做**：server 不任意读取用户仓库；默认不包含 `.env` / secrets / `node_modules` / `.git`；不自动执行破坏性命令；不上传到外部 AI；不做 RAG / embedding。
- **验证要求**：bundle 包含 repo name、branch、git status、git diff --stat、git log -n、file tree 摘要、用户指定文件内容、build/typecheck/verify 输出、错误日志；大文件跳过；allowlist 生效；输出 markdown 或 json。
- **完成定义**：用户可在本地显式生成可审阅 bundle；默认安全排除敏感路径；输出可被 ProbeFlash 后续附加。
- **下一个任务**：`CODE-CONTEXT-ATTACH-TO-ISSUE`。

### 14. CODE-CONTEXT-ATTACH-TO-ISSUE
- **目标**：ProbeFlash issue 支持附加 code context bundle，并显示摘要。
- **前置依赖**：`CODE-CONTEXT-BUNDLE-CLI` 完成。
- **输入文件**：code context bundle schema、IssueCard / InvestigationRecord schema、server storage/API、frontend issue detail UI。
- **允许改动**：作为 InvestigationRecord 或独立 CodeContext entity 的最小 schema/API/UI；摘要展示；verify 脚本；planning sync。
- **明确不做**：不让 server 扫描任意路径；不自动执行命令；不解析 secrets；不影响现有 issue / record / closeout 主路径。
- **验证要求**：可附加 bundle；可显示 repo / branch / status / diff stat / selected files 摘要；主路径不回归；bundle 过大或 schema 错误有可见错误。
- **完成定义**：用户显式提供的 code context 能被安全挂到问题上，且不会改变原有调试闭环。
- **下一个任务**：`AI-ASSIST-ANALYZE-CODE-CONTEXT`。

### 15. AI-ASSIST-ANALYZE-CODE-CONTEXT
- **目标**：AI 基于用户提供的 code context bundle 分析可能原因和下一步排查。
- **前置依赖**：`CODE-CONTEXT-ATTACH-TO-ISSUE` 完成；最小 AI draft adapter 已完成。
- **输入文件**：issue、records、attached code context bundle、AI prompt templates、server AI adapter。
- **允许改动**：code context analysis prompt、server draft endpoint、前端 hypothesis / next steps 草稿 UI、verify 脚本、planning sync。
- **明确不做**：只分析用户显式提供的内容；不扫描服务器文件系统；不自动执行命令；不直接写 InvestigationRecord；不做 RAG / embedding。
- **验证要求**：AI 输出 hypothesis / next steps 草稿；用户确认后才能转成记录；provider 失败不影响 issue 主路径；bundle 缺失时有清楚空状态。
- **完成定义**：AI 能基于显式 bundle 给出可审阅排查方向，且所有入库动作仍由用户确认。
- **下一个任务**：`CODE-CONTEXT-REPO-CONNECTOR-LATER`。

### 16. CODE-CONTEXT-REPO-CONNECTOR-LATER
- **目标**：在 bundle MVP 验证后，再评估只读 repo connector。
- **前置依赖**：`AI-ASSIST-ANALYZE-CODE-CONTEXT` 完成，并确认 bundle 方式不足以满足常用场景。
- **输入文件**：bundle 使用反馈、权限边界设计、allowlist paths、server deployment constraints、secret 排除规则。
- **允许改动**：设计文档、最小只读 connector spike、权限 / allowlist 校验、verify 脚本、planning sync。
- **明确不做**：不默认扫全仓库；不读取 secrets；不越过 allowlist；不自动执行命令；不做写操作；不绕过用户确认。
- **验证要求**：allowlist 生效；禁读 `.env` / secrets / `node_modules` / `.git`；大文件跳过；审计日志可说明读取了哪些路径；关闭 connector 后主流程不受影响。
- **完成定义**：只读 repo connector 的安全边界被验证，且仍以用户授权和 allowlist 为前提。
- **下一个任务**：待 planning 重新评估。

## 当前先不做
- 不把真实服务器部署标记为 completed。
- 不在夜跑 / 无人值守模式下执行 `S3-SERVER-USER-DIR-DEPLOY-VERIFY` 或任何真实服务器任务。
- 不把 AI-ready / AI assist / code context 写成已实现。
- 不让服务器直接扫描任意仓库路径。
- 不引入 RAG / embedding 作为第一步。
- 不做权限系统、账号体系、多租户、复杂协同或公网暴露。
- 不做 Electron / preload / fs / IPC，不把 `.debug_workspace` 文件写盘当作当前主线。
- 不做大 UI 重构，不改变已通过 smoke 的主流程，除非当前原子任务明确要求最小适配。
