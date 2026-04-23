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
5. 判断当前阶段目标与完成定义是否仍成立（是否需要切换阶段）。
6. 维护前沿任务窗口（1~3 个候选）；更远的候选留在 `backlog.md`，不得涌入 `current.md`。
7. 依据“依赖是否满足 + MVP 优先级 + planning 与实际是否脱节 + 是否仍是最优解”，从窗口中选择**唯一一个**下一原子任务。
8. 写入 `current.md` 的“当前唯一执行中的原子任务”与 `.agent-state/handoff.json` 的 `current_atomic_task`；保持 `.agent-state/handoff.json` 为机读最小状态，不复制长篇 prose。

## output
```json
{
  "currentStage": "string",
  "currentStageGoal": "string",
  "frontierTasks": ["string"],
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
- 禁止一次性把长期任务全部展开为大计划表。
- 前沿窗口不得超过 3 个候选；超过就是 backlog。
- 禁止仅凭旧计划机械顺推；每轮必须重新读取真实状态。
- 不得跳过规划区 / 交接区更新直接进入下一任务。
- 不得把“规划中”写成“已完成”。
- README 不是内部事实源，产品介绍不是当前战况源；二者只在职责命中时读取。
