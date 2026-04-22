# AGENTS Rules

## 1. Project Overview
- 本项目是 **ProbeFlash — 面向嵌入式调试现场的问题闪记与知识归档系统**。
- 核心模块：项目绑定与仓库快照、问题闪记 / IssueCard intake、InvestigationRecord 追记、debug closeout、ArchiveDocument / ErrorEntry 归档。
- 当前运行形态：`apps/desktop` 浏览器 SPA + `window.localStorage`；Electron / fs / IPC 尚未接入。

## 2. Workspace Rules
- `docs/product/` 只放产品定义。
- `docs/planning/` 只放工程推进、路线图、前沿任务、决策与交接。
- `.agent-state/` 只放上下文重置交接物（progress / session-log / handoff）。
- `.debug_workspace/` 只放调试运行数据与归档。
- `.agents/skills/` 只放可执行流程规则；一个 skill 只做一件事。
- 禁止把临时思考散落到仓库根目录或无关路径。

## 3. Delivery-Priority Mode（交差优先模式）
- 当 `.agent-state/handoff.json.current_mode = "delivery_priority"` 或 `current.md` 写明当前阶段为交差优先时，当前最高优先级是：先交付一个“好看、中文、能用、像产品壳”的可演示版本。
- 在该模式下，UI 壳层、中文化、空状态、演示友好性优先于继续扩展深层闭环功能。
- 不得伪造功能完成状态；localStorage、占位区、未接入 Electron/fs/IPC 等边界必须如实标注。
- 阶段名使用 `D1：交差优先中文产品壳`，除非 planning 明确切回技术主线。

## 4. Dual-Track Rule（双链路规则）
- 链路 A：技术闭环主线，当前降级为后续主线；包括 `.debug_workspace` 文件写盘、Electron / preload / IPC、runtime log、repair task、恢复机制、相似问题检索。
- 链路 B：当前交差优先链路，当前阶段唯一优先主线；包括中文文案、视觉统一、空状态、项目区/归档区演示壳、问题卡区视觉重心、最小中文演示路径。
- `current.md` 的前沿任务窗口只放当前链路 B 的 1~3 个候选；链路 A 放入 `backlog.md` 的"后续主线：链路 A 技术闭环深化"区域，不默认塞回前沿窗口。
- 禁止把链路 A 和链路 B 混写成一个模糊任务堆；禁止让 AI 把技术闭环深化误判为当前最高优先级。

## 5. Safe Polish Rule（安全美化规则）
- 当前阶段允许：中文文案替换、UI 视觉统一、空状态设计、卡片/按钮/表单/布局层优化、演示路径清晰化、必要的最小中文演示数据入口。
- 当前阶段禁止：为了美化重做业务数据流；无必要扩展 schema / store / Electron / fs / IPC；把占位功能包装成已完成；大规模重构或引入复杂抽象。
- 涉及硬件访问、仓库访问、归档写盘路径时，优先可预测性和可调试性，不为视觉改动牺牲真实状态表达。

## 6. Rolling Planning And Next Task Selection
- 每轮只允许一个原子任务处于执行中。
- 开始下一轮前必须重新读取：`AGENTS.md`、`README.md`、`docs/planning/current.md`、`docs/planning/backlog.md`、`docs/planning/decisions.md`、`.agent-state/handoff.json`、`git status`、最近 commit、相关代码目录。
- 选择下一任务时优先判断：当前 mode、阶段目标、completion gate 是否闭合、依赖是否满足、planning 与实际是否脱节、是否最有利于验收演示。
- 如果 `current.md` 前沿窗口不再匹配真实阶段，先更新 `current.md` / `handoff.json`，再执行任务。
- 禁止凭旧计划机械顺推；禁止同时推进两个原子任务。

## 7. Completion Gate And Post-Task Planning Sync
- 当前原子任务未完成"最小验证 + planning sync + 单任务 commit"前，不得选择或执行下一任务。
- 每次完成一个原子任务后，必须执行 post-task planning sync；planning sync 是 completion gate 的必要条件，不是可选交接备注。
- planning sync 的最小必更文件为：`docs/planning/current.md` 与 `.agent-state/handoff.json`。
- `docs/planning/backlog.md` 仅在以下情况更新：当前前沿任务窗口变化；候选任务被移除 / 新增 / 改名 / 重排优先级；当前任务完成后需要显式切换下一前沿任务。
- planning sync 采用"覆盖当前状态"而非"追加流水账"；目标是让下一轮 AI 能正确接着干，不是把本轮全过程写成纪实文学。
- 弱化文档（`handoff.md` / `roadmap.md` / `architecture.md` / `progress.md` / `session-log.md`）不再默认逐轮同步；只有其自身职责命中变化时才动（见 §13 / §14）。
- 阶段或产品口径变化明显时，还必须同步 `README.md` / `docs/planning/decisions.md`。
- 不允许"代码已经变了，但 `current.md` / `handoff.json` 还停留在旧阶段"。

## 8. Controlled Context Reset
- 下一轮优先依赖结构化交接物，而不是聊天历史。
- 每轮结束后的状态必须沉淀到 planning 与 `.agent-state`；仅存在于对话中的约定视为会丢失。
- 允许受控重启：重新读取仓库 -> 重新判断阶段 -> 选择唯一下一任务 -> 执行。

## 9. Mandatory Skill Usage
- `planning`：读取真实状态、判断阶段与前沿任务窗口、生成唯一下一原子任务。
- `task-execution`：只做当前原子任务的落地改动、最小验证、planning sync、单任务 commit。
- `task-verification`：完成定义检查、读回验证、completion gate 放行判断。
- `repo-onboard`：首次进入仓库的路径校验与快照采集。
- `debug-intake`：碎片输入生成 IssueCard。
- `debug-closeout`：结案生成 ErrorEntry 与 ArchiveDocument。

## 10. Acceptance-Facing Mindset（面向验收）
- 当前 D1 阶段选择任务时，优先问：页面是否更像产品？中文是否统一？演示是否更顺？用户是否更容易理解当前已做到什么？
- 不以“技术上还能继续堆什么功能”作为 D1 的最高优先级。
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
- **核心文档**（人读优先只看这五份）：
  - `AGENTS.md`：长期规则、工作流、DoD、夜跑边界、禁改区、文档职责。
  - `docs/planning/current.md`：唯一当前战况。阶段目标、前沿任务窗口（1~3 候选）、唯一执行中的原子任务、下一任务选择流程、DoD；不保留长篇历史实现细节，不重复 `git log`，不复制 `handoff.json.notes`。
  - `docs/planning/backlog.md`：唯一候选池。只留未开做候选；不再维护"已完成"区。
  - `docs/planning/decisions.md`：关键拍板与长期约束。仅在出现新的长期性决定时追加，不是轮次日志。
  - `.agent-state/handoff.json`：唯一机读状态。只保存下一轮选择所必需的结构化字段，不承载长篇 prose。
- **弱化/低频文档**（不再和核心文档重复状态；如需要，仅保留历史痕迹或薄重定向）：
  - `docs/planning/handoff.md`：以 `current.md` + `handoff.json` 为准，本文件不再逐轮追加。
  - `docs/planning/roadmap.md`：阶段代号索引，不再重复 backlog/decisions 细节。
  - `docs/planning/architecture.md`：详细规则见本文件 §2 / §6；仅保留分层示意。
  - `.agent-state/progress.md`：完成项明细见 `handoff.json.completed_atomic_tasks` 与 `git log`。
  - `.agent-state/session-log.md`：低频维护的历史时间线；非事实源，不强制追加。
- **已完成任务历史**：以 `git log` 与 `.agent-state/handoff.json.completed_atomic_tasks` 为主，不在 `current.md` / `backlog.md` 重复维护长已完成列表。
- **禁止**：在多个文档里并行维护"当前战况 / 已完成列表 / 上一轮详述"；核心文档与弱化文档之间出现冲突时，以核心文档为准。

## 14. Documentation Update Triggers（何时更新哪份文档）
- 每轮原子任务完成后，**必须执行 planning sync**：
  - `docs/planning/current.md`：必更。只覆盖当前阶段、前沿窗口、当前唯一执行中的原子任务、下一任务选择流程、DoD 当前态；"当前唯一执行中的原子任务"只保留当前态，不保留多轮旧任务正文。
  - `.agent-state/handoff.json`：必更。只写机读状态与下一轮必须保留的结构化字段；`notes` 只保留长期约束或关键边界，不复写任务完成明细。
  - `docs/planning/backlog.md`：条件更新。仅当前前沿任务窗口变化、候选任务被移除 / 新增 / 改名 / 重排优先级、或当前任务完成后需要显式切换下一前沿任务时修改。
- **按需**更新：
  - `AGENTS.md`：长期规则、工作流、文档职责、夜跑边界发生变化时。
  - `docs/planning/decisions.md`：产生了新的长期性决定（D-xxx 级别）时。
  - `README.md`：产品对外口径、阶段口径、演示说明发生变化时。
- **不要默认同时更新**：`handoff.md` / `roadmap.md` / `architecture.md` / `progress.md` / `session-log.md`。只有这些弱化文档自身职责命中变化时才动。
- **防膨胀约束**：单轮 planning sync 优先修改已有段落，不新增同义新段；若某段描述只是在重复 `backlog.md` / `decisions.md` / `git log` / `handoff.json`，必须删减或改为引用；非长期规则不得写入 `AGENTS.md`；非长期决策不得写入 `decisions.md`。

## 15. Overnight / Unattended Boundaries（夜跑 / 无人值守边界）
- 允许方向：文档对齐、`.agent-state/handoff.json` 对齐、verify 脚本补齐、低风险异味扫描、单个原子 UI 低风险小改（仍受 §5 安全美化限制）。
- 禁止方向（D1 阶段内全部禁止）：AI runtime 接入、Electron / preload / IPC、Node fs / `.debug_workspace` 写盘、MCP 接入、大规模 UI 重构、schema / store / closeout 工厂 / localStorage key 变更、多任务并行推进。
- 每轮仍遵守 §6 / §7：只一个原子任务在执行、完成前必须跑最小验证 + planning sync + 单任务 commit；夜跑不允许跳过。

## 16. Verification Matrix（验证矩阵）
- **必跑**（每轮都要跑，除非用户明确免除）：
  - `npm run typecheck`（在 `apps/desktop` 下）。
  - `npm run build`（在 `apps/desktop` 下）。
  - `git diff --check`（不限目录）。
  - `handoff.json` 可被 `JSON.parse`（`.agent-state/handoff.json`）。
- **按需**（任务相关时跑）：
  - `apps/desktop/scripts/verify-*.mts` 中与本轮改动语义相关的脚本。
  - 浏览器人工冒烟（涉及 UI 行为变化时；不改代码时可仅标注未执行）。
- **文档/规划类任务专用最小验证**：路径存在、内容可读、引用一致、planning sync 边界符合 §7 / §14、`JSON.parse` 通过、`git diff --check` 通过；typecheck 与 build 仍建议跑以避免误伤。
- 未跑的必跑项必须在 commit message 或 handoff 中如实标注原因，不得静默跳过。
