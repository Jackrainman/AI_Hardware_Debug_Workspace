# 待办池（Backlog）

## P0（必须尽快完成）
- [x] 重写 `AGENTS.md`，落地规划-执行-验证-交接闭环规则。
- [x] 重写课程风格中文 `README.md`，确保“已实现/规划中”状态真实。
- [x] 新增 `planning` / `task-execution` / `task-verification` 三个 skills。
- [x] 统一 `repo-onboard` / `debug-intake` / `debug-closeout` 的最小骨架结构。
- [x] 建立原子任务级 commit 与 handoff 更新节奏。

## P1（MVP 近期）
- [ ] 选型并初始化 `apps/desktop`（Electron 或 Tauri）。
- [ ] 定义并实现 IssueCard/InvestigationRecord/ErrorEntry/ArchiveDocument schema。
- [ ] 跑通最小闭环：仓库绑定 → 问题卡创建 → 结案归档。
- [ ] 归档读回验证与 repair task 机制。

## P2（后续增强）
- [ ] 历史相似问题检索增强。
- [ ] 运行时日志可视化。
- [ ] 团队协作与统计视图（按需）。
