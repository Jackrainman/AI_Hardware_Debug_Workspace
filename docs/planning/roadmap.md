# 路线图（Roadmap）

## 阶段 S0：工作区规范化（已完成）
- 目标：把仓库整理为可长期 AI 协作开发的结构化工作区。
- 里程碑：
  - 重构 `AGENTS.md` 为可执行规则。
  - 重构课程风格 `README.md`。
  - 建立 `docs/planning/` 与 `.agent-state/` 交接机制。
  - 统一 `.agents/skills/` 关键骨架。
- 交付物：
  - 文档与目录规范完成。
  - 每个原子任务均有独立 commit 与交接更新。

## 阶段 S1：MVP 桌面壳与本地存储（已完成，Electron 已延后）
- 目标：跑通最小桌面壳，支持本地项目与问题卡存取。
- 里程碑：
  - `apps/desktop` SPA 启动成功。
  - zod schema 骨架已覆盖 RepoSnapshot / IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument。
  - IssueCard 基于 `window.localStorage` 的保存与读回可用。
  - Electron 外壳按 D-007 明确延后，不再阻塞 S1 关闭。
- 交付物：
  - 最小可运行 SPA。
  - IssueCard 基础数据读写层。
  - S1 关闭决策与交接状态。

## 阶段 S2：调试闭环主流程（主闭环关键路径已完成）
- 目标：打通“绑定仓库 → intake → 追记 → 结案归档”闭环，阶段内以 SPA + localStorage 承载。
- 里程碑：
  - IssueCard intake 表单可生成结构正确的问题卡。
  - IssueCard 列表可刷新并选中目标卡片。
  - InvestigationRecord 可追加并按 IssueCard 关联读回。
  - closeout 可生成 ArchiveDocument + ErrorEntry，并把 IssueCard 回写为 `archived`。
  - Node 黑盒验证覆盖 intake -> 追记 -> closeout -> ArchiveDocument / ErrorEntry / IssueCard 读回。
- 交付物：
  - S2 最小闭环可演示流程。
  - localStorage 读回验证与结构化失败路径。
  - README / roadmap / backlog / handoff 状态同步。
  - 未完成边界：`.debug_workspace` 文件系统双写、Electron/IPC、repair task 机制仍留到后续阶段评估。

## 阶段 S3：验证与可观测性强化（下一阶段候选，未开始）
- 目标：把 schema 校验、工具执行检查、重试与人工升级机制产品化。
- 里程碑：
  - runtime log 可追踪。
  - repair task 机制可触发。
  - 文件系统归档读回与 localStorage 路径的边界明确。
  - 全关键工具调用 exit code 与失败升级路径可追踪。
- 已有基础：
  - 全关键实体 schema 校验已在 S1/S2 主路径接入。
- 交付物：
  - 稳定的反馈闭环层。

## 阶段 S4：协作与扩展（规划中）
- 目标：增强团队协作、历史检索和更深 repo-aware 能力。
- 交付物：
  - 相似问题检索增强。
  - 团队视角统计（可选）。
