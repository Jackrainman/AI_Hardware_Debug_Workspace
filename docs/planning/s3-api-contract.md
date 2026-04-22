# S3 API Contract Draft

> 状态：草案。用于后续 `S3-BACKEND-SCAFFOLD`、`S3-SQLITE-STORAGE` 与前端 HTTP storage adapter 对齐；本文件不代表后端已经实现。

## 1. 目标与边界

### 目标
- 为同一 WiFi 下 `http://hurricane-server.local:<port>/` 访问形态定义最小 HTTP API。
- 覆盖当前闭环实体：Workspace、IssueCard、InvestigationRecord、ArchiveDocument、ErrorEntry。
- 明确 workspace 归属、读回语义、统一错误返回，避免后端与前端 adapter 各自发散。

### 非目标
- 不定义权限、登录、多租户或公网暴露。
- 不定义 AI / RAG / embedding / 相似问题检索接口。
- 不定义实时协作、WebSocket、SSE、离线队列或冲突合并。
- 不实现后端、不创建数据库、不改变现有 localStorage schema。

## 2. 基础约定

- Base path：`/api`
- 内容类型：`application/json; charset=utf-8`
- 默认 workspace：
  - `workspaceId = "workspace-26-r1"`
  - `name = "26年 R1"`
- Workspace 传递方式：
  - health 不带 workspace。
  - 业务实体统一放在 path：`/api/workspaces/{workspaceId}/...`
- S3 兼容期实体归属：
  - 当前前端实体仍只有 `projectId`，没有单独 `workspaceId` 字段。
  - 服务端写入时必须校验：`payload.projectId === workspaceId`。
  - 如果后续需要迁移历史 `projectId = "default-project"` 数据，必须另开迁移任务；本契约不隐式改写历史数据。
- ID 生成：
  - 当前前端可继续生成 `issue-*`、`record-*`、`error-entry-*` 等 id。
  - 服务端接收客户端 id，但必须拒绝 workspace 内重复 id。

## 3. 通用响应 envelope

成功：

```json
{
  "ok": true,
  "data": {}
}
```

失败：

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "human readable message",
    "operation": "create_issue",
    "retryable": false,
    "details": {}
  }
}
```

### 最小错误码

| code | HTTP | retryable | 说明 |
|---|---:|---:|---|
| `BAD_REQUEST` | 400 | false | JSON 格式、path 参数或 query 参数不合法 |
| `NOT_FOUND` | 404 | false | workspace 或实体不存在 |
| `CONFLICT` | 409 | false | id 已存在、状态冲突或重复归档 |
| `VALIDATION_ERROR` | 422 | false | zod / schema 校验失败 |
| `STORAGE_ERROR` | 500 | true | 服务端读写异常 |
| `SERVICE_UNAVAILABLE` | 503 | true | 服务端暂不可用或依赖未就绪 |

> 网络不可达、DNS 失败、连接超时不属于服务端 JSON 响应；前端 server adapter 需在不可达策略中映射为本地错误状态。

## 4. Health

### `GET /api/health`

用途：前端启动、部署 smoke、不可达策略判断。

响应：

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "serverTime": "2026-04-23T01:00:00+08:00",
    "schemaVersion": 1,
    "storage": {
      "kind": "sqlite",
      "ready": true
    }
  }
}
```

## 5. Workspaces

### `GET /api/workspaces`

返回当前服务器可用 workspace 列表。S3 初期至少返回默认工作区。

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "workspace-26-r1",
        "name": "26年 R1",
        "isDefault": true,
        "createdAt": "2026-04-23T01:00:00+08:00",
        "updatedAt": "2026-04-23T01:00:00+08:00"
      }
    ]
  }
}
```

### `GET /api/workspaces/{workspaceId}`

返回单个 workspace；不存在返回 `NOT_FOUND`。

## 6. Issues

当前对应前端 `IssueCard`。

### `GET /api/workspaces/{workspaceId}/issues?status=active|archived|all`

返回 IssueCard summary 列表，默认 `status=active`。

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "issue-xxx",
        "title": "UART 启动日志停住",
        "severity": "high",
        "status": "open",
        "createdAt": "2026-04-23T01:00:00+08:00",
        "updatedAt": "2026-04-23T01:00:00+08:00"
      }
    ]
  }
}
```

### `POST /api/workspaces/{workspaceId}/issues`

请求体：完整 `IssueCard` JSON。  
约束：`IssueCard.projectId` 必须等于 path 中的 `{workspaceId}`。  
成功：`201`，返回已持久化的完整 `IssueCard`。

### `GET /api/workspaces/{workspaceId}/issues/{issueId}`

成功：返回完整 `IssueCard`。  
不存在：`NOT_FOUND`。

### `PUT /api/workspaces/{workspaceId}/issues/{issueId}`

请求体：完整 `IssueCard` JSON，用于 closeout 时回写 `status = "archived"` 等场景。  
约束：path 中 `issueId` 必须等于 body 中 `id`。

## 7. Investigation records

当前对应前端 `InvestigationRecord`。

### `GET /api/workspaces/{workspaceId}/issues/{issueId}/records`

返回指定 issue 下的记录，按 `createdAt` 升序。

### `POST /api/workspaces/{workspaceId}/issues/{issueId}/records`

请求体：完整 `InvestigationRecord` JSON。  
约束：`record.issueId` 必须等于 path 中 `{issueId}`，且 issue 必须属于同一 workspace。  
成功：`201`，返回已持久化记录。

## 8. Archives

当前对应前端 `ArchiveDocument`。

### `GET /api/workspaces/{workspaceId}/archives`

返回 ArchiveDocument 列表，按 `generatedAt` 倒序。列表项可返回完整 ArchiveDocument，也可在实现期拆 summary；S3 初期建议直接返回完整实体以减少前端分支。

### `POST /api/workspaces/{workspaceId}/archives`

请求体：完整 `ArchiveDocument` JSON。  
约束：`archive.projectId === workspaceId`；`fileName` 在 workspace 内唯一。  
成功：`201`，返回已持久化 ArchiveDocument。

### `GET /api/workspaces/{workspaceId}/archives/{fileName}`

按 `fileName` 读回 ArchiveDocument；`fileName` 必须 URL encode。

## 9. Error entries

当前对应前端 `ErrorEntry`。

### `GET /api/workspaces/{workspaceId}/error-entries`

返回 ErrorEntry 列表，按 `createdAt` 倒序。

### `POST /api/workspaces/{workspaceId}/error-entries`

请求体：完整 `ErrorEntry` JSON。  
约束：`entry.projectId === workspaceId`；`entry.id` 与 `entry.errorCode` 在 workspace 内唯一。  
成功：`201`，返回已持久化 ErrorEntry。

### `GET /api/workspaces/{workspaceId}/error-entries/{entryId}`

按 id 读回 ErrorEntry。

## 10. 写入读回语义

- 所有写接口成功后，服务端必须返回“已持久化后的实体”，不能只返回 `{ id }`。
- 后续 verification / smoke 可执行：
  1. `POST issue`
  2. `GET issue`
  3. 对比 id、workspace/projectId、核心字段
- closeout 最小顺序建议：
  1. `POST archive`
  2. `POST error-entry`
  3. `PUT issue` 为 archived
  4. 任一写入失败时不得在前端显示“已结案完成”

## 11. 后续实现输入

- `S3-SQLITE-SCHEMA-DRAFT` 需按本契约补齐 workspaces 外键与唯一约束。
- `S3-PREP-SERVER-UNREACHABLE-HANDLING` 需基于通用错误 envelope 与网络不可达状态定义前端行为。
- `S3-BACKEND-SCAFFOLD` 只需先实现 `/api/health` 与通用错误 envelope，再逐步接入实体 API。
