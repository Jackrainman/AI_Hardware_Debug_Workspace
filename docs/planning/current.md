# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口、唯一执行中的原子任务。候选任务不等于顺推队列；更远任务放入 `backlog.md`。

## 当前阶段
- 阶段：S3：技术闭环深化入口。
- 当前模式：`technical_mainline`。
- 阶段目标：D1 中文产品壳已完成 Playwright/Chromium 主流程浏览器 smoke；下一轮重新接回链路 A，先用一个规划入口任务确认技术闭环深化的唯一原子切入点，再执行具体代码任务。
- 当前边界：当前仍是浏览器 SPA + `window.localStorage`；Electron / fs / IPC / `.debug_workspace` 文件写盘仍未接入。S3 入口任务只做真实状态复核与唯一技术任务选择，不直接大改业务代码。
- 仓库卫生边界：个人 AI/assistant/IDE 工具痕迹保持未跟踪；`.agents/skills/**` 与 `.agent-state/**` 仍按项目共享技能与交接事实源保留。
- D1 已验事实：`D1-MAINLINE-BROWSER-SMOKE` 已用 headless Chromium 覆盖默认创建态、问题卡创建/选中、左侧刷新/切换、header 创建入口、追加记录、结案、归档抽屉、刷新后 localStorage 读回；这是浏览器自动化 smoke，不等同于人工视觉验收。

## 两条链路

### 链路 A：技术闭环主线（当前主线）
- IssueCard / InvestigationRecord / Closeout / ArchiveDocument / ErrorEntry 主闭环继续加固。
- `.debug_workspace/archive` 与 `.debug_workspace/error-table` 文件系统写盘。
- Electron / preload / IPC 或其它 fs adapter。
- runtime log、repair task、失败恢复、读回校验、人工升级。
- 历史检索、相似问题关联与真实仓库上下文增强。

### 链路 B：交差优先中文产品壳（已完成当前 smoke，转维护）
- 中文化、视觉统一、空状态、问题卡主流程 IA 与归档入口已进入可演示状态。
- 后续只做低风险修补；不得把 localStorage / 占位区包装成已完成的 Electron / 文件系统能力。

## 当前唯一执行中的原子任务
- **S3-ENTRY-PLANNING（待下一轮执行）**。
  - 目标：重新读取真实仓库状态，基于 D1 smoke 已通过的事实，选择链路 A 技术闭环深化的唯一下一原子任务。
  - 范围：planning/state 对齐；判断是否先做 `.debug_workspace` 写盘、Electron/fs adapter、验证脚本或恢复机制中的一个最小入口。
  - 非目标：不在同一轮直接实现 Electron / fs / IPC；不重做 UI；不改 schema / store / localStorage key，除非 S3 入口任务明确拆出并选择为下一原子任务。
  - 当前状态：待下一轮重新读取仓库后执行；本轮不继续推进下一任务。

## 当前前沿任务窗口（候选，不等于顺推队列）
- S3-ENTRY-PLANNING
  - 目标：交差壳 smoke 通过后，重新读取真实状态并选择唯一技术主线入口任务。
  - 范围：更新 `current.md` / `.agent-state/handoff.json` / 必要时 `backlog.md`；只做规划入口，不混入具体实现。
  - 非目标：不直接做 Electron / fs / IPC；不一次性展开多个 S3 任务；不跳过验证与单任务 commit。
  - 依赖关系：`D1-MAINLINE-BROWSER-SMOKE` 已通过。
  - 当前状态：待执行。

## 下一任务选择流程
1. 重新读取：`AGENTS.md`、`README.md`、本文件、`docs/planning/backlog.md`、`docs/planning/decisions.md`、`.agent-state/handoff.json`、`git status`、最近 commit；再按 S3 入口需要读取相关代码目录。
2. 先确认 `current_mode` 是否仍为 `technical_mainline`，并确认 `D1-MAINLINE-BROWSER-SMOKE` 已在完成列表中。
3. 执行 `S3-ENTRY-PLANNING`：只选择链路 A 的一个最小技术入口任务，不同时推进实现。
4. 若发现 D1 smoke 结论与真实仓库状态脱节，先做 planning sync/repair，不得直接进入技术实现。

## 原子任务完成标准（DoD）
- 文件修改已落盘。
- 跑 AGENTS §16 验证矩阵中的必跑项：`npm run typecheck`、`npm run build`、`git diff --check`、`.agent-state/handoff.json` JSON.parse。
- 本文件 `current.md`、`.agent-state/handoff.json` 必须 compact 覆盖同步；`docs/planning/backlog.md` 仅在前沿窗口变化时更新。
- 若阶段或对外口径受影响，`README.md` / `docs/planning/decisions.md` 同步。
- 弱化文档（`handoff.md` / `roadmap.md` / `architecture.md` / `progress.md` / `session-log.md`）仅在其自身职责命中变化时才动，不默认同步。
- 已完成独立 commit，且 message 对应单一任务结果。
- 以上任一项未满足，不得选择或执行下一任务。
