# 路线图（Roadmap）

## 阶段 S0：工作区规范化（已完成）
- 目标：把仓库整理为可长期 AI 协作开发的结构化工作区。
- 交付物：
  - `AGENTS.md`、`docs/planning/`、`.agent-state/`、`.agents/skills/` 基础规则与交接机制已建立。
  - 原子任务、验证、交接、commit 的工作流已落地。

## 阶段 S1：MVP SPA 壳与本地存储（已完成，Electron 已延后）
- 目标：跑通最小前端壳，支持 IssueCard 的本地读写。
- 交付物：
  - `apps/desktop` Vite + React + TypeScript SPA。
  - zod schema 骨架。
  - IssueCard 基于 `window.localStorage` 的保存与读回。
  - D-007 明确 Electron / fs / IPC 延后，不再阻塞 S1。

## 阶段 S2：调试闭环主流程（已完成关键路径）
- 目标：在 SPA + localStorage 路径打通“IssueCard intake -> InvestigationRecord 追记 -> closeout -> ArchiveDocument + ErrorEntry -> IssueCard archived”主闭环。
- 交付物：
  - IssueCard intake 表单、列表刷新、选中。
  - InvestigationRecord 追加与按 IssueCard 读回。
  - closeout 生成 ArchiveDocument + ErrorEntry，并回写 IssueCard archived。
  - Node 黑盒验证覆盖 S1-A3 / S2-A1 / S2-A2 / S2-A3 / S2-A4。
- 明确边界：
  - ArchiveDocument / ErrorEntry 当前仍写入 localStorage，不是 `.debug_workspace` 文件系统写盘。
  - 浏览器真实人工冒烟尚未执行。
  - UI 当前仍偏工程验证壳，中文化和产品感不足。

## 阶段 D1：交差优先中文产品壳（当前阶段）
- 当前模式：`delivery_priority`。
- 阶段目标：先交付一个“好看、中文、能用、像产品壳”的可演示版本，让用户能理解产品价值和已完成边界。
- 优先链路：链路 B（当前交差优先链路）。
- 里程碑：
  - D1-UI-V0：中文文案、标题、副标题、状态、按钮、表单、空状态统一。
  - D1-UI-V1：项目区 / 问题卡区 / 归档区视觉层级整理，形成更像产品的首页工作台。
  - D1-DEMO-PATH：在不重做数据流的前提下补最小中文演示路径，让创建、追记、结案更顺。
- 禁止事项：
  - 不借 D1 之名重写 schema / store / Electron / fs / IPC。
  - 不把占位区包装成已完成真实功能。
  - 不把 S3 技术深化误判为当前最高优先级。

## 阶段 S3：技术闭环深化（后续主线，当前降级）
- 恢复条件：D1 交差壳完成并在 planning / handoff / `.agent-state` 中明确切回技术主线。
- 目标：继续加固真实调试闭环、文件写盘、可观测性与恢复机制。
- 后续内容：
  - `.debug_workspace/archive` 与 `.debug_workspace/error-table` 文件系统双写。
  - Electron / preload / IPC 或其它 fs adapter 接入评估。
  - runtime log、repair task、失败恢复和人工升级路径产品化。
  - 浏览器人工冒烟与更完整验证矩阵。

## 阶段 S4：协作与扩展（规划中）
- 历史相似问题检索增强。
- 多项目、团队协作和统计视图。
- 更深 repo-aware 能力与跨项目经验复用。
