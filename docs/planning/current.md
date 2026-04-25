# 当前执行面板（Current）

> 本文件只维护当前阶段目标、前沿任务窗口、唯一主线原子任务与下一任务选择规则。完整剩余串行队列与详细执行拆解见 `docs/planning/backlog.md` 与 `.agent-state/handoff.json.pending_task_queue`。

## 当前阶段
- 阶段：S3 到 S4 到 AI 能力的分层路线图重建后，当前仍处于 **S3：服务器安全部署**。
- 当前模式：`server_storage_migration`。
- 阶段目标：基于 v0.2.0 已完成的本地 HTTP + SQLite 主链路，先在 Ubuntu 20.04 服务器上完成安全、可回滚、可验证的用户目录部署；再进入 systemd 自启、数据安全、AI-ready 与代码上下文分析能力。
- 当前技术路线：先 `/home/hurricane/probeflash` no-sudo 验证，再准备并授权安装 `probeflash.service`，再定义 release tarball 更新 / 回滚；完成 operability / data safety 后，才进入 AI-ready、最小真实 AI 草稿、code context bundle。

## 本轮按已知事实重建后的状态
- v0.2.0 release 已完成：本地 HTTP + SQLite 主链路、`/api` adapter、`apps/server`、SQLite schema/API、workspace 创建与切换、issue / record / closeout / archive / error-entry 主路径、`dev-start.sh`、本地 release smoke 均已完成。
- 本地 release smoke 已确认：web dist 可被 `127.0.0.1:4173` 托管；`4173/api` 可代理到 `127.0.0.1:4100`；`4100` 后端可返回 sqlite ready；停掉后端后 `4173/api` 返回 `proxy_error`，没有 fake data / silent fallback。
- 真实服务器部署、systemd 开机自启、服务器 LAN 持久化验证、AI 功能、仓库代码上下文分析均未完成。
- 目标服务器事实：`192.168.2.2` / `hurricane-server` / SSH 用户 `hurricane` / Ubuntu 20.04.6 LTS / systemd 可用；80 端口由 filebrowser 占用；系统 Node 为 `v10.19.0`，不能用于 ProbeFlash；`4100` 当前未见监听，适合 ProbeFlash。
- 服务器安全边界：不占用 80，不升级系统 Node，不影响 filebrowser / vnt-cli / docker / Portainer；`/home/hurricane` 可写，`/opt` 属于 root，不作为第一步部署目录。
- 旧 `apps/server/deploy/*` 材料仍是已存在的部署准备输入，但其中 `/opt` 路径不能被解释为当前授权；下一轮应按本文件与 backlog 的 no-sudo 用户目录策略优先执行。

## 当前已确认约束
- 先做 **no-sudo 用户目录部署验证**：`/home/hurricane/probeflash`。
- 再做 **systemd 开机自启准备**：只准备 `probeflash.service` 内容与静态检查，不执行真正 `systemctl`，除非用户授权。
- 用户授权后才做 **systemd 安装与自启验证**：写 `/etc/systemd/system/probeflash.service` 前必须再次确认 sudo 边界。
- 最后才考虑 `/opt`、反向代理、`.local`、80/443 美化；这些不是当前前沿任务。
- AI 路线必须先 AI-ready：规则模板草稿与 prompt schema 先落地；真实 AI 只返回草稿，不直接写库；API key 只允许在 server env；不做 RAG / embedding。
- 代码上下文路线必须先 code context bundle：只分析用户显式提供的内容，不让服务器任意扫描仓库路径，不自动执行命令。

## 当前唯一主线原子任务（下一轮只认领这个）
- **S3-SERVER-USER-DIR-DEPLOY-VERIFY**
  - 目标：在服务器 `/home/hurricane/probeflash` 下完成 v0.2.0 no-sudo 用户目录部署验证，确认独立 Node runtime、4100 端口、SQLite 持久化与 filebrowser:80 旁路都成立。
  - 前置依赖：v0.2.0 release asset 已生成并本地测试；本地 HTTP + SQLite E2E 已通过；服务器事实已确认；用户明确允许 SSH 到 `hurricane@192.168.2.2` 并在 `/home/hurricane` 下写入文件。
  - 输入文件 / 环境：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`docs/planning/backlog.md`、v0.2.0 release assets、`apps/server/deploy/*` 作为参考输入、目标服务器 `192.168.2.2`、人工确认的 SSH / 上传方式。
  - 允许改动：服务器 `/home/hurricane/probeflash` 下的 release、runtime、shared data/log/env；仓库内只允许做 planning sync 或必要 deploy 文档修正，不能写业务功能。
  - 明确不做：不 sudo；不 systemd；不写 `/opt`；不碰 80；不升级系统 Node；不使用系统 Node v10；不影响 filebrowser / vnt-cli / docker / Portainer；不做反向代理 / `.local`。
  - 验证要求：`curl http://127.0.0.1:4100/api/health`；`curl http://192.168.2.2:4100/api/health`；创建 workspace / issue；停止重启后读回；确认 `http://192.168.2.2/` 上 filebrowser:80 仍正常；仓库侧运行 planning 类 completion gate。
  - 完成定义：ProbeFlash 可在服务器用户目录下以独立 Node runtime 运行；SQLite 文件位于 `/home/hurricane/probeflash/shared/data/probeflash.sqlite` 且重启后可读回；LAN 可访问 4100；既有 80 端口服务不受影响；未执行任何 sudo / systemd / `/opt` 操作。
  - 下一个任务：`S3-SERVER-SYSTEMD-AUTOSTART-PREP`。

## 当前前沿任务窗口（最多 3 个候选）
- **S3-SERVER-USER-DIR-DEPLOY-VERIFY**
  - 状态：当前唯一可认领任务。
  - 选择理由：服务器真实部署未完成，但 `/opt` 与 systemd 需要更高权限；先用 `/home/hurricane/probeflash` 验证同一 runtime / DB / 端口方案，风险最小。
- **S3-SERVER-SYSTEMD-AUTOSTART-PREP**
  - 状态：等待 `S3-SERVER-USER-DIR-DEPLOY-VERIFY` 完成。
  - 选择理由：只有 no-sudo 跑通后，才值得准备与用户目录路径一致的 `probeflash.service`。
- **S3-SERVER-SYSTEMD-AUTOSTART-VERIFY**
  - 状态：等待用户授权 sudo，且等待 systemd unit 准备完成。
  - 选择理由：自启验证必须明确授权写 `/etc/systemd/system/probeflash.service`，不能与 no-sudo 验证混在同一轮。

## 剩余完整 pending queue（按执行顺序）
1. `S3-SERVER-USER-DIR-DEPLOY-VERIFY`
2. `S3-SERVER-SYSTEMD-AUTOSTART-PREP`
3. `S3-SERVER-SYSTEMD-AUTOSTART-VERIFY`
4. `S3-SERVER-RELEASE-UPDATE-FLOW`
5. `S4-DATA-BACKUP-EXPORT`
6. `S4-DATA-RESTORE-DRY-RUN`
7. `S4-OPERABILITY-HEALTH-STATUS`
8. `S4-RELEASE-VERSION-ENDPOINT`
9. `AI-READY-PROMPT-TEMPLATE-SYSTEM`
10. `AI-READY-CLOSEOUT-DRAFT-PANEL`
11. `AI-ASSIST-POLISH-CLOSEOUT-MINIMAL`
12. `AI-ASSIST-SUGGEST-PREVENTION`
13. `CODE-CONTEXT-BUNDLE-CLI`
14. `CODE-CONTEXT-ATTACH-TO-ISSUE`
15. `AI-ASSIST-ANALYZE-CODE-CONTEXT`
16. `CODE-CONTEXT-REPO-CONNECTOR-LATER`

## 下一步最小可执行动作
- 下一轮默认先认领 `S3-SERVER-USER-DIR-DEPLOY-VERIFY`。
- 认领前必须重新读取默认事实源 + `docs/planning/backlog.md` + `apps/server/deploy/*` + v0.2.0 release asset 状态。
- 真实服务器操作前必须获得用户确认：SSH 登录方式、上传方式、是否允许在 `/home/hurricane/probeflash` 写入、是否允许启动临时进程、是否允许用 4100 端口。
- 若用户未授权 SSH / 上传 / 启动进程，不得自行部署；只输出阻塞点和需要确认的问题。

## 下一任务选择流程
1. 默认只读取：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关文件。
2. 需要完整队列、任务新增 / 重排 / 改名时读取 `docs/planning/backlog.md`。
3. 服务器部署任务命中时读取 `apps/server/deploy/*` 与 release asset 状态；但不得把旧 `/opt` 材料当作当前授权。
4. 只允许从 `backlog.md` / `.agent-state/handoff.json.pending_task_queue` 中认领第一个“依赖已满足且未完成”的任务。
5. 当前任务未完成“最小验证 + planning sync + 单任务 commit”前，不得认领下一任务。
6. 真实服务器部署必须分层：用户目录 no-sudo 验证先于 systemd，自启验证先于 `/opt` / 反向代理 / `.local`。
7. AI 任务必须分层：AI-ready 草稿与 prompt schema 先于真实 AI，真实 AI 先于 code context AI，code context bundle 先于任何 repo connector。

## DoD / Verification Expectation
- 每个原子任务都必须写清：ID、目标、前置依赖、输入文件、允许改动、明确不做、验证要求、完成定义、下一个任务。
- 本轮 planning-only 验证要求：`git diff --check`、`.agent-state/handoff.json` 可被 `JSON.parse`、`cd apps/desktop && npm run verify:handoff`、`git status --short`。
- 后续代码或部署类任务若改 package 或业务代码，必须额外跑 `cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all` 与任务相关 server / deploy 验证。
- `docs/planning/current.md`、`.agent-state/handoff.json` 为 planning sync 必更文件；排队顺序或详细计划变化时同步 `docs/planning/backlog.md`；长期拍板变化时才同步 `docs/planning/decisions.md`。
- 任一验证未过、planning sync 未完成或未单独 commit，都不得进入下一任务选择。
