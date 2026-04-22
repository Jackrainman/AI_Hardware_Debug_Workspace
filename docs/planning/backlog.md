# 待办池（Backlog）

> Backlog 只存**未开做候选**池，不等于执行顺序。已完成原子任务列表以 `.agent-state/handoff.json.completed_atomic_tasks` + `git log` 为唯一事实源，本文件不再维护。D1 阶段的当前前沿任务只放在 `current.md`，不得把技术深化任务默认塞回当前窗口。

## 当前阶段
- D1：交差优先中文产品壳。当前前沿候选任务见 `docs/planning/current.md`；下一轮必须重新读取真实状态后再选择唯一原子任务，不自动顺推。

## 后续候选（D1 阶段内，不等于顺推队列）
- 当前暂无额外 D1 backlog 候选；`D1-MAINLINE-BROWSER-SMOKE` 已回到 `current.md` 前沿窗口，仍处于待人工浏览器冒烟 / 环境阻塞状态。

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
