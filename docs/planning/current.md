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
  - 当前应用事实：最薄 async storage / repository port 与 closeout orchestrator 已落地，`App.tsx` 不再直接串联 `ArchiveDocument / ErrorEntry / IssueCard` 三类写入；但 UI 侧错误展示与连接状态仍分散在多个表单和读回面板中。

## 当前已确认约束
- 当前必须先在 **WSL 本地** 跑通最小闭环，再走服务器 **独立部署** 验证；不要把“直接去服务器试出来”当主线。
- 服务器阶段必须使用 **独立运行时 + 独立端口 + 独立 systemd service**；不升级服务器全局 Node，不影响现有 Web 服务，不抢占 80 端口。
- 当前访问口径先按 `http://192.168.2.2:<port>/` 理解；`.local`、反向代理、美化入口都不是当前第一优先级。
- 不得把 localStorage silent fallback 冒充服务器成功；失败态必须可见、可调试、可区分。
- 保留 `projectId -> workspaceId` 的兼容口径，但本阶段不做全量字段重命名。
- 不做 AI / RAG / 权限 / Electron / fs / IPC / 多租户 / 多工作区复杂管理 / 大 UI 重构 / 离线队列 / 冲突合并 / 实时协作。

## 当前下一最小闭环
> 基于已落地的 async storage / repository port + closeout orchestrator，把读写失败与连接状态收口成统一 storage error / connection state；先统一错误语义和 UI 出口，再接 WSL 本地 backend / HTTP adapter。

### 为什么这是当前最小闭环
1. closeout 多步写入已经从 UI 收口到 `orchestrateIssueCloseout()`，现在已有单一编排出口可挂统一错误模型。
2. 当前 `StorageReadError`、`StorageWriteError`、closeout orchestration failure 仍以分散字符串落到不同 UI 分支；如果不先统一，后续接 HTTP 时 `validation / write_failed / server_unreachable / timeout` 会继续四散在组件里。
3. unified storage error / connection state 完成后，`S3-LOCAL-BACKEND-SCAFFOLD` 与 `S3-LOCAL-HTTP-STORAGE-ADAPTER` 才能在同一失败语义上联调，而不是继续把 localStorage 时代的零散提示直接带到 HTTP 化阶段。

## 当前卡点（已按新路线改写）
- closeout 编排卡点已解除，但服务器化主线仍卡在“错误语义未统一、连接状态未统一、UI 还没有单一错误出口”。
- 当前主要工程阻塞按优先级排序：
  1. `App.tsx` 中 intake / investigation / closeout / 列表读回仍各自拼接错误文案，尚未汇总成统一 storage error / connection state。
  2. closeout orchestrator 已能返回 `step / reason / completedWrites`，但这一层结果还没有被统一映射为后续 HTTP 可复用的错误模型。
  3. 服务器不可达策略文档已存在，但尚未真正落到前端连接状态和错误出口上。

## 当前唯一主线原子任务（下一轮只认领这个）
- **S3-ARCH-UNIFIED-STORAGE-ERROR-STATE**
  - 目标：统一 storage result / error model、连接状态与 UI 错误出口。
  - 直接输入边界：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、`apps/desktop/src/App.tsx`、`apps/desktop/src/use-cases/closeout-orchestrator.ts`、`apps/desktop/src/storage/*`、`docs/planning/s3-server-unreachable-strategy.md`（命中时读取）、必要的新 error model / adapter 文件。
  - 不做项：不接 HTTP、不写后端、不做服务器部署、不引入 Redux / Zustand / React Query、不做离线队列 / 重试编排 / 冲突合并。
  - 工程化验证：`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`npm run verify:handoff`，以及任务相关验证（至少覆盖 validation / write_failed / server_unreachable 等错误映射，并证明 UI 错误出口不再分散）。
  - 完成定义：
    - 统一 error model 与 connection state 已落地；
    - UI 已有单一错误出口；
    - `S3-LOCAL-BACKEND-SCAFFOLD` 依赖解除；
    - 规划同步已更新，且下一轮明确转入 `S3-LOCAL-BACKEND-SCAFFOLD`。

## 当前前沿任务窗口（候选，不等于完整顺推队列）
- **S3-ARCH-UNIFIED-STORAGE-ERROR-STATE**
  - 选择理由：closeout 编排已收口后，统一错误与连接状态是当前第一个依赖满足且未完成的任务，也是 HTTP 化前必须补齐的最后一个架构接缝。
  - 预期输出：统一 storage error model、统一 connection state、统一 UI 错误出口。
- **S3-LOCAL-BACKEND-SCAFFOLD**
  - 依赖关系：`S3-ARCH-UNIFIED-STORAGE-ERROR-STATE` 完成后继续。
  - 选择理由：三处 `S3-ARCH-*` 缝合点补齐后，才能在 WSL 本地起最小后端与 SQLite。
  - 预期输出：WSL 本地 backend scaffold、最小 `/health`、SQLite 初始化 / 落盘能力。
- **S3-LOCAL-HTTP-STORAGE-ADAPTER**
  - 依赖关系：`S3-LOCAL-BACKEND-SCAFFOLD` 完成后继续。
  - 选择理由：backend scaffold 起好后，前端才能真正切到 HTTP adapter，并验证不可达时不冒充 localStorage 成功。
  - 预期输出：HTTP storage adapter、本地联通 smoke、明确失败态。

## 后续排队任务（按执行顺序，完整细节见 backlog / handoff）
1. `S3-ARCH-UNIFIED-STORAGE-ERROR-STATE`
2. `S3-LOCAL-BACKEND-SCAFFOLD`
3. `S3-LOCAL-HTTP-STORAGE-ADAPTER`
4. `S3-LOCAL-END-TO-END-VERIFY`
5. `S3-SERVER-INDEPENDENT-DEPLOY-PREP`
6. `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY`

## 下一步最小可执行动作
- 下一轮默认先认领 `S3-ARCH-UNIFIED-STORAGE-ERROR-STATE`。
- 只读默认最小事实源 + `App.tsx` / `closeout-orchestrator.ts` / `src/storage/*` / `docs/planning/s3-server-unreachable-strategy.md`；不默认扩读 README / 产品介绍 / decisions。
- 动代码前先明确统一 error model 的最薄边界：哪些错误码要保留、connection state 放哪一层、UI 单一错误出口如何挂接；不要把 backend scaffold 或 HTTP adapter 提前做掉。

## 下一任务选择流程
1. 默认只读取：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关代码或专项文档。
2. 只有在以下情况才条件读取：
   - `docs/planning/backlog.md`：当前窗口变化、排队任务新增/移除/改名/重排、或需要核对完整串行队列时；
   - `docs/planning/decisions.md`：长期规则变化、阶段拍板变化或需要核对长期决策时；
   - `docs/product/产品介绍.md`：改产品定义 / 页面结构 / 领域语言时；
   - `README.md`：改对外展示 / 快速开始 / 演示口径时；
   - `docs/planning/s3-api-contract.md`、`docs/planning/s3-sqlite-schema-draft.md`：仅在命中 backend / SQLite 任务时读取；
   - `docs/planning/s3-server-unreachable-strategy.md`：命中统一错误状态或 HTTP adapter 失败态处理任务时读取。
3. 只允许从 `backlog.md` / `.agent-state/handoff.json.pending_task_queue` 中认领 **第一个“依赖已满足且未完成”的任务**；禁止 AI 发散式自己找事做。
4. 当前任务未完成“最小验证 + planning sync + 单任务 commit”前，不得认领下一任务。
5. 未完成 `S3-ARCH-*` 三个缝合任务前，不得把 HTTP API 直接塞进现有组件；未完成 `S3-LOCAL-END-TO-END-VERIFY` 前，不得把服务器部署验证当当前唯一入口。
6. 服务器阶段只允许“独立运行时 + 独立端口 + 独立 systemd service”；不升级系统 Node，不抢占 80 端口，不优先做反向代理或 `.local` 美化。

## DoD / Verification Expectation
- 每个原子任务都必须写清：目标、直接输入边界、不做项、工程化验证、完成定义、后继依赖。
- 每轮默认执行：`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`cd apps/desktop && npm run verify:handoff`。
- 若本轮仅改 docs / planning / skills，允许说明性不跑某项**额外**验证，但必须明确写出原因，不得默认省略；本轮若能跑则优先跑。
- 若改动命中 `storage / repository / closeout / adapter / backend scaffold`，除默认验证外，必须补任务对应的代码级验证与契约级验证，并同时覆盖成功态与失败态。
- `docs/planning/current.md`、`.agent-state/handoff.json` 为 planning sync 必更文件；排队顺序变化时同步 `docs/planning/backlog.md`；长期拍板变化时同步 `docs/planning/decisions.md`。
- 任一验证未过、planning sync 未完成或未单独 commit，都不得进入下一任务选择。
