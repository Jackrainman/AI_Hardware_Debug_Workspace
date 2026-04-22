# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口、唯一执行中的原子任务。候选任务不等于顺推队列；更远任务放入 `backlog.md`。

## 当前阶段
- 阶段：S3：存储迁移与服务器化。
- 当前模式：`server_storage_migration`。
- 阶段切换理由：D1 中文产品壳与浏览器 smoke 已完成；继续停留在 localStorage 演示版无法支撑战队局域网共享和长期保存，下一阶段必须先解决“数据在哪里、服务怎么访问、能否多设备共享”的工程基础。
- 阶段目标：把当前 `apps/desktop` 浏览器 SPA + `window.localStorage` 演示版，迁移为同一 WiFi 下可访问、服务器端长期存储的版本。
- 交付形态：同一 WiFi 下通过类似 `http://hurricane-server.local:<port>/` 的入口访问；服务端负责长期持久化，前端不再把 localStorage 当作唯一事实源。
- 当前真实边界：本轮仅完成 S3 仓库内准备任务的 planning/state 扩展；未写后端代码，未接 SQLite，未 SSH 服务器，未改前端业务代码，当前应用仍是浏览器 SPA + `window.localStorage`。

## S3 范围与边界

### 本阶段做
- 服务器环境、端口、域名 / mDNS / IP 入口、部署权限与数据目录盘点。
- 默认共用工作区基础逻辑，为后续“可增加工作区”和多人同看同写预留数据归属边界。
- 最小后端 API 契约、SQLite schema 草案、服务不可达策略，再进入后端与 HTTP adapter 实现。
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
- **S3-PREP-WORKSPACE-FOUNDATION**：建立默认共用工作区基础，为 storage / API / SQLite 统一提供 workspace 边界。
- **S3-PREP-STORAGE-ADAPTER-ABSTRACTION**：把当前 localStorage 调用点抽成统一存储适配层，先保留 localStorage adapter，不接服务器。
- **S3-PREP-API-CONTRACT-DRAFT**：定义最小 HTTP API 契约，供后续后端实现。
- **S3-PREP-SQLITE-SCHEMA-DRAFT**：定义最小 SQLite schema 草案，覆盖 issues / records / archives / error_entries / workspaces。
- **S3-PREP-SERVER-UNREACHABLE-HANDLING**：明确服务器不可达时前端提示、阻断或回退策略。
- **S3-SERVER-INVENTORY**：确认服务器 OS / Node 环境 / 端口 / hostname 或 IP / 防火墙 / 启动权限 / 数据目录 / 备份位置 / 局域网客户端条件。
- **S3-BACKEND-SCAFFOLD**：建立最小后端服务、健康检查、配置入口和前端静态资源服务策略。
- **S3-SQLITE-STORAGE**：设计并实现 SQLite schema、迁移/初始化、CRUD 与读回校验。
- **S3-FRONTEND-STORAGE-ADAPTER**：前端通过 HTTP storage adapter 读写服务器数据，移除 localStorage 作为主事实源。
- **S3-LAN-DEPLOY**：落地局域网部署命令、端口暴露、hostname/IP 访问说明和持久运行方式。
- **S3-MULTI-DEVICE-SMOKE**：执行多设备读写 smoke，确认数据跨设备共享与重启后仍存在。

详细原子任务拆分见 `docs/planning/backlog.md`。

## 当前唯一执行中的原子任务
- **S3-PREP-WORKSPACE-FOUNDATION（待下一轮执行）**。
  - 目标：引入默认共用工作区（例如“26年 R1”）的基础逻辑，让后续 storage adapter、HTTP API 与 SQLite schema 都有一致的数据归属边界。
  - 范围：只建立默认 workspace 标识 / 名称 / 归属规则与后续可扩展路径；必要代码改动保持最小，并保留 localStorage adapter 行为兼容。
  - 非目标：不做完整工作区管理系统；不做复杂切换 UI；不做权限隔离；不写后端；不接 SQLite。
  - 当前状态：`S3-PREP-FRONTIER-EXPANSION` 已把五个仓库内准备任务纳入 planning；下一轮从默认工作区基础开始。

## 当前前沿任务窗口（候选，不等于顺推队列）
- S3-PREP-WORKSPACE-FOUNDATION
  - 依赖关系：D1 smoke 已完成；S3-ENTRY-PLANNING 已完成阶段切换；S3-PREP-FRONTIER-EXPANSION 已补齐准备任务池。
  - 选择理由：默认 workspace 是 storage key、adapter 接口、API 路由/参数和 SQLite 外键的共同边界；先做它可避免后续 storage adapter 抽象后再返工补 workspaceId。
  - 完成输出：默认工作区基础逻辑与扩展边界清晰落盘，且不引入完整管理 UI / 权限系统 / 后端。
- S3-PREP-STORAGE-ADAPTER-ABSTRACTION
  - 依赖关系：建议依赖 `S3-PREP-WORKSPACE-FOUNDATION`；server adapter 仍需等待 API contract 与后端任务。
  - 选择理由：当前 localStorage 调用分散在 `apps/desktop/src/storage/*`，先抽统一接口可降低后续切 HTTP API 的改动面。
  - 完成输出：统一 storage adapter 接口 + localStorage adapter 保留，业务行为兼容，不接服务器。
- S3-PREP-API-CONTRACT-DRAFT
  - 依赖关系：建议至少确认默认 workspace 命名和 workspaceId 传递方式；不依赖真实服务器。
  - 选择理由：先定义最小 HTTP API、错误格式和读回语义，避免后端脚手架和前端 server adapter 各自发散。
  - 完成输出：最小 HTTP API 契约文档，覆盖 workspace、issues、records、archives、error_entries 与 health，不实现后端。

## 下一任务选择流程
1. 重新读取：`AGENTS.md`、`README.md`、`docs/product/产品介绍.md`、本文件、`docs/planning/backlog.md`、`docs/planning/decisions.md`、`.agent-state/handoff.json`、`git status`、最近 commit、相关代码目录。
2. 确认 `current_mode = server_storage_migration`，且当前唯一入口为 `S3-PREP-WORKSPACE-FOUNDATION`。
3. 先完成默认共用工作区基础，再在 `S3-PREP-STORAGE-ADAPTER-ABSTRACTION` 与 `S3-PREP-API-CONTRACT-DRAFT` 之间重新判断最小下一步。
4. 本轮准备任务期间不 SSH 服务器、不安装依赖、不写完整后端、不接 SQLite；若需要目标服务器信息，记录待确认项，不得伪造成已确认。

## 原子任务完成标准（DoD）
- 文件修改已落盘，且只服务于当前唯一原子任务。
- 文档/规划类任务至少执行：路径可读检查、`.agent-state/handoff.json` JSON.parse、`git diff --check`。
- 若本轮只改文档规划，可不跑 `npm run typecheck` / `npm run build`，但必须在汇报或 commit message 中说明原因。
- `docs/planning/current.md`、`.agent-state/handoff.json` 必须 compact 覆盖同步；`docs/planning/backlog.md` 仅在任务窗口或候选拆分变化时更新。
- 阶段或产品口径变化时，同步 `README.md`、`docs/product/产品介绍.md`、`docs/planning/decisions.md`、`docs/planning/roadmap.md`、`docs/planning/architecture.md`。
- 已完成独立 commit，且 message 对应单一任务结果。
- 以上任一项未满足，不得选择或执行下一任务。
