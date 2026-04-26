# 当前执行面板（Current）

> 本文件只维护当前阶段目标、前沿任务窗口、唯一主线原子任务与下一任务选择规则。完整剩余串行队列与详细执行拆解见 `docs/planning/backlog.md` 与 `.agent-state/handoff.json.pending_task_queue`。v0.2.0 前历史专项输入已归档到 `docs/archive/v0.2-closeout/`，默认不读。

## 当前阶段
- 阶段：S3 到 S4 到 AI 能力的分层路线图重建后，当前仍处于 **S3：服务器安全部署**。
- 当前模式：`server_storage_migration`。
- 阶段目标：基于 v0.2.0 已完成的本地 HTTP + SQLite 主链路，优先用 **GitHub Release tarball** 在 Ubuntu 20.04 服务器用户目录完成安全、可回滚、可验证的部署；真实服务器尚未执行。
- 当前技术路线：从 GitHub Release 下载固定版本资产并校验 `SHA256SUMS.txt`，解压到 `/home/hurricane/probeflash/releases/vX.Y.Z`，用独立 Node runtime 启动，`shared/data` / `shared/env` / `shared/logs` 保持跨 release 持久，`current` symlink 指向当前版本；服务器不作为开发 checkout，不以 `git pull` 作为主部署方式。

## 本轮重构后的状态
- v0.2.0 release 已完成，已存在资产：`probeflash-web-v0.2.0.tar.gz`、`probeflash-server-v0.2.0.tar.gz`、`probeflash-dev-tools-v0.2.0.tar.gz`、`SHA256SUMS.txt`。
- WSL 本地已验证 release 包可下载、解压、运行：历史临时 web server 曾证明 web dist 可被托管、`/api` 可代理到 `127.0.0.1:4100`、停掉 backend 后 proxy 返回 `502 proxy_error`，没有 silent fallback。
- `S3-SERVER-RELEASE-STATIC-WEB-SERVE-PLAN` 已完成并收敛为推荐方案 B：`apps/server` 在设置 `PROBEFLASH_STATIC_DIR=/home/hurricane/probeflash/current/dist` 时，同一 `4100` 端口服务 release `dist` 与现有 `/api`；未设置时保持 API-only，本地 `dev-start.sh` / Vite proxy 不受影响。
- S4 本地 operability / data safety 已完成：`/api/version`、增强 `/api/health`、`backup:export`、`restore:dry-run` 均已有本地自动验证；真实服务器路径仍需等 release 部署后复验。
- AI-ready prompt/schema 与 closeout draft panel 已完成；仍未调用外部 AI，仍不自动写库。
- 真实服务器 release 部署、LAN 持久化验证、systemd 开机自启、真实 AI、仓库代码上下文分析均未完成。
- 目标服务器事实：`192.168.2.2` / `hurricane-server` / SSH 用户 `hurricane` / Ubuntu 20.04.6 LTS / systemd 可用；80 端口由 filebrowser 占用；系统 Node 为 `v10.19.0`，不能用于 ProbeFlash；`4100` 当前未见监听，适合 ProbeFlash。
- 服务器安全边界：不占用 80，不升级系统 Node，不影响 filebrowser / vnt-cli / docker / Portainer；`/home/hurricane` 可写，`/opt` 属于 root，不作为当前部署目录。
- `apps/server/deploy/*` 当前应表达 release tarball first：GitHub Release 固定资产 + SHA256 校验 + 用户目录解压 + `current` symlink + `shared` 持久目录 + `PROBEFLASH_STATIC_DIR=/home/hurricane/probeflash/current/dist`；`git pull` 只可作为开发 / 调试方式，不是正式部署方式。

## 推荐服务器目录
```text
/home/hurricane/probeflash/
  releases/
    v0.2.0/
      apps/server/
      dist/
  current -> releases/v0.2.0
  shared/
    data/
      probeflash.sqlite
    logs/
    env/
      probeflash.env
  runtime/
    node/
```

## 当前已确认约束
- 优先部署方式是 **release tarball deployment**，不是服务器上 `git checkout` / `git pull` 开发态部署。
- 真实服务器部署验证必须等用户白天确认；本轮不 SSH、不上传、不 sudo、不 systemd、不写 `/home/hurricane/probeflash`、不写 `/opt`、不碰 80。
- 当前服务器部署任务必须保持 `blocked_by_user_confirmation`、`blocked_by_user_time`、`not night-safe`。
- systemd 只保留为后续任务，必须依赖 no-sudo release deploy verify 通过；不得作为当前第一步。
- 最后才考虑 `/opt`、反向代理、`.local`、80/443 美化；这些不是当前前沿任务。
- AI 路线必须先 AI-ready：规则模板草稿与 prompt schema 先落地；真实 AI 只返回草稿，不直接写库；API key 只允许在 server env；不做 RAG / embedding。
- 代码上下文路线必须先 code context bundle：只分析用户显式提供的内容，不让服务器任意扫描仓库路径，不自动执行命令。
- 夜跑 / 无人值守模式只能执行 repo-local、可自动验证、可回滚任务；任何 SSH、上传、真实服务器、sudo、systemd、`/opt`、80/443 或需用户拍板事项都必须停止并留下 handoff。

## 当前唯一白天主线原子任务（blocked，不能夜跑）
- **S3-SERVER-RELEASE-USER-DIR-DEPLOY-VERIFY**
  - 目标：在服务器 `/home/hurricane/probeflash` 下使用 GitHub Release tarball 完成 v0.2.0 no-sudo 用户目录部署验证，确认独立 Node runtime、4100 端口、SQLite 持久化、release 解压布局与 filebrowser:80 旁路都成立。
  - 当前状态：`blocked_by_user_confirmation` + `blocked_by_user_time`；只在用户白天确认 SSH / 下载或上传 release assets / 写入路径 / 启动进程 / 4100 端口边界后可执行。
  - 前置依赖：v0.2.0 release assets 已发布并本地 smoke 通过；release download / upload + SHA256 校验计划已写入 deploy docs；仍需用户确认真实服务器操作边界。
  - 输入文件 / 环境：`apps/server/deploy/*`、v0.2.0 release assets、`SHA256SUMS.txt`、目标服务器 `192.168.2.2`、用户确认的 SSH / 下载或上传 / 写入 / 启动 / 端口边界。
  - 允许改动：服务器 `/home/hurricane/probeflash/{releases,current,runtime,shared}`；仓库内仅 planning sync 或必要 deployment note。
  - 明确不做：不在服务器上 `git pull`；不 sudo；不 systemd；不写 `/opt`；不碰 80；不升级系统 Node；不使用系统 Node v10；不影响 filebrowser / vnt-cli / docker / Portainer；不做反向代理 / `.local`。
  - 夜跑边界：blocked；涉及真实服务器、SSH、下载 / 上传、写入路径、启动进程与端口确认，必须停止。
  - 验证要求：校验 `SHA256SUMS.txt`；确认 `current -> releases/v0.2.0`；确认 server release 用独立 Node runtime 启动；确认 `PROBEFLASH_STATIC_DIR=/home/hurricane/probeflash/current/dist`；`curl http://127.0.0.1:4100/`；`curl http://127.0.0.1:4100/api/health`；`curl http://192.168.2.2:4100/`；`curl http://192.168.2.2:4100/api/health`；missing SPA route 返回 index；创建 workspace / issue；停止重启后读回；确认 `/home/hurricane/probeflash/shared/data/probeflash.sqlite` 被使用；确认 filebrowser:80 仍正常。
  - 完成定义：ProbeFlash 从固定 release 资产运行；4100 可本机与 LAN 访问 Web UI 和 `/api`；SQLite 重启后可读回；`shared/data` / `shared/env` / `shared/logs` 不随 release 删除；filebrowser:80 不受影响；没有执行 sudo / systemd / `/opt` / 服务器 `git pull`。
  - 下一个白天任务：`S3-SERVER-SYSTEMD-AUTOSTART-PREP`，但它必须依赖本任务通过。

## 当前前沿任务窗口（最多 3 个候选）
- **S3-SERVER-RELEASE-USER-DIR-DEPLOY-VERIFY**
  - 状态：`blocked_by_user_confirmation` + `blocked_by_user_time`；白天主线，只能等用户确认真实服务器边界后执行，夜跑不可执行。
  - 选择理由：真实服务器部署未完成；release tarball 是用户确认的优先部署方式，风险低于服务器开发 checkout / `git pull`。
- **TECH-DEBT-CLOSEOUT-ATOMICITY-RECOVERY**
  - 状态：`pending_night_safe_candidate`；repo-local 临时 DB / fixture，可自动验证，是 storage error contract 完成后的下一技术债候选。
  - 选择理由：closeout 多步写入仍需收敛原子性、失败恢复与读回验证边界。
- **TECH-DEBT-VERIFY-HELPERS**
  - 状态：`pending_night_safe_candidate`；repo-local，可在不触碰真实服务器的前提下补高风险路径静态 / smoke helper。
  - 选择理由：release static serve 已完成；若暂不做 closeout 原子性，可优先补 deploy / handoff / storage 口径的自动一致性检查。

## 剩余 pending queue（区分白天主线与夜跑候选）
1. `S3-SERVER-RELEASE-USER-DIR-DEPLOY-VERIFY`：blocked_by_user_confirmation + blocked_by_user_time，白天主线，必须用户确认真实服务器边界。
2. `S3-SERVER-RELEASE-UPDATE-FLOW`：pending_after_release_user_dir_verify；定义 v0.2.1 / v0.3.0 下载新 release、解压到 `releases/vX.Y.Z`、切 `current`、restart、health check、rollback。
3. `S3-SERVER-SYSTEMD-AUTOSTART-PREP`：blocked_by_external_dependency_after_release_user_dir_verify，白天主线后续，不执行 systemctl。
4. `S3-SERVER-SYSTEMD-AUTOSTART-VERIFY`：blocked_by_user_confirmation，涉及 sudo / systemd。
5. `TECH-DEBT-CLOSEOUT-ATOMICITY-RECOVERY`：pending_night_safe_candidate，夜跑可选，repo-local 临时 DB / fixture。
6. `TECH-DEBT-APP-SPLIT-MINIMAL`：pending_after_closeout_recovery，夜跑可选，必须小步且自动验证。
7. `TECH-DEBT-VERIFY-HELPERS`：pending_after_app_split_or_as_verify_followup，夜跑可选，repo-local。
8. `TECH-DEBT-VERIFY-TMP-CLEANUP`：pending_after_verify_helpers，夜跑可选，只能清理 repo-local 临时路径。
9. `AI-ASSIST-POLISH-CLOSEOUT-MINIMAL`：blocked_by_external_dependency_api_key_after_ai_ready；不得作为无人值守 current task。
10. `AI-ASSIST-SUGGEST-PREVENTION`：pending_after_minimal_ai。
11. `CODE-CONTEXT-BUNDLE-CLI`：pending_after_ai_prevention。
12. `CODE-CONTEXT-ATTACH-TO-ISSUE`：pending_after_bundle_cli。
13. `AI-ASSIST-ANALYZE-CODE-CONTEXT`：pending_after_bundle_attach_and_ai_adapter。
14. `CODE-CONTEXT-REPO-CONNECTOR-LATER`：pending_after_user_feedback。

## 下一步最小可执行动作
- 白天主线：等待用户确认 `S3-SERVER-RELEASE-USER-DIR-DEPLOY-VERIFY` 的 SSH、release 下载或上传方式、写入 `/home/hurricane/probeflash`、启动临时进程与 4100 端口边界。
- 若用户没有服务器时间：不要执行真实部署；可选择第一个 repo-local、可自动验证、可回滚的 night-safe 任务。`S3-SERVER-RELEASE-STATIC-WEB-SERVE-PLAN` 已完成；下一 night-safe 候选优先 `TECH-DEBT-CLOSEOUT-ATOMICITY-RECOVERY`，也可在用户更想补验证基础设施时选择 `TECH-DEBT-VERIFY-HELPERS`。
- 真实 AI：`AI-ASSIST-POLISH-CLOSEOUT-MINIMAL` 仍需要用户确认 provider、API key/server env、timeout 与 mock/test provider 边界；不得作为无人值守 current task。
- 认领前必须重新读取默认事实源 + `docs/planning/backlog.md`，确认 `S3-*` 真实服务器任务仍保持 blocked 且未被误标 completed，并确认 night-safe 候选没有外部依赖。
- 真实服务器操作前必须获得用户确认：SSH 登录方式、release assets 下载 / 上传方式、是否允许在 `/home/hurricane/probeflash` 写入、是否允许启动临时进程、是否允许用 4100 端口。
- 若用户未授权 SSH / 下载或上传 / 启动进程，不得自行部署；夜跑只能继续 repo-local、可自动验证、可回滚任务。
- 若后续队列只剩服务器、sudo、systemd、真实 API key 或用户拍板任务，停止并说明需要用户白天介入。

## 下一任务选择流程
1. 默认只读取：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关文件。
2. 需要完整队列、任务新增 / 重排 / 改名时读取 `docs/planning/backlog.md`。
3. 需要历史 API / SQLite / 服务器不可达策略背景、v0.2.0 前专项追溯或归档审计时，才读取 `docs/archive/v0.2-closeout/`。
4. 服务器 release 部署任务命中时读取 `apps/server/deploy/*` 与 release asset 状态；不得把旧 `/opt` 或服务器 `git pull` 材料当作当前授权。
5. 夜跑 / 无人值守模式下，若候选任务需要 SSH、sudo、systemd、真实服务器、外部账号、API key、删除 / 迁移数据或用户确认，必须停止，不得硬跑。
6. 只允许从 `backlog.md` / `.agent-state/handoff.json.pending_task_queue` 中认领第一个“依赖已满足且未完成”的任务；若第一个任务 blocked，只能选择明确标注为 repo-local night-safe 的候选。
7. 当前任务未完成“最小验证 + planning sync + 单任务 commit”前，不得认领下一任务。
8. 真实服务器部署必须分层：release tarball no-sudo 用户目录验证先于 systemd，systemd 自启验证先于 `/opt` / 反向代理 / `.local`。
9. AI 任务必须分层：AI-ready 草稿与 prompt schema 先于真实 AI，真实 AI 先于 code context AI，code context bundle 先于任何 repo connector。

## Night Run / Unattended Mode
- 允许任务：docs / planning 整理、机读 handoff 对齐、本地代码功能、本地 verify 脚本、单元测试 / smoke 脚本、backup / export 本地功能、AI-ready UI / prompt schema、code context bundle CLI、小型局部重构。
- 禁止任务：SSH 到服务器写入、sudo、systemd、写 `/opt`、操作 80/443、真实服务器部署、GitHub release / tag 删除、数据库 destructive migration、删除用户数据、修改真实生产数据、大规模 UI 重构、引入大型框架、需要用户拍板的产品方向、任何无法本地自动验证的任务。
- 停止条件：git status 不干净且无法归类；typecheck / build / verify 失败且不能在当前边界内修复；需要 SSH / sudo / systemd / 外部账号 / API key；需要用户确认路径、权限、端口、账号或密钥；涉及真实服务器；涉及删除 / 迁移数据；planning 与代码冲突且无法判断谁 stale；任务边界不清；连续两次修复验证仍失败；命令出现权限错误、网络错误或端口冲突但无法确定原因。
- 提交规则：每个原子任务单独 commit；提交前必须验证；提交后 `git status --short` 必须为空；不 push；不改 tag / release；不进入下一任务前留下脏工作区。
- 输出要求：夜跑结束必须输出已完成任务、每个任务 commit、验证结果、未完成任务、阻塞点、下一步最小动作、是否需要用户白天介入。
- 当前服务器任务口径：`S3-SERVER-RELEASE-USER-DIR-DEPLOY-VERIFY`、`S3-SERVER-SYSTEMD-AUTOSTART-PREP`、`S3-SERVER-SYSTEMD-AUTOSTART-VERIFY` 都不能夜跑。

## DoD / Verification Expectation
- 每个原子任务都必须写清：ID、目标、前置依赖、输入文件、允许改动、明确不做、验证要求、完成定义、下一个任务。
- 本轮 release static web serve 实现验证要求：`git diff --check`、`cd apps/server && npm run verify:s3-local-backend-scaffold`、`cd apps/server && npm run verify:deploy-prep`、`cd apps/server && npm run verify:release-static-web-serve`、`cd apps/desktop && npm run typecheck`、`cd apps/desktop && npm run build`、`cd apps/desktop && npm run verify:handoff`、`cd apps/desktop && npm run verify:all`、`python3 -m json.tool .agent-state/handoff.json >/dev/null`。
- 后续代码或部署类任务若改 package 或业务代码，必须继续额外跑 `cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all` 与任务相关 server / deploy 验证。
- `docs/planning/current.md`、`.agent-state/handoff.json` 为 planning sync 必更文件；排队顺序或详细计划变化时同步 `docs/planning/backlog.md`；长期拍板变化时同步 `docs/planning/decisions.md`。
- 任一验证未过、planning sync 未完成或未单独 commit，都不得进入下一任务选择。
