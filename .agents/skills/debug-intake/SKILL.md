---
name: debug-intake
description: 接收用户的碎片化调试描述，结合当前仓库快照与历史相似问题，生成一张结构化的 IssueCard。
trigger: 快闪输入提交后，或用户点击"创建问题卡"时触发。
---

## 目的

把诸如 "串口又乱了" 这样的一句碎片输入，补全为一个可追踪、可排查的 `IssueCard`，并挂载仓库上下文。

## 触发条件

- 用户从快闪窗口提交了一段 rawInput。
- 用户把旧的 draft 推进到 open 状态。

## 输入

```json
{
  "projectId": "string",
  "rawInput": "string",
  "tags": ["string"],
  "repoSnapshot": "RepoSnapshot (来自 repo-onboard 输出)",
  "historicalIssueSummaries": [
    { "issueId": "string", "title": "string", "rootCause": "string" }
  ]
}
```

## 输出（必须符合 schema）

```json
{
  "issueCard": {
    "id": "string",
    "projectId": "string",
    "title": "string",
    "rawInput": "string",
    "normalizedSummary": "string",
    "symptomSummary": "string",
    "suspectedDirections": ["string"],
    "suggestedActions": ["string"],
    "status": "open",
    "severity": "low|medium|high|critical",
    "tags": ["string"],
    "repoSnapshot": "RepoSnapshot",
    "relatedFiles": ["string"],
    "relatedCommits": ["string"],
    "relatedHistoricalIssueIds": ["string"],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

## Prompt 模板要点

- 必须区分「用户原文」和「AI 补全」，不得覆盖 rawInput。
- `suspectedDirections` 每条都要附带依据，不允许空话。
- `suggestedActions` 面向硬件/嵌入式调试，倾向给出"下一步实际能做的动作"。
- 若历史相似问题存在，必须在 `relatedHistoricalIssueIds` 中引用。

## 工具调用

- 本地 git CLI（由 `repo-onboard` 已采集的 snapshot 传入即可，本 skill 自身不需要再调 git）。
- 历史问题检索：读取 `.debug_workspace/archive/` 和 `error-table/` 中的 JSON/md。
- 不需要 MCP server。

## 反馈闭环与自动纠错

- 输出必须是合法 JSON 并符合 `IssueCard` schema。
- 若字段类型错误或必填字段缺失：
  1. 保留用户原始 `rawInput`。
  2. 保留已经合法的字段。
  3. 让 AI 只重生无效部分（例如只重新生成 `suspectedDirections`）。
- 允许重试次数上限：2 次。超过则降级——保留 `rawInput` + 最小骨架，把问题卡标记为 `needs_manual_review`。
- 严禁静默丢弃用户输入。

## 不做的事

- 不调用外部知识库。
- 不改写用户原文。
- 不自动执行排查动作。
