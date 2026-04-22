# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口、唯一执行中的原子任务。候选任务不等于顺推队列；更远任务放入 `backlog.md`。

## 当前阶段
- 阶段：D1：交差优先中文产品壳。
- 当前模式：`delivery_priority`。
- 阶段目标：先交付一个”好看、中文、能用、像产品壳”的 SPA 演示版本，让用户能看懂产品价值、当前能力和未完成边界；主操作区的”创建 → 选中 → 追记 → 结案 → 结果反馈”必须在当前页面上真的跑通，不止是看起来跑通。
- 当前边界：不切回 S3 / technical_mainline；不改 schema / store 契约 / localStorage key / Electron / fs / IPC；不新增 `task.md` / `tasks/` 目录；不做大规模组件拆分。
- 阶段完成定义：
  - 主页面中文文案统一，标题、副标题、按钮、状态、表单、空状态不再混杂英文工程壳。
  - 项目区、问题卡区、归档区看起来像一个可演示的产品工作台，而不是裸占位。
  - 问题卡创建、追记、结案的最小演示路径清晰可理解，并且在当前页面上能看到每一步的真实结果反馈。
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
- **D1-IA-ISSUE-RAIL-CREATE-ACTION（待执行）**。
  - 目标：已选中问题卡时，主区域聚焦主线内容；把“创建新问题卡”从主区域大块常驻表单改为问题卡区 header 右侧的显式按钮入口。
  - 前置状态：D1-ISSUE-RAIL-INITIAL-AUTO-LOAD 已完成代码修复与验证；左侧问题卡列表进入/刷新页面会自动同步加载一次，且不会自动选中第一张卡。
  - 范围：主要改 `apps/desktop/src/App.tsx` 条件渲染与轻量状态切换，必要时改 `App.css`；保持默认未选中创建态。
  - 非目标：不改 schema / store / localStorage key / closeout / archive / error-entry 数据流；不做大规模组件拆分。

## 当前前沿任务窗口（候选，不等于顺推队列）
> 本轮用户指定固定顺序：任务 A 已完成后，只允许进入任务 B；D1-MAINLINE-BROWSER-SMOKE 继续留在 backlog，待 B 完成并提交后再重新判断。

- D1-IA-ISSUE-RAIL-CREATE-ACTION
  - 目标：选中问题卡时隐藏主区域常驻创建大表单，改由问题卡区 header 右侧“创建新问题卡”按钮进入创建态。
  - 范围：App.tsx 条件渲染 / 轻量状态；App.css header action 布局收口。
  - 验收：未选中问题卡时默认创建态正常；已选中时主区域只保留当前问题卡与闭环状态、追加记录、时间线、结案表单；点击 header 按钮后可进入创建态。
  - 依赖关系：D1-ISSUE-RAIL-INITIAL-AUTO-LOAD 已完成。

## 下一任务选择流程
1. 重新读取：`AGENTS.md`、`README.md`、本文件、`docs/planning/backlog.md`、`docs/planning/decisions.md`、`.agent-state/handoff.json`、`git status`、最近 commit、`apps/desktop/src/App.tsx`、`App.css`、`index.css`。
2. 先确认 `current_mode` 是否仍为 `delivery_priority`；若是，优先链路 B，不切回 S3 / technical_mainline。
3. 本轮任务顺序固定：D1-IA-ISSUE-RAIL-CREATE-ACTION 是唯一下一原子任务。
4. 任务 B 完成前不得推进浏览器冒烟或技术主线；任务 B 完成后必须再次执行验证、compact planning sync、单独 commit。

## 原子任务完成标准（DoD）
- 文件修改已落盘。
- 跑 AGENTS §16 验证矩阵中的必跑项：`npm run typecheck`、`npm run build`、`git diff --check`、`.agent-state/handoff.json` JSON.parse。
- 本文件 `current.md`、`.agent-state/handoff.json` 必须 compact 覆盖同步；`docs/planning/backlog.md` 仅在前沿窗口变化时更新。
- 若阶段或对外口径受影响，`README.md` / `docs/planning/decisions.md` 同步。
- 弱化文档（`handoff.md` / `roadmap.md` / `architecture.md` / `progress.md` / `session-log.md`）仅在其自身职责命中变化时才动，不默认同步。
- 已完成独立 commit，且 message 对应单一任务结果。
- 以上任一项未满足，不得选择或执行下一任务。
