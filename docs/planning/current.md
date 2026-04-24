# 当前执行面板（Current）

> 本文件只维护当前阶段目标、前沿任务窗口、唯一主线原子任务与下一任务选择规则。完整剩余串行队列与详细执行拆解见 `docs/planning/backlog.md` 与 `.agent-state/handoff.json.pending_task_queue`。

## 当前阶段
- 阶段：S3：存储迁移与服务器化。
- 当前模式：`server_storage_migration`。
- 阶段目标：把当前 `apps/desktop` 浏览器 SPA + `window.localStorage` 演示版，迁移为“战队局域网可访问 + 服务端长期存储”的版本。
- 当前技术路线：先完成 `S3-ARCH-*` 三个最薄架构缝合点，再在 **本地 WSL** 跑通最小后端 + SQLite + HTTP adapter 闭环，最后做 **服务器独立部署验证**。

## 本轮按代码 / 脚本复核后的事实
- `apps/desktop/src/storage/storage-repository.ts` 仍把 `storageRepository` 指向 `localStorageStorageRepository`；前端主流程还没有 HTTP adapter。
- `apps/desktop/src/storage/storage-feedback.ts` 已有统一 storage feedback / connection state 基础形态，包含 `server_unreachable`、`timeout`、`conflict`、`not_found` 等错误口径。
- `apps/desktop/src/use-cases/closeout-orchestrator.ts` 已落地，`App.tsx` 已通过 `orchestrateIssueCloseout` 走 closeout orchestration。
- `apps/server/src/server.mjs` + `apps/server/src/database.mjs` 已提供本地 backend scaffold：`/api/health`、workspace seed、SQLite 初始化、issues / records / archives / error-entries 最小 API。
- `apps/desktop/vite.config.ts` 当前只有基础 dev server 配置，尚未提供 `/api` proxy；`apps/desktop/src` 下也未发现 `fetch()` / `HttpStorageRepository` 路径。
- 服务器 OS / 端口 / systemd / 系统 Node 等环境事实，本轮未通过仓库命令复核，仍沿用 `current.md` / `handoff.json` 既有记录，视为“前序已确认、当前未复验”。

## 当前已确认约束
- 当前必须先在 **WSL 本地** 跑通最小闭环，再走服务器 **独立部署** 验证；不要把“直接去服务器试出来”当主线。
- 服务器阶段必须使用 **独立运行时 + 独立端口 + 独立 systemd service**；不升级服务器全局 Node，不影响现有 Web 服务，不抢占 80 端口。
- 当前访问口径分两层：
  - 本地联调：前端请求相对路径 `/api`，下一任务通过 Vite proxy 转发到 `http://127.0.0.1:4100`。
  - 独立部署：继续按 `http://192.168.2.2:<port>/` 理解；`.local`、反向代理、美化入口都不是当前第一优先级。
- 不得把 localStorage silent fallback 冒充服务器成功；失败态必须可见、可调试、可区分。
- 保留 `projectId -> workspaceId` 的兼容口径，但本阶段不做全量字段重命名。
- 不做 AI / RAG / 权限 / Electron / fs / IPC / 多租户 / 多工作区复杂管理 / 大 UI 重构 / 离线队列 / 冲突合并 / 实时协作。

## 当前唯一主线原子任务（下一轮只认领这个）
- **S3-LOCAL-HTTP-STORAGE-ADAPTER**
  - 目标：让前端主流程真实走 HTTP + 本地 WSL backend，而不是继续停留在 localStorage；同时把失败态桥接到现有统一 storage feedback，严禁 silent fallback。
  - 前置依赖：`S3-LOCAL-BACKEND-SCAFFOLD` 已完成；`storage-feedback.ts` 与 `closeout-orchestrator.ts` 已可承接 HTTP 失败态与 closeout 主流程。
  - 直接输入文件：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、`docs/planning/s3-api-contract.md`、`docs/planning/s3-server-unreachable-strategy.md`、`apps/desktop/src/storage/storage-repository.ts`、`apps/desktop/src/storage/storage-feedback.ts`、`apps/desktop/src/use-cases/closeout-orchestrator.ts`、`apps/desktop/src/App.tsx`、`apps/desktop/vite.config.ts`、`apps/server/src/server.mjs`、`apps/server/src/database.mjs`。
  - 执行拆解（认领后按此顺序收敛）：
    1. 明确 HTTP / network / timeout / 5xx / 4xx 如何桥接到现有 `StorageFeedbackError` 与 `StorageConnectionState`。
    2. 新增最薄 `HttpStorageRepository`（必要时连同最薄 HTTP client），按现有 `StorageRepository` 接口覆盖 issue / record / archive / error-entry 读写。
    3. 开发连接方案固定为 **Vite proxy**：前端 base URL 用相对路径 `/api`，`vite.config.ts` 代理到 `http://127.0.0.1:4100`；当前不优先改 `apps/server` CORS，理由是后端现状无 CORS header，proxy 改动更小、调试更直接。
    4. 复用 `DEFAULT_WORKSPACE_ID = "workspace-26-r1"`；path 中 `workspaceId` 与 payload 中 `projectId` 保持兼容一致，不做 schema 重命名。
    5. 把 `storageRepository` 的单一出口切到 HTTP implementation；若保留 localStorage 演示路径，必须是显式开关，不允许 health / 写入失败后自动 fallback 冒充成功。
    6. 仅做 App 最小适配：接入连接检查 / 错误反馈所需最小 UI 状态，不重构页面结构。
    7. 若现有验证矩阵不能覆盖 adapter 成功态与失败态，补一条任务级 verify 脚本；不要引入新测试框架。
  - 预期改动点：`apps/desktop/src/storage/storage-repository.ts`、`apps/desktop/src/storage/storage-feedback.ts`、`apps/desktop/src/App.tsx`、`apps/desktop/vite.config.ts`、必要的新 `apps/desktop/src/storage/http-*.ts` 文件、必要的新 `apps/desktop/scripts/verify-s3-local-http-storage-adapter.mts`。
  - 明确不做项：不做服务器部署、不做离线队列、不做实时协作、不做 `.local` / 反向代理、不重构 `App.tsx` 大结构、不保留 silent fallback 作为默认成功路径。
  - 工程化验证：`cd apps/server && npm run verify:s3-local-backend-scaffold`、`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`cd apps/desktop && npm run verify:handoff`，以及任务级验证（HTTP happy path、服务关闭 / 端口错误 / 超时 / 不可达失败态、不得伪装为 localStorage 成功）。
  - 完成定义：
    - HTTP adapter 已成为前端主流程的真实存储入口；
    - 成功态与失败态都能稳定表达，并桥接到统一 storage feedback；
    - 开发期 base URL / proxy 方案已经落地且可复现；
    - `S3-LOCAL-END-TO-END-VERIFY` 的前置依赖解除。
  - 完成后下一任务：`S3-LOCAL-END-TO-END-VERIFY`。

## 当前前沿任务窗口（候选，不等于完整顺推队列）
- **S3-LOCAL-HTTP-STORAGE-ADAPTER**
  - 状态：当前唯一可认领任务。
  - 选择理由：这是第一个“依赖已满足且未完成”的任务，也是把后端 scaffold 变成真实主路径的唯一下一步。
- **S3-LOCAL-END-TO-END-VERIFY**
  - 状态：依赖 `S3-LOCAL-HTTP-STORAGE-ADAPTER`。
  - 选择理由：adapter 接通后，必须证明问题卡 / 追记 / closeout 的本地主路径确实落到 HTTP + SQLite。
- **S3-SERVER-INDEPENDENT-DEPLOY-PREP**
  - 状态：依赖 `S3-LOCAL-END-TO-END-VERIFY`。
  - 选择理由：只有本地最小闭环通过后，服务器阶段才会收敛成“独立部署方案准备”问题。

## 剩余完整 pending queue（按执行顺序）
1. `S3-LOCAL-HTTP-STORAGE-ADAPTER`
2. `S3-LOCAL-END-TO-END-VERIFY`
3. `S3-SERVER-INDEPENDENT-DEPLOY-PREP`
4. `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY`

## 下一步最小可执行动作
- 下一轮默认先认领 `S3-LOCAL-HTTP-STORAGE-ADAPTER`。
- 只读默认最小事实源 + `docs/planning/s3-api-contract.md` / `docs/planning/s3-server-unreachable-strategy.md` / `apps/server/src/*` / `apps/desktop/src/storage/*` / `App.tsx` / `vite.config.ts`；不默认扩读 README / 产品介绍 / decisions。
- 动代码前先固定三件事：
  1. HTTP error -> `StorageFeedbackError` bridge；
  2. `/api` -> `http://127.0.0.1:4100` 的 Vite proxy 方案；
  3. 禁止 silent fallback 的切换点。

## 下一任务选择流程
1. 默认只读取：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关代码或专项文档。
2. 只有在以下情况才条件读取：
   - `docs/planning/backlog.md`：需要完整剩余队列、详细任务拆解、或队列新增 / 移除 / 改名 / 重排时；
   - `docs/planning/decisions.md`：长期规则变化、阶段拍板变化或需要核对长期决策时；
   - `docs/product/产品介绍.md`：改产品定义 / 页面结构 / 领域语言时；
   - `README.md`：改对外展示 / 快速开始 / 演示口径时；
   - `docs/planning/s3-api-contract.md`：命中 HTTP adapter / backend 任务时；
   - `docs/planning/s3-sqlite-schema-draft.md`：命中 SQLite backend 任务时；
   - `docs/planning/s3-server-unreachable-strategy.md`：命中 HTTP adapter 失败态处理任务时。
3. 只允许从 `backlog.md` / `.agent-state/handoff.json.pending_task_queue` 中认领 **第一个“依赖已满足且未完成”的任务**；禁止 AI 发散式自己找事做。
4. 当前任务未完成“最小验证 + planning sync + 单任务 commit”前，不得认领下一任务。
5. 未完成 `S3-LOCAL-END-TO-END-VERIFY` 前，不得把服务器部署验证当当前唯一入口。
6. 服务器阶段只允许“独立运行时 + 独立端口 + 独立 systemd service”；不升级系统 Node，不抢占 80 端口，不优先做反向代理或 `.local` 美化。

## DoD / Verification Expectation
- 每个原子任务都必须写清：目标、前置依赖、直接输入文件、预期改动点、明确不做项、工程化验证、完成定义、完成后下一任务。
- 每轮默认执行：`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`cd apps/desktop && npm run verify:handoff`；命中 server scaffold / adapter / E2E 时按任务加严。
- 若本轮仅改 docs / planning / skills，允许说明性不跑某项**额外**验证，但必须明确写出原因，不得默认省略；本轮若能跑则优先跑。
- `docs/planning/current.md`、`.agent-state/handoff.json` 为 planning sync 必更文件；排队顺序或详细计划变化时同步 `docs/planning/backlog.md`；长期拍板变化时才同步 `docs/planning/decisions.md`。
- 任一验证未过、planning sync 未完成或未单独 commit，都不得进入下一任务选择。
