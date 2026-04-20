---
name: task-execution
description: 用于执行单个原子任务，完成文件修改、最小验证、交接更新和单任务提交。
---

## when to use
- 已经从 `planning` 明确了当前原子任务。
- 需要把任务从“计划”落地为“文件变更 + 验证 + commit”。

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
1. 仅围绕当前原子任务修改文件，不混入其他任务改动。
2. 执行最小验证（路径、内容、引用、命令结果）。
3. 更新 `docs/planning/current.md` 与 `docs/planning/handoff.md`。
4. 更新 `.agent-state/progress.md`、`.agent-state/session-log.md`、`.agent-state/handoff.json`。
5. 执行一次 commit，message 对应单一任务结果。

## output
```json
{
  "taskId": "string",
  "changedFiles": ["string"],
  "verification": ["string"],
  "commitMessage": "string",
  "commitHash": "string"
}
```

## rules
- 未 commit 前不得进入下一个任务。
- 遇到验证失败不得伪造完成状态。
- 不得静默忽略工具错误和写盘失败。
