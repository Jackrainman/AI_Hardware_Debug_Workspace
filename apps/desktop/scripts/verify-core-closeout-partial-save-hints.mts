import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildIssueCardFromIntake, defaultIntakeOptions } from "../src/domain/issue-intake.ts";
import {
  buildInvestigationRecordFromIntake,
  defaultInvestigationIntakeOptions,
} from "../src/domain/investigation-intake.ts";
import type { ArchiveDocument } from "../src/domain/schemas/archive-document.ts";
import type { ErrorEntry } from "../src/domain/schemas/error-entry.ts";
import type { InvestigationRecord } from "../src/domain/schemas/investigation-record.ts";
import type { IssueCard } from "../src/domain/schemas/issue-card.ts";
import { createUnexpectedWriteError, storageWriteOk } from "../src/storage/storage-result.ts";
import type { StorageRepository, StorageWriteResult } from "../src/storage/storage-repository.ts";
import { buildCloseoutFailureFeedbackCopy } from "../src/use-cases/closeout-failure-feedback.ts";
import { orchestrateIssueCloseout } from "../src/use-cases/closeout-orchestrator.ts";

type FailureStep = "archive" | "error_entry" | "issue_card";

function fail(reason: string, detail?: unknown): never {
  console.error(`[CORE-06-CLOSEOUT-PARTIAL-SAVE-HINTS verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

function assert(condition: unknown, reason: string, detail?: unknown): asserts condition {
  if (!condition) fail(reason, detail);
}

function buildIssueFixture(id: string): IssueCard {
  const result = buildIssueCardFromIntake(
    {
      title: `${id} closeout failure preserve input`,
      description: "Verify that failed closeout keeps user-entered root cause, resolution and prevention.",
      severity: "high",
      tags: ["closeout"],
    },
    defaultIntakeOptions("2026-04-30T03:00:00+08:00", id, "workspace-core-06"),
  );
  assert(result.ok, "issue fixture should build", result);
  return result.card;
}

function buildRecordFixture(issueId: string): InvestigationRecord {
  const result = buildInvestigationRecordFromIntake(
    {
      issueId,
      type: "result",
      note: "Failure injection should not clear closeout form input.",
    },
    defaultInvestigationIntakeOptions("2026-04-30T03:05:00+08:00", `record-${issueId}`),
  );
  assert(result.ok, "record fixture should build", result);
  return result.record;
}

function createMemoryRepository(failureStep: FailureStep): StorageRepository {
  const issues = new Map<string, IssueCard>();
  const records = new Map<string, InvestigationRecord[]>();
  const archives = new Map<string, ArchiveDocument>();
  const errorEntries = new Map<string, ErrorEntry>();

  const failWrite = (entity: "archive_document" | "error_entry" | "issue_card", target: string) => ({
    ok: false as const,
    error: createUnexpectedWriteError(entity, target, `forced ${entity} write failure`),
  });

  return {
    search: {
      async query() {
        return {
          query: "",
          filters: { kind: "all", status: "all", tag: "", from: "", to: "" },
          items: [],
          readError: null,
        };
      },
    },
    workspaces: {
      async list() {
        return { valid: [], invalid: [], readError: null };
      },
      async create() {
        return {
          ok: false,
          error: createUnexpectedWriteError("workspace", "workspace-core-06", "not needed"),
        };
      },
    },
    issueCards: {
      async list() {
        return {
          valid: Array.from(issues.values()).map((card) => ({
            id: card.id,
            title: card.title,
            severity: card.severity,
            status: card.status,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt,
          })),
          invalid: [],
          readError: null,
        };
      },
      async load(id) {
        const card = issues.get(id);
        return card === undefined ? { ok: false, error: { kind: "not_found", id } } : { ok: true, card };
      },
      async save(card): Promise<StorageWriteResult> {
        if (failureStep === "issue_card" && card.status === "archived") {
          return failWrite("issue_card", card.id);
        }
        issues.set(card.id, card);
        return storageWriteOk();
      },
    },
    investigationRecords: {
      async listByIssueId(issueId) {
        return { valid: records.get(issueId) ?? [], invalid: [], readError: null };
      },
      async append(record) {
        records.set(record.issueId, [...(records.get(record.issueId) ?? []), record]);
        return storageWriteOk();
      },
    },
    archiveDocuments: {
      async list() {
        return { valid: Array.from(archives.values()), invalid: [], readError: null };
      },
      async save(document) {
        if (failureStep === "archive") {
          return failWrite("archive_document", document.fileName);
        }
        archives.set(document.fileName, document);
        return storageWriteOk();
      },
    },
    errorEntries: {
      async list() {
        return { valid: Array.from(errorEntries.values()), invalid: [], readError: null };
      },
      async save(entry) {
        if (failureStep === "error_entry") {
          return failWrite("error_entry", entry.id);
        }
        errorEntries.set(entry.id, entry);
        return storageWriteOk();
      },
    },
  };
}

async function verifyFailureStep(failureStep: FailureStep, expectedReason: string, expectedWrites: string[]) {
  const repository = createMemoryRepository(failureStep);
  const issue = buildIssueFixture(`issue-core-06-${failureStep}`);
  const record = buildRecordFixture(issue.id);
  const savedIssue = await repository.issueCards.save(issue);
  assert(savedIssue.ok, `${failureStep}: issue fixture should save`, savedIssue);
  const savedRecord = await repository.investigationRecords.append(record);
  assert(savedRecord.ok, `${failureStep}: record fixture should save`, savedRecord);

  const closeoutInput = {
    category: "core-workflow",
    rootCause: `${failureStep} injected root cause must stay in the form`,
    resolution: `${failureStep} injected resolution must stay in the form`,
    prevention: `${failureStep} injected prevention must stay in the form`,
  };

  const result = await orchestrateIssueCloseout(issue.id, closeoutInput, {
    repository,
    now: () => "2026-04-30T03:10:00+08:00",
    closeoutOptionsOverrides: {
      errorEntryId: `error-entry-core-06-${failureStep}`,
      errorCode: `DBG-20260430-${failureStep === "archive" ? "061" : failureStep === "error_entry" ? "062" : "063"}`,
      generatedBy: "hybrid",
    },
  });

  assert(!result.ok, `${failureStep}: closeout should fail`, result);
  assert(result.reason === expectedReason, `${failureStep}: wrong failure reason`, result);
  assert(
    result.completedWrites.join(",") === expectedWrites.join(","),
    `${failureStep}: wrong completedWrites`,
    result,
  );

  const copy = buildCloseoutFailureFeedbackCopy(result);
  for (const marker of ["未归档成功", "根因", "修复/结论", "预防建议", "已保留", "重试"]) {
    assert(copy.retryHint.includes(marker), `${failureStep}: retry hint missing ${marker}`, copy);
  }
  assert(copy.statusReason.includes("未归档成功"), `${failureStep}: status should say not archived`, copy);

  assert(
    closeoutInput.rootCause.includes("root cause") &&
      closeoutInput.resolution.includes("resolution") &&
      closeoutInput.prevention.includes("prevention"),
    `${failureStep}: closeout input object should stay unchanged after failed submit`,
    closeoutInput,
  );
}

await verifyFailureStep("archive", "archive_save_failed", []);
await verifyFailureStep("error_entry", "error_entry_save_failed", ["archive_document"]);
await verifyFailureStep("issue_card", "issue_card_save_failed", ["archive_document", "error_entry"]);

const appSource = readFileSync(resolve(process.cwd(), "src", "App.tsx"), "utf8");
for (const marker of [
  "buildCloseoutFailureFeedbackCopy(result)",
  "preservationHint: failureCopy.retryHint",
  'data-testid="closeout-failure-retry-hint"',
  "status.preservationHint",
]) {
  assert(appSource.includes(marker), `App.tsx missing closeout failure marker: ${marker}`);
}

const failureBranchStart = appSource.indexOf("if (!result.ok) {");
assert(failureBranchStart >= 0, "App.tsx should keep explicit closeout failure branch");
const failureBranchEnd = appSource.indexOf("return;", failureBranchStart);
assert(failureBranchEnd > failureBranchStart, "closeout failure branch should return before success cleanup");
const failureBranch = appSource.slice(failureBranchStart, failureBranchEnd);
for (const forbidden of ['setCategory("")', 'setRootCause("")', 'setResolution("")', 'setPrevention("")']) {
  assert(!failureBranch.includes(forbidden), `failure branch must not clear closeout input: ${forbidden}`);
}

const successBranch = appSource.slice(failureBranchEnd);
for (const expected of ['setRootCause("")', 'setResolution("")', 'setPrevention("")']) {
  assert(successBranch.includes(expected), `success branch should still clear closeout input after archive success: ${expected}`);
}

console.log("[CORE-06-CLOSEOUT-PARTIAL-SAVE-HINTS verify] PASS: archive/error-entry/issue write failures are injected");
console.log("[CORE-06-CLOSEOUT-PARTIAL-SAVE-HINTS verify] PASS: failure copy says not archived, input preserved and retry next step");
console.log("[CORE-06-CLOSEOUT-PARTIAL-SAVE-HINTS verify] PASS: App failure branch keeps closeout fields and renders retry hint");
