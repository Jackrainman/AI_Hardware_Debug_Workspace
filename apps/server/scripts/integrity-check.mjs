import { existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { SCHEMA_VERSION } from "../src/database.mjs";
import { DEFAULT_DB_PATH } from "../src/server.mjs";

const REQUIRED_TABLES = [
  "schema_meta",
  "workspaces",
  "issues",
  "records",
  "archives",
  "error_entries",
];

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--db") {
      options.dbPath = argv[++index];
    } else if (arg === "--checked-at") {
      options.checkedAt = argv[++index];
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log("Usage: npm run integrity:check -- --db <sqlite-path>");
  console.log("Defaults: --db uses PROBEFLASH_DB_PATH or apps/server/.runtime/probeflash.local.sqlite");
}

function assertReadableDbFile(dbPath) {
  if (!existsSync(dbPath)) {
    throw new Error(`sqlite db does not exist: ${dbPath}`);
  }
  const stat = statSync(dbPath);
  if (!stat.isFile()) {
    throw new Error(`sqlite db must be a file: ${dbPath}`);
  }
}

function firstValue(row) {
  return Object.values(row ?? {})[0];
}

function jsonPath(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pushCheck(checks, id, status, severity, message, details = {}) {
  checks.push({ id, status, severity, message, details });
}

function runCheckedQuery(checks, id, fn) {
  try {
    return fn();
  } catch (error) {
    pushCheck(checks, id, "fail", "error", error instanceof Error ? error.message : String(error));
    return null;
  }
}

function parsePayload(checks, tableName, rowId, payloadJson) {
  try {
    const parsed = JSON.parse(payloadJson);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      pushCheck(checks, `${tableName}.payload_json`, "fail", "error", `${tableName} payload must be an object`, {
        rowId,
      });
      return null;
    }
    return parsed;
  } catch (error) {
    pushCheck(checks, `${tableName}.payload_json`, "fail", "error", `${tableName} payload must be valid JSON`, {
      rowId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function requirePayloadFields(checks, tableName, rowId, payload, fields) {
  const missing = fields.filter((field) => !isNonEmptyString(jsonPath(payload, field)));
  if (missing.length > 0) {
    pushCheck(checks, `${tableName}.payload_required_fields`, "fail", "error", `${tableName} payload missing required fields`, {
      rowId,
      missing,
    });
  }
}

function checkSqliteIntegrity(db, checks) {
  const rows = runCheckedQuery(checks, "sqlite.integrity_check", () => db.prepare("PRAGMA integrity_check").all());
  if (!rows) return;
  const failures = rows.map(firstValue).filter((value) => value !== "ok");
  if (failures.length > 0) {
    pushCheck(checks, "sqlite.integrity_check", "fail", "error", "SQLite PRAGMA integrity_check reported failures", {
      failures,
    });
    return;
  }
  pushCheck(checks, "sqlite.integrity_check", "pass", "info", "SQLite file integrity_check returned ok");
}

function checkForeignKeys(db, checks) {
  const rows = runCheckedQuery(checks, "sqlite.foreign_key_check", () => db.prepare("PRAGMA foreign_key_check").all());
  if (!rows) return;
  if (rows.length > 0) {
    pushCheck(checks, "sqlite.foreign_key_check", "fail", "error", "SQLite foreign_key_check reported violations", {
      violations: rows,
    });
    return;
  }
  pushCheck(checks, "sqlite.foreign_key_check", "pass", "info", "SQLite foreign_key_check returned no violations");
}

function checkSchema(db, checks) {
  const userVersionRow = runCheckedQuery(checks, "schema.user_version", () => db.prepare("PRAGMA user_version").get());
  if (userVersionRow) {
    const userVersion = firstValue(userVersionRow);
    pushCheck(
      checks,
      "schema.user_version",
      userVersion === SCHEMA_VERSION ? "pass" : "fail",
      userVersion === SCHEMA_VERSION ? "info" : "error",
      userVersion === SCHEMA_VERSION ? "PRAGMA user_version matches code schema" : "PRAGMA user_version does not match code schema",
      { expected: SCHEMA_VERSION, actual: userVersion },
    );
  }

  const tableRows = runCheckedQuery(checks, "schema.required_tables", () =>
    db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name ASC").all(),
  );
  if (tableRows) {
    const tableNames = new Set(tableRows.map((row) => row.name));
    const missing = REQUIRED_TABLES.filter((tableName) => !tableNames.has(tableName));
    pushCheck(
      checks,
      "schema.required_tables",
      missing.length === 0 ? "pass" : "fail",
      missing.length === 0 ? "info" : "error",
      missing.length === 0 ? "required ProbeFlash tables exist" : "required ProbeFlash tables are missing",
      { missing },
    );
  }

  const schemaMeta = runCheckedQuery(checks, "schema.schema_meta_version", () =>
    db.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get(),
  );
  if (schemaMeta) {
    pushCheck(
      checks,
      "schema.schema_meta_version",
      schemaMeta.value === String(SCHEMA_VERSION) ? "pass" : "fail",
      schemaMeta.value === String(SCHEMA_VERSION) ? "info" : "error",
      schemaMeta.value === String(SCHEMA_VERSION)
        ? "schema_meta schema_version matches code schema"
        : "schema_meta schema_version does not match code schema",
      { expected: String(SCHEMA_VERSION), actual: schemaMeta.value },
    );
  }
}

function checkRelationshipQueries(db, checks) {
  const relationshipChecks = [
    {
      id: "issues.workspace_fk",
      message: "issues must reference an existing workspace",
      sql: `
        SELECT issues.id, issues.workspace_id
        FROM issues
        LEFT JOIN workspaces ON workspaces.id = issues.workspace_id
        WHERE workspaces.id IS NULL
      `,
    },
    {
      id: "records.workspace_fk",
      message: "records must reference an existing workspace",
      sql: `
        SELECT records.id, records.workspace_id
        FROM records
        LEFT JOIN workspaces ON workspaces.id = records.workspace_id
        WHERE workspaces.id IS NULL
      `,
    },
    {
      id: "records.issue_fk",
      message: "records must reference an existing issue",
      sql: `
        SELECT records.id, records.issue_id
        FROM records
        LEFT JOIN issues ON issues.id = records.issue_id
        WHERE issues.id IS NULL
      `,
    },
    {
      id: "records.workspace_match",
      message: "records.workspace_id must match the referenced issue workspace",
      sql: `
        SELECT records.id, records.workspace_id, issues.workspace_id AS issue_workspace_id
        FROM records
        JOIN issues ON issues.id = records.issue_id
        WHERE records.workspace_id <> issues.workspace_id
      `,
    },
    {
      id: "archives.issue_fk",
      message: "archives must reference an existing issue",
      sql: `
        SELECT archives.file_name, archives.issue_id
        FROM archives
        LEFT JOIN issues ON issues.id = archives.issue_id
        WHERE issues.id IS NULL
      `,
    },
    {
      id: "archives.workspace_match",
      message: "archives.workspace_id must match the referenced issue workspace",
      sql: `
        SELECT archives.file_name, archives.workspace_id, issues.workspace_id AS issue_workspace_id
        FROM archives
        JOIN issues ON issues.id = archives.issue_id
        WHERE archives.workspace_id <> issues.workspace_id
      `,
    },
    {
      id: "error_entries.issue_fk",
      message: "error_entries must reference an existing source issue",
      sql: `
        SELECT error_entries.id, error_entries.source_issue_id
        FROM error_entries
        LEFT JOIN issues ON issues.id = error_entries.source_issue_id
        WHERE issues.id IS NULL
      `,
    },
    {
      id: "error_entries.workspace_match",
      message: "error_entries.workspace_id must match the referenced issue workspace",
      sql: `
        SELECT error_entries.id, error_entries.workspace_id, issues.workspace_id AS issue_workspace_id
        FROM error_entries
        JOIN issues ON issues.id = error_entries.source_issue_id
        WHERE error_entries.workspace_id <> issues.workspace_id
      `,
    },
    {
      id: "issues.archived_has_archive",
      message: "archived issues must have an archive document row",
      sql: `
        SELECT issues.id, issues.workspace_id
        FROM issues
        LEFT JOIN archives ON archives.issue_id = issues.id AND archives.workspace_id = issues.workspace_id
        WHERE issues.status = 'archived' AND archives.issue_id IS NULL
      `,
    },
    {
      id: "issues.archived_has_error_entry",
      message: "archived issues must have an error-entry row",
      sql: `
        SELECT issues.id, issues.workspace_id
        FROM issues
        LEFT JOIN error_entries ON error_entries.source_issue_id = issues.id AND error_entries.workspace_id = issues.workspace_id
        WHERE issues.status = 'archived' AND error_entries.source_issue_id IS NULL
      `,
    },
  ];

  for (const check of relationshipChecks) {
    const rows = runCheckedQuery(checks, check.id, () => db.prepare(check.sql).all());
    if (!rows) continue;
    pushCheck(
      checks,
      check.id,
      rows.length === 0 ? "pass" : "fail",
      rows.length === 0 ? "info" : "error",
      rows.length === 0 ? check.message : `${check.message}: found ${rows.length} violation(s)`,
      { violations: rows },
    );
  }
}

function checkPayloads(db, checks) {
  const issueRows = runCheckedQuery(checks, "issues.payload_scan", () =>
    db.prepare("SELECT id, workspace_id, title, status, payload_json FROM issues ORDER BY id ASC").all(),
  );
  for (const row of issueRows ?? []) {
    const payload = parsePayload(checks, "issues", row.id, row.payload_json);
    if (!payload) continue;
    requirePayloadFields(checks, "issues", row.id, payload, ["id", "projectId", "title", "status", "createdAt", "updatedAt"]);
    if (payload.id !== row.id || payload.projectId !== row.workspace_id || payload.status !== row.status) {
      pushCheck(checks, "issues.payload_row_match", "fail", "error", "issue payload must match indexed row fields", {
        rowId: row.id,
      });
    }
  }

  const recordRows = runCheckedQuery(checks, "records.payload_scan", () =>
    db.prepare("SELECT id, workspace_id, issue_id, type, payload_json FROM records ORDER BY id ASC").all(),
  );
  for (const row of recordRows ?? []) {
    const payload = parsePayload(checks, "records", row.id, row.payload_json);
    if (!payload) continue;
    requirePayloadFields(checks, "records", row.id, payload, ["id", "issueId", "type", "createdAt"]);
    if (payload.id !== row.id || payload.issueId !== row.issue_id || payload.type !== row.type) {
      pushCheck(checks, "records.payload_row_match", "fail", "error", "record payload must match indexed row fields", {
        rowId: row.id,
      });
    }
  }

  const archiveRows = runCheckedQuery(checks, "archives.payload_scan", () =>
    db.prepare("SELECT workspace_id, file_name, issue_id, file_path, payload_json FROM archives ORDER BY file_name ASC").all(),
  );
  for (const row of archiveRows ?? []) {
    const payload = parsePayload(checks, "archives", row.file_name, row.payload_json);
    if (!payload) continue;
    requirePayloadFields(checks, "archives", row.file_name, payload, ["issueId", "projectId", "fileName", "filePath", "generatedAt"]);
    if (
      payload.fileName !== row.file_name ||
      payload.issueId !== row.issue_id ||
      payload.projectId !== row.workspace_id ||
      payload.filePath !== row.file_path
    ) {
      pushCheck(checks, "archives.payload_row_match", "fail", "error", "archive payload must match indexed row fields", {
        rowId: row.file_name,
      });
    }
  }

  const errorRows = runCheckedQuery(checks, "error_entries.payload_scan", () =>
    db.prepare("SELECT id, workspace_id, source_issue_id, error_code, payload_json FROM error_entries ORDER BY id ASC").all(),
  );
  for (const row of errorRows ?? []) {
    const payload = parsePayload(checks, "error_entries", row.id, row.payload_json);
    if (!payload) continue;
    requirePayloadFields(checks, "error_entries", row.id, payload, [
      "id",
      "projectId",
      "sourceIssueId",
      "errorCode",
      "title",
      "prevention",
      "archiveFilePath",
      "createdAt",
      "updatedAt",
    ]);
    if (
      payload.id !== row.id ||
      payload.projectId !== row.workspace_id ||
      payload.sourceIssueId !== row.source_issue_id ||
      payload.errorCode !== row.error_code
    ) {
      pushCheck(checks, "error_entries.payload_row_match", "fail", "error", "error-entry payload must match indexed row fields", {
        rowId: row.id,
      });
    }
  }
}

function readCounts(db, checks) {
  const counts = {};
  for (const tableName of REQUIRED_TABLES) {
    const row = runCheckedQuery(checks, `counts.${tableName}`, () =>
      db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get(),
    );
    if (row) counts[tableName] = row.count;
  }
  return counts;
}

export function createIntegrityReport(options = {}) {
  const dbPath = resolve(options.dbPath ?? process.env.PROBEFLASH_DB_PATH ?? DEFAULT_DB_PATH);
  assertReadableDbFile(dbPath);

  const db = new DatabaseSync(dbPath);
  const checks = [];
  try {
    checkSqliteIntegrity(db, checks);
    checkSchema(db, checks);
    checkForeignKeys(db, checks);
    checkRelationshipQueries(db, checks);
    checkPayloads(db, checks);
    const counts = readCounts(db, checks);
    const failedChecks = checks.filter((check) => check.status === "fail");
    return {
      ok: failedChecks.length === 0,
      checkedAt: options.checkedAt ?? new Date().toISOString(),
      db: {
        path: dbPath,
        fileName: basename(dbPath),
      },
      counts,
      checks,
      summary: {
        passed: checks.filter((check) => check.status === "pass").length,
        failed: failedChecks.length,
      },
    };
  } finally {
    db.close();
  }
}

const directRun = process.argv[1] === fileURLToPath(import.meta.url);

if (directRun) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const report = createIntegrityReport(options);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`[probeflash-integrity-check] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
