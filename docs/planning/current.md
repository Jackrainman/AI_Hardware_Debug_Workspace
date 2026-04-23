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
  - 当前应用事实：最薄 async storage / repository port 已落地，`storageRepository` 已成为当前 localStorage 的业务级入口；但 `App.tsx` 仍承担 UI 渲染、页面状态、业务编排、存储协调和 closeout 多步写入。

## 当前已确认约束
- 服务器未知已解除；当前卡点不再是“服务器信息不明”，而是“HTTP / SQLite / 部署之前缺少最薄可控接缝”。
- 当前必须先在 **WSL 本地** 跑通最小闭环，再走服务器 **独立部署** 验证；不要把“直接去服务器试出来”当主线。
- 服务器阶段必须使用 **独立运行时 + 独立端口 + 独立 systemd service**；不升级服务器全局 Node，不影响现有 Web 服务，不抢占 80 端口。
- 当前访问口径先按 `http://192.168.2.2:<port>/` 理解；`.local`、反向代理、美化入口都不是当前第一优先级。
- 不得把 localStorage silent fallback 冒充服务器成功；失败态必须可见、可调试、可区分。
- 保留 `projectId -> workspaceId` 的兼容口径，但本阶段不做全量字段重命名。
- 不做 AI / RAG / 权限 / Electron / fs / IPC / 多租户 / 多工作区复杂管理 / 大 UI 重构 / 离线队列 / 冲突合并 / 实时协作。

## 当前下一最小闭环
> 基于已落地的 async storage / repository port，把 closeout 多步写入从 UI 中抽到最薄 orchestrator；先收口编排链路，再做统一 storage error / connection state。

### 为什么这是当前最小闭环
1. async storage / repository 接缝已经落地，当前主流程写操作不再假定 `void` 成功，closeout 已具备继续抽离的稳定边界。
2. `App.tsx` 里最危险的 HTTP 化链路仍是 closeout 三次写入串联；如果不先抽 orchestrator，后续部分成功 / 状态不一致仍会留在 UI。
3. closeout orchestrator 完成后，`S3-ARCH-UNIFIED-STORAGE-ERROR-STATE` 才能在单一编排出口上统一错误与连接状态，而不是继续分散到组件里。

## 当前卡点（已按新路线改写）
- 服务器未知已解除，但服务器部署必须走独立运行时 / 独立端口 / 独立 `systemd service`，且 **本轮先以 WSL 本地跑通为先**。
- 当前主要工程阻塞按优先级排序：
  1. `App.tsx` 仍同时承担 UI、业务编排和多实体写入协调，closeout 仍在组件中直接串联三类写入。
  2. async storage / repository port 虽已落地，但 closeout 尚未形成单一 orchestration result；一旦后续接 HTTP，最容易出现部分成功与状态不一致。
  3. 读写 failure 已开始结构化，但 UI 侧尚未统一成单一 storage error / connection state 出口。

## 当前唯一主线原子任务（下一轮只认领这个）
- **S3-ARCH-CLOSEOUT-ORCHESTRATOR**
  - 目标：把 closeout 多步写入从 UI 中抽到 use-case / service 层，UI 不再直接协调 `ArchiveDocument / ErrorEntry / IssueCard` 三类写入。
  - 直接输入边界：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、`apps/desktop/src/App.tsx`、closeout domain 代码、`apps/desktop/src/storage/*`、必要的 use-case / service 文件。
  - 不做项：不做 UI 重构、不接 HTTP、不写后端、不改服务器部署、不引入 Redux / Zustand / React Query、不提前做 unified error / connection state 全套体系。
  - 工程化验证：`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`npm run verify:handoff`，以及任务相关的代码级验证（至少覆盖 closeout happy path 与部分失败路径，证明 UI 不再直接串联多实体写入）。
  - 完成定义：
    - closeout orchestration 已从 UI 抽离；
    - 返回统一 orchestration result；
    - 后续 `S3-ARCH-UNIFIED-STORAGE-ERROR-STATE` 依赖解除；
    - 规划同步已更新，且下一轮明确转入 `S3-ARCH-UNIFIED-STORAGE-ERROR-STATE`。

## 当前前沿任务窗口（候选，不等于完整顺推队列）
- **S3-ARCH-CLOSEOUT-ORCHESTRATOR**
  - 选择理由：async storage / repository port 已落地后，closeout 多步写入是当前最危险的 UI 编排链路，依赖已满足且收益最高。
  - 预期输出：closeout use-case / service、统一 orchestration result、UI 不再直接协调 archive / error-entry / issue 写入。
- **S3-ARCH-UNIFIED-STORAGE-ERROR-STATE**
  - 依赖关系：`S3-ARCH-CLOSEOUT-ORCHESTRATOR` 完成后继续。
  - 选择理由：closeout 编排收口后，才能把 validation / write_failed / server_unreachable 等错误映射成单一出口。
  - 预期输出：统一 storage error model、统一连接状态表达、统一 UI 错误出口。
- **S3-LOCAL-BACKEND-SCAFFOLD**
  - 依赖关系：`S3-ARCH-UNIFIED-STORAGE-ERROR-STATE` 完成后继续。
  - 选择理由：三处 S3-ARCH 缝合点补齐后，才能在 WSL 本地接最小后端与 SQLite 闭环。
  - 预期输出：WSL 本地 backend scaffold、最小 `/health`、SQLite 初始化 / 落盘能力。

## 后续排队任务（按执行顺序，完整细节见 backlog / handoff）
1. `S3-ARCH-CLOSEOUT-ORCHESTRATOR`
2. `S3-ARCH-UNIFIED-STORAGE-ERROR-STATE`
3. `S3-LOCAL-BACKEND-SCAFFOLD`
4. `S3-LOCAL-HTTP-STORAGE-ADAPTER`
5. `S3-LOCAL-END-TO-END-VERIFY`
6. `S3-SERVER-INDEPENDENT-DEPLOY-PREP`
7. `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY`

## 下一步最小可执行动作
- 下一轮默认先认领 `S3-ARCH-CLOSEOUT-ORCHESTRATOR`。
- 只读默认最小事实源 + `App.tsx` / closeout domain / `src/storage/*` 等直接相关代码；不默认扩读 README / 产品介绍 / decisions / S3 专项文档。
- 动代码前先明确 orchestrator 输入输出、部分失败表达与 UI 收口方式，再落地最小改动；不要把 unified error state 或 HTTP adapter 提前做掉。

## 下一任务选择流程
1. 默认只读取：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关代码或专项文档。
2. 只有在以下情况才条件读取：
   - `docs/planning/backlog.md`：当前窗口变化、排队任务新增/移除/改名/重排、或需要核对完整串行队列时；
   - `docs/planning/decisions.md`：长期规则变化、阶段拍板变化或需要核对长期决策时；
   - `docs/product/产品介绍.md`：改产品定义 / 页面结构 / 领域语言时；
   - `README.md`：改对外展示 / 快速开始 / 演示口径时；
   - `docs/planning/s3-api-contract.md`、`docs/planning/s3-sqlite-schema-draft.md`、`docs/planning/s3-server-unreachable-strategy.md`：仅在命中 API / SQLite / 服务器不可达实现任务时读取。
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
