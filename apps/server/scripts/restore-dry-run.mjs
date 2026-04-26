import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createProbeFlashDatabase } from "../src/database.mjs";

const SERVER_APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TMP_PARENT = resolve(SERVER_APP_DIR, ".runtime", "restore-dry-runs");

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--backup") {
      options.backupPath = argv[++index];
    } else if (arg === "--json-export") {
      options.jsonExportPath = argv[++index];
    } else if (arg === "--tmp-dir") {
      options.tmpDir = argv[++index];
    } else if (arg === "--keep-temp") {
      options.keepTemp = true;
    } else if (arg === "--require-domain-data") {
      options.requireDomainData = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function assertFile(path, label) {
  if (!path) {
    throw new Error(`${label} path is required`);
  }
  if (!existsSync(path)) {
    throw new Error(`${label} does not exist: ${path}`);
  }
  const stat = statSync(path);
  if (!stat.isFile()) {
    throw new Error(`${label} must be a file: ${path}`);
  }
  return stat;
}

function readExpectedCounts(jsonExportPath) {
  if (!jsonExportPath) return null;
  assertFile(jsonExportPath, "json export");
  const parsed = JSON.parse(readFileSync(jsonExportPath, "utf8"));
  if (!parsed.counts || typeof parsed.counts !== "object") {
    throw new Error("json export must include counts");
  }
  return parsed.counts;
}

function assertCountsMatch(actual, expected) {
  if (!expected) return false;
  for (const key of ["workspaces", "issues", "records", "archives", "errorEntries"]) {
    if (actual[key] !== expected[key]) {
      throw new Error(`restored ${key} count ${actual[key]} does not match json export ${expected[key]}`);
    }
  }
  return true;
}

function assertDomainData(counts) {
  for (const key of ["workspaces", "issues", "records", "archives", "errorEntries"]) {
    if (counts[key] < 1) {
      throw new Error(`restore dry-run requires at least one ${key} row`);
    }
  }
}

function readWorkspaceSummary(store, workspace) {
  const issues = store.listIssues(workspace.id, "all");
  const archives = store.listArchives(workspace.id);
  const errorEntries = store.listErrorEntries(workspace.id);
  let recordsCount = 0;
  let sampleIssue = null;
  let sampleRecord = null;

  for (const issueSummary of issues) {
    const issue = store.getIssue(workspace.id, issueSummary.id);
    const records = store.listRecords(workspace.id, issue.id);
    recordsCount += records.length;
    sampleIssue ??= issue;
    sampleRecord ??= records[0] ?? null;
  }

  const sampleArchive = archives[0]
    ? store.getArchive(workspace.id, archives[0].fileName)
    : null;
  const sampleErrorEntry = errorEntries[0]
    ? store.getErrorEntry(workspace.id, errorEntries[0].id)
    : null;

  return {
    workspace,
    counts: {
      issues: issues.length,
      records: recordsCount,
      archives: archives.length,
      errorEntries: errorEntries.length,
    },
    samples: {
      issueId: sampleIssue?.id ?? null,
      recordId: sampleRecord?.id ?? null,
      archiveFileName: sampleArchive?.fileName ?? null,
      errorEntryId: sampleErrorEntry?.id ?? null,
    },
  };
}

function readRestoredData(tempDbPath) {
  const store = createProbeFlashDatabase(tempDbPath);
  try {
    const workspaces = store.listWorkspaces();
    const workspaceSummaries = workspaces.map((workspace) => readWorkspaceSummary(store, workspace));
    const counts = workspaceSummaries.reduce(
      (acc, summary) => ({
        workspaces: acc.workspaces,
        issues: acc.issues + summary.counts.issues,
        records: acc.records + summary.counts.records,
        archives: acc.archives + summary.counts.archives,
        errorEntries: acc.errorEntries + summary.counts.errorEntries,
      }),
      {
        workspaces: workspaces.length,
        issues: 0,
        records: 0,
        archives: 0,
        errorEntries: 0,
      },
    );
    const firstSummary = workspaceSummaries.find((summary) => summary.samples.issueId) ?? workspaceSummaries[0];
    return {
      counts,
      samples: {
        workspaceId: firstSummary?.workspace.id ?? null,
        workspaceName: firstSummary?.workspace.name ?? null,
        issueId: firstSummary?.samples.issueId ?? null,
        recordId: firstSummary?.samples.recordId ?? null,
        archiveFileName: firstSummary?.samples.archiveFileName ?? null,
        errorEntryId: firstSummary?.samples.errorEntryId ?? null,
      },
    };
  } finally {
    store.close();
  }
}

export function restoreDryRun(options = {}) {
  const backupInput = options.backupPath ?? process.env.PROBEFLASH_RESTORE_BACKUP;
  if (!backupInput) {
    throw new Error("sqlite backup path is required");
  }
  const backupPath = resolve(backupInput);
  const jsonExportPath = options.jsonExportPath
    ? resolve(options.jsonExportPath)
    : process.env.PROBEFLASH_RESTORE_JSON_EXPORT
      ? resolve(process.env.PROBEFLASH_RESTORE_JSON_EXPORT)
      : null;
  const tmpParent = resolve(
    options.tmpDir ?? process.env.PROBEFLASH_RESTORE_TMP_DIR ?? DEFAULT_TMP_PARENT,
  );
  const backupBefore = assertFile(backupPath, "sqlite backup");
  const expectedCounts = readExpectedCounts(jsonExportPath);

  mkdirSync(tmpParent, { recursive: true });
  const tempDir = mkdtempSync(join(tmpParent, "probeflash-restore-dry-run-"));
  const tempDbPath = join(tempDir, `restored-${basename(backupPath)}`);

  try {
    if (resolve(tempDbPath) === backupPath) {
      throw new Error("restore dry-run temp db must not overwrite the backup db");
    }
    copyFileSync(backupPath, tempDbPath);
    const restored = readRestoredData(tempDbPath);
    const jsonExportMatched = assertCountsMatch(restored.counts, expectedCounts);
    if (options.requireDomainData) {
      assertDomainData(restored.counts);
    }

    const backupAfter = statSync(backupPath);
    const backupUnchanged =
      backupBefore.size === backupAfter.size && backupBefore.mtimeMs === backupAfter.mtimeMs;
    if (!backupUnchanged) {
      throw new Error("restore dry-run changed the backup file metadata");
    }

    return {
      backupPath,
      jsonExportPath,
      tempDbPath,
      tempDbRemoved: options.keepTemp !== true,
      backupUnchanged,
      jsonExportMatched,
      counts: restored.counts,
      samples: restored.samples,
    };
  } finally {
    if (options.keepTemp !== true) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

function printHelp() {
  console.log("Usage: npm run restore:dry-run -- --backup <sqlite-backup> [--json-export <export.json>]");
  console.log("Options:");
  console.log("  --tmp-dir <dir>             Parent directory for the temporary restored DB");
  console.log("  --keep-temp                 Keep the temporary restored DB for manual inspection");
  console.log("  --require-domain-data       Fail unless key ProbeFlash entities are present");
}

const directRun = process.argv[1] === fileURLToPath(import.meta.url);

if (directRun) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const result = restoreDryRun(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`[probeflash-restore-dry-run] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
