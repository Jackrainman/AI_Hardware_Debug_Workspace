import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_DB_PATH } from "../src/server.mjs";

const SERVER_APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT_DIR = resolve(SERVER_APP_DIR, ".runtime", "backups");
const EXPORT_FORMAT = "probeflash-json-export";
const EXPORT_FORMAT_VERSION = 1;
const SENSITIVE_KEY_PATTERN =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|authorization|cookie|set-cookie|private[_-]?key|client[_-]?secret)/i;
const REDACTION_SUMMARY = {
  enabled: true,
  sensitiveKeys: [
    "api key",
    "authorization",
    "client secret",
    "cookie",
    "password",
    "private key",
    "secret",
    "token",
  ],
  textPatterns: ["authorization bearer", "key=value secrets", "absolute filesystem paths"],
};

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--db") {
      options.dbPath = argv[++index];
    } else if (arg === "--out") {
      options.outputDir = argv[++index];
    } else if (arg === "--timestamp") {
      options.timestamp = argv[++index];
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function safeTimestamp(timestamp = new Date().toISOString()) {
  return timestamp.replace(/[^0-9A-Za-z]+/g, "-").replace(/^-+|-+$/g, "");
}

function sqlStringLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function assertUsableSource(dbPath) {
  if (!existsSync(dbPath)) {
    throw new Error(`source sqlite db does not exist: ${dbPath}`);
  }
  const stat = statSync(dbPath);
  if (!stat.isFile()) {
    throw new Error(`source sqlite db must be a file: ${dbPath}`);
  }
}

function classifyDbPath(dbPath) {
  const normalized = dbPath.replaceAll("\\", "/");
  if (normalized.includes("/.runtime/")) return "app_runtime";
  if (normalized.includes("/shared/data/")) return "deploy_shared_data";
  if (normalized.includes("/tmp/")) return "temporary";
  return "custom";
}

function redactText(value) {
  return value
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s"']+/gi, "$1<redacted>")
    .replace(
      /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|client[_-]?secret)\s*[:=]\s*)["']?[^&\s"',}]+/gi,
      "$1<redacted>",
    )
    .replace(
      /([?&](?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|client[_-]?secret)=)[^&\s]+/gi,
      "$1<redacted>",
    )
    .replace(/(^|[\s"'([{=])\/(?:home|Users|tmp|var|opt|mnt|root|etc)\/[^\s"',)\]}]+/g, "$1<redacted-path>")
    .replace(/[A-Za-z]:\\[^\s"',)\]}]+/g, "<redacted-path>");
}

function redactObject(value) {
  if (Array.isArray(value)) {
    return value.map(redactObject);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? "<redacted>" : redactObject(item),
      ]),
    );
  }
  if (typeof value === "string") {
    return redactText(value);
  }
  return value;
}

function readJsonRows(db, tableName) {
  return db
    .prepare(`SELECT payload_json FROM ${tableName} ORDER BY rowid ASC`)
    .all()
    .map((row) => JSON.parse(row.payload_json));
}

function countRows(db, tableName) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;
}

function buildJsonExport(db, dbPath, exportedAt) {
  const workspaces = db
    .prepare(`
      SELECT id, name, description, is_default, created_at, updated_at
      FROM workspaces
      ORDER BY is_default DESC, name ASC
    `)
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

  const meta = db
    .prepare(`SELECT key, value, updated_at FROM schema_meta ORDER BY key ASC`)
    .all()
    .map((row) => ({ key: row.key, value: row.value, updatedAt: row.updated_at }));

  const counts = {
    workspaces: countRows(db, "workspaces"),
    issues: countRows(db, "issues"),
    records: countRows(db, "records"),
    archives: countRows(db, "archives"),
    errorEntries: countRows(db, "error_entries"),
  };

  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt,
    source: {
      kind: "sqlite",
      dbFileName: basename(dbPath),
      dbPathClass: classifyDbPath(dbPath),
      schemaMeta: meta,
    },
    redaction: REDACTION_SUMMARY,
    counts,
    workspaces: redactObject(workspaces),
    issues: redactObject(readJsonRows(db, "issues")),
    records: redactObject(readJsonRows(db, "records")),
    archives: redactObject(readJsonRows(db, "archives")),
    errorEntries: redactObject(readJsonRows(db, "error_entries")),
  };
}

export function createBackupExport(options = {}) {
  const dbPath = resolve(options.dbPath ?? process.env.PROBEFLASH_DB_PATH ?? DEFAULT_DB_PATH);
  const outputDir = resolve(options.outputDir ?? process.env.PROBEFLASH_BACKUP_DIR ?? DEFAULT_OUTPUT_DIR);
  const exportedAt = options.timestamp ?? new Date().toISOString();
  const stamp = safeTimestamp(exportedAt);
  const backupPath = resolve(outputDir, `probeflash-backup-${stamp}.sqlite`);
  const exportPath = resolve(outputDir, `probeflash-export-${stamp}.json`);

  assertUsableSource(dbPath);
  mkdirSync(outputDir, { recursive: true });
  for (const outputPath of [backupPath, exportPath]) {
    if (existsSync(outputPath)) {
      throw new Error(`refusing to overwrite existing backup artifact: ${outputPath}`);
    }
  }
  if (backupPath === dbPath || exportPath === dbPath) {
    throw new Error("backup/export output must not overwrite the source db");
  }

  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA wal_checkpoint(PASSIVE)");
    db.exec(`VACUUM INTO ${sqlStringLiteral(backupPath)}`);
    const jsonExport = buildJsonExport(db, dbPath, exportedAt);
    writeFileSync(exportPath, `${JSON.stringify(jsonExport, null, 2)}\n`, "utf8");
    return {
      dbPath,
      outputDir,
      backupPath,
      exportPath,
      counts: jsonExport.counts,
    };
  } finally {
    db.close();
  }
}

function printHelp() {
  console.log("Usage: npm run backup:export -- --db <sqlite-path> --out <output-dir>");
  console.log("Defaults: --db uses PROBEFLASH_DB_PATH or apps/server/.runtime/probeflash.local.sqlite");
  console.log("          --out uses PROBEFLASH_BACKUP_DIR or apps/server/.runtime/backups");
}

const directRun = process.argv[1] === fileURLToPath(import.meta.url);

if (directRun) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const result = createBackupExport(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`[probeflash-backup-export] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
