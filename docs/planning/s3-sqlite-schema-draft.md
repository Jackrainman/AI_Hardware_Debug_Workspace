# S3 SQLite Schema Draft

> 状态：草案。用于后续 `S3-SQLITE-STORAGE` 实现前统一表、外键、索引和版本边界；本文件不创建数据库、不写迁移脚本。

## 1. 设计目标

- 支撑 `docs/planning/s3-api-contract.md` 中的最小 API。
- 以 `workspace_id` 作为所有业务实体的归属边界。
- 保持当前前端实体 schema 兼容：IssueCard / InvestigationRecord / ArchiveDocument / ErrorEntry 原样作为 JSON payload 保存。
- 优先可调试、可读回、可恢复，不在 S3 准备期引入复杂投影表。

## 2. 非目标

- 不实现 CRUD。
- 不选择 `better-sqlite3` / `sqlite3` / ORM。
- 不创建 `.db` 文件。
- 不写迁移脚本。
- 不做权限、多租户、实时协作或离线冲突合并。

## 3. 全局约定

- SQLite 文件路径、备份目录、运行用户权限等待 `S3-SERVER-INVENTORY` 确认。
- 每个连接必须执行：`PRAGMA foreign_keys = ON;`
- 最小版本：`PRAGMA user_version = 1;`
- 时间字段统一保存 ISO 字符串，例如 `2026-04-23T01:00:00+08:00`。
- JSON payload：
  - 最小草案使用 `TEXT NOT NULL`。
  - 应用层必须用现有 zod schema 校验后再写入。
  - 待读取后再过 zod 校验；失败不得静默吞掉。
  - 暂不强依赖 SQLite JSON1；若服务器盘点确认可用，可在实现期追加 `CHECK (json_valid(payload_json))`。

## 4. Workspace 兼容边界

默认 workspace：

| 字段 | 值 |
|---|---|
| `id` | `workspace-26-r1` |
| `name` | `26年 R1` |
| `is_default` | `1` |

当前前端实体没有 `workspaceId` 字段，仍使用 `projectId`。S3 初期规则：

- `issues.workspace_id === IssueCard.projectId`
- `archives.workspace_id === ArchiveDocument.projectId`
- `error_entries.workspace_id === ErrorEntry.projectId`
- `records.workspace_id` 由其所属 IssueCard 推导；`InvestigationRecord.issueId` 必须指向同 workspace issue。

若后续需要迁移历史 `projectId = "default-project"` 数据，必须另开数据迁移任务；本 schema 草案不自动改写历史 payload。

## 5. 表结构草案

### 5.1 `schema_meta`

保存可读的 schema 元信息；同时使用 `PRAGMA user_version` 作为 SQLite 原生版本号。

```sql
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

初始写入：

```sql
INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '1', :now)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
```

### 5.2 `workspaces`

```sql
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_single_default
ON workspaces (is_default)
WHERE is_default = 1;
```

初始化时必须 seed 默认 workspace；若已存在则不覆盖用户后续改名，除非未来任务明确需要。

### 5.3 `issues`

对应完整 `IssueCard` payload。

```sql
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_issues_workspace_status_created
ON issues (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_issues_workspace_updated
ON issues (workspace_id, updated_at DESC);
```

写入约束：

- `payload_json.id === issues.id`
- `payload_json.projectId === issues.workspace_id`
- `payload_json.title / severity / status / createdAt / updatedAt` 必须与投影列一致
- payload 先过 `IssueCardSchema.safeParse`

### 5.4 `records`

对应完整 `InvestigationRecord` payload。

```sql
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_records_issue_created
ON records (issue_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_records_workspace_created
ON records (workspace_id, created_at DESC);
```

写入约束：

- `payload_json.id === records.id`
- `payload_json.issueId === records.issue_id`
- `records.issue_id` 指向的 issue 必须属于同一 `workspace_id`
- payload 先过 `InvestigationRecordSchema.safeParse`

### 5.5 `archives`

对应完整 `ArchiveDocument` payload。当前 ArchiveDocument 没有独立 id，保留 `file_name` 作为 workspace 内读回 key。

```sql
CREATE TABLE IF NOT EXISTS archives (
  workspace_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (workspace_id, file_name),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_archives_workspace_generated
ON archives (workspace_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_archives_issue
ON archives (issue_id);
```

写入约束：

- `payload_json.fileName === archives.file_name`
- `payload_json.projectId === archives.workspace_id`
- `payload_json.issueId === archives.issue_id`
- `file_name` 在同 workspace 内唯一
- payload 先过 `ArchiveDocumentSchema.safeParse`

### 5.6 `error_entries`

对应完整 `ErrorEntry` payload。

```sql
CREATE TABLE IF NOT EXISTS error_entries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  source_issue_id TEXT NOT NULL,
  error_code TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_issue_id) REFERENCES issues(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_error_entries_workspace_error_code
ON error_entries (workspace_id, error_code);

CREATE INDEX IF NOT EXISTS idx_error_entries_workspace_created
ON error_entries (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_entries_source_issue
ON error_entries (source_issue_id);
```

写入约束：

- `payload_json.id === error_entries.id`
- `payload_json.projectId === error_entries.workspace_id`
- `payload_json.sourceIssueId === error_entries.source_issue_id`
- `payload_json.errorCode === error_entries.error_code`
- payload 先过 `ErrorEntrySchema.safeParse`

## 6. 最小初始化顺序

```sql
PRAGMA foreign_keys = ON;
PRAGMA user_version = 1;

BEGIN;
-- 1. schema_meta
-- 2. workspaces
-- 3. issues
-- 4. records
-- 5. archives
-- 6. error_entries
-- 7. seed workspace-26-r1
COMMIT;
```

若初始化任一步失败，必须 rollback，不得留下半初始化数据库并标记服务健康。

## 7. API 对齐表

| API 资源 | SQLite 表 | 主读写 key | 排序 |
|---|---|---|---|
| `/workspaces` | `workspaces` | `id` | `is_default DESC, name ASC` |
| `/issues` | `issues` | `id` | `created_at DESC` |
| `/issues/{issueId}/records` | `records` | `issue_id` | `created_at ASC` |
| `/archives` | `archives` | `(workspace_id, file_name)` | `generated_at DESC` |
| `/error-entries` | `error_entries` | `id` | `created_at DESC` |

## 8. 读回验证要求

后续实现最小 smoke 应覆盖：

1. 初始化后 `GET /api/health` 返回 `schemaVersion = 1` 且 storage ready。
2. 创建 IssueCard 后，按 id 读回并再次通过 `IssueCardSchema.safeParse`。
3. 创建 InvestigationRecord 后，按 issueId 列表读回且时间升序。
4. closeout 后写入 ArchiveDocument、ErrorEntry、archived IssueCard，三者可分别读回。
5. 服务重启后重复读回上述实体。

## 9. 暂不确定项

- SQLite runtime 库选择等待后端脚手架任务。
- SQLite 文件路径、备份路径、日志路径等待服务器盘点。
- 是否启用 JSON1 `json_valid` 检查等待服务器 SQLite 版本确认。
- 是否需要历史 localStorage 导入任务，等待 server adapter 与验收策略确认。
