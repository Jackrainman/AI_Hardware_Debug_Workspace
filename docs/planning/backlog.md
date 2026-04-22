# 待办池（Backlog）

> Backlog 只存**未开做候选**池，不等于执行顺序。已完成原子任务列表以 `.agent-state/handoff.json.completed_atomic_tasks` + `git log` 为唯一事实源，本文件不再维护。当前前沿任务只放在 `docs/planning/current.md`。

## 当前阶段
- S3：技术闭环深化入口。D1 中文产品壳的主流程浏览器 smoke 已通过；当前唯一前沿候选见 `docs/planning/current.md`。

## 后续候选（S3 技术闭环深化，不等于顺推队列）
- [ ] `.debug_workspace/archive` 与 `.debug_workspace/error-table` 文件系统双写。
- [ ] Electron / preload / IPC 或其它 fs adapter 接入评估。
- [ ] runtime log 可视化与 repair task 机制产品化。
- [ ] 失败恢复、人工升级、读回校验修复路径。
- [ ] 历史相似问题检索增强。
- [ ] 团队协作与统计视图（按需）。

## 当前先不做
- 不在未完成 `S3-ENTRY-PLANNING` 前直接开写 Electron / fs / IPC。
- 不改动 D1 已验证的 UI 数据流，除非后续任务明确是低风险修补。
- 不把 localStorage 归档说成 `.debug_workspace` 真实文件写盘。
- 不大规模重构 UI 组件结构。
