---
name: planning
description: 读取仓库真实状态，维护“滚动前沿”任务窗口，生成唯一的下一原子任务；不做顺推式长计划展开。
---

## when to use
- 任务开始前需要确认当前阶段与前沿任务窗口。
- 一个原子任务完成后，需要基于最新仓库状态重新选择下一个唯一原子任务。
- 上下文重置后需要快速恢复“下一步到底做什么”。
- 发现 planning 与仓库实际脱节时，先修 planning 再继续。

## inputs
```json
{
  "goal": "string",
  "constraints": ["string"],
  "repoState": {
    "agents": "AGENTS.md",
    "current": "docs/planning/current.md",
    "agentHandoff": ".agent-state/handoff.json",
    "gitStatusShort": "string",
    "gitLogOneline5": "string",
    "keyPaths": ["当前任务直接相关代码或专项文档"]
  }
}
```

## steps
1. 默认读取 `AGENTS.md`、`docs/planning/current.md`、`.agent-state/handoff.json`。
2. 跑 `git status --short` 与 `git log --oneline -5`，核对 planning 与实际是否一致；若脱节，**先更新 planning 再继续**。
3. 只读取当前任务直接相关代码或专项文档；不要默认读取对外展示文档、产品定义文档、候选池或长期决策文档。
4. 条件读取：
   - 当前前沿窗口耗尽、任务切换、候选新增/移除/改名/重排优先级时，读取 `docs/planning/backlog.md`。
   - 阶段切换、长期规则变化、技术争议或需要核对长期拍板时，读取 `docs/planning/decisions.md`。
   - 改产品定义、页面结构、领域模型、用户场景或领域语言时，读取 `docs/product/产品介绍.md`。
   - 改对外展示、快速开始、比赛/演示口径时，读取 `README.md`。
   - 命中 S3 API / SQLite / 服务器不可达策略实现时，读取对应 `docs/planning/s3-*.md` 专项输入。
5. 维护两层状态：
   - `current.md` 只保留 1 个当前任务 + 1~3 个前沿候选；
   - `handoff.json.pending_task_queue` / `backlog.md` 维护完整串行队列与依赖顺序。
6. 每个原子任务都必须明确写出：目标、直接输入边界、不做项、工程化验证、完成定义、后继依赖；缺任何一项都不允许进入执行。
7. 若 `current_mode = server_storage_migration`，默认技术路线必须是：**先 `S3-ARCH-*` 架构缝合，再本地 WSL 最小 backend / HTTP / SQLite 闭环，最后服务器独立部署验证**；不得回退成“服务器 inventory 优先”或“直接去服务器试出来”。
8. 选择下一任务时，只能从完整队列里认领 **第一个“依赖已满足且未完成”的任务**；禁止 AI 发散式自己找事做。
9. 写回 `docs/planning/current.md` 的当前唯一任务 / 下一步最小动作，以及 `.agent-state/handoff.json` 的 `current_atomic_task`、`frontier_tasks`、`pending_task_queue`、`next_task_selection_basis`。

## output
```json
{
  "currentStage": "string",
  "currentStageGoal": "string",
  "frontierTasks": ["string"],
  "pendingTaskQueue": ["string"],
  "currentAtomicTask": "string",
  "selectionBasis": {
    "dependenciesSatisfied": true,
    "mvpPriority": "string",
    "planningDriftDetected": false,
    "chosenOverAlternatives": ["string"],
    "inputsRead": ["默认输入 + 条件命中输入"]
  }
}
```

## rules
- 同一时刻只允许一个原子任务处于执行中。
- `current.md` 的前沿窗口不得超过 3 个候选；完整顺序放 `backlog.md` / `handoff.json.pending_task_queue`。
- 禁止一次性把长期任务全部展开为当前执行任务；只能认领一个最小原子任务。
- 禁止仅凭旧计划机械顺推；每轮必须重新读取真实状态。
- 不得跳过规划区 / 交接区更新直接进入下一任务。
- 不得把“规划中”写成“已完成”。
- README 不是内部事实源，产品介绍不是当前战况源；二者只在职责命中时读取。
