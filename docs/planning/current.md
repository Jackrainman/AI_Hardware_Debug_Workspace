# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口（1~3 个候选）、唯一执行中的原子任务。候选任务不等于顺推队列；更远任务放入 `backlog.md`。

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
- **无**。本轮 **D1-ARCHIVE-PERSIST-INDEX** 已完成：右侧归档区在 mount 时从 `window.localStorage` 真实读回累计归档索引；改为展示“累计归档 N 条”徽标 + 最近一次归档摘要（文件名 / 错误表编号 / 来源问题 / 分类 / 归档时间），刷新后不再空掉；新增 [查看归档列表] 按钮，点击后打开右侧抽屉，倒序列出全部归档条目（文件名 / errorCode / 分类 / 来源问题 / 后续写盘位置 / 归档时间）；closeout 成功后自动刷新索引，计数和最近摘要立即更新。仅改 `App.tsx` / `App.css` / `archive-document-store.ts` / `error-entry-store.ts` 与 `scripts/verify-d1-archive-persist-index.mts`；未改 schema / closeout 工厂 / IssueCard 数据流 / 项目区 / Electron / fs / IPC / .debug_workspace 写盘。

## 当前前沿任务窗口（候选，不等于顺推队列）
- D1-MAINLINE-BROWSER-SMOKE：在浏览器里真人走一遍 创建 → 自动选中 → 追记 → 结案 → 结果面板读回 → 刷新验证右侧累计归档数量与最近摘要仍在 → 点击 [查看归档列表] 看到全部条目；只验证、不改代码。
- D1-ISSUE-LIST-HIDE-ARCHIVED：在中间问题卡列表里隐藏 `status=archived` 的卡（或折叠到“已归档”分组），让主列表只聚焦未结案问题；不改 store 契约。
- S3-ENTRY-PLANNING：交差壳完成后切回链路 A，评估 Electron/fs adapter、runtime log、repair task 的入口任务；需 planning 明确切回技术主线。

## 下一任务选择流程
1. 重新读取：`AGENTS.md`、`README.md`、本文件、`docs/planning/handoff.md`、`.agent-state/handoff.json`、`git status`、最近 commit、`apps/desktop/src/App.tsx`、`App.css`、`index.css`。
2. 先确认 `current_mode` 是否仍为 `delivery_priority`；若是，优先链路 B。
3. 评估依据：
   - 是否最利于交差演示。
   - 是否提升中文一致性、产品感、演示顺畅度。
   - 是否保持核心数据流、接口、时序和行为兼容。
   - 是否避开 schema / store / Electron / fs / IPC 深改。
   - planning 与实际是否脱节；脱节时先更新 planning。
4. 从窗口中选择**唯一一个**下一原子任务，写入交接文件，再进入 `task-execution`。

## 原子任务完成标准（DoD）
- 文件修改已落盘。
- 做最小验证：读回关键文件、JSON 可解析、引用状态一致、`git diff --check` 通过；除非用户明确要求，不自行编译。
- `docs/planning/current.md`、`docs/planning/handoff.md` 已更新。
- `.agent-state/progress.md`、`.agent-state/session-log.md`、`.agent-state/handoff.json` 已更新。
- 若阶段或 README 口径受影响，`README.md` / `roadmap.md` / `backlog.md` 同步。
- 已完成独立 commit，且 message 对应单一任务结果。
- 以上任一项未满足，不得选择或执行下一任务。
