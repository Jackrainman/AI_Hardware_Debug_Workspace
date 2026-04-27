import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  closeoutFailureToFeedback,
  formatStorageFeedbackError,
  type RepairTask,
} from "../src/storage/storage-feedback.ts";
import { createUnexpectedWriteError } from "../src/storage/storage-result.ts";

const NOW = "2026-04-27T18:20:00+08:00";
const WORKSPACE_ID = "workspace-data-08";
const ISSUE_ID = "issue-data-08-partial";

function fail(reason: string, detail?: unknown): never {
  console.error(`[DATA-08-REPAIR-TASK-GENERATION verify] FAIL: ${reason}`);
  if (detail !== undefined) {
    console.error(JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

function assert(condition: unknown, reason: string, detail?: unknown): asserts condition {
  if (!condition) {
    fail(reason, detail);
  }
}

function assertReviewableRepairTask(task: RepairTask, label: string) {
  assert(task.problemType.length > 0, `${label}: should include problemType`, task);
  assert(task.affectedEntities.length >= 1, `${label}: should include affectedEntities`, task);
  assert(task.risk.length > 0, `${label}: should include risk`, task);
  assert(task.suggestedRepairSteps.length >= 4, `${label}: should include suggestedRepairSteps`, task);
  assert(task.requiresManualConfirmation === true, `${label}: should require manual confirmation`, task);
  assert(task.verification.length > 0, `${label}: should include verification`, task);
}

const artifacts = {
  archiveDocument: {
    issueId: ISSUE_ID,
    projectId: WORKSPACE_ID,
    fileName: "2026-04-27_issue-data-08-partial.md",
    filePath: ".debug_workspace/archive/2026-04-27_issue-data-08-partial.md",
    markdownContent: "# DATA-08 partial closeout\n",
    generatedBy: "hybrid",
    generatedAt: NOW,
  },
  errorEntry: {
    id: "error-entry-data-08-partial",
    projectId: WORKSPACE_ID,
    sourceIssueId: ISSUE_ID,
    errorCode: "DBG-20260427-801",
    title: "DATA-08 partial closeout",
    category: "data-safety",
    symptom: "partial closeout write",
    rootCause: "forced verify failure",
    resolution: "generate repair task instead of mutating data",
    prevention: "review repair task before applying any repair",
    archiveFilePath: ".debug_workspace/archive/2026-04-27_issue-data-08-partial.md",
    relatedFiles: [],
    relatedCommits: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
  updatedIssueCard: {
    id: ISSUE_ID,
    projectId: WORKSPACE_ID,
    title: "DATA-08 repair task generation",
    rawInput: "Verify partial closeout repair task generation.",
    normalizedSummary: "repair task generation fixture",
    symptomSummary: "partial closeout fixture",
    suspectedDirections: ["data safety"],
    suggestedActions: ["generate repair task"],
    status: "archived",
    severity: "medium",
    tags: ["verify"],
    repoSnapshot: {
      branch: "master",
      headCommitHash: "0000000000000000000000000000000000000000",
      headCommitMessage: "verify fixture",
      hasUncommittedChanges: false,
      changedFiles: [],
      recentCommits: [],
      capturedAt: NOW,
    },
    relatedFiles: [],
    relatedCommits: [],
    relatedHistoricalIssueIds: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
};

const partialFeedback = closeoutFailureToFeedback({
  ok: false,
  step: "save_issue_card",
  reason: "issue_card_save_failed",
  error: createUnexpectedWriteError("issue_card", ISSUE_ID, "forced issue status write failure"),
  artifacts,
  completedWrites: ["archive_document", "error_entry"],
});

assert(partialFeedback.repairTask !== undefined, "partial closeout failure should include a repair task", partialFeedback);
assertReviewableRepairTask(partialFeedback.repairTask, "partial closeout repair task");
assert(
  partialFeedback.repairTask.problemType === "partial_closeout_write_failure",
  "partial closeout repair task should use a specific problem type",
  partialFeedback.repairTask,
);
assert(
  partialFeedback.repairTask.affectedEntities.some((entity) => entity.entityId === ISSUE_ID),
  "partial closeout repair task should include the affected issue",
  partialFeedback.repairTask,
);
assert(
  partialFeedback.repairTask.affectedEntities.some((entity) => entity.entityType === "archive_document"),
  "partial closeout repair task should include the archive document",
  partialFeedback.repairTask,
);
assert(
  partialFeedback.repairTask.affectedEntities.some((entity) => entity.entityType === "error_entry"),
  "partial closeout repair task should include the error entry",
  partialFeedback.repairTask,
);
assert(
  partialFeedback.repairTask.suggestedRepairSteps.some((step) => step.includes("不要删除")),
  "repair task should explicitly avoid automatic destructive repair",
  partialFeedback.repairTask,
);
assert(
  partialFeedback.repairTask.verification.includes("integrity check"),
  "repair task should include an integrity/readback verification method",
  partialFeedback.repairTask,
);

const formattedPartial = formatStorageFeedbackError(partialFeedback);
assert(formattedPartial.includes("repair=partial_closeout_write_failure"), "formatted feedback should mention repair task", formattedPartial);

const blockedFeedback = closeoutFailureToFeedback({
  ok: false,
  step: "save_archive_document",
  reason: "archive_save_failed",
  error: createUnexpectedWriteError(
    "archive_document",
    artifacts.archiveDocument.fileName,
    "forced archive conflict before any completed write",
  ),
  artifacts,
  completedWrites: [],
});

assert(blockedFeedback.repairTask !== undefined, "blocked closeout write should include a repair task", blockedFeedback);
assertReviewableRepairTask(blockedFeedback.repairTask, "blocked closeout repair task");
assert(
  blockedFeedback.repairTask.problemType === "closeout_write_blocked",
  "blocked closeout repair task should use blocked problem type",
  blockedFeedback.repairTask,
);

const appSource = readFileSync(resolve(process.cwd(), "src", "App.tsx"), "utf8");
assert(appSource.includes('data-testid="repair-task-panel"'), "UI should expose repair task panel", appSource);
assert(!appSource.includes("repair-task-execute"), "UI must not expose automatic repair execution", appSource);

console.log("[DATA-08-REPAIR-TASK-GENERATION verify] PASS: partial closeout failure creates reviewable repair task");
console.log("[DATA-08-REPAIR-TASK-GENERATION verify] PASS: blocked closeout write creates reviewable repair task without auto repair");
console.log("[DATA-08-REPAIR-TASK-GENERATION verify] PASS: UI displays repair task panel without execution control");
