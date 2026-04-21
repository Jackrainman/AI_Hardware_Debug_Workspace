# 待办池（Backlog）

> Backlog 只存**未开做候选**池，不等于执行顺序。已完成原子任务列表以 `.agent-state/handoff.json.completed_atomic_tasks` + `git log` 为唯一事实源，本文件不再维护。D1 阶段的当前前沿任务只放在 `current.md`，不得把技术深化任务默认塞回当前窗口。

## 当前阶段
- D1：交差优先中文产品壳。当前前沿候选任务见下文；下一轮必须重新读取真实状态后再选择唯一原子任务，不自动顺推。

## 后续候选（D1 阶段内，不等于顺推队列）
- [ ] D1-ISSUE-LIST-HIDE-ARCHIVED：问题卡主列表隐藏或折叠 `status=archived` 的卡，让演示时主列表只剩未结案问题；不改 store 契约。
- [ ] D1-STEPPER-CLEANUP：把 IssuePane 内"1. 创建 / 2. 选择 / 3. 追记 / 4. 结案"四块大表单的视觉重心降权（收成更轻量提示或折叠区），**必须保证最小演示路径仍可跑通**；DoD 需谨慎评估。
- [ ] D1-MAINLINE-BROWSER-SMOKE：在浏览器里真人走一遍 header 双入口 → ProjectSelector popover → 创建 → 自动选中 → 追记 → 结案 → 右上角计数徽标变化 → 打开 Drawer 看最近摘要 + 全部列表 → 刷新页面验证 → 再创建一张看倒序列表；只验证、不改代码。

## 后续主线：链路 A 技术闭环深化
- [ ] S3-ENTRY-PLANNING：交差壳完成后，重新读取真实状态并选择唯一技术主线入口任务。
- [ ] `.debug_workspace/archive` 与 `.debug_workspace/error-table` 文件系统双写。
- [ ] Electron / preload / IPC 或其它 fs adapter 接入评估。
- [ ] runtime log 可视化与 repair task 机制产品化。
- [ ] 失败恢复、人工升级、读回校验修复路径。
- [ ] 历史相似问题检索增强。
- [ ] 团队协作与统计视图（按需）。

## 当前先不做
- 不继续深挖 S3 技术闭环。
- 不改 schema / store / Electron / fs / IPC。
- 不把 localStorage 归档说成 `.debug_workspace` 真实文件写盘。
- 不大规模重构 UI 组件结构。
