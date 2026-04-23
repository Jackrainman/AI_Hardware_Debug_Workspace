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
  - 当前应用事实：`App.tsx` 仍承担 UI 渲染、页面状态、业务编排、存储协调和 closeout 多步写入；现有 store 写操作成功假设偏强，closeout 未来 HTTP 化后存在部分成功 / 状态不一致风险。

## 当前已确认约束
- 服务器未知已解除；当前卡点不再是“服务器信息不明”，而是“HTTP / SQLite / 部署之前缺少最薄可控接缝”。
- 当前必须先在 **WSL 本地** 跑通最小闭环，再走服务器 **独立部署** 验证；不要把“直接去服务器试出来”当主线。
- 服务器阶段必须使用 **独立运行时 + 独立端口 + 独立 systemd service**；不升级服务器全局 Node，不影响现有 Web 服务，不抢占 80 端口。
- 当前访问口径先按 `http://192.168.2.2:<port>/` 理解；`.local`、反向代理、美化入口都不是当前第一优先级。
- 不得把 localStorage silent fallback 冒充服务器成功；失败态必须可见、可调试、可区分。
- 保留 `projectId -> workspaceId` 的兼容口径，但本阶段不做全量字段重命名。
- 不做 AI / RAG / 权限 / Electron / fs / IPC / 多租户 / 多工作区复杂管理 / 大 UI 重构 / 离线队列 / 冲突合并 / 实时协作。

## 当前下一最小闭环
> 先补最薄异步 storage / repository 边界，并让 localStorage 先通过该边界跑通；为后续本地 WSL 最小后端 + HTTP adapter + 服务器独立部署预留可控接缝。

### 为什么这是当前最小闭环
1. 直接接 HTTP 会把 `App.tsx` 当前的同步写入假设和 closeout 多步写入风险原样放大到网络层。
2. 先把 localStorage 放到异步业务边界后，后续 HTTP adapter 才能在不重做 UI 的前提下替换。
3. 这一步完成后，`S3-ARCH-CLOSEOUT-ORCHESTRATOR` 与 `S3-ARCH-UNIFIED-STORAGE-ERROR-STATE` 才有稳定接缝可用。

## 当前卡点（已按新路线改写）
- 服务器未知已解除，但服务器部署必须走独立运行时 / 独立端口 / 独立 `systemd service`，且 **本轮先以 WSL 本地跑通为先**。
- 当前主要工程阻塞按优先级排序：
  1. `App.tsx` 同时承担 UI、业务编排和多实体写入协调，HTTP 化后最容易出现部分成功与状态不一致。
  2. 现有 `src/storage/*` 写操作大多返回 `void`，缺少统一 result / error model，不利于连接态和失败态表达。
  3. closeout 仍由 UI 直接串联 `ArchiveDocument / ErrorEntry / IssueCard` 多步写入，后续最容易变成难调试的网络边界问题。

## 当前唯一主线原子任务（下一轮只认领这个）
- **S3-ARCH-ASYNC-STORAGE-PORT**
  - 目标：定义最薄异步业务级 storage / repository interface，让 localStorage 先通过该接口跑通，并把写操作从 `void` 收敛为结构化 result。
  - 直接输入边界：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、`apps/desktop/src/App.tsx`、`apps/desktop/src/storage/*`、必要的 domain schema / intake / closeout 代码。
  - 不做项：不接 HTTP、不写后端、不改服务器部署、不引入 Redux / Zustand / React Query、不大改 UI、不做全量 `projectId` 重命名。
  - 工程化验证：`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`npm run verify:handoff`，以及任务相关的代码级验证（至少证明 localStorage 读写已经走异步 port，且写结果不再是裸 `void`）。
  - 完成定义：
    - 已落地最薄 async storage / repository port；
    - localStorage adapter 已适配该 port；
    - 当前主流程涉及的写操作至少能返回统一结构化 result；
    - 规划同步已更新，且下一轮明确转入 `S3-ARCH-CLOSEOUT-ORCHESTRATOR`。

## 当前前沿任务窗口（候选，不等于完整顺推队列）
- **S3-ARCH-ASYNC-STORAGE-PORT**
  - 选择理由：它是后续 HTTP / SQLite / 部署前的最小接缝，依赖已满足，且当前收益最高。
  - 预期输出：异步 storage / repository port、localStorage adapter 适配、结构化写结果。
- **S3-ARCH-CLOSEOUT-ORCHESTRATOR**
  - 依赖关系：`S3-ARCH-ASYNC-STORAGE-PORT` 完成后继续。
  - 选择理由：closeout 多步写入是最危险的 HTTP 化链路，必须先从 UI 抽到 use-case / service。
  - 预期输出：UI 不再直接协调 archive / error-entry / issue 三类写入。
- **S3-ARCH-UNIFIED-STORAGE-ERROR-STATE**
  - 依赖关系：`S3-ARCH-CLOSEOUT-ORCHESTRATOR` 完成后继续。
  - 选择理由：HTTP 化前先统一 storage result / error / connection state，后续 adapter 与部署失败态才有单一出口。
  - 预期输出：统一 storage error model、统一连接状态表达、统一 UI 错误出口。

## 后续排队任务（按执行顺序，完整细节见 backlog / handoff）
1. `S3-ARCH-ASYNC-STORAGE-PORT`
2. `S3-ARCH-CLOSEOUT-ORCHESTRATOR`
3. `S3-ARCH-UNIFIED-STORAGE-ERROR-STATE`
4. `S3-LOCAL-BACKEND-SCAFFOLD`
5. `S3-LOCAL-HTTP-STORAGE-ADAPTER`
6. `S3-LOCAL-END-TO-END-VERIFY`
7. `S3-SERVER-INDEPENDENT-DEPLOY-PREP`
8. `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY`

## 下一步最小可执行动作
- 下一轮默认先认领 `S3-ARCH-ASYNC-STORAGE-PORT`。
- 只读默认最小事实源 + `App.tsx` / `src/storage/*` 等直接相关代码；不默认扩读 README / 产品介绍 / backlog / decisions / S3 专项文档。
- 动代码前先明确 async port 的输入输出、result / error shape、localStorage adapter 承接方式，再落地最小改动。

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
