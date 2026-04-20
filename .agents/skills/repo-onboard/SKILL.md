---
name: repo-onboard
description: 绑定用户提供的本地仓库路径，校验是否为 Git 仓库，采集首个 RepoSnapshot，建立 Project 实体。
trigger: 用户首次添加仓库路径，或切换当前工作区时触发。
---

## 目的

把一个本地目录绑定成产品里的 `Project`，并立即采集一次 `RepoSnapshot`，让后续所有问题卡都有可挂载的仓库上下文。

## 触发条件

- 用户在桌面端选择仓库路径。
- 用户切换当前工作区到一个未注册过的路径。
- 用户主动要求刷新项目基本信息。

## 输入

```json
{
  "repoPath": "string (绝对路径)",
  "suggestedArchiveDir": "string (可选，默认 repo/docs/debug)"
}
```

## 输出（必须符合 schema）

```json
{
  "project": {
    "id": "string",
    "name": "string",
    "repoPath": "string",
    "repoName": "string",
    "defaultArchiveDir": "string",
    "git": {
      "currentBranch": "string",
      "lastCommitHash": "string",
      "hasUncommittedChanges": "boolean",
      "lastScannedAt": "ISO8601"
    },
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "repoSnapshot": {
    "branch": "string",
    "headCommitHash": "string",
    "headCommitMessage": "string",
    "hasUncommittedChanges": "boolean",
    "changedFiles": [{ "path": "string", "status": "added|modified|deleted|renamed|untracked" }],
    "recentCommits": [{ "hash": "string", "author": "string", "message": "string", "timestamp": "ISO8601" }],
    "capturedAt": "ISO8601"
  }
}
```

## 执行步骤

1. 校验路径存在且包含 `.git`。
2. 执行 `git rev-parse --abbrev-ref HEAD` 读分支。
3. 执行 `git rev-parse HEAD` 和 `git log -1 --pretty=%B` 读 HEAD commit。
4. 执行 `git status --porcelain` 判断 working tree 是否脏。
5. 执行 `git log -n 10 --pretty=format:%H|%an|%s|%cI` 读最近 10 条提交。
6. 执行 `git diff --name-status HEAD~1..HEAD` 读变更文件列表（首次没有 HEAD~1 则跳过）。
7. 组装 `Project` 与 `RepoSnapshot`。

## 工具调用

MVP 阶段只依赖本地 `git` CLI 与文件系统。不需要任何 MCP server。

## 反馈闭环与自动纠错

- 每条 git 子命令必须检查 exit code；任一步失败则整个 skill 返回 `status: "failed"`，记录到运行时日志。
- 输出 JSON 必须通过 schema 校验；失败时保留原始 git 输出，要求 AI 仅重构错误字段。
- 若路径不是 Git 仓库，不静默降级为普通目录；返回明确错误码 `NOT_A_GIT_REPO` 由上层提示用户。

## 不做的事

- 不做 embedding 索引。
- 不做文件内容扫描。
- 不做全量 history 分析。
