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
    "handoff": "docs/planning/handoff.md",
    "agentHandoff": ".agent-state/handoff.json",
    "gitStatus": "string",
    "gitLog": "string",
    "keyPaths": ["string"]
  }
}
```

## steps
1. 重新读取 `AGENTS.md` 第 3/4/5 章（滚动前沿 / 下一任务选择 / 完成门）。
2. 读取 `docs/planning/current.md`、`docs/planning/handoff.md`、`.agent-state/handoff.json`。
3. 跑 `git status` 与 `git log -5`，核对 planning 与实际是否一致；若脱节，**先更新 planning 再继续**。
4. 判断当前阶段目标与完成定义是否仍成立（是否需要切换阶段）。
5. 维护前沿任务窗口（1~3 个候选）；更远的候选留在 `backlog.md`，不得涌入 `current.md`。
6. 依据“依赖是否满足 + MVP 优先级 + planning 与实际是否脱节 + 是否仍是最优解”，从窗口中选择**唯一一个**下一原子任务。
7. 写入 `current.md` 的“当前唯一执行中的原子任务”与 `.agent-state/handoff.json` 的 `current_atomic_task`。
8. 把选择过程的关键理由补到 `handoff.md` 的“下一步最推荐动作”。

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
    "chosenOverAlternatives": ["string"]
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
