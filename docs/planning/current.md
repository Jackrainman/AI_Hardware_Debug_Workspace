# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口、唯一主线原子任务与下一任务选择规则。完整串行队列放在 `docs/planning/backlog.md` 与 `.agent-state/handoff.json.pending_task_queue`。

## 当前阶段
- 阶段：S3：存储迁移与服务器化。
- 当前模式：`server_storage_migration`。
- 阶段目标：把当前 `apps/desktop` 浏览器 SPA + `window.localStorage` 演示版，迁移为“战队局域网可访问 + 服务端长期存储”的版本。
- 当前技术路线：先补 `S3-ARCH-*` 三个最薄架构缝合点，再在 **本地 WSL** 跑通最小后端 + SQLite + HTTP adapter 闭环，最后做 **服务器独立部署验证**。
- 当前真实边界：
  - 服务器事实已确认：Ubuntu 20.04.6 LTS、局域网地址 `192.168.2.2`、80 端口已被现有 Web 服务占用、`systemd` 可用、`sqlite3` 未安装、系统 Node 仅 `v10.19.0`。
  - 本机 / WSL 事实已确认：Ubuntu 24.04 LTS，`sqlite3`、`python3`、`gcc/g++`、`make`、`pkg-config` 已可用。
  - 当前应用事实：async storage / repository port、closeout orchestrator、统一 storage error / connection state 与单一 storage feedback banner 已落地；但当前数据仍全部停留在浏览器 localStorage，尚无 WSL 本地 backend / SQLite / HTTP adapter。

## 当前已确认约束
- 当前必须先在 **WSL 本地** 跑通最小闭环，再走服务器 **独立部署** 验证；不要把“直接去服务器试出来”当主线。
- 服务器阶段必须使用 **独立运行时 + 独立端口 + 独立 systemd service**；不升级服务器全局 Node，不影响现有 Web 服务，不抢占 80 端口。
- 当前访问口径先按 `http://192.168.2.2:<port>/` 理解；`.local`、反向代理、美化入口都不是当前第一优先级。
- 不得把 localStorage silent fallback 冒充服务器成功；失败态必须可见、可调试、可区分。
- 保留 `projectId -> workspaceId` 的兼容口径，但本阶段不做全量字段重命名。
- 不做 AI / RAG / 权限 / Electron / fs / IPC / 多租户 / 多工作区复杂管理 / 大 UI 重构 / 离线队列 / 冲突合并 / 实时协作。

## 当前下一最小闭环
> 基于已收口的前端架构接缝，在 WSL 本地起最小 backend scaffold，提供 `/health`、SQLite 初始化 / 落盘与至少一条最小写入 + 读回 smoke；先把“前端可联调的本地目标”跑出来，再接 HTTP adapter。

### 为什么这是当前最小闭环
1. `S3-ARCH-*` 三个前端缝合点已经补齐，继续停留在 localStorage 只会重复验证浏览器演示链路，不能再逼近“局域网共享 + 服务端长期存储”。
2. HTTP adapter 依赖一个真实可访问的 backend / SQLite 目标；如果不先起 backend scaffold，前端再多改 error state 也无法完成联调闭环。
3. 当前 WSL 环境已具备 `sqlite3 / gcc / make / pkg-config / python3`，本地最小 backend 是已知依赖满足、且比服务器部署更低风险的下一步。

## 当前卡点（已按新路线改写）
- 前端架构接缝已补齐，当前主要阻塞已经从“前端如何接”切换为“本地后端目标尚不存在”。
- 当前主要工程阻塞按优先级排序：
  1. 仓库内还没有可启动的 backend scaffold，也没有 `/health` 与 SQLite 初始化入口。
  2. `docs/planning/s3-api-contract.md` 与 `docs/planning/s3-sqlite-schema-draft.md` 仍停留在实现输入，尚未转成实际 WSL 本地 runtime。
  3. 前端虽然已有统一错误出口，但没有真实 server connection 目标可切到 `online / degraded / unreachable` 的 backend 语义。

## 当前唯一主线原子任务（下一轮只认领这个）
- **S3-LOCAL-BACKEND-SCAFFOLD**
  - 目标：在 WSL 本地起最小后端，提供最小 API、SQLite 初始化 / 落盘能力和健康检查。
  - 直接输入边界：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、`docs/planning/s3-api-contract.md`、`docs/planning/s3-sqlite-schema-draft.md`、拟新增的 backend scaffold 目录、WSL 本地运行环境。
  - 不做项：不碰服务器、不升级服务器系统 Node、不抢占 80 端口、不做反向代理、不提前接前端 HTTP adapter、不扩成完整权限 / 多租户后端。
  - 工程化验证：`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`npm run verify:handoff`，以及任务相关验证（backend 启动 smoke、`curl /health`、SQLite 初始化成功、至少一条最小写入 + 读回 smoke）。
  - 完成定义：
    - WSL 本地 backend + SQLite 最小闭环可独立启动；
    - 前端 `S3-LOCAL-HTTP-STORAGE-ADAPTER` 已有可联调目标；
    - 规划同步已更新，且下一轮明确转入 `S3-LOCAL-HTTP-STORAGE-ADAPTER`。

## 当前前沿任务窗口（候选，不等于完整顺推队列）
- **S3-LOCAL-BACKEND-SCAFFOLD**
  - 选择理由：三处 `S3-ARCH-*` 缝合点已完成，当前第一个依赖满足且未完成的任务就是 WSL 本地 backend scaffold。
  - 预期输出：backend scaffold、`/health`、SQLite 初始化 / 落盘、最小写入 + 读回 smoke。
- **S3-LOCAL-HTTP-STORAGE-ADAPTER**
  - 依赖关系：`S3-LOCAL-BACKEND-SCAFFOLD` 完成后继续。
  - 选择理由：有了本地 backend 目标后，前端才能真正切换到 HTTP storage adapter，并验证不可达时不冒充 localStorage 成功。
  - 预期输出：HTTP storage adapter、本地联通 smoke、明确失败态。
- **S3-LOCAL-END-TO-END-VERIFY**
  - 依赖关系：`S3-LOCAL-HTTP-STORAGE-ADAPTER` 完成后继续。
  - 选择理由：adapter 接通后，需要验证 D1 主路径在 HTTP + SQLite + WSL backend 下跑通且失败态不冒充成功。
  - 预期输出：问题卡 / 追记 / closeout 的本地端到端验证与 SQLite 读回证明。

## 后续排队任务（按执行顺序，完整细节见 backlog / handoff）
1. `S3-LOCAL-BACKEND-SCAFFOLD`
2. `S3-LOCAL-HTTP-STORAGE-ADAPTER`
3. `S3-LOCAL-END-TO-END-VERIFY`
4. `S3-SERVER-INDEPENDENT-DEPLOY-PREP`
5. `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY`

## 下一步最小可执行动作
- 下一轮默认先认领 `S3-LOCAL-BACKEND-SCAFFOLD`。
- 只读默认最小事实源 + `docs/planning/s3-api-contract.md` / `docs/planning/s3-sqlite-schema-draft.md` / backend scaffold 相关目录；不默认扩读 README / 产品介绍 / decisions / 服务器部署文档。
- 动代码前先明确 backend 选型、目录、端口、SQLite 路径与 `/health` / 最小写入接口；不要把 HTTP adapter 或服务器部署提前做掉。

## 下一任务选择流程
1. 默认只读取：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关代码或专项文档。
2. 只有在以下情况才条件读取：
   - `docs/planning/backlog.md`：当前窗口变化、排队任务新增/移除/改名/重排、或需要核对完整串行队列时；
   - `docs/planning/decisions.md`：长期规则变化、阶段拍板变化或需要核对长期决策时；
   - `docs/product/产品介绍.md`：改产品定义 / 页面结构 / 领域语言时；
   - `README.md`：改对外展示 / 快速开始 / 演示口径时；
   - `docs/planning/s3-api-contract.md`、`docs/planning/s3-sqlite-schema-draft.md`：命中 backend / SQLite 任务时读取；
   - `docs/planning/s3-server-unreachable-strategy.md`：命中 HTTP adapter 失败态处理任务时读取。
3. 只允许从 `backlog.md` / `.agent-state/handoff.json.pending_task_queue` 中认领 **第一个“依赖已满足且未完成”的任务**；禁止 AI 发散式自己找事做。
4. 当前任务未完成“最小验证 + planning sync + 单任务 commit”前，不得认领下一任务。
5. 未完成 `S3-LOCAL-END-TO-END-VERIFY` 前，不得把服务器部署验证当当前唯一入口。
6. 服务器阶段只允许“独立运行时 + 独立端口 + 独立 systemd service”；不升级系统 Node，不抢占 80 端口，不优先做反向代理或 `.local` 美化。

## DoD / Verification Expectation
- 每个原子任务都必须写清：目标、直接输入边界、不做项、工程化验证、完成定义、后继依赖。
- 每轮默认执行：`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`cd apps/desktop && npm run verify:handoff`。
- 若本轮仅改 docs / planning / skills，允许说明性不跑某项**额外**验证，但必须明确写出原因，不得默认省略；本轮若能跑则优先跑。
- 若改动命中 `storage / repository / closeout / adapter / backend scaffold`，除默认验证外，必须补任务对应的代码级验证与契约级验证，并同时覆盖成功态与失败态。
- `docs/planning/current.md`、`.agent-state/handoff.json` 为 planning sync 必更文件；排队顺序变化时同步 `docs/planning/backlog.md`；长期拍板变化时同步 `docs/planning/decisions.md`。
- 任一验证未过、planning sync 未完成或未单独 commit，都不得进入下一任务选择。
