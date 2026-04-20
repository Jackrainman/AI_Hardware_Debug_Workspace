---
name: task-verification
description: 用于验证原子任务是否真实完成，覆盖结构校验、工具结果检查、读回验证和风险标注。
---

## when to use
- 每个原子任务修改后、提交前。
- 结案归档流程写盘后。

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
3. 对结构化输出执行 schema 校验（IssueCard/InvestigationRecord/ErrorEntry/ArchiveDocument）。
4. 对归档类任务执行读回验证（文件存在、条目存在、必填字段非空）。
5. 失败时返回修复任务，不得标记为“已完成”。

## output
```json
{
  "taskId": "string",
  "status": "passed|failed|needs_manual_review",
  "failedChecks": ["string"],
  "repairActions": ["string"]
}
```

## rules
- 不得跳过验证步骤。
- 不得把部分成功当作全部成功。
- 连续失败必须升级人工确认。
