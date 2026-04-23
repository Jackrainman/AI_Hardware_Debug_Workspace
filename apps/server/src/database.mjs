import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const SCHEMA_VERSION = 1;
export const DEFAULT_WORKSPACE = {
  id: "workspace-26-r1",
  name: "26年 R1",
  description: "",
  isDefault: true,
};

function assertObject(payload, message) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    const error = new Error(message);
    error.code = "VALIDATION_ERROR";
    throw error;
  }
}

function assertString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    const error = new Error(`${fieldName} is required`);
    error.code = "VALIDATION_ERROR";
    throw error;
  }
}

function assertArray(value, fieldName) {
  if (!Array.isArray(value)) {
    const error = new Error(`${fieldName} must be an array`);
    error.code = "VALIDATION_ERROR";
    throw error;
  }
}

function normalizeIssuePayload(workspaceId, payload) {
  assertObject(payload, "issue payload must be an object");
  assertString(payload.id, "issue.id");
  assertString(payload.projectId, "issue.projectId");
  assertString(payload.title, "issue.title");
  assertString(payload.severity, "issue.severity");
  assertString(payload.status, "issue.status");
  assertString(payload.createdAt, "issue.createdAt");
  assertString(payload.updatedAt, "issue.updatedAt");

  if (payload.projectId !== workspaceId) {
    const error = new Error("issue.projectId must match workspaceId");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  payload.relatedFiles ??= [];
  payload.relatedCommits ??= [];
  payload.relatedHistoricalIssueIds ??= [];
  payload.tags ??= [];
  payload.suspectedDirections ??= [];
  payload.suggestedActions ??= [];
  assertArray(payload.relatedFiles, "issue.relatedFiles");
  assertArray(payload.relatedCommits, "issue.relatedCommits");
  assertArray(payload.relatedHistoricalIssueIds, "issue.relatedHistoricalIssueIds");
  assertArray(payload.tags, "issue.tags");
  assertArray(payload.suspectedDirections, "issue.suspectedDirections");
  assertArray(payload.suggestedActions, "issue.suggestedActions");

  return payload;
}

function normalizeRecordPayload(workspaceId, issueId, payload) {
  assertObject(payload, "record payload must be an object");
  assertString(payload.id, "record.id");
  assertString(payload.issueId, "record.issueId");
  assertString(payload.type, "record.type");
  assertString(payload.createdAt, "record.createdAt");
  if (payload.issueId !== issueId) {
    const error = new Error("record.issueId must match path issueId");
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  payload.linkedFiles ??= [];
  payload.linkedCommits ??= [];
  assertArray(payload.linkedFiles, "record.linkedFiles");
  assertArray(payload.linkedCommits, "record.linkedCommits");
  return {
    ...payload,
    workspaceId,
  };
}

function normalizeArchivePayload(workspaceId, payload) {
  assertObject(payload, "archive payload must be an object");
  assertString(payload.issueId, "archive.issueId");
  assertString(payload.projectId, "archive.projectId");
  assertString(payload.fileName, "archive.fileName");
  assertString(payload.filePath, "archive.filePath");
  assertString(payload.generatedAt, "archive.generatedAt");
  assertString(payload.markdownContent, "archive.markdownContent");
  if (payload.projectId !== workspaceId) {
    const error = new Error("archive.projectId must match workspaceId");
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  return payload;
}

function normalizeErrorEntryPayload(workspaceId, payload) {
  assertObject(payload, "errorEntry payload must be an object");
  for (const field of [
    "id",
    "projectId",
    "sourceIssueId",
    "errorCode",
    "title",
    "category",
    "symptom",
    "rootCause",
    "resolution",
    "prevention",
    "archiveFilePath",
    "createdAt",
    "updatedAt",
  ]) {
    assertString(payload[field], `errorEntry.${field}`);
  }
  if (payload.projectId !== workspaceId) {
    const error = new Error("errorEntry.projectId must match workspaceId");
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  payload.relatedFiles ??= [];
  payload.relatedCommits ??= [];
  assertArray(payload.relatedFiles, "errorEntry.relatedFiles");
  assertArray(payload.relatedCommits, "errorEntry.relatedCommits");
  return payload;
}

function parsePayload(row) {
  return JSON.parse(row.payload_json);
}

function createStorageError(message, code = "STORAGE_ERROR") {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createProbeFlashDatabase(dbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA user_version = ${SCHEMA_VERSION};

    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

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
  `);

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO schema_meta (key, value, updated_at)
    VALUES ('schema_version', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(String(SCHEMA_VERSION), now);

  db.prepare(`
    INSERT INTO workspaces (id, name, description, is_default, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
  `).run(
    DEFAULT_WORKSPACE.id,
    DEFAULT_WORKSPACE.name,
    DEFAULT_WORKSPACE.description,
    now,
    now,
  );

  function getWorkspace(workspaceId) {
    return db
      .prepare(
        `SELECT id, name, description, is_default, created_at, updated_at FROM workspaces WHERE id = ?`,
      )
      .get(workspaceId);
  }

  function requireWorkspace(workspaceId) {
    const row = getWorkspace(workspaceId);
    if (!row) {
      throw createStorageError(`workspace ${workspaceId} not found`, "NOT_FOUND");
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function requireIssue(workspaceId, issueId) {
    const row = db
      .prepare(
        `SELECT id, workspace_id, payload_json FROM issues WHERE workspace_id = ? AND id = ?`,
      )
      .get(workspaceId, issueId);
    if (!row) {
      throw createStorageError(`issue ${issueId} not found`, "NOT_FOUND");
    }
    return parsePayload(row);
  }

  return {
    dbPath,
    close() {
      db.close();
    },
    health() {
      return {
        status: "ok",
        serverTime: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
        storage: {
          kind: "sqlite",
          ready: true,
          dbPath,
        },
      };
    },
    listWorkspaces() {
      const rows = db
        .prepare(
          `SELECT id, name, description, is_default, created_at, updated_at
           FROM workspaces
           ORDER BY is_default DESC, name ASC`,
        )
        .all();
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        isDefault: row.is_default === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
    getWorkspace(workspaceId) {
      return requireWorkspace(workspaceId);
    },
    listIssues(workspaceId, statusFilter = "active") {
      requireWorkspace(workspaceId);
      let sql = `
        SELECT id, title, severity, status, created_at, updated_at
        FROM issues
        WHERE workspace_id = ?
      `;
      if (statusFilter === "active") {
        sql += ` AND status <> 'archived'`;
      } else if (statusFilter === "archived") {
        sql += ` AND status = 'archived'`;
      }
      sql += ` ORDER BY created_at DESC`;
      const rows = db.prepare(sql).all(workspaceId);
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        severity: row.severity,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
    createIssue(workspaceId, payload) {
      requireWorkspace(workspaceId);
      const issue = normalizeIssuePayload(workspaceId, structuredClone(payload));
      try {
        db.prepare(`
          INSERT INTO issues (id, workspace_id, title, severity, status, created_at, updated_at, payload_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          issue.id,
          workspaceId,
          issue.title,
          issue.severity,
          issue.status,
          issue.createdAt,
          issue.updatedAt,
          JSON.stringify(issue),
        );
      } catch (error) {
        if (error && typeof error === "object" && String(error.message).includes("UNIQUE")) {
          throw createStorageError(`issue ${issue.id} already exists`, "CONFLICT");
        }
        throw error;
      }
      return issue;
    },
    getIssue(workspaceId, issueId) {
      return requireIssue(workspaceId, issueId);
    },
    updateIssue(workspaceId, issueId, payload) {
      requireWorkspace(workspaceId);
      const issue = normalizeIssuePayload(workspaceId, structuredClone(payload));
      if (issue.id !== issueId) {
        throw createStorageError("issue.id must match path issueId", "VALIDATION_ERROR");
      }
      requireIssue(workspaceId, issueId);
      db.prepare(`
        UPDATE issues
        SET title = ?, severity = ?, status = ?, created_at = ?, updated_at = ?, payload_json = ?
        WHERE workspace_id = ? AND id = ?
      `).run(
        issue.title,
        issue.severity,
        issue.status,
        issue.createdAt,
        issue.updatedAt,
        JSON.stringify(issue),
        workspaceId,
        issueId,
      );
      return issue;
    },
    listRecords(workspaceId, issueId) {
      requireWorkspace(workspaceId);
      requireIssue(workspaceId, issueId);
      const rows = db
        .prepare(
          `SELECT payload_json FROM records WHERE workspace_id = ? AND issue_id = ? ORDER BY created_at ASC`,
        )
        .all(workspaceId, issueId);
      return rows.map(parsePayload);
    },
    createRecord(workspaceId, issueId, payload) {
      requireWorkspace(workspaceId);
      requireIssue(workspaceId, issueId);
      const record = normalizeRecordPayload(workspaceId, issueId, structuredClone(payload));
      try {
        db.prepare(`
          INSERT INTO records (id, workspace_id, issue_id, type, created_at, payload_json)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          record.id,
          workspaceId,
          issueId,
          record.type,
          record.createdAt,
          JSON.stringify(record),
        );
      } catch (error) {
        if (error && typeof error === "object" && String(error.message).includes("UNIQUE")) {
          throw createStorageError(`record ${record.id} already exists`, "CONFLICT");
        }
        throw error;
      }
      return record;
    },
    listArchives(workspaceId) {
      requireWorkspace(workspaceId);
      const rows = db
        .prepare(
          `SELECT payload_json FROM archives WHERE workspace_id = ? ORDER BY generated_at DESC`,
        )
        .all(workspaceId);
      return rows.map(parsePayload);
    },
    createArchive(workspaceId, payload) {
      requireWorkspace(workspaceId);
      const archive = normalizeArchivePayload(workspaceId, structuredClone(payload));
      requireIssue(workspaceId, archive.issueId);
      try {
        db.prepare(`
          INSERT INTO archives (workspace_id, file_name, issue_id, file_path, generated_at, payload_json)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          workspaceId,
          archive.fileName,
          archive.issueId,
          archive.filePath,
          archive.generatedAt,
          JSON.stringify(archive),
        );
      } catch (error) {
        if (error && typeof error === "object" && String(error.message).includes("UNIQUE")) {
          throw createStorageError(`archive ${archive.fileName} already exists`, "CONFLICT");
        }
        throw error;
      }
      return archive;
    },
    getArchive(workspaceId, fileName) {
      requireWorkspace(workspaceId);
      const row = db
        .prepare(
          `SELECT payload_json FROM archives WHERE workspace_id = ? AND file_name = ?`,
        )
        .get(workspaceId, fileName);
      if (!row) {
        throw createStorageError(`archive ${fileName} not found`, "NOT_FOUND");
      }
      return parsePayload(row);
    },
    listErrorEntries(workspaceId) {
      requireWorkspace(workspaceId);
      const rows = db
        .prepare(
          `SELECT payload_json FROM error_entries WHERE workspace_id = ? ORDER BY created_at DESC`,
        )
        .all(workspaceId);
      return rows.map(parsePayload);
    },
    createErrorEntry(workspaceId, payload) {
      requireWorkspace(workspaceId);
      const entry = normalizeErrorEntryPayload(workspaceId, structuredClone(payload));
      requireIssue(workspaceId, entry.sourceIssueId);
      try {
        db.prepare(`
          INSERT INTO error_entries (
            id, workspace_id, source_issue_id, error_code, category, created_at, updated_at, payload_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          entry.id,
          workspaceId,
          entry.sourceIssueId,
          entry.errorCode,
          entry.category,
          entry.createdAt,
          entry.updatedAt,
          JSON.stringify(entry),
        );
      } catch (error) {
        if (error && typeof error === "object" && String(error.message).includes("UNIQUE")) {
          throw createStorageError(`error entry conflict for ${entry.id}`, "CONFLICT");
        }
        throw error;
      }
      return entry;
    },
    getErrorEntry(workspaceId, entryId) {
      requireWorkspace(workspaceId);
      const row = db
        .prepare(
          `SELECT payload_json FROM error_entries WHERE workspace_id = ? AND id = ?`,
        )
        .get(workspaceId, entryId);
      if (!row) {
        throw createStorageError(`error entry ${entryId} not found`, "NOT_FOUND");
      }
      return parsePayload(row);
    },
  };
}
