# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口、唯一执行中的原子任务。候选任务不等于顺推队列；更远任务放入 `backlog.md`。

## 当前阶段
- 阶段：S3：存储迁移与服务器化。
- 当前模式：`server_storage_migration`。
- 阶段切换理由：D1 中文产品壳与浏览器 smoke 已完成；继续停留在 localStorage 演示版无法支撑战队局域网共享和长期保存，下一阶段必须先解决“数据在哪里、服务怎么访问、能否多设备共享”的工程基础。
- 阶段目标：把当前 `apps/desktop` 浏览器 SPA + `window.localStorage` 演示版，迁移为同一 WiFi 下可访问、服务器端长期存储的版本。
- 交付形态：同一 WiFi 下通过类似 `http://hurricane-server.local:<port>/` 的入口访问；服务端负责长期持久化，前端不再把 localStorage 当作唯一事实源。
- 当前真实边界：本轮只完成阶段切换、文档同步和任务拆分；未写后端代码，未改前端业务逻辑，当前应用仍是浏览器 SPA + `window.localStorage`。

## S3 范围与边界

### 本阶段做
- 服务器环境、端口、域名 / mDNS / IP 入口、部署权限与数据目录盘点。
- 最小后端 API 骨架与健康检查。
- 服务端 SQLite 长期存储，覆盖 IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument 的最小闭环。
- 前端 storage adapter 从 localStorage 演示存储切到 HTTP API，必要时保留 localStorage fallback 的真实边界说明。
- 局域网部署说明与多设备 smoke：两台设备访问同一服务器，看到同一份数据。

### 本阶段不做
- 不优先做 AI、RAG、相似问题向量检索或自治 agent 编排。
- 不做权限系统、账号体系、多租户、复杂协同。
- 不做 Electron、preload、fs/IPC，也不把 `.debug_workspace` 本地文件写盘作为当前主线。
- 不做大 UI 重构、不改动 D1 已验证的主流程视觉壳，除非后续任务明确需要最小适配。
- 不做复杂统计、报表大屏或云同步。

## 大任务拆分（概览）
- **S3-SERVER-INVENTORY**：先确认服务器 OS / Node 环境 / 端口 / hostname 或 IP / 防火墙 / 启动权限 / 数据目录 / 备份位置 / 局域网客户端条件。
- **S3-BACKEND-SCAFFOLD**：建立最小后端服务、健康检查、配置入口和前端静态资源服务策略。
- **S3-SQLITE-STORAGE**：设计并实现 SQLite schema、迁移/初始化、CRUD 与读回校验。
- **S3-FRONTEND-STORAGE-ADAPTER**：前端通过 HTTP storage adapter 读写服务器数据，移除 localStorage 作为主事实源。
- **S3-LAN-DEPLOY**：落地局域网部署命令、端口暴露、hostname/IP 访问说明和持久运行方式。
- **S3-MULTI-DEVICE-SMOKE**：执行多设备读写 smoke，确认数据跨设备共享与重启后仍存在。

详细原子任务拆分见 `docs/planning/backlog.md`。

## 当前唯一执行中的原子任务
- **S3-SERVER-INVENTORY（待下一轮执行）**。
  - 目标：在写任何后端代码前，先搞清服务器环境、端口、域名/入口方式、权限和部署条件。
  - 范围：只做盘点与规划记录；输出服务器运行约束、端口/入口候选、数据目录/备份候选、部署权限风险、S3-BACKEND-SCAFFOLD 的输入条件。
  - 非目标：不写后端代码；不改前端业务逻辑；不改 localStorage key；不引入 AI / RAG / 权限系统 / Electron。
  - 当前状态：S3-ENTRY-PLANNING 已完成规划切换；下一轮从此任务开始。

## 当前前沿任务窗口（候选，不等于顺推队列）
- S3-SERVER-INVENTORY
  - 依赖关系：D1 smoke 已完成；S3-ENTRY-PLANNING 已完成阶段切换。
  - 选择理由：后端脚手架、SQLite 数据目录、LAN 部署和多设备 smoke 都依赖服务器端口、hostname/IP、权限和部署条件；不先盘点会导致后续实现返工。
  - 完成输出：`docs/planning/current.md` 与 `.agent-state/handoff.json` 更新为可执行的后端脚手架入口条件；必要时补充 `docs/planning/backlog.md` 中 S3-BACKEND-SCAFFOLD 的约束。

## 下一任务选择流程
1. 重新读取：`AGENTS.md`、`README.md`、本文件、`docs/planning/backlog.md`、`docs/planning/decisions.md`、`.agent-state/handoff.json`、`git status`、最近 commit。
2. 确认 `current_mode = server_storage_migration`，且当前唯一入口仍是 `S3-SERVER-INVENTORY`。
3. 先完成服务器环境与部署条件盘点，再决定 `S3-BACKEND-SCAFFOLD` 的最小后端形态。
4. 若发现无法获取目标服务器信息，先记录阻塞与待确认项，不得跳过盘点直接写后端。

## 原子任务完成标准（DoD）
- 文件修改已落盘，且只服务于当前唯一原子任务。
- 文档/规划类任务至少执行：路径可读检查、`.agent-state/handoff.json` JSON.parse、`git diff --check`。
- 若本轮只改文档规划，可不跑 `npm run typecheck` / `npm run build`，但必须在汇报中说明原因。
- `docs/planning/current.md`、`.agent-state/handoff.json` 必须 compact 覆盖同步；`docs/planning/backlog.md` 仅在任务窗口或候选拆分变化时更新。
- 阶段或产品口径变化时，同步 `README.md`、`docs/product/产品介绍.md`、`docs/planning/decisions.md`、`docs/planning/roadmap.md`、`docs/planning/architecture.md`。
- 已完成独立 commit，且 message 对应单一任务结果。
- 以上任一项未满足，不得选择或执行下一任务。
