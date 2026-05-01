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
  "form_drafts",
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
      id: "form_drafts.workspace_fk",
      message: "form_drafts must reference an existing workspace",
      sql: `
        SELECT form_drafts.workspace_id, form_drafts.form_kind, form_drafts.item_id
        FROM form_drafts
        LEFT JOIN workspaces ON workspaces.id = form_drafts.workspace_id
        WHERE workspaces.id IS NULL
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

  const formDraftRows = runCheckedQuery(checks, "form_drafts.payload_scan", () =>
    db.prepare("SELECT workspace_id, form_kind, item_id, payload_json FROM form_drafts ORDER BY form_kind ASC, item_id ASC").all(),
  );
  for (const row of formDraftRows ?? []) {
    const key = `${row.form_kind}/${row.item_id}`;
    const payload = parsePayload(checks, "form_drafts", key, row.payload_json);
    if (!payload) continue;
    if (payload.workspaceId !== undefined && payload.workspaceId !== row.workspace_id) {
      pushCheck(checks, "form_drafts.payload_workspace_match", "fail", "error", "form_draft payload workspaceId must match indexed workspace_id", {
        rowKey: key,
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

function repairTaskId(check, index) {
  const safeCheckId = check.id.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `repair-${String(index + 1).padStart(2, "0")}-${safeCheckId}`;
}

function inferEntityType(checkId, row = {}) {
  if (typeof row.table === "string" && row.table.length > 0) return row.table;
  if (checkId.startsWith("issues.")) return "issue_card";
  if (checkId.startsWith("records.")) return "investigation_record";
  if (checkId.startsWith("archives.")) return "archive_document";
  if (checkId.startsWith("error_entries.")) return "error_entry";
  if (checkId.startsWith("schema.")) return "schema";
  if (checkId.startsWith("sqlite.")) return "sqlite_db";
  return "unknown";
}

function inferEntityId(row = {}, fallback) {
  for (const key of ["id", "file_name", "rowId", "rowid", "source_issue_id", "issue_id", "workspace_id"]) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).length > 0) {
      return String(row[key]);
    }
  }
  return fallback;
}

function createAffectedEntities(check, dbPath) {
  const details = check.details ?? {};
  const rows = Array.isArray(details.violations) ? details.violations : [];
  const entities = rows.map((row) => ({
    entityType: inferEntityType(check.id, row),
    entityId: inferEntityId(row, basename(dbPath)),
    workspaceId: row.workspace_id ? String(row.workspace_id) : undefined,
    details: row,
  }));

  if (details.rowId !== undefined) {
    entities.push({
      entityType: inferEntityType(check.id),
      entityId: String(details.rowId),
      details,
    });
  }

  if (entities.length === 0) {
    entities.push({
      entityType: inferEntityType(check.id),
      entityId: basename(dbPath),
      details: { checkId: check.id, message: check.message },
    });
  }

  return entities;
}

function repairGuidanceForCheck(check) {
  if (check.id === "sqlite.integrity_check") {
    return {
      risk: "SQLite 文件级完整性异常，继续写入可能扩大损坏范围或让后续备份也包含坏页。",
      suggestedRepairSteps: [
        "不要直接修改或压缩该 DB，先复制原始 DB 和最近备份到只读审阅位置。",
        "用 SQLite 官方工具在副本上重新运行 PRAGMA integrity_check，确认是否可复现。",
        "由人工决定从最近健康备份恢复，或在副本上导出可读数据后重建 DB。",
        "确认恢复路径后再安排停机、替换和回滚步骤。",
      ],
      verification: "在临时副本和目标 DB 上重新运行 integrity check，并读回 workspace / issue / archive / error-entry 计数。",
    };
  }

  if (check.id.startsWith("schema.")) {
    return {
      risk: "数据库 schema 与当前代码预期不一致，继续写入可能产生无法被当前版本正确读取的数据。",
      suggestedRepairSteps: [
        "停止把该 DB 当作可写生产库使用，先确认正在运行的 ProbeFlash release 版本。",
        "对照 release notes 或 schema contract 判断是版本跑错、迁移未执行，还是 DB 来自未来版本。",
        "在临时 DB 上演练迁移或恢复，不要对原始 DB 做 destructive migration。",
        "人工确认迁移 / 恢复方案后，再切换服务使用的 DB。",
      ],
      verification: "重新运行 schema contract / integrity check，确认 user_version、schema_meta 和必需表全部匹配。",
    };
  }

  if (check.id.includes("payload")) {
    return {
      risk: "payload_json 与索引列或必填字段不一致，UI / API 可能跳过该实体或展示错误事实。",
      suggestedRepairSteps: [
        "导出受影响行的索引列和 payload_json，保留原始内容供审阅。",
        "人工判断应以索引列、payload_json、归档文档还是最近备份为事实源。",
        "只在临时副本中试写修正后的 payload，并通过 schema 校验后再考虑生产修复。",
        "不要自动补空字段；缺失根因、修复或预防信息必须由人工确认。",
      ],
      verification: "重新运行 integrity check，并通过 UI/API 读回受影响实体，确认 schema 校验不再报错。",
    };
  }

  if (check.id === "issues.archived_has_archive" || check.id === "issues.archived_has_error_entry") {
    return {
      risk: "问题卡已标记 archived，但归档摘要或错误表条目缺失，知识库会误以为该问题已完整结案。",
      suggestedRepairSteps: [
        "读取受影响 issue，确认 closeout 表单内容、已有 archive/error-entry 和用户最近操作。",
        "如果只是部分写入失败，保留已落库实体，不要自动删除或覆盖。",
        "由人工决定补齐缺失 archive/error-entry，或把 issue 状态回退为 open 后重新结案。",
        "修复前先备份 DB；修复动作必须能回滚。",
      ],
      verification: "重新运行 integrity check，并读回 issue、archive、error-entry 三者的 workspaceId / issueId 关系。",
    };
  }

  if (check.id.includes("_fk") || check.id.includes("workspace_match")) {
    return {
      risk: "实体关系断裂或 workspaceId 不一致，可能导致跨项目串数据、孤儿记录或归档无法追溯。",
      suggestedRepairSteps: [
        "列出受影响实体及其引用 ID，确认缺失父实体是否可从备份恢复。",
        "不要自动删除孤儿记录；先判断记录是否仍有审计价值。",
        "在临时 DB 中演练补父实体、调整 workspaceId 或恢复备份三种方案。",
        "人工确认后再对生产 DB 做最小修复，并记录修复原因。",
      ],
      verification: "重新运行 PRAGMA foreign_key_check 和 integrity check，确认同一 workspace 下 issue / record / archive / error-entry 关系闭合。",
    };
  }

  return {
    risk: "数据一致性检查发现异常，继续写入可能隐藏真实损坏状态或让 completion gate 误判完成。",
    suggestedRepairSteps: [
      "先备份当前 DB 和相关导出报告。",
      "人工审阅 affectedEntities 与 failed check 明细，确认真实事实源。",
      "只在临时副本中试修复，不直接修改生产 DB。",
      "确认修复方案、回滚方式和验证结果后，再安排人工应用。",
    ],
    verification: "重新运行 integrity check，并通过 UI/API 读回受影响实体。",
  };
}

export function createIntegrityRepairPlan({ failedChecks, dbPath, checkedAt }) {
  return {
    generatedAt: checkedAt,
    source: "sqlite_integrity_check",
    readOnly: true,
    autoRepair: false,
    tasks: failedChecks.map((check, index) => {
      const guidance = repairGuidanceForCheck(check);
      return {
        id: repairTaskId(check, index),
        problemType: check.id,
        affectedEntities: createAffectedEntities(check, dbPath),
        risk: guidance.risk,
        suggestedRepairSteps: guidance.suggestedRepairSteps,
        requiresManualConfirmation: true,
        verification: guidance.verification,
      };
    }),
  };
}

export function createIntegrityReport(options = {}) {
  const dbPath = resolve(options.dbPath ?? process.env.PROBEFLASH_DB_PATH ?? DEFAULT_DB_PATH);
  assertReadableDbFile(dbPath);

  const db = new DatabaseSync(dbPath);
  const checks = [];
  try {
    const checkedAt = options.checkedAt ?? new Date().toISOString();
    checkSqliteIntegrity(db, checks);
    checkSchema(db, checks);
    checkForeignKeys(db, checks);
    checkRelationshipQueries(db, checks);
    checkPayloads(db, checks);
    const counts = readCounts(db, checks);
    const failedChecks = checks.filter((check) => check.status === "fail");
    const repairPlan = createIntegrityRepairPlan({ failedChecks, dbPath, checkedAt });
    return {
      ok: failedChecks.length === 0,
      checkedAt,
      db: {
        path: dbPath,
        fileName: basename(dbPath),
      },
      counts,
      checks,
      repairPlan,
      summary: {
        passed: checks.filter((check) => check.status === "pass").length,
        failed: failedChecks.length,
        repairTasks: repairPlan.tasks.length,
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
