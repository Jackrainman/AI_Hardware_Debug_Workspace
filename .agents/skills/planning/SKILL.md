---
name: planning
description: 用于把目标拆成阶段计划和原子任务，并维护当前执行窗口（docs/planning/current.md 与 handoff）。
---

## when to use
- 任务开始前需要先规划阶段目标。
- 完成一个原子任务后需要决定下一个原子任务。
- 上下文重置后需要快速恢复执行节奏。

## inputs
```json
{
  "goal": "string",
  "constraints": ["string"],
  "currentState": {
    "current": "docs/planning/current.md",
    "handoff": "docs/planning/handoff.md",
    "progress": ".agent-state/progress.md"
  }
}
```

## steps
1. 读取 `docs/product/*`、`docs/planning/current.md`、`docs/planning/handoff.md`。
2. 先给 3-6 个阶段任务，再拆当前阶段原子任务。
3. 明确“当前只允许推进”的原子任务清单。
4. 每完成一个原子任务后更新 `current.md` 和 `handoff.md`。
5. 同步更新 `.agent-state/progress.md` 与 `.agent-state/handoff.json`。

## output
```json
{
  "phasePlan": ["string"],
  "atomicTasks": ["string"],
  "currentAtomicTask": "string",
  "nextAtomicTask": "string"
}
```

## rules
- 一次只允许一个原子任务处于执行中。
- 不得跳过规划区更新直接进入下一个任务。
- 不得把“规划中”写成“已完成”。
