---
name: task-verification
description: 完成定义检查 + 读回验证 + completion gate 放行判断；决定当前任务是否允许进入“下一任务选择”。
---

## when to use
- 每个原子任务修改后、commit 前。
- 结案归档流程写盘后。
- `planning` 准备选择下一任务之前（最后一次把关）。

## inputs
```json
{
  "taskId": "string",
  "expectedArtifacts": ["string"],
  "validationChecks": ["string"],
  "toolResults": [
    { "name": "string", "exitCode": "number", "stderr": "string" }
  ]
}
```

## steps
1. 检查工具 exit code，非 0 直接判失败。
2. 检查产物路径存在且可读。
3. 对结构化输出执行 schema 校验（IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument）。
4. 对归档类任务执行读回验证（文件存在、条目存在、必填字段非空）。
5. 执行 completion gate 三件事齐全性检查：
   - 最小验证已通过？
   - planning sync 是否已更新 `docs/planning/current.md` 与 `.agent-state/handoff.json`？
   - 是否已完成单任务 commit？
6. 若任务职责命中过候选池、长期决策、产品定义或对外展示文档，检查对应保留文档是否同步；未命中则不得要求默认更新。
7. 失败时返回 repair actions，明确禁止进入“下一任务选择”。

## output
```json
{
  "taskId": "string",
  "status": "passed|failed|needs_manual_review",
  "completionGate": "open|blocked",
  "failedChecks": ["string"],
  "repairActions": ["string"]
}
```

## rules
- 不得跳过验证步骤。
- 不得把部分成功当作全部成功。
- `completionGate = blocked` 时，禁止 `planning` 选择下一任务。
- 连续失败必须升级人工确认。
- 不得把 README 当作内部事实源；不得把产品介绍当作当前战况源。
