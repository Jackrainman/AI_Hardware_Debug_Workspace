# 工作区架构（Architecture）— 弱化

> 本文件已弱化为分层示意；完整规则以 `AGENTS.md` 为准，参见 §2（Workspace Rules）与 §6（Rolling Planning）。

## 五层分工（示意）
1. **规划层** `docs/planning/`：长期路线图、候选 backlog、当前阶段、关键决策。核心文档见 `AGENTS.md` §13。
2. **执行层** `apps/`：桌面应用与实现代码。每次只做一个原子任务。
3. **验证层** `AGENTS.md` §16 验证矩阵 + `.agents/skills/*/SKILL.md`：schema / exit code / 读回 / completion gate。
4. **交接层** `.agent-state/`：上下文重置交接。机读状态 `handoff.json` 为唯一事实源。
5. **产品功能层** `.debug_workspace/`：active / archive / error-table / attachments 等调试闭环运行数据（当前以 localStorage 替代，文件写盘为 S3 方向）。

## 工作流（简述）
长期目标 → 阶段目标（`current.md`）→ 前沿任务窗口（1~3 候选）→ 唯一执行中的原子任务 → 最小改动执行 → 验证矩阵 → 交接更新（`current.md` + `handoff.json`）→ 单任务 commit → 受控上下文重置 → 重新读取 → 下一任务自动选择。

完整工作流描述见 `AGENTS.md` §6 / §7 / §14；本文件不再复写。
