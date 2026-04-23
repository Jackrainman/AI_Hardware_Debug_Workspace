# 待办池（Backlog）

> Backlog 只存**未开做候选与串行认领队列**。当前唯一主线任务看 `docs/planning/current.md`；机读顺序与验证要求看 `.agent-state/handoff.json.pending_task_queue`。

## 当前阶段
- S3：存储迁移与服务器化。
- 大目标：把 D1 的浏览器 SPA + `window.localStorage` 演示版，迁移为“战队局域网可访问 + 服务端长期存储”的版本。
- 当前技术路线：**先架构缝合，再本地 WSL 闭环，再服务器独立部署验证**。
- 当前访问口径：先按 `http://192.168.2.2:<port>/` 理解；不抢占 80 端口，不优先做 `.local` / 反向代理美化。

## 认领规则
1. AI 只能从下列队列中认领 **第一个依赖已满足且未完成** 的原子任务。
2. 每次只允许一个任务处于执行中；完成前必须做最小验证、planning sync、单任务 commit。
3. 若发现队列顺序、依赖或约束与真实仓库状态脱节，先修 `current.md` / `handoff.json` / 本文件，再继续。
4. 架构类任务不能只产出分析结论，必须附带工程化验证要求；涉及 `storage / repository / closeout / adapter / backend scaffold` 时必须同时覆盖成功态与失败态。

## S3 串行原子任务队列

> 已完成前置：`S3-ARCH-ASYNC-STORAGE-PORT`。以下只保留尚未认领的串行候选。

### 1. S3-ARCH-CLOSEOUT-ORCHESTRATOR
- 目标：把 closeout 多步写入从 UI 中抽到 use-case / service 层，UI 不再直接协调 `ArchiveDocument / ErrorEntry / IssueCard` 三类写入。
- 直接输入边界：`apps/desktop/src/App.tsx`、closeout domain 代码、`src/storage/*` 或新的 repository/use-case 层。
- 不做项：不做 UI 重构、不接服务器部署、不引入复杂状态框架、不重做领域模型。
- 工程化验证：
  - `cd apps/desktop && npm run typecheck`
  - `cd apps/desktop && npm run build`
  - `cd apps/desktop && npm run verify:all`
  - `git diff --check`
  - 任务相关验证：至少覆盖 closeout happy path 与部分失败路径，证明 UI 不再直接串联多实体写入。
- 完成定义：closeout orchestration 已从 UI 抽离；返回统一 orchestration result；后续统一错误状态可挂接；下一任务 `S3-ARCH-UNIFIED-STORAGE-ERROR-STATE` 依赖解除。
- 后继依赖：`S3-ARCH-UNIFIED-STORAGE-ERROR-STATE`。

### 2. S3-ARCH-UNIFIED-STORAGE-ERROR-STATE
- 目标：统一 storage result / error model，统一 `server_connection / unreachable / timeout / validation / write_failed` 表达，并给 UI 留出单一错误出口。
- 直接输入边界：新旧 storage / repository 边界、closeout orchestrator、`App.tsx` 当前错误展示路径、`docs/planning/s3-server-unreachable-strategy.md`（命中时读取）。
- 不做项：不做离线队列、不做重试编排、不引入 React Query / Redux / Zustand、不做复杂全局状态重构。
- 工程化验证：
  - `cd apps/desktop && npm run typecheck`
  - `cd apps/desktop && npm run build`
  - `cd apps/desktop && npm run verify:all`
  - `git diff --check`
  - 任务相关验证：至少覆盖 validation / write_failed 与 server_unreachable 等错误映射；UI 错误出口不再分散。
- 完成定义：统一 error model 与 connection state 已落地；UI 有单一错误出口；HTTP adapter 可无缝承接；下一任务 `S3-LOCAL-BACKEND-SCAFFOLD` 依赖解除。
- 后继依赖：`S3-LOCAL-BACKEND-SCAFFOLD`。

### 3. S3-LOCAL-BACKEND-SCAFFOLD
- 目标：在本地 WSL 起最小后端，提供最小 API、SQLite 初始化 / 落盘能力和基础健康检查，为前端 HTTP adapter 提供可联通的本地目标。
- 直接输入边界：默认最小事实源、`docs/planning/s3-api-contract.md`、`docs/planning/s3-sqlite-schema-draft.md`、后端脚手架目录与最小运行脚本。
- 不做项：不碰服务器、不升级服务器系统 Node、不抢占 80 端口、不做反向代理、不扩成完整权限 / 多租户后端。
- 工程化验证：
  - `cd apps/desktop && npm run typecheck`
  - `cd apps/desktop && npm run build`
  - `cd apps/desktop && npm run verify:all`
  - `git diff --check`
  - 任务相关验证：本地 backend 能启动；`/health` 可访问；SQLite 文件 / 表初始化成功；最小 API 可完成至少一条写入 + 读回 smoke。
- 完成定义：WSL 本地 backend + SQLite 最小闭环可独立启动和读写；不依赖服务器即可联调；下一任务 `S3-LOCAL-HTTP-STORAGE-ADAPTER` 依赖解除。
- 后继依赖：`S3-LOCAL-HTTP-STORAGE-ADAPTER`。

### 4. S3-LOCAL-HTTP-STORAGE-ADAPTER
- 目标：前端接入 HTTP storage adapter，在本地 WSL 与后端联通；严禁 silent fallback 冒充成功。
- 直接输入边界：`S3-ARCH-*` 三个缝合结果、本地 backend scaffold、`docs/planning/s3-api-contract.md`、`docs/planning/s3-server-unreachable-strategy.md`。
- 不做项：不做服务器部署、不加离线队列、不做实时协作、不保留 silent fallback 作为默认成功路径。
- 工程化验证：
  - `cd apps/desktop && npm run typecheck`
  - `cd apps/desktop && npm run build`
  - `cd apps/desktop && npm run verify:all`
  - `git diff --check`
  - 任务相关验证：前端能通过 HTTP adapter 与本地后端收发数据；后端关闭 / 超时 / 不可达时 UI 明确失败，不伪装为 localStorage 成功。
- 完成定义：HTTP adapter 已接入当前主流程；成功态与失败态都能稳定表达；下一任务 `S3-LOCAL-END-TO-END-VERIFY` 依赖解除。
- 后继依赖：`S3-LOCAL-END-TO-END-VERIFY`。

### 5. S3-LOCAL-END-TO-END-VERIFY
- 目标：验证 D1 主路径在“HTTP + SQLite + 本地 WSL 后端”下可以跑通，并证明失败态不会伪装成功。
- 直接输入边界：前端 HTTP adapter、本地 backend、SQLite 数据文件、当前 D1 主流程。
- 不做项：不做服务器部署、不改系统 Node、不优先做入口美化。
- 工程化验证：
  - `cd apps/desktop && npm run typecheck`
  - `cd apps/desktop && npm run build`
  - `cd apps/desktop && npm run verify:all`
  - `git diff --check`
  - 任务相关验证：创建问题卡、追加 InvestigationRecord、closeout 归档本地联通；SQLite 读回成功；失败态（后端停机 / 写入失败）不冒充成功。
- 完成定义：WSL 本地最小闭环已通过端到端验证；服务器阶段可以只处理“独立部署”问题；下一任务 `S3-SERVER-INDEPENDENT-DEPLOY-PREP` 依赖解除。
- 后继依赖：`S3-SERVER-INDEPENDENT-DEPLOY-PREP`。

### 6. S3-SERVER-INDEPENDENT-DEPLOY-PREP
- 目标：只为服务器独立部署做准备，规划独立 runtime / 独立目录 / 独立端口 / 独立 systemd service，不碰系统全局 Node。
- 直接输入边界：已验证的 WSL 本地方案、已确认服务器事实、部署脚本 / service unit / 路径规划文档。
- 不做项：不改服务器现有 Web 服务、不抢占 80 端口、不优先做 `.local` 或反向代理美化、不升级系统 Node。
- 工程化验证：
  - 文档 / 路径 / service unit / 启动脚本一致性检查
  - `git diff --check`
  - 若新增脚本或 service 文件，至少完成语法 / 引用 / 路径级验证
  - 明确记录端口、工作目录、数据目录、日志目录、独立 runtime 位置
- 完成定义：服务器独立部署所需目录、端口、runtime、service 方案明确且可执行；下一任务 `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY` 依赖解除。
- 后继依赖：`S3-SERVER-INDEPENDENT-DEPLOY-VERIFY`。

### 7. S3-SERVER-INDEPENDENT-DEPLOY-VERIFY
- 目标：把“本地已验证方案”部署到服务器独立端口，由 systemd 拉起，并验证局域网设备可访问且不影响现有 Web 服务。
- 直接输入边界：服务器独立部署方案、本地已验证产物、目标服务器 `192.168.2.2`。
- 不做项：不抢占 80 端口、不修改现有服务依赖的系统 Node、不把静态演示版或 localStorage 说成服务器化完成。
- 工程化验证：
  - `systemctl status` / 日志检查
  - `curl http://192.168.2.2:<port>/health` 或等价本机/局域网检查
  - 局域网设备访问 smoke
  - 服务重启后 SQLite 数据仍可读回
  - 确认既有 80 端口服务不受影响
- 完成定义：局域网设备可通过独立端口访问 ProbeFlash；服务端长期存储生效；现有服务不受影响；S3 服务器独立部署最小闭环成立。
- 后继依赖：后续再评估 `.local` / 反向代理美化、更多 workspace 或更深层服务器化能力。

## 当前先不做
- 不做 AI、RAG、embedding、相似问题向量检索或自治 agent。
- 不做权限系统、账号体系、多租户、复杂协同或公网暴露。
- 不做 Electron / preload / fs / IPC，不把 `.debug_workspace` 文件写盘当作当前 S3 主线。
- 不做大 UI 重构，不改变 D1 已通过 smoke 的主流程，除非当前原子任务明确要求最小适配。
- 不做离线队列、冲突合并、实时协作。
