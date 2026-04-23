# AGENTS Rules

## 1. Project Overview
- 本项目是 **ProbeFlash — 面向嵌入式调试现场的问题闪记与知识归档系统**。
- 核心模块：项目绑定与仓库快照、问题闪记 / IssueCard intake、InvestigationRecord 追记、debug closeout、ArchiveDocument / ErrorEntry 归档。
- 当前真实运行形态：`apps/desktop` 浏览器 SPA + `window.localStorage`；D1 产品壳与浏览器 smoke 已完成。当前 S3 目标是迁移为局域网 Web 入口 + 服务器长期存储；后端 / SQLite / LAN 部署尚未接入。

## 2. Workspace Rules
- `docs/product/` 只放产品定义、用户场景、领域语言、数据模型与长期能力方向。
- `docs/planning/` 只放当前战况、候选池、长期拍板与专项实现输入。
- `.agent-state/` 只放上下文重置所需的机读状态；当前唯一机读状态文件是 `.agent-state/handoff.json`。
- `.debug_workspace/` 只放调试运行数据与归档。
- `.agents/skills/` 只放可执行流程规则；一个 skill 只做一件事。
- 禁止把临时思考散落到仓库根目录或无关路径。

## 3. Delivery-Priority Mode（交差优先模式）
- 当 `.agent-state/handoff.json.current_mode = "delivery_priority"` 或 `current.md` 写明当前阶段为交差优先时，当前最高优先级是：先交付一个“好看、中文、能用、像产品壳”的可演示版本。
- 在该模式下，UI 壳层、中文化、空状态、演示友好性优先于继续扩展深层闭环功能。
- 不得伪造功能完成状态；localStorage、占位区、未接入 Electron/fs/IPC 等边界必须如实标注。
- 阶段名使用 `D1：交差优先中文产品壳`，除非 planning 明确切出 D1 并更新 `current.md` / `.agent-state/handoff.json`。

## 4. S3 Storage Serverization Rule（存储迁移与服务器化规则）
- 当 `.agent-state/handoff.json.current_mode = "server_storage_migration"` 或 `current.md` 写明阶段为 S3 存储迁移与服务器化时，当前最高优先级是：把 localStorage 演示版迁移为“局域网共享 + 服务器长期存储”版本。
- S3 当前主线：服务器环境盘点、最小后端 API、SQLite 长期存储、前端 storage adapter、局域网部署、多设备 smoke。
- S3 当前不做：AI、RAG、权限系统、Electron、preload、fs/IPC、大 UI 重构、复杂统计、云同步或公网多租户。
- `current.md` 的前沿任务窗口只放当前 S3 主线 1~3 个候选；更远任务放入 `backlog.md`，不得把 AI/RAG/Electron 等后续方向混入当前入口。
- 交付目标必须表述为“同一 WiFi 下通过类似 `http://hurricane-server.local:<port>/` 访问，服务端长期持久化”，不得把静态演示版或 localStorage 刷新保留说成服务器化完成。

## 5. Safe Change Rule（安全改动规则）
- D1 维护期允许低风险中文文案、空状态和小视觉修补，但不得重做业务数据流。
- S3 阶段允许围绕服务器化目标做最小必要改动：后端脚手架、SQLite schema、storage adapter、部署脚本和 smoke 验证。
- S3 阶段禁止为了“顺手优化”大规模重构 UI、改动无关 schema / store、引入复杂抽象或提前接 AI/RAG/权限/Electron。
- 涉及仓库访问、归档写盘路径、服务器数据目录、端口和启动方式时，优先可预测性、可调试性和可恢复性，不为表面美化牺牲真实状态表达。

## 6. Rolling Planning And Next Task Selection
- 每轮只允许一个原子任务处于执行中。
- 默认必读输入只保留：`AGENTS.md`、`docs/planning/current.md`、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关代码或专项文档。
- 条件读取规则：
  - `docs/planning/backlog.md`：当前前沿窗口耗尽、任务切换、候选新增/移除/改名/重排优先级时读取。
  - `docs/planning/decisions.md`：阶段切换、长期规则变化、技术争议或需要核对长期拍板时读取。
  - `docs/product/产品介绍.md`：改产品定义、页面结构、领域模型、用户场景或领域语言时读取。
  - `README.md`：对外展示、快速开始、比赛/演示口径变更时读取；它不是内部事实源，不进入默认内部读取链。
  - `docs/planning/s3-api-contract.md`、`docs/planning/s3-sqlite-schema-draft.md`、`docs/planning/s3-server-unreachable-strategy.md`：仅在任务命中对应 API、SQLite 或服务器不可达策略实现时读取。
- 选择下一任务时优先判断：当前 mode、阶段目标、completion gate 是否闭合、依赖是否满足、planning 与实际是否脱节、是否最有利于验收演示。
- 如果 `current.md` 前沿窗口不再匹配真实阶段，先更新 `current.md` / `.agent-state/handoff.json`，再执行任务。
- 禁止凭旧计划机械顺推；禁止同时推进两个原子任务。

## 7. Completion Gate And Post-Task Planning Sync
- 当前原子任务未完成“最小验证 + planning sync + 单任务 commit”前，不得选择或执行下一任务。
- 每次完成一个原子任务后，必须执行 post-task planning sync；planning sync 是 completion gate 的必要条件，不是可选交接备注。
- planning sync 的最小必更文件为：`docs/planning/current.md` 与 `.agent-state/handoff.json`。
- `docs/planning/backlog.md` 仅在以下情况更新：当前前沿任务窗口变化；候选任务被移除 / 新增 / 改名 / 重排优先级；当前任务完成后需要显式切换下一前沿任务。
- `docs/planning/decisions.md` 仅在产生新的长期性决定时更新。
- `docs/product/产品介绍.md` 仅在产品定义、用户场景、领域模型或领域语言变化时更新；它不承担当前战况职责。
- `README.md` 仅在对外展示、快速开始、比赛/演示口径变化时更新；它不承担内部 planning 职责。
- 旧的弱化文档已退出主工作流并硬删除；不得以占位、薄重定向或“方便接力”为由重新生成。
- planning sync 采用“覆盖当前状态”而非“追加流水账”；目标是让下一轮 AI 能正确接着干，不是把本轮全过程写成纪实文学。
- 不允许“代码已经变了，但 `current.md` / `.agent-state/handoff.json` 还停留在旧阶段”。

## 8. Controlled Context Reset
- 下一轮优先依赖结构化交接物，而不是聊天历史。
- 每轮结束后的状态必须沉淀到 `current.md` 与 `.agent-state/handoff.json`；仅存在于对话中的约定视为会丢失。
- 允许受控重启：重新读取默认必读输入 -> 重新判断阶段 -> 选择唯一下一任务 -> 执行。

## 9. Mandatory Skill Usage
- `planning`：读取真实状态、判断阶段与前沿任务窗口、生成唯一下一原子任务。
- `task-execution`：只做当前原子任务的落地改动、最小验证、planning sync、单任务 commit。
- `task-verification`：完成定义检查、读回验证、completion gate 放行判断。
- `repo-onboard`：首次进入仓库的路径校验与快照采集。
- `debug-intake`：碎片输入生成 IssueCard。
- `debug-closeout`：结案生成 ErrorEntry 与 ArchiveDocument。

## 10. Acceptance-Facing Mindset（面向验收）
- D1 阶段选择任务时，优先问：页面是否更像产品？中文是否统一？演示是否更顺？用户是否更容易理解当前已做到什么？
- S3 阶段选择任务时，优先问：是否更接近局域网共享？是否更接近服务器长期存储？是否保持 localStorage / 后端未接入等真实边界？是否避免把 AI/RAG/Electron 误塞回当前主线？
- 输出必须区分“必须改 / 建议改 / 可选优化”，不确定处标注“待确认 / 信息不足”。

## 11. Feedback Loop And Truthfulness
- AI 输出涉及 IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument 时必须过 schema 校验；失败要记录错误、保留原始输入、只重生无效结构段。
- 工具调用必须检查 exit code；失败不可静默吞掉。
- 归档后必须读回验证；验证失败时创建 repair task，不得标记“已归档完成”。
- 禁止把“规划中”写成“已完成”；禁止把占位壳说成真实功能。

## 12. Commit And Verification
- 每完成一个离散任务提交一次 commit；一个 commit 只对应一个明确任务结果。
- 当前任务未提交前，不得进入下一任务。
- 文档/规划重构的最小验证：路径存在、内容可读、引用一致、JSON 可解析、planning sync 边界符合 §7 / §14、`git diff --check` 通过、提交范围聚焦。
- 用户当前偏好：除非明确要求，由 AI 自行编译。

## 13. Documentation Responsibilities（文档职责与唯一事实源）
- **内部长期保留**：
  - `AGENTS.md`：长期规则、工作流、DoD、夜跑边界、禁改区、文档职责。
  - `docs/planning/current.md`：唯一当前战况。阶段目标、前沿任务窗口（1~3 候选）、唯一执行中的原子任务、下一任务选择流程、DoD；不保留长篇历史实现细节，不重复 `git log`，不复制 `.agent-state/handoff.json.notes`。
  - `.agent-state/handoff.json`：唯一机读状态。只保存下一轮选择所必需的结构化字段，不承载长篇 prose。
  - `docs/planning/backlog.md`：唯一候选池。只留未开做候选；不再维护“已完成”长列表。
  - `docs/planning/decisions.md`：关键拍板与长期约束。仅在出现新的长期性决定时追加，不是轮次日志。
  - `docs/product/产品介绍.md`：产品定义、场景、数据模型、领域语言、长期能力方向；不承担当前战况职责，不默认读取。
- **对外保留**：
  - `README.md`：对外门面、快速开始、展示口径、当前限制；不是内部事实源，不默认读取。
- **专项实现输入**：
  - `docs/planning/s3-api-contract.md`：S3 HTTP API 契约输入，命中后端/API adapter 任务时读取。
  - `docs/planning/s3-sqlite-schema-draft.md`：S3 SQLite schema 输入，命中 SQLite storage 任务时读取。
  - `docs/planning/s3-server-unreachable-strategy.md`：服务器不可达策略输入，命中相关前端/adapter 任务时读取。
- **已完成任务历史**：以 `git log` 与 `.agent-state/handoff.json.completed_atomic_tasks` 为主，不在 `current.md` / `backlog.md` 重复维护长已完成列表。
- **禁止**：在多个文档里并行维护“当前战况 / 已完成列表 / 上一轮详述”；弱化文档已硬删除，不得恢复。

## 14. Documentation Update Triggers（何时更新哪份文档）
- 每轮原子任务完成后，**必须执行 planning sync**：
  - `docs/planning/current.md`：必更。只覆盖当前阶段、前沿窗口、当前唯一执行中的原子任务、下一任务选择流程、DoD 当前态；“当前唯一执行中的原子任务”只保留当前态，不保留多轮旧任务正文。
  - `.agent-state/handoff.json`：必更。只写机读状态与下一轮必须保留的结构化字段；`notes` 只保留长期约束或关键边界，不复写任务完成明细。
  - `docs/planning/backlog.md`：条件更新。仅当前前沿任务窗口变化、候选任务被移除 / 新增 / 改名 / 重排优先级、或当前任务完成后需要显式切换下一前沿任务时修改。
- **按需**更新：
  - `AGENTS.md`：长期规则、工作流、文档职责、夜跑边界发生变化时。
  - `docs/planning/decisions.md`：产生了新的长期性决定（D-xxx 级别）时。
  - `docs/product/产品介绍.md`：产品定义、场景、领域模型、用户语言发生变化时。
  - `README.md`：产品对外口径、快速开始、阶段口径、演示说明发生变化时。
- **防膨胀约束**：单轮 planning sync 优先修改已有段落，不新增同义新段；若某段描述只是在重复 `backlog.md` / `decisions.md` / `git log` / `.agent-state/handoff.json`，必须删减或改为引用；非长期规则不得写入 `AGENTS.md`；非长期决策不得写入 `decisions.md`。

## 15. Overnight / Unattended Boundaries（夜跑 / 无人值守边界）
- 允许方向：文档对齐、`.agent-state/handoff.json` 对齐、verify 脚本补齐、低风险异味扫描、单个原子任务内的 S3 服务器化最小改动（仍受 §5 安全改动限制）。
- S3 阶段禁止方向：AI runtime 接入、RAG/embedding、权限系统、Electron / preload / IPC、大规模 UI 重构、复杂统计、多任务并行推进、未完成 `S3-SERVER-INVENTORY` 前直接开写后端。
- 每轮仍遵守 §6 / §7：只一个原子任务在执行、完成前必须跑最小验证 + planning sync + 单任务 commit；夜跑不允许跳过。

## 16. Verification Matrix（验证矩阵）
- **必跑**（每轮都要跑，除非用户明确免除）：
  - `npm run typecheck`（在 `apps/desktop` 下）。
  - `npm run build`（在 `apps/desktop` 下）。
  - `git diff --check`（不限目录）。
  - `.agent-state/handoff.json` 可被 `JSON.parse`。
- **按需**（任务相关时跑）：
  - `apps/desktop/scripts/verify-*.mts` 中与本轮改动语义相关的脚本。
  - 浏览器人工冒烟（涉及 UI 行为变化时；不改代码时可仅标注未执行）。
- **文档/规划类任务专用最小验证**：路径存在、内容可读、引用一致、planning sync 边界符合 §7 / §14、`JSON.parse` 通过、`git diff --check` 通过；typecheck 与 build 仍建议跑以避免误伤。
- 未跑的必跑项必须在 commit message 或 handoff 中如实标注原因，不得静默跳过。
