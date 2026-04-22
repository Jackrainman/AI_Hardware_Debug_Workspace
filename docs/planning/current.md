# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口、唯一执行中的原子任务。候选任务不等于顺推队列；更远任务放入 `backlog.md`。

## 当前阶段
- 阶段：D1：交差优先中文产品壳。
- 当前模式：`delivery_priority`。
- 阶段目标：先交付一个”好看、中文、能用、像产品壳”的 SPA 演示版本，让用户能看懂产品价值、当前能力和未完成边界；主操作区的”创建 → 选中 → 追记 → 结案 → 结果反馈”必须在当前页面上真的跑通，不止是看起来跑通。
- 切换原因：S2 技术主闭环关键路径已在 localStorage 路径打通；继续直接推进 S3 / Electron / fs 会让交差版本仍停留在工程验证壳，不利于验收演示。
- 阶段完成定义：
  - 主页面中文文案统一，标题、副标题、按钮、状态、表单、空状态不再混杂英文工程壳。
  - 项目区、问题卡区、归档区看起来像一个可演示的产品工作台，而不是裸占位。
  - 问题卡创建、追记、结案的最小演示路径清晰可理解，**并且在当前页面上能看到每一步的真实结果反馈**。
  - UI 不伪造未完成能力；Electron / fs / `.debug_workspace` 文件写盘仍如实标注为后续。
  - 不改 schema / store / Electron / fs / IPC，不重做业务数据流。

## 两条链路

### 链路 A：技术闭环主线（后续主线，当前降级）
- IssueCard / InvestigationRecord / Closeout / ArchiveDocument / ErrorEntry 主闭环继续加固。
- `.debug_workspace/archive` 与 `.debug_workspace/error-table` 文件系统写盘。
- Electron / preload / IPC 或其它 fs adapter。
- runtime log、repair task、失败恢复、读回校验、人工升级。
- 浏览器真实交互冒烟、历史检索、相似问题关联。

### 链路 B：当前交差优先链路（当前主线）
- 页面中文化和产品化文案。
- UI 视觉统一、层级整理、空状态设计。
- 问题卡区视觉重心优化，降低英文工程验证感。
- 项目区 / 归档区从裸占位改成“可演示壳”。
- 必要时补最小中文演示路径，但不动深层数据流。

## 当前唯一执行中的原子任务
- **无**。本轮 **D1-IA-PLANNING-SYNC** 只对齐 planning/state，不选择下一执行任务；下一轮仍需重新读取真实状态后再从前沿窗口选择唯一原子任务。

## 当前前沿任务窗口（候选，不等于顺推队列）
> 本轮按最新确认的页面 IA 保留 4 个 D1 候选：3 个低风险 IA 改动 + 1 个浏览器冒烟。仍不切回 S3 / 技术主线。

- D1-IA-LEFT-ISSUE-RAIL
  - 目标：把“选择问题卡”放到页面左侧，形成长期稳定的问题卡选择区。
  - 范围：页面布局、选择区中文文案、空状态、刷新/选择入口的视觉位置；复用现有 IssueCard 列表与选中状态。
  - 非目标：不改 schema / store / localStorage key / Electron / fs / IPC；不引入路由或新的全局状态模型；不把归档文件写盘包装成已完成。
  - 依赖关系：无。它是后续创建态和结案动作重排的 IA 基础。
- D1-IA-CREATE-ENTRY-MODES
  - 目标：没选中任何问题卡 / 第一次启动时，主界面默认显示“创建问题卡”；平时页面中心靠上保留主动“创建问题卡”入口。
  - 范围：创建入口的默认态、主动入口位置、创建成功后的结果反馈与选中衔接；保持现有创建数据流。
  - 非目标：不新增 AI intake 能力；不改 IssueCard 字段、校验、存储键；不新增演示数据伪装真实项目。
  - 依赖关系：依赖 D1-IA-LEFT-ISSUE-RAIL 提供稳定选择区。
- D1-IA-CLOSEOUT-HEADER-ACTION
  - 目标：选中问题卡后，把“结案”放到“查看归档列表”旁边，形成同一层级的主操作入口。
  - 范围：选中态主区域/顶部操作区的信息层级、结案入口位置、与归档列表入口的并列关系；保持现有 closeout 生成与 localStorage 归档链路。
  - 非目标：不改 ArchiveDocument / ErrorEntry schema；不改归档 store；不接 Electron / fs / IPC；不把 Drawer 或归档页重做成独立系统。
  - 依赖关系：依赖 D1-IA-LEFT-ISSUE-RAIL 提供明确的选中问题卡上下文。
- D1-MAINLINE-BROWSER-SMOKE
  - 目标：在浏览器里按新 IA 真人冒烟，确认默认创建态、左侧选择区、主动创建入口、追记、结案、归档列表与刷新后状态都能真实跑通。
  - 范围：只验证不改代码；覆盖第一次启动/无选中态、创建后选中、左侧选择切换、追加记录、结案入口与归档列表并列、刷新后 localStorage 状态。
  - 非目标：不修 UI；不改业务代码；不补 schema/store/Electron/fs/IPC。
  - 依赖关系：依赖 D1-IA-LEFT-ISSUE-RAIL、D1-IA-CREATE-ENTRY-MODES、D1-IA-CLOSEOUT-HEADER-ACTION 完成后执行。

## 下一任务选择流程
1. 重新读取：`AGENTS.md`、`README.md`、本文件、`docs/planning/backlog.md`、`docs/planning/decisions.md`、`.agent-state/handoff.json`、`git status`、最近 commit、`apps/desktop/src/App.tsx`、`App.css`、`index.css`。
2. 先确认 `current_mode` 是否仍为 `delivery_priority`；若是，优先链路 B。
3. 评估依据：
   - 是否最利于交差演示。
   - 是否提升中文一致性、产品感、演示顺畅度。
   - 是否保持核心数据流、接口、时序和行为兼容。
   - 是否避开 schema / store / Electron / fs / IPC 深改。
   - planning 与实际是否脱节；脱节时先更新 planning。
4. 从窗口中选择**唯一一个**下一原子任务，写入 `.agent-state/handoff.json.current_atomic_task`，再进入 `task-execution`；若仍未选择，保持“无 / WAITING_FOR_PLANNING_SELECTION”状态。

## 原子任务完成标准（DoD）
- 文件修改已落盘。
- 跑 AGENTS §16 验证矩阵中的必跑项（typecheck / build / `git diff --check` / `handoff.json` JSON.parse）；未跑的必跑项必须在交接中如实标注原因。
- 本文件 `current.md`、`docs/planning/backlog.md`、`.agent-state/handoff.json` 已更新（见 AGENTS §14）。
- 若阶段或对外口径受影响，`README.md` / `docs/planning/decisions.md` 同步。
- 弱化文档（`handoff.md` / `roadmap.md` / `architecture.md` / `progress.md` / `session-log.md`）仅在其自身职责命中变化时才动，不默认同步。
- 已完成独立 commit，且 message 对应单一任务结果。
- 以上任一项未满足，不得选择或执行下一任务。
