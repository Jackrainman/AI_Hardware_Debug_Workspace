# 工作区架构（Architecture）

## 分层目标
把仓库组织成“可持续规划、可执行、可验证、可交接、可归档”的 AI 协作结构。

## 五层分工

### 1. 规划层（Planning Layer）
- 位置：`docs/planning/`
- 作用：维护路线图、待办池、当前任务窗口、关键决策、交接文本。
- 产物：`roadmap.md`、`backlog.md`、`current.md`、`decisions.md`、`handoff.md`、`architecture.md`。

### 2. 执行层（Execution Layer）
- 位置：`apps/`、`packages/`（按需）、`scripts/`（按需）
- 作用：承载桌面应用与后续实现代码。
- 当前状态：`apps/desktop` 已存在，功能代码待实现。

### 3. 验证层（Verification Layer）
- 位置：`AGENTS.md` + `.agents/skills/*/SKILL.md`
- 作用：定义 schema 校验、工具 exit code 检查、读回验证、重试与人工升级规则。
- 当前状态：规则基础已存在，需统一重构为长期协作规范。

### 4. 交接层（Handoff Layer）
- 位置：`.agent-state/`
- 作用：在上下文重置后提供结构化续航信息（进度、会话日志、机器可读 handoff）。
- 产物：`progress.md`、`session-log.md`、`handoff.json`。

### 5. 产品功能层（Debug Product Layer）
- 位置：`.debug_workspace/`
- 作用：存放 active/archive/error-table/attachments 等调试闭环运行数据。

## 关键约束
- 任何原子任务完成后，必须同时更新规划层与交接层。
- 执行结果以“文件落盘 + 读回验证 + commit 记录”为准。
