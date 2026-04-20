---
name: debug-closeout
description: 当用户点击"结案"时，根据 IssueCard + InvestigationRecord 生成 ErrorEntry 和 Markdown ArchiveDocument，并写入本地归档目录。
trigger: IssueCard 状态从 resolved 进入 archived 时触发。
---

## 目的

把一个已经排查完成的问题，闭环成两件永久制品：
1. 一条机器可读的 `ErrorEntry`（进入 error-table）。
2. 一份人类可读的 `ArchiveDocument`（markdown 文件）。

## 触发条件

- 用户点击"结案"。
- IssueCard.status === "resolved" 且尚未归档。

## 输入

```json
{
  "issueCard": "IssueCard",
  "investigationRecords": ["InvestigationRecord"],
  "archiveDir": "string (绝对路径，由 project.defaultArchiveDir 决定)",
  "errorTableDir": "string"
}
```

## 输出（必须符合 schema）

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

## Markdown 模板（必须固定）

```
# <title>

## 基本信息
- 项目 / 仓库路径 / 分支 / 创建时间 / 结案时间 / 标签

## 原始问题输入
<issueCard.rawInput>

## 现象描述
<symptomSummary + 复现条件>

## 排查过程
(按 records 时间顺序，区分 observation / hypothesis / action / result / conclusion)

## 根因
<errorEntry.rootCause>

## 解决方案
<errorEntry.resolution>

## 预防建议
<errorEntry.prevention>

## 关联文件
## 关联提交
```

## 执行步骤

1. 依据 `createdAt` 日期和序号生成 `errorCode`（`DBG-YYYYMMDD-NNN`）。
2. 依据日期 + slug 生成文件名。slug 来自 title，英文、短、具体。
3. AI 生成 `rootCause / resolution / prevention` 文本。
4. 拼接 markdown，写入 `archiveDir/issues/<fileName>`。
5. 更新 `errorTableDir/errors.json` 与 `errorTableDir/README.md`。
6. 执行回读验证（见下）。

## 工具调用

- 本地文件系统（Node/Python 皆可）写文件。
- 本地文件系统读回校验。
- 不需要 MCP server。

## 反馈闭环与自动纠错（关键）

**写盘前：**
- 校验 `ErrorEntry` / `ArchiveDocument` schema。
- 校验 `errorCode` 唯一；重复则递增序号。

**写盘后（读回验证）：**
1. 确认归档 markdown 文件存在于 `filePath`。
2. 确认 `errors.json` 中存在对应 `errorCode` 且字段非空。
3. 确认 markdown 中关键段落（根因 / 解决方案）非空占位。

**任一验证失败：**
- **不得**把 IssueCard 标记为 `archived`。
- 创建一条"修复任务"，状态保留为 `resolved`。
- 写入运行时日志：失败原因 + 失败步骤 + 计划重试次数。

**AI 部分失败（schema 不合法）：**
- 只重生不合法的 section（如只重生 `prevention`）。
- 重试上限 2 次，失败则标记 `needs_manual_review`。

**工具调用失败（写盘 / git）：**
- 必检查 exit code / 文件 existsSync。
- 不得静默回退到"已归档"。

## 不做的事

- 不自动推送到远端仓库。
- 不自动 `git commit` 归档文件（由用户决定是否提交）。
- 不删除任何原始用户输入。
