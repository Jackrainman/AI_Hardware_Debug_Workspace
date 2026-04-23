# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口、唯一执行中的原子任务。候选任务不等于顺推队列；更远任务放入 `backlog.md`。

## 当前阶段
- 阶段：S3：存储迁移与服务器化。
- 当前模式：`server_storage_migration`。
- 阶段切换理由：D1 中文产品壳与浏览器 smoke 已完成；继续停留在 localStorage 演示版无法支撑战队局域网共享和长期保存，下一阶段必须先解决“数据在哪里、服务怎么访问、能否多设备共享”的工程基础。
- 阶段目标：把当前 `apps/desktop` 浏览器 SPA + `window.localStorage` 演示版，迁移为同一 WiFi 下可访问、服务器端长期存储的版本。
- 交付形态：同一 WiFi 下通过类似 `http://hurricane-server.local:<port>/` 的入口访问；服务端负责长期持久化，前端不再把 localStorage 当作唯一事实源。
- 当前真实边界：五个 S3-PREP 仓库内准备任务已完成：默认工作区基础、`local-storage-adapter`、HTTP API 契约草案、SQLite schema 草案、服务器不可达策略；未写后端代码，未创建数据库文件，未 SSH 服务器，当前应用仍是浏览器 SPA + `window.localStorage`。

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
- **S3-SERVER-INVENTORY-A1（待服务器摸底，不在今晚执行）**。
  - 目标：确认目标服务器 OS / CPU 架构 / Node 与 npm 版本 / 可安装依赖方式。
  - 范围：明天在允许接触服务器时收集环境事实，作为后端 scaffold 的输入。
  - 非目标：今晚不 SSH、不部署、不写后端；未拿到服务器事实前不伪造环境结论。
  - 当前状态：仓库内准备任务已完成；下一步需要真实服务器信息。

## 当前前沿任务窗口（候选，不等于顺推队列）
- S3-SERVER-INVENTORY-A1
  - 依赖关系：五个 S3-PREP 准备任务已完成；需要真实服务器访问或用户提供环境信息。
  - 选择理由：后端脚手架、SQLite 路径、端口和 LAN 入口都依赖服务器事实。
  - 完成输出：OS / CPU 架构 / Node 与 npm 版本 / 依赖安装方式记录。
- S3-SERVER-INVENTORY-A2
  - 依赖关系：A1 后继续。
  - 选择理由：确认 `hurricane-server.local`、mDNS / IP 回退和预期端口范围，避免后端启动参数返工。
  - 完成输出：局域网入口方式与端口策略。
- S3-SERVER-INVENTORY-A3
  - 依赖关系：A1 / A2 后继续。
  - 选择理由：确认防火墙、端口开放、启动用户、工作目录、数据目录、备份目录和日志目录权限。
  - 完成输出：后端 scaffold / SQLite storage 的运行权限和路径输入。

## 下一任务选择流程
1. 默认只读取：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关代码或专项文档。
2. 条件读取：
   - `docs/planning/backlog.md`：当前窗口耗尽、任务切换、候选新增/移除/改名/重排优先级时读取。
   - `docs/planning/decisions.md`：阶段切换、长期规则变化、技术争议或需要核对长期拍板时读取。
   - `docs/product/产品介绍.md`：改产品定义、页面结构、领域模型、用户场景或领域语言时读取。
   - `README.md`：对外展示、快速开始、比赛/演示口径变化时读取；不作为内部事实源默认读取。
   - `docs/planning/s3-api-contract.md`、`docs/planning/s3-sqlite-schema-draft.md`、`docs/planning/s3-server-unreachable-strategy.md`：仅在任务命中对应 API、SQLite 或服务器不可达策略实现时读取。
3. 确认 `current_mode = server_storage_migration`，且当前唯一入口仍为 `S3-SERVER-INVENTORY-A1`；若阶段或窗口与真实状态不一致，先同步本文件与 `.agent-state/handoff.json`。
4. 只有在允许服务器摸底或用户提供环境信息后，才执行 S3-SERVER-INVENTORY；否则停下并汇报“等待服务器信息”。
5. 未完成服务器摸底前，不写完整后端、不接 SQLite、不做部署；若需要目标服务器信息，记录待确认项，不得伪造成已确认。

## 原子任务完成标准（DoD）
- 文件修改已落盘，且只服务于当前唯一原子任务。
- 文档/规划类任务至少执行：路径可读检查、`.agent-state/handoff.json` JSON.parse、`git diff --check`。
- 若本轮只改文档规划，可不跑 `npm run typecheck` / `npm run build`，但必须在汇报或 commit message 中说明原因。
- `docs/planning/current.md`、`.agent-state/handoff.json` 必须 compact 覆盖同步；`docs/planning/backlog.md` 仅在任务窗口或候选拆分变化时更新。
- 阶段、产品定义或对外口径变化时，按职责条件同步 `docs/planning/decisions.md`、`docs/product/产品介绍.md`、`README.md`；README 与产品介绍都不承担当前战况职责。
- 已完成独立 commit，且 message 对应单一任务结果。
- 以上任一项未满足，不得选择或执行下一任务。
