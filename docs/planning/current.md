# 当前执行面板（Current）

## 当前阶段
- 阶段：S0 工作区规范化
- 阶段目标：完成文档、skills、交接机制的规范化重构，并保持每个原子任务单独 commit。（已完成）

## 当前状态
- 已完成原子任务：
  - A1：建立 `docs/planning`、`.agent-state`、`docs/product` 基础结构并迁移产品文档。
  - A2：重构 `AGENTS.md` 为长期 AI 协作规则文件。
  - A3：重构 `README.md` 为课程/作业风格中文文档。
  - A4：重构 skills 骨架并与 AGENTS 规则对齐。
  - A5：最终结构校验、文档一致性修正与总交接。
- 正在进行原子任务：
  - S1-A1：初始化 `apps/desktop` 最小可运行壳（下一阶段）。

## 当前只允许推进的原子任务
1. S1-A1：初始化桌面壳工程并确认可启动。
2. S1-A2：补齐 schema 校验代码骨架（IssueCard/InvestigationRecord/ErrorEntry/ArchiveDocument）。
3. S1-A3：实现本地存储最小读写与问题卡重开验证。

## 原子任务完成标准（DoD）
- 文件修改已落盘。
- 关键路径已做最小验证（存在性/可读性/引用一致性）。
- `docs/planning/handoff.md` 已更新。
- `.agent-state/progress.md` 与 `.agent-state/handoff.json` 已更新。
- 已完成独立 commit，且 message 对应单一任务结果。
