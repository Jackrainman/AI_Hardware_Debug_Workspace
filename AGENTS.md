# AGENTS Rules

## 1. Project Overview
- 本项目是“绑定 Git 仓库的硬件调试闭环工作区”。
- 核心模块：项目绑定与仓库快照、IssueCard intake、InvestigationRecord 追记、debug closeout、ArchiveDocument / ErrorEntry 归档。
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
- `current.md` 的前沿任务窗口只放当前链路 B 的 1~3 个候选；链路 A 放入 roadmap / backlog / handoff 的“后续主线”区域。
- 禁止把链路 A 和链路 B 混写成一个模糊任务堆；禁止让 AI 把技术闭环深化误判为当前最高优先级。

## 5. Safe Polish Rule（安全美化规则）
- 当前阶段允许：中文文案替换、UI 视觉统一、空状态设计、卡片/按钮/表单/布局层优化、演示路径清晰化、必要的最小中文演示数据入口。
- 当前阶段禁止：为了美化重做业务数据流；无必要扩展 schema / store / Electron / fs / IPC；把占位功能包装成已完成；大规模重构或引入复杂抽象。
- 涉及硬件访问、仓库访问、归档写盘路径时，优先可预测性和可调试性，不为视觉改动牺牲真实状态表达。

## 6. Rolling Planning And Next Task Selection
- 每轮只允许一个原子任务处于执行中。
- 开始下一轮前必须重新读取：`AGENTS.md`、`README.md`、`docs/planning/current.md`、`docs/planning/handoff.md`、`.agent-state/handoff.json`、`git status`、最近 commit、相关代码目录。
- 选择下一任务时优先判断：当前 mode、阶段目标、completion gate 是否闭合、依赖是否满足、planning 与实际是否脱节、是否最有利于验收演示。
- 如果 `current.md` 前沿窗口不再匹配真实阶段，先更新 planning / handoff / state，再执行任务。
- 禁止凭旧计划机械顺推；禁止同时推进两个原子任务。

## 7. Completion Gate And Mandatory Doc Sync
- 当前原子任务未完成“最小验证 + 交接更新 + 单任务 commit”前，不得选择或执行下一任务。
- 每次完成一个原子任务后，至少检查并按需更新：
  - `docs/planning/current.md`
  - `docs/planning/handoff.md`
  - `docs/planning/backlog.md`
  - `.agent-state/progress.md`
  - `.agent-state/session-log.md`
  - `.agent-state/handoff.json`
- 若阶段或产品口径变化明显，还必须同步 `README.md` / `docs/planning/roadmap.md` / `docs/planning/decisions.md`。
- 不允许“代码已经变了，但 README/current/handoff 还停留在旧阶段”。

## 8. Controlled Context Reset
- 下一轮优先依赖结构化交接物，而不是聊天历史。
- 每轮结束后的状态必须沉淀到 planning 与 `.agent-state`；仅存在于对话中的约定视为会丢失。
- 允许受控重启：重新读取仓库 -> 重新判断阶段 -> 选择唯一下一任务 -> 执行。

## 9. Mandatory Skill Usage
- `planning`：读取真实状态、判断阶段与前沿任务窗口、生成唯一下一原子任务。
- `task-execution`：只做当前原子任务的落地改动、最小验证、交接更新、单任务 commit。
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
- 文档/规划重构的最小验证：路径存在、内容可读、引用一致、JSON 可解析、`git diff --check` 通过、提交范围聚焦。
- 用户当前偏好：除非明确要求，不由 AI 自行编译；若任务需要编译作为完成定义，必须明确说明并等待用户执行或授权。
