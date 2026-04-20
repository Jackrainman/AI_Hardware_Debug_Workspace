---
name: task-execution
description: 执行由 planning 选定的唯一原子任务，完成文件修改、最小验证、交接更新和单任务提交；禁止在 commit 后机械进入下一任务。
---

## when to use
- 已经从 `planning` 明确了当前**唯一**原子任务。
- 需要把任务从“计划”落地为“文件变更 + 最小验证 + 交接更新 + commit”。

## inputs
```json
{
  "taskId": "string",
  "taskGoal": "string",
  "filesToChange": ["string"],
  "definitionOfDone": ["string"]
}
```

## steps
1. 确认 `docs/planning/current.md` 中的“当前唯一执行中的原子任务”与 `taskId` 一致；不一致时回到 `planning`。
2. 仅围绕当前原子任务修改文件，不混入其他任务改动，不做顺手重构。
3. 执行最小验证（路径 / 内容 / 引用 / 构建 / 命令结果）。
4. 更新 `docs/planning/current.md` 与 `docs/planning/handoff.md`。
5. 更新 `.agent-state/progress.md`、`.agent-state/session-log.md`、`.agent-state/handoff.json`。
6. 执行一次 commit，message 对应单一任务结果。
7. 本 skill 到此结束；**不得**自动进入下一任务。下一任务必须由 `planning` 重新读取仓库后选择。

## output
```json
{
  "taskId": "string",
  "changedFiles": ["string"],
  "verification": ["string"],
  "commitMessage": "string",
  "commitHash": "string",
  "nextStep": "回到 planning skill 重新读取仓库并选择下一唯一任务"
}
```

## rules
- 未 commit 前不得进入下一个任务。
- commit 完成后也不得自动顺推，必须回到 `planning`。
- 遇到验证失败不得伪造完成状态；应创建修复任务或回退。
- 不得静默忽略工具错误和写盘失败。
