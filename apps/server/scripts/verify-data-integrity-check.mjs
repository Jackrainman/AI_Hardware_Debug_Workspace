import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

import { createProbeFlashDatabase } from "../src/database.mjs";
import { createIntegrityReport } from "./integrity-check.mjs";

const WORKSPACE_ID = "workspace-26-r1";
const NOW = "2026-04-27T15:30:00+08:00";
const SCRIPT_PATH = resolve(fileURLToPath(import.meta.url), "..", "integrity-check.mjs");

function fail(reason, detail) {
  console.error(`[DATA-INTEGRITY-CHECK verify] FAIL: ${reason}`);
  if (detail !== undefined) {
    console.error(JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

function assert(condition, reason, detail) {
  if (!condition) {
    fail(reason, detail);
  }
}

function repoSnapshot() {
  return {
    branch: "master",
    headCommitHash: "0000000000000000000000000000000000000000",
    headCommitMessage: "verify fixture",
    hasUncommittedChanges: false,
    changedFiles: [],
    recentCommits: [],
    capturedAt: NOW,
  };
}

function issueFixture(id, status = "open") {
  return {
    id,
    projectId: WORKSPACE_ID,
    title: `Integrity verify issue ${id}`,
    rawInput: "Verify SQLite integrity check.",
    normalizedSummary: "integrity check fixture",
    symptomSummary: "n/a",
    suspectedDirections: ["data integrity"],
    suggestedActions: ["run integrity check"],
    status,
    severity: "medium",
    tags: ["verify"],
    repoSnapshot: repoSnapshot(),
    relatedFiles: [],
    relatedCommits: [],
    relatedHistoricalIssueIds: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function recordFixture(id, issueId) {
  return {
    id,
    issueId,
    type: "observation",
    rawText: "Integrity verify record.",
    polishedText: "Integrity verify record.",
    aiExtractedSignals: [],
    linkedFiles: [],
    linkedCommits: [],
    createdAt: NOW,
  };
}

function archiveFixture(issueId, fileName) {
  return {
    issueId,
    projectId: WORKSPACE_ID,
    fileName,
    filePath: `.debug_workspace/archive/${fileName}`,
    markdownContent: "# Integrity verify\n",
    generatedBy: "manual",
    generatedAt: NOW,
  };
}

function errorEntryFixture(id, issueId, errorCode, archiveFilePath, prevention = "Run integrity checks before deploy.") {
  return {
    id,
    projectId: WORKSPACE_ID,
    sourceIssueId: issueId,
    errorCode,
    title: `Integrity verify entry ${id}`,
    category: "verify",
    symptom: "integrity check smoke",
    rootCause: "verify fixture",
    resolution: "integrity check detected or passed fixture",
    prevention,
    archiveFilePath,
    relatedFiles: [],
    relatedCommits: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function hasFailedCheck(report, id) {
  return report.checks.some((check) => check.id === id && check.status === "fail");
}

function hasPassedCheck(report, id) {
  return report.checks.some((check) => check.id === id && check.status === "pass");
}

function createCleanDb(dbPath) {
  const store = createProbeFlashDatabase(dbPath);
  try {
    const issue = issueFixture("issue-integrity-clean-0001", "archived");
    const record = recordFixture("record-integrity-clean-0001", issue.id);
    const archive = archiveFixture(issue.id, "2026-04-27_issue-integrity-clean-0001.md");
    const errorEntry = errorEntryFixture(
      "error-entry-integrity-clean-0001",
      issue.id,
      "DBG-20260427-301",
      archive.filePath,
    );
    store.createIssue(WORKSPACE_ID, issue);
    store.createRecord(WORKSPACE_ID, issue.id, record);
    store.createArchive(WORKSPACE_ID, archive);
    store.createErrorEntry(WORKSPACE_ID, errorEntry);
  } finally {
    store.close();
  }
}

function createBrokenDb(dbPath) {
  const store = createProbeFlashDatabase(dbPath);
  try {
    store.createIssue(WORKSPACE_ID, issueFixture("issue-integrity-no-closeout-0001", "archived"));
    store.createIssue(WORKSPACE_ID, issueFixture("issue-integrity-bad-entry-0001", "open"));
  } finally {
    store.close();
  }

  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA foreign_keys = OFF");
    const orphanRecord = recordFixture("record-integrity-orphan-0001", "issue-does-not-exist");
    db.prepare(`
      INSERT INTO records (id, workspace_id, issue_id, type, created_at, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      orphanRecord.id,
      WORKSPACE_ID,
      orphanRecord.issueId,
      orphanRecord.type,
      orphanRecord.createdAt,
      JSON.stringify(orphanRecord),
    );

    const badEntry = errorEntryFixture(
      "error-entry-integrity-blank-prevention-0001",
      "issue-integrity-bad-entry-0001",
      "DBG-20260427-302",
      ".debug_workspace/archive/missing.md",
      "   ",
    );
    db.prepare(`
      INSERT INTO error_entries (
        id, workspace_id, source_issue_id, error_code, category, created_at, updated_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      badEntry.id,
      WORKSPACE_ID,
      badEntry.sourceIssueId,
      badEntry.errorCode,
      badEntry.category,
      badEntry.createdAt,
      badEntry.updatedAt,
      JSON.stringify(badEntry),
    );
  } finally {
    db.close();
  }
}

const workdir = mkdtempSync(join(tmpdir(), "probeflash-data-integrity-check-"));
const cleanDbPath = join(workdir, "clean.sqlite");
const brokenDbPath = join(workdir, "broken.sqlite");

createCleanDb(cleanDbPath);
const cleanReport = createIntegrityReport({ dbPath: cleanDbPath, checkedAt: NOW });
assert(cleanReport.ok === true, "clean DB should pass integrity check", cleanReport);
assert(hasPassedCheck(cleanReport, "sqlite.integrity_check"), "clean DB should run sqlite integrity_check", cleanReport);
assert(hasPassedCheck(cleanReport, "issues.archived_has_archive"), "clean archived issue should have archive", cleanReport);
assert(hasPassedCheck(cleanReport, "issues.archived_has_error_entry"), "clean archived issue should have error entry", cleanReport);

createBrokenDb(brokenDbPath);
const brokenReport = createIntegrityReport({ dbPath: brokenDbPath, checkedAt: NOW });
assert(brokenReport.ok === false, "broken DB should fail integrity check", brokenReport);
assert(hasFailedCheck(brokenReport, "sqlite.foreign_key_check"), "broken DB should fail foreign_key_check", brokenReport);
assert(hasFailedCheck(brokenReport, "records.issue_fk"), "broken DB should report orphan record", brokenReport);
assert(hasFailedCheck(brokenReport, "issues.archived_has_archive"), "broken DB should report missing archive", brokenReport);
assert(hasFailedCheck(brokenReport, "issues.archived_has_error_entry"), "broken DB should report missing error entry", brokenReport);
assert(hasFailedCheck(brokenReport, "error_entries.payload_required_fields"), "broken DB should report blank prevention", brokenReport);

const cli = spawnSync(process.execPath, [SCRIPT_PATH, "--db", brokenDbPath, "--checked-at", NOW], {
  encoding: "utf8",
});
assert(cli.status === 1, "integrity-check CLI should exit 1 for broken DB", {
  status: cli.status,
  stdout: cli.stdout,
  stderr: cli.stderr,
});
const cliReport = JSON.parse(cli.stdout);
assert(cliReport.ok === false && hasFailedCheck(cliReport, "records.issue_fk"), "CLI report should be readable JSON with failed checks", cliReport);

console.log("[DATA-INTEGRITY-CHECK verify] PASS: clean DB passes SQLite, relationship, closeout, and payload checks");
console.log("[DATA-INTEGRITY-CHECK verify] PASS: injected orphan record fails foreign key and relationship checks");
console.log("[DATA-INTEGRITY-CHECK verify] PASS: archived issue without archive/error-entry is reported");
console.log("[DATA-INTEGRITY-CHECK verify] PASS: blank ErrorEntry.prevention is reported and CLI exits non-zero");
