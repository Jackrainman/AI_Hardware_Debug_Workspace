# 待办池（Backlog）

## P0（必须尽快完成）
- [x] 重写 `AGENTS.md`，落地规划-执行-验证-交接闭环规则。
- [x] 重写课程风格中文 `README.md`，确保“已实现/规划中”状态真实。
- [x] 新增 `planning` / `task-execution` / `task-verification` 三个 skills。
- [x] 统一 `repo-onboard` / `debug-intake` / `debug-closeout` 的最小骨架结构。
- [x] 建立原子任务级 commit 与 handoff 更新节奏。

## P1（MVP 近期）
- [x] 初始化 `apps/desktop` 最小 SPA（Electron 按 D-007 延后）。
- [x] 定义并实现 IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument schema。
- [x] 跑通最小闭环：IssueCard 创建 → 列表选中 → InvestigationRecord 追记 → closeout 生成 ArchiveDocument + ErrorEntry。
- [x] 完成 localStorage 读回验证与结构化失败路径覆盖（S2-A4 Node 黑盒验证）。
- [x] S2-CLOSEOUT-DOCS：同步 README / roadmap / backlog / planning / handoff / `.agent-state` 阶段状态。
- [ ] UI-V1：浏览器真实交互冒烟，确认 S2-A4 DOM 路径无偏差。
- [ ] S3-ENTRY-PLANNING：重新读取仓库状态后，只选择一个 S3 入口原子任务。

## P2（后续增强）
- [ ] `.debug_workspace/archive` 与 `.debug_workspace/error-table` 文件系统双写。
- [ ] Electron / preload / IPC 或其它 fs adapter 接入评估。
- [ ] runtime log 可视化与 repair task 机制产品化。
- [ ] 历史相似问题检索增强。
- [ ] 团队协作与统计视图（按需）。
