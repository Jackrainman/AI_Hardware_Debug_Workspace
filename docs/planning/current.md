# 当前执行面板（Current）

> 本文件只维护当前阶段目标、前沿任务窗口、唯一主线原子任务与下一任务选择规则。完整剩余串行队列与详细执行拆解见 `docs/planning/backlog.md` 与 `.agent-state/handoff.json.pending_task_queue`。

## 当前阶段
- 阶段：S3：存储迁移与服务器化。
- 当前模式：`server_storage_migration`。
- 阶段目标：把当前 `apps/desktop` 浏览器 SPA + `window.localStorage` 演示版，迁移为“战队局域网可访问 + 服务端长期存储”的版本。
- 当前技术路线：先完成 `S3-ARCH-*` 三个最薄架构缝合点，再在 **本地 WSL** 跑通最小后端 + SQLite + HTTP adapter 闭环，最后做 **服务器独立部署验证**。

## 本轮按代码 / 脚本复核后的事实
- `apps/desktop/src/storage/storage-repository.ts` 已在浏览器 runtime 切到 `httpStorageRepository`；Node / 无 `window` 的 verify 环境继续走 `localStorageStorageRepository`，用于兼容既有 verify 脚本。
- `apps/desktop/src/storage/http-storage-client.ts` + `http-storage-repository.ts` 已落地：前端 base URL 使用相对路径 `/api`，并把 `server_unreachable` / `timeout` / `4xx` / `5xx` / invalid envelope 桥接到现有统一 storage error / connection state。
- `apps/desktop/src/storage/storage-result.ts`、`storage-feedback.ts` 与 `apps/desktop/src/use-cases/closeout-orchestrator.ts` 已补齐 HTTP 失败态口径，`closeout` 失败不会再被伪装成成功。
- `apps/desktop/src/App.tsx` 已在 HTTP runtime 启动时执行 `/api/health` 检查，并通过统一 banner 暴露连接状态；`apps/desktop/vite.config.ts` 已固定 `/api -> http://127.0.0.1:4100` proxy。
- `apps/server/src/server.mjs` 已把 `listen()` 启动失败改成显式抛出，避免 server-backed verify 在端口 / 权限异常时静默挂住。
- 已重新跑通并确认：`git diff --check`、`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:handoff`、`cd apps/server && npm run verify:s3-local-backend-scaffold`、`cd apps/desktop && npm run verify:s3-local-http-storage-adapter`、`npm run verify:all`。
- 当前 Codex 沙箱内对 `127.0.0.1` 监听仍会触发 `listen EPERM`；server-backed verify 需要无沙箱执行。但在无沙箱重跑后，上述 backend / adapter 验证均已通过。

## 当前已确认约束
- 当前必须先在 **WSL 本地** 跑通最小闭环，再走服务器 **独立部署** 验证；不要把“直接去服务器试出来”当主线。
- 服务器阶段必须使用 **独立运行时 + 独立端口 + 独立 systemd service**；不升级服务器全局 Node，不影响现有 Web 服务，不抢占 80 端口。
- 当前访问口径分两层：
  - 本地联调：前端请求相对路径 `/api`，通过 Vite proxy 转发到 `http://127.0.0.1:4100`。
  - 独立部署：继续按 `http://192.168.2.2:<port>/` 理解；`.local`、反向代理、美化入口都不是当前第一优先级。
- 不得把 localStorage silent fallback 冒充服务器成功；失败态必须可见、可调试、可区分。
- 保留 `projectId -> workspaceId` 的兼容口径，但本阶段不做全量字段重命名。
- 不做 AI / RAG / 权限 / Electron / fs / IPC / 多租户 / 多工作区复杂管理 / 大 UI 重构 / 离线队列 / 冲突合并 / 实时协作。

## 当前唯一主线原子任务（下一轮只认领这个）
- **S3-LOCAL-END-TO-END-VERIFY**
  - 目标：验证 D1 主路径在 HTTP + SQLite + 本地 WSL 后端下真实跑通，并证明失败态不会伪装成功。
  - 前置依赖：`S3-LOCAL-HTTP-STORAGE-ADAPTER` 已完成；前端浏览器 runtime 已切到 HTTP adapter，任务级 adapter verify 与全量 verify 已通过。
  - 直接输入文件：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、`apps/desktop/src/App.tsx`、`apps/desktop/src/storage/http-*.ts`、`apps/desktop/src/storage/storage-repository.ts`、`apps/desktop/src/use-cases/closeout-orchestrator.ts`、`apps/server/src/server.mjs`、`apps/server/src/database.mjs`、`apps/server/scripts/verify-s3-local-backend-scaffold.mjs`、当前已有 verify scripts 与可能新增的 end-to-end verify 脚本。
  - 执行拆解（认领后按此顺序收敛）：
    1. 固定主路径验证范围：创建问题卡 -> 加载 / 列表 -> 追加 InvestigationRecord -> closeout -> 读取 archive / error-entry / archived issue。
    2. 明确自动化与人工 smoke 边界：优先补最薄 verify 脚本，不引入新框架。
    3. 若当前验证矩阵仍缺覆盖，补一条 `verify-s3-local-end-to-end` 脚本，用于拉起本地 backend、驱动当前 HTTP storage path，并读回 SQLite。
    4. 验证成功态：问题卡、记录、archive、error-entry、issue archived 状态都能通过 HTTP 写入并从 SQLite 读回。
    5. 验证失败态：服务关闭、错误端口、超时、`SERVICE_UNAVAILABLE` / 500 / 409 等情况下，UI 与脚本都不能把结果当成功。
    6. 沉淀执行证据与 planning sync，确保服务器阶段只剩独立部署问题。
  - 预期改动点：优先是 `apps/desktop/scripts/verify-*.mts` / `apps/server/scripts/verify-*.mjs`；视验证需要做极小量 smoke helper / fixture 调整；如非必要，不继续改业务代码。
  - 明确不做项：不做服务器部署、不升级系统 Node、不做入口美化 / 反向代理、不把验证任务扩成新的功能开发。
  - 工程化验证：`cd apps/server && npm run verify:s3-local-backend-scaffold`、`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`cd apps/desktop && npm run verify:handoff`，以及任务级验证（前端 -> HTTP -> SQLite 主路径、服务停机 / 错端口 / timeout / 写入失败、浏览器人工 smoke 与自动化边界说明）。
  - 完成定义：
    - 本地 WSL 最小闭环已经通过主路径验证；
    - SQLite 中可读回问题卡、记录、归档摘要、错误表条目与 archived 状态；
    - 失败态不会冒充成功；
    - `S3-SERVER-INDEPENDENT-DEPLOY-PREP` 依赖解除。
  - 完成后下一任务：`S3-SERVER-INDEPENDENT-DEPLOY-PREP`。

## 当前前沿任务窗口（候选，不等于完整顺推队列）
- **S3-LOCAL-END-TO-END-VERIFY**
  - 状态：当前唯一可认领任务。
  - 选择理由：HTTP adapter 已接通，当前第一优先级是证明主路径 issue -> record -> closeout 真实落到 HTTP + SQLite，而不是只停在 repository harness。
- **S3-SERVER-INDEPENDENT-DEPLOY-PREP**
  - 状态：依赖 `S3-LOCAL-END-TO-END-VERIFY`。
  - 选择理由：只有本地最小闭环通过后，服务器阶段才会收敛成“独立部署方案准备”问题。
- **S3-SERVER-INDEPENDENT-DEPLOY-VERIFY**
  - 状态：依赖 `S3-SERVER-INDEPENDENT-DEPLOY-PREP`。
  - 选择理由：部署验证只能在独立 runtime / 目录 / 端口 / service 方案明确后进行。

## 剩余完整 pending queue（按执行顺序）
1. `S3-LOCAL-END-TO-END-VERIFY`
2. `S3-SERVER-INDEPENDENT-DEPLOY-PREP`
3. `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY`

## 下一步最小可执行动作
- 下一轮默认先认领 `S3-LOCAL-END-TO-END-VERIFY`。
- 只读默认最小事实源 + 当前 HTTP adapter / server / verify 直接相关文件；不默认扩读 README / 产品介绍 / decisions。
- 动代码前先固定三件事：
  1. 自动化 verify 覆盖到 issue -> record -> closeout -> SQLite 读回；
  2. 浏览器人工 smoke 与自动化边界说明清楚；
  3. 失败态验证不能退化成“仓库层失败已测过，所以 UI 层默认没问题”。

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
5. 未完成 `S3-LOCAL-END-TO-END-VERIFY` 前，不得把服务器部署验证当当前唯一入口。
6. 服务器阶段只允许“独立运行时 + 独立端口 + 独立 systemd service”；不升级系统 Node，不抢占 80 端口，不优先做反向代理或 `.local` 美化。

## DoD / Verification Expectation
- 每个原子任务都必须写清：目标、前置依赖、直接输入文件、预期改动点、明确不做项、工程化验证、完成定义、完成后下一任务。
- 每轮默认执行：`cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all`、`git diff --check`、`cd apps/desktop && npm run verify:handoff`；命中 server scaffold / adapter / E2E 时按任务加严。
- 若本轮仅改 docs / planning / skills，允许说明性不跑某项**额外**验证，但必须明确写出原因，不得默认省略；本轮若能跑则优先跑。
- `docs/planning/current.md`、`.agent-state/handoff.json` 为 planning sync 必更文件；排队顺序或详细计划变化时同步 `docs/planning/backlog.md`；长期拍板变化时才同步 `docs/planning/decisions.md`。
- 任一验证未过、planning sync 未完成或未单独 commit，都不得进入下一任务选择。
