# 工作区架构（Architecture）

## 分层目标
把仓库组织成“可持续规划、可执行、可验证、可交接、可归档”的 AI 协作结构。

## 工作流图景（滚动前沿视角）

```
长期目标（roadmap）
   │
   ▼
当前阶段目标（current.md 顶部）
   │
   ▼
前沿任务窗口（current.md，1~3 个候选）
   │
   ▼
唯一执行中的原子任务（current.md）
   │
   ▼
执行（apps/ 代码改动 + 最小改动原则）
   │
   ▼
验证（schema / exit code / 读回 / 构建）
   │
   ▼
交接更新（planning/handoff + .agent-state/*）
   │
   ▼
commit（一个原子任务 = 一个 commit）
   │
   ▼
受控上下文重置
   │
   ▼
重新读取（AGENTS / current / handoff / handoff.json / git status / 关键目录）
   │
   ▼
下一任务自动选择（唯一一个，基于真实状态）
   │
   └──► 回到“唯一执行中的原子任务”
```

任何一步失败，都要回到上一步修复；禁止跳过验证或交接直接进入下一轮。

## 五层分工

### 1. 规划层（Planning Layer）
- 位置：`docs/planning/`
- 作用：维护长期路线图、候选 backlog、当前阶段、前沿任务窗口、关键决策、交接文本。
- 产物：`roadmap.md`、`backlog.md`、`current.md`、`decisions.md`、`handoff.md`、`architecture.md`。
- 滚动前沿原则：`current.md` 只放“当前阶段 + 前沿窗口 + 唯一任务”，不堆 backlog。

### 2. 执行层（Execution Layer）
- 位置：`apps/`、`packages/`（按需）、`scripts/`（按需）
- 作用：承载桌面应用与实现代码。
- 原则：一次只做一个原子任务，不混入其他任务改动。

### 3. 验证层（Verification Layer）
- 位置：`AGENTS.md` + `.agents/skills/*/SKILL.md`
- 作用：定义 schema 校验、工具 exit code 检查、读回验证、completion gate、重试与人工升级规则。
- 放行条件：最小验证 + 交接更新 + commit 三者齐全，才允许进入“下一任务选择”。

### 4. 交接层（Handoff Layer）
- 位置：`.agent-state/`
- 作用：在上下文重置后提供结构化续航信息。
- 产物：`progress.md`、`session-log.md`、`handoff.json`。
- 原则：任何仅存在于对话历史中的约定，都必须沉淀到这里，否则下一轮会丢失。

### 5. 产品功能层（Debug Product Layer）
- 位置：`.debug_workspace/`
- 作用：存放 active/archive/error-table/attachments 等调试闭环运行数据。

## 关键约束
- 任何原子任务完成后，必须同时更新规划层与交接层。
- 执行结果以“文件落盘 + 读回验证 + commit 记录”为准。
- 下一任务不得机械顺推，必须在重新读取仓库后重新选择。
