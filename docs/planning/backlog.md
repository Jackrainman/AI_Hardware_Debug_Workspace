# 待办池（Backlog）

> Backlog 只存**未开做候选**池，不等于执行顺序。已完成原子任务列表以 `.agent-state/handoff.json.completed_atomic_tasks` + `git log` 为唯一事实源，本文件不再维护。当前前沿任务只放在 `docs/planning/current.md`。

## 当前阶段
- S3：存储迁移与服务器化。
- 大目标：把 D1 的浏览器 SPA + `window.localStorage` 演示版，迁移为战队局域网可访问、服务器端长期存储版。
- 交付目标：同一 WiFi 下通过类似 `http://hurricane-server.local:<port>/` 的地址访问；服务端持久化数据，支持多设备共享与重启后读回。
- 当前唯一前沿入口：`S3-PREP-STORAGE-ADAPTER-ABSTRACTION-A2A3A4`，见 `docs/planning/current.md`。

## S3 仓库内准备任务池

> 这些任务用于在不上服务器、不写完整后端、不接 SQLite 的前提下，先把 workspace / storage / API / schema / 不可达策略的工程边界对齐。

### S3-PREP-STORAGE-ADAPTER-ABSTRACTION（当前前沿）
- [ ] 目标：把当前 localStorage 读写调用点抽成统一存储适配层，为后续 server adapter 做准备。
- [ ] DoD：`apps/desktop/src/storage/*` 通过统一 adapter 边界读写，localStorage adapter 保留且现有保存 / 读取 / 列表 / 归档行为兼容。
- [ ] 边界：先不接服务器；不改成 HTTP 主事实源；不重做业务数据流；不改变既有 schema 语义。
- [ ] 依赖：`S3-PREP-WORKSPACE-FOUNDATION-A1` 已完成；server adapter 部分等待 API contract 与后端任务。

### S3-PREP-API-CONTRACT-DRAFT
- [ ] 目标：定义最小 HTTP API 契约，供后续后端实现。
- [ ] DoD：契约覆盖 health、workspaces、issues、records、archives、error_entries 的最小读写 / 列表 / 读回语义，以及统一错误返回和 workspace 参数传递方式。
- [ ] 边界：只写契约，不实现真实后端；不引入权限、实时协作、AI 或复杂查询。
- [ ] 依赖：默认 workspace id / name 已确认。

### S3-PREP-SQLITE-SCHEMA-DRAFT
- [ ] 目标：定义最小 SQLite schema 草案，覆盖 issues / records / archives / error_entries / workspaces。
- [ ] DoD：schema 草案明确表、主键、workspace 关联、核心字段 / JSON payload 边界、时间字段、schema version 与基础索引。
- [ ] 边界：先出 schema 设计，不创建数据库文件，不写迁移脚本，不实现 CRUD。
- [ ] 依赖：默认 workspace id / name 已确认；需与 `S3-PREP-API-CONTRACT-DRAFT` 互相对齐。

### S3-PREP-SERVER-UNREACHABLE-HANDLING
- [ ] 目标：明确服务器不可达时，前端应如何提示、阻断或回退。
- [ ] DoD：策略说明清楚区分 health 失败、读失败、写失败、超时和 localStorage fallback 边界；不得把未保存成功显示成成功。
- [ ] 边界：当前不做复杂容灾；不做离线队列、冲突合并、后台同步或多端实时协作。
- [ ] 依赖：建议依赖 `S3-PREP-API-CONTRACT-DRAFT` 和 `S3-PREP-STORAGE-ADAPTER-ABSTRACTION`，以便错误格式与前端 adapter 行为一致。

## S3 小任务与原子任务拆分

### S3-SERVER-INVENTORY
- [ ] S3-SERVER-INVENTORY-A1：确认目标服务器 OS / CPU 架构 / Node 与 npm 版本 / 可安装依赖方式。
- [ ] S3-SERVER-INVENTORY-A2：确认局域网入口方式：`hurricane-server.local` 是否可用、mDNS/路由器 DNS/IP 回退策略、预期端口范围。
- [ ] S3-SERVER-INVENTORY-A3：确认防火墙、端口开放、启动用户、工作目录、数据目录、备份目录和日志目录权限。
- [ ] S3-SERVER-INVENTORY-A4：确认部署形态：手动 `npm` 启动、systemd、pm2、Docker 或其它；只记录条件，不急于选复杂方案。
- [ ] S3-SERVER-INVENTORY-A5：输出 `S3-BACKEND-SCAFFOLD` 的输入约束：端口、base URL、数据路径、运行命令、验收 smoke 条件。

### S3-BACKEND-SCAFFOLD
- [ ] S3-BACKEND-SCAFFOLD-A1：选择最小 Node 后端方案和目录位置，避免引入与任务无关的大框架。
- [ ] S3-BACKEND-SCAFFOLD-A2：实现 `/health` 与基础错误返回格式，提供可配置 host / port。
- [ ] S3-BACKEND-SCAFFOLD-A3：确定前端静态资源服务或反向代理策略，保证局域网入口可访问。
- [ ] S3-BACKEND-SCAFFOLD-A4：补最小启动脚本与 README 运行说明。

### S3-SQLITE-STORAGE
- [ ] S3-SQLITE-STORAGE-A1：确定 SQLite 文件路径、初始化策略、备份边界和 schema 版本字段。
- [ ] S3-SQLITE-STORAGE-A2：为 IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument 建立最小表结构。
- [ ] S3-SQLITE-STORAGE-A3：实现最小 CRUD 与 zod 校验边界，错误不得静默吞掉。
- [ ] S3-SQLITE-STORAGE-A4：实现服务端读回验证脚本或 smoke，确认重启后数据仍存在。

### S3-FRONTEND-STORAGE-ADAPTER
- [ ] S3-FRONTEND-STORAGE-ADAPTER-A1：梳理当前 `apps/desktop/src/storage/*` localStorage 调用点，定义最小 HTTP adapter 接口。
- [ ] S3-FRONTEND-STORAGE-ADAPTER-A2：将 IssueCard 读写切到 HTTP API，保留失败提示与可调试日志。
- [ ] S3-FRONTEND-STORAGE-ADAPTER-A3：将 InvestigationRecord / ErrorEntry / ArchiveDocument 读写切到 HTTP API。
- [ ] S3-FRONTEND-STORAGE-ADAPTER-A4：处理首屏加载、空状态、网络失败和服务器不可达的最小 UI 提示，不重做视觉结构。

### S3-LAN-DEPLOY
- [ ] S3-LAN-DEPLOY-A1：提供服务器构建与启动命令，明确 host 绑定、端口和数据目录。
- [ ] S3-LAN-DEPLOY-A2：提供 `hurricane-server.local` / IP 回退访问说明和防火墙检查步骤。
- [ ] S3-LAN-DEPLOY-A3：提供持久运行方式与日志查看方式；优先简单、可调试。
- [ ] S3-LAN-DEPLOY-A4：补充备份/恢复说明，避免 SQLite 文件丢失。

### S3-MULTI-DEVICE-SMOKE
- [ ] S3-MULTI-DEVICE-SMOKE-A1：在设备 A 创建问题卡，设备 B 刷新后可见。
- [ ] S3-MULTI-DEVICE-SMOKE-A2：设备 B 追加记录，设备 A 刷新后可见。
- [ ] S3-MULTI-DEVICE-SMOKE-A3：结案归档后，两台设备均能看到归档结果。
- [ ] S3-MULTI-DEVICE-SMOKE-A4：服务器重启后数据仍可读回，失败时记录 repair task。

## 当前先不做
- 不做 AI、RAG、embedding、相似问题向量检索或自治 agent。
- 不做权限系统、账号体系、多租户、复杂协同或公网暴露。
- 不做 Electron / preload / fs / IPC，不把本地 `.debug_workspace` 文件写盘作为 S3 主线。
- 不做大 UI 重构，不改变 D1 已通过 smoke 的主流程，除非后续原子任务明确要求最小适配。
- 不做复杂统计、报表大屏、云同步。
