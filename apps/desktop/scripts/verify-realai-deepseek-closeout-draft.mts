import {
  createCloseoutDraftHistoryEntry,
  labelCloseoutDraftHistorySource,
} from "../src/ai/rule-closeout-draft-history.ts";
import { buildRuleCloseoutDraft } from "../src/ai/rule-closeout-draft.ts";
import { generateAiCloseoutDraft } from "../src/ai/ai-draft-client.ts";
import type { InvestigationRecord } from "../src/domain/schemas/investigation-record.ts";
import type { IssueCard } from "../src/domain/schemas/issue-card.ts";

function fail(reason: string, detail?: unknown): never {
  console.error(`[REALAI-DEEPSEEK-CLOSEOUT-DRAFT verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

const issue: IssueCard = {
  id: "issue-realai-deepseek",
  projectId: "workspace-26-r1",
  title: "CAN boot handshake timeout",
  rawInput: "Boot handshake times out after CAN init.",
  normalizedSummary: "CAN boot handshake timeout after init",
  symptomSummary: "CAN init succeeds, then boot handshake times out.",
  suspectedDirections: ["termination mismatch"],
  suggestedActions: ["measure bus termination", "verify baud rate"],
  status: "investigating",
  severity: "high",
  tags: ["can", "boot"],
  repoSnapshot: {
    branch: "master",
    headCommitHash: "0000000000000000000000000000000000000000",
    headCommitMessage: "verify fixture",
    hasUncommittedChanges: false,
    changedFiles: [],
    recentCommits: [],
    capturedAt: "2026-05-01T09:00:00+08:00",
  },
  relatedFiles: ["firmware/can_boot.c"],
  relatedCommits: [],
  relatedHistoricalIssueIds: [],
  createdAt: "2026-05-01T09:00:00+08:00",
  updatedAt: "2026-05-01T09:20:00+08:00",
};

const records: InvestigationRecord[] = [
  {
    id: "record-realai-deepseek-1",
    issueId: issue.id,
    type: "result",
    rawText: "Adding the missing 120 ohm terminator restores boot handshake.",
    polishedText: "Adding the missing 120 ohm terminator restores boot handshake.",
    aiExtractedSignals: [],
    linkedFiles: ["firmware/can_boot.c"],
    linkedCommits: [],
    createdAt: "2026-05-01T09:15:00+08:00",
  },
];

let requestedPath = "";
let requestedBody: unknown = null;
const success = await generateAiCloseoutDraft({
  issue,
  records,
  closeoutDraft: {
    category: "can",
    rootCause: "",
    resolution: "",
    prevention: "",
  },
  options: {
    baseUrl: "http://probeflash.test/api",
    fetchFn: async (input, init) => {
      requestedPath = String(input);
      requestedBody = JSON.parse(String(init?.body ?? "{}"));
      return new Response(JSON.stringify({
        ok: true,
        data: {
          provider: "deepseek",
          model: "deepseek-chat",
          task: "polish_closeout",
          output: {
            task: "polish_closeout",
            draftOnly: true,
            confidence: "medium",
            category: "can",
            rootCause: "missing CAN terminator caused boot handshake timeout",
            resolution: "add 120 ohm terminator and verify boot handshake completes",
            prevention: "include CAN termination check in bring-up checklist",
            caveats: ["草稿需人工确认"],
          },
        },
      }), { status: 200 });
    },
  },
});
if (!success.ok || success.output.task !== "polish_closeout") {
  fail("mock DeepSeek draft should pass schema", success);
}
if (!requestedPath.endsWith("/workspaces/workspace-26-r1/ai/closeout-draft")) {
  fail("client should call workspace-scoped AI closeout route", requestedPath);
}
if (!JSON.stringify(requestedBody).includes("OutputContract")) {
  fail("client should send rendered prompt with output contract", requestedBody);
}

const invalid = await generateAiCloseoutDraft({
  issue,
  records,
  closeoutDraft: { category: "", rootCause: "", resolution: "", prevention: "" },
  options: {
    baseUrl: "http://probeflash.test/api",
    fetchFn: async () => new Response(JSON.stringify({
      ok: true,
      data: {
        provider: "deepseek",
        model: "deepseek-chat",
        task: "polish_closeout",
        output: { task: "polish_closeout", draftOnly: false },
      },
    }), { status: 200 }),
  },
});
if (invalid.ok || invalid.failure.code !== "AI_DRAFT_SCHEMA_ERROR") {
  fail("invalid AI draft should fail schema and allow local fallback", invalid);
}

const localFallback = buildRuleCloseoutDraft(issue, records);
if (localFallback.rootCause.trim().length === 0 || localFallback.resolution.trim().length === 0) {
  fail("local rule fallback should remain available", localFallback);
}

const historyEntry = createCloseoutDraftHistoryEntry({
  issueId: issue.id,
  issueTitle: issue.title,
  generatedAt: "2026-05-01T09:30:00+08:00",
  source: "deepseek",
  recordCount: records.length,
  draft: localFallback,
  sequence: 1,
});
if (historyEntry.source !== "deepseek") {
  fail("draft history should accept deepseek source", historyEntry);
}
if (labelCloseoutDraftHistorySource("deepseek") !== "DeepSeek 生成（草稿，未自动写库）") {
  fail("deepseek history source should be labeled explicitly");
}

console.log("[REALAI-DEEPSEEK-CLOSEOUT-DRAFT verify] PASS: client calls workspace AI route and validates schema");
console.log("[REALAI-DEEPSEEK-CLOSEOUT-DRAFT verify] PASS: invalid AI output fails closed and local fallback remains available");
console.log("[REALAI-DEEPSEEK-CLOSEOUT-DRAFT verify] PASS: draft history tracks deepseek source");
