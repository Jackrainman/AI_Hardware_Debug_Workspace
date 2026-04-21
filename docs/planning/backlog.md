# 待办池（Backlog）

> Backlog 只存候选池，不等于执行顺序。D1 阶段的当前前沿任务只放在 `current.md`，不得把技术深化任务默认塞回当前窗口。

## 已完成
- [x] S0：工作区规范化、规划区、交接区、skills 骨架、原子任务提交节奏。
- [x] S1：`apps/desktop` 最小 SPA、schema 骨架、IssueCard localStorage save/load。
- [x] D-007：Electron / fs / IPC 明确延后，S1 关闭。
- [x] S2-A1：IssueCard intake 最小表单。
- [x] S2-A2：IssueCard 列表视图。
- [x] M-1：typecheck 脚本修复。
- [x] S2-A3：InvestigationRecord 追加与按 IssueCard 读回。
- [x] S2-A4：closeout 生成 ArchiveDocument + ErrorEntry，并回写 IssueCard archived。
- [x] S2-CLOSEOUT-DOCS：同步 S2 收口状态。
- [x] D1-RULES-REALIGN：切换到交差优先模式，重整双链路规则、planning、handoff 与 state。
- [x] D1-UI-V0-CN-SHELL-POLISH：中文化主壳文案、按钮、表单标签、状态、空状态，并把项目区/归档区改为可演示壳；未改业务数据流。
- [x] D1-UI-V1-VISUAL-HIERARCHY：优化主标题/阶段标签/三栏标题层级、问题卡区视觉重心、卡片/表单/列表密度、状态/说明区分和页面留白；仅改展示层与交接文档。
- [x] D1-DEMO-PATH-MIN-CN：补最小中文演示路径，让创建问题卡、追记、结案流程更适合演示；不伪造 Electron/fs 能力。
- [x] D1-MAINLINE-WIRE-CONNECT：串联主操作区主线闭环——创建后自动选中新卡、新增 MainlineResultPanel 集中展示当前卡与归档摘要、FlowGuide 根据真实状态反映当前步骤、CloseoutForm.onClosed 回传 summary；只改 App.tsx / App.css，未改 schema / store / verify 脚本 / 业务数据流。

## 当前阶段：D1 交差优先中文产品壳
- 当前无前沿候选任务。主操作区主线闭环串联已落地；下一轮重新读取真实状态后按下文"后续候选"重新选择。

## 后续候选（不等于顺推队列，D1 阶段内可继续）
- [ ] D1-MAINLINE-BROWSER-SMOKE：在浏览器里真人走一遍 创建 → 自动选中 → 追记 → 结案 → MainlineResultPanel 读回；只验证、不改代码。
- [ ] D1-ARCHIVE-PANE-MIN-RESULT：归档区从纯占位升级为"当前浏览器本地有 N 条 ArchiveDocument + M 条 ErrorEntry"的最小结果提示（只读 localStorage，不改 store / schema / fs）。

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
