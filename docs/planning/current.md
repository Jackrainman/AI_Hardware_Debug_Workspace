# 当前执行面板（Current）

> 本文件只维护当前阶段目标、前沿任务窗口、唯一主线原子任务与下一任务选择规则。完整剩余串行队列与详细执行拆解见 `docs/planning/backlog.md` 与 `.agent-state/handoff.json.pending_task_queue`。

## 当前阶段
- 阶段：S3：存储迁移与服务器化。
- 当前模式：`server_storage_migration`。
- 阶段目标：把当前 `apps/desktop` 浏览器 SPA + `window.localStorage` 演示版，迁移为“战队局域网可访问 + 服务端长期存储”的版本。
- 当前技术路线：先完成 `S3-ARCH-*` 三个最薄架构缝合点，再在 **本地 WSL** 跑通最小后端 + SQLite + HTTP adapter 闭环，最后做 **服务器独立部署验证**。

## 本轮按代码 / 脚本复核后的事实
- `S3-LOCAL-HTTP-STORAGE-ADAPTER` 已完成（`c3525b2`）；`S3-LOCAL-END-TO-END-VERIFY` 已完成（`1470571`）。
- 本地 HTTP + SQLite E2E 已通过：主路径可从 SQLite 读回问题卡、排查记录、归档摘要、错误表条目与 archived 状态；失败态覆盖 server unreachable、timeout、500、503、409 conflict、validation / bad request，且不会触发 localStorage fallback。
- `S3-SERVER-INDEPENDENT-DEPLOY-PREP` 已完成：新增 `apps/server/deploy/` 下的独立部署准备材料，并为 server 补齐部署 env 的最小支持。
- 当前部署准备材料只说明和验证仓库内方案：独立 runtime、独立目录、独立端口、独立 systemd service；**本轮未 SSH、未上传、未 sudo、未安装 runtime、未启动 systemd、未实际部署到 192.168.2.2**。
- `S3-WORKSPACE-CREATE-MINIMAL` 已完成：前端可经 HTTP 创建新项目 / workspace，创建后自动切换；issues / records / archives / error entries 继续按 `projectId === workspaceId` 隔离在当前 workspace 下；新增 `verify:s3-workspace-create-minimal` 并接入 `verify:all`。
- `apps/server/src/server.mjs` 仍保持默认本地开发行为：默认 `127.0.0.1:4100`、默认 DB 在 `apps/server/.runtime/probeflash.local.sqlite`、默认 workspace 为 `workspace-26-r1 / 26年 R1`。
- `apps/server/src/server.mjs` 已支持部署 env：`PROBEFLASH_HOST`、`PROBEFLASH_PORT`、`PROBEFLASH_DB_PATH`、`PROBEFLASH_LOG_DIR`、`PROBEFLASH_WORKSPACE_ID`、`PROBEFLASH_WORKSPACE_NAME`。
- `apps/server/src/database.mjs` 已支持从 server 传入默认 workspace seed；verify 已覆盖默认行为与 env 覆盖路径。
- 当前 Codex 环境本轮可监听 `127.0.0.1`，已跑通 server-backed verify；若后续环境再次出现 `listen EPERM`，仍按沙箱限制处理，不得伪造通过。

## 当前已确认约束
- 服务器阶段必须使用 **独立运行时 + 独立端口 + 独立 systemd service**；不升级服务器全局 Node，不影响现有 Web 服务，不抢占 80 端口。
- 目标服务器既有事实：`192.168.2.2`、Ubuntu 20.04.6 LTS、80 端口已占用、systemd 可用、sqlite3 未装、系统 Node 为 `v10.19.0` 且不能作为 ProbeFlash runtime。
- ProbeFlash 后端当前依赖 `node:sqlite`；部署 runtime 必须使用独立 Node 24 LTS，或至少 Node 22 LTS `>=22.13.0`。旧 Node 10/18/20 不能运行当前 backend。
- 当前访问口径分两层：
  - 本地联调：前端请求相对路径 `/api`，通过 Vite proxy 转发到 `http://127.0.0.1:4100`。
  - 独立部署：继续按 `http://192.168.2.2:<port>/` 理解；`.local`、反向代理、美化入口都不是当前第一优先级。
- 不得把 localStorage silent fallback 冒充服务器成功；失败态必须可见、可调试、可区分。
- 不做 AI / RAG / 权限 / Electron / fs / IPC / 多租户 / 多工作区复杂管理 / 大 UI 重构 / 离线队列 / 冲突合并 / 实时协作。

## 当前唯一主线原子任务（下一轮只认领这个）
- **S3-SERVER-INDEPENDENT-DEPLOY-VERIFY**
  - 目标：把“本地已验证方案 + 本轮已准备的独立部署材料”部署到服务器独立端口，由 systemd 拉起，并验证局域网设备可访问、SQLite 数据可持续、现有 80 端口服务不受影响。
  - 前置依赖：`S3-SERVER-INDEPENDENT-DEPLOY-PREP` 已完成；独立 runtime / 目录 / 端口 / service 模板 / env 模板 / 回滚边界已在 `apps/server/deploy/` 中准备。
  - 直接输入文件 / 环境：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`docs/planning/backlog.md`、`apps/server/deploy/README.md`、`apps/server/deploy/install-layout.md`、`apps/server/deploy/env.example`、`apps/server/deploy/probeflash.service.template`、目标服务器 `192.168.2.2` 与人工确认的登录 / sudo / 服务账号边界。
  - 执行拆解（认领后按此顺序收敛）：
    1. 部署前人工确认：目标服务器、登录用户、sudo 边界、服务账号 / group、是否允许创建 `/opt/probeflash`、是否允许新增 `probeflash.service`、是否允许使用 4100 端口。
    2. 在服务器确认系统事实：80 端口仍由旧服务占用、系统 Node 仍不改、systemd 可用、独立 runtime 路径可用。
    3. 按 `apps/server/deploy/install-layout.md` 准备独立目录、release、shared data/log/env、runtime 与 `current` symlink。
    4. 按 `env.example` 写入 `/opt/probeflash/shared/env/probeflash.env`，按 service template 渲染真实 unit。
    5. 只启动独立 `probeflash.service`，验证 `/api/health`、SQLite 创建 / 重启读回、日志、LAN 访问与旧 80 服务旁路。
    6. 若失败，按部署材料中的回滚边界只停用新 service / 回退 current symlink，不动旧 80 服务和系统 Node。
  - 预期改动点：真实部署动作发生在服务器环境；仓库内通常只允许补充 deployment notes / planning sync / 必要的 deploy 材料修补，不得伪造“已部署完成”。
  - 明确不做项：不抢占 80 端口；不升级系统 Node；不修改现有 Web 服务 / 反向代理 / `.local`；不把 localStorage 演示链路当作服务器化完成。
  - 工程化验证：`systemctl status probeflash.service` / `journalctl -u probeflash.service`；服务器本机 `curl http://127.0.0.1:4100/api/health`；局域网 `curl http://192.168.2.2:4100/api/health` 或等价浏览器 smoke；服务重启后 SQLite 数据读回；确认旧 80 端口服务不受影响；仓库侧仍需按 completion gate 跑最小验证与 planning sync。
  - 完成定义：局域网设备可通过独立端口访问 ProbeFlash；服务端长期存储生效并可跨服务重启读回；既有 80 端口服务不受影响；S3 服务器独立部署最小闭环成立。
  - 完成后下一任务：无；后续再评估 `.local` / 反向代理美化、复杂项目管理或更深层服务器化能力。

## 当前前沿任务窗口（候选，不等于完整顺推队列）
- **S3-SERVER-INDEPENDENT-DEPLOY-VERIFY**
  - 状态：当前唯一可认领任务。
  - 选择理由：`S3-SERVER-INDEPENDENT-DEPLOY-PREP` 已完成，下一步必须在真实服务器环境和人工确认边界下验证独立 runtime / 独立目录 / 独立端口 / 独立 systemd service；不得再停留在本地部署材料准备，也不得绕过人工边界直接操作未知服务器。

## 剩余完整 pending queue（按执行顺序）
1. `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY`

## 下一步最小可执行动作
- 下一轮默认先认领 `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY`。
- 认领前必须重新读取默认最小事实源 + `apps/server/deploy/*` 部署材料。
- 真实部署前必须人工确认：SSH / 登录方式、sudo 边界、服务账号与 group、`/opt/probeflash` 创建权限、4100 端口可用性、是否允许安装独立 Node runtime、是否允许新增并启动 `probeflash.service`。
- 若人工边界未确认，不要实际部署；输出阻塞点和需要确认的问题。

## 下一任务选择流程
1. 默认只读取：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关代码或专项文档。
2. 只有在以下情况才条件读取：
   - `docs/planning/backlog.md`：需要完整剩余队列、详细任务拆解、或队列新增 / 移除 / 改名 / 重排时；
   - `docs/planning/decisions.md`：长期规则变化、阶段拍板变化或需要核对长期决策时；
   - `docs/product/产品介绍.md`：改产品定义 / 页面结构 / 领域语言时；
   - `README.md`：改对外展示 / 快速开始 / 演示口径时；
   - `docs/planning/s3-api-contract.md`：需要核对 HTTP / SQLite 主路径契约时；
   - `docs/planning/s3-sqlite-schema-draft.md`：需要核对 SQLite 读回预期时；
   - `docs/planning/s3-server-unreachable-strategy.md`：需要核对失败态验证口径时。
3. 只允许从 `backlog.md` / `.agent-state/handoff.json.pending_task_queue` 中认领 **第一个“依赖已满足且未完成”的任务**；禁止 AI 发散式自己找事做。
4. 当前任务未完成“最小验证 + planning sync + 单任务 commit”前，不得认领下一任务。
5. 下一轮是首次真实服务器部署验证；必须先获得人工确认边界，不得默认 SSH / sudo / 上传 / systemd 操作都已授权。
6. 服务器阶段只允许“独立运行时 + 独立端口 + 独立 systemd service”；不升级系统 Node，不抢占 80 端口，不优先做反向代理或 `.local` 美化。

## DoD / Verification Expectation
- 每个原子任务都必须写清：目标、前置依赖、直接输入文件、预期改动点、明确不做项、工程化验证、完成定义、完成后下一任务。
- 每轮默认执行：`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`cd apps/desktop && npm run verify:handoff`；命中 server scaffold / adapter / E2E 时按任务加严。
- 若本轮仅改 docs / planning / skills，允许说明性不跑某项**额外**验证，但必须明确写出原因，不得默认省略；本轮若能跑则优先跑。
- `docs/planning/current.md`、`.agent-state/handoff.json` 为 planning sync 必更文件；排队顺序或详细计划变化时同步 `docs/planning/backlog.md`；长期拍板变化时才同步 `docs/planning/decisions.md`。
- 任一验证未过、planning sync 未完成或未单独 commit，都不得进入下一任务选择。
