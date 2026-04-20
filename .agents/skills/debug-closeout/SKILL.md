---
name: debug-closeout
description: 当用户结案时生成 ErrorEntry 与 Markdown ArchiveDocument，并完成写盘与读回验证。
---

## when to use
- 用户点击“结案”。
- IssueCard 状态为 `resolved` 且未归档。

## inputs
```json
{
  "issueCard": "IssueCard",
  "investigationRecords": ["InvestigationRecord"],
  "archiveDir": "string (绝对路径，由 project.defaultArchiveDir 决定)",
  "errorTableDir": "string"
}
```

## steps
1. 生成唯一 `errorCode`（`DBG-YYYYMMDD-NNN`）。
2. 生成归档文件名 `YYYY-MM-DD_<slug>.md`。
3. 基于 IssueCard + InvestigationRecord 生成 `ErrorEntry` 与 `ArchiveDocument`。
4. 先做 schema 校验，失败则仅重生无效字段。
5. 写入 `archiveDir` 与 `errorTableDir`。
6. 执行读回验证：文件存在、错误表条目存在、必填字段非空。
7. 任一验证失败时创建 repair task，不标记 archived。

## output
```json
{
  "errorEntry": {
    "id": "string",
    "projectId": "string",
    "sourceIssueId": "string",
    "errorCode": "DBG-YYYYMMDD-NNN",
    "title": "string",
    "category": "string",
    "symptom": "string",
    "rootCause": "string",
    "resolution": "string",
    "prevention": "string",
    "relatedFiles": ["string"],
    "relatedCommits": ["string"],
    "archiveFilePath": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "archiveDocument": {
    "issueId": "string",
    "projectId": "string",
    "fileName": "YYYY-MM-DD_<slug>.md",
    "filePath": "string",
    "markdownContent": "string",
    "generatedBy": "ai|manual|hybrid",
    "generatedAt": "ISO8601"
  }
}
```

## rules
- 输出必须通过 `ErrorEntry` / `ArchiveDocument` schema 校验。
- 工具调用必须检查 exit code 和写盘成功状态。
- 读回验证失败必须返回 repair task，不得伪造归档成功。
- 不自动推送远端，不自动提交归档文件，不删除原始输入。
