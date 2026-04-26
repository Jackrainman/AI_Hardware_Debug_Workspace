import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildRuleCloseoutDraft } from "../src/ai/rule-closeout-draft.ts";
import { buildCloseoutFromIssue, defaultCloseoutOptions } from "../src/domain/closeout.ts";
import type { InvestigationRecord } from "../src/domain/schemas/investigation-record.ts";
import type { IssueCard } from "../src/domain/schemas/issue-card.ts";

function fail(reason: string, detail?: unknown): never {
  console.error(`[AI-READY-CLOSEOUT-DRAFT-PANEL verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

const issue: IssueCard = {
  id: "issue-closeout-draft-panel",
  projectId: "workspace-26-r1",
  title: "UART boot log stuck at 0x40",
  rawInput: "Boot log stops after ROM banner on UART0.",
  normalizedSummary: "UART boot log stops after ROM banner",
  symptomSummary: "UART0 prints ROM banner and then no further boot messages.",
  suspectedDirections: ["weak pull-up", "boot strap sampling"],
  suggestedActions: ["measure UART RX pull-up", "compare strap resistor values"],
  status: "investigating",
  severity: "high",
  tags: ["boot"],
  repoSnapshot: {
    branch: "master",
    headCommitHash: "0000000000000000000000000000000000000000",
    headCommitMessage: "verify fixture",
    hasUncommittedChanges: false,
    changedFiles: [],
    recentCommits: [],
    capturedAt: "2026-04-26T11:30:00+08:00",
  },
  relatedFiles: ["boards/r1/uart.c"],
  relatedCommits: ["abc1234"],
  relatedHistoricalIssueIds: [],
  createdAt: "2026-04-26T11:00:00+08:00",
  updatedAt: "2026-04-26T11:20:00+08:00",
};

const records: InvestigationRecord[] = [
  {
    id: "record-closeout-draft-1",
    issueId: issue.id,
    type: "observation",
    rawText: "ROM banner appears, then log stops.",
    polishedText: "ROM banner appears, then log stops.",
    aiExtractedSignals: [],
    linkedFiles: [],
    linkedCommits: [],
    createdAt: "2026-04-26T11:10:00+08:00",
  },
  {
    id: "record-closeout-draft-2",
    issueId: issue.id,
    type: "result",
    rawText: "Replacing the weak pull-up restores normal boot.",
    polishedText: "Replacing the weak pull-up restores normal boot.",
    aiExtractedSignals: [],
    linkedFiles: ["boards/r1/uart.c"],
    linkedCommits: [],
    createdAt: "2026-04-26T11:20:00+08:00",
  },
];

const draft = buildRuleCloseoutDraft(issue, records);
for (const [field, value] of Object.entries({
  problemSummary: draft.problemSummary,
  category: draft.category,
  rootCause: draft.rootCause,
  resolution: draft.resolution,
  prevention: draft.prevention,
})) {
  if (value.trim().length === 0) {
    fail(`draft field should be non-empty: ${field}`, draft);
  }
}
if (draft.keySignals.length === 0 || draft.checklistItems.length === 0) {
  fail("draft should include key signals and checklist items", draft);
}

const closeout = buildCloseoutFromIssue(
  issue,
  records,
  draft,
  defaultCloseoutOptions("2026-04-26T11:40:00+08:00", {
    errorEntryId: "error-entry-closeout-draft-panel",
    errorCode: "DBG-20260426-002",
    generatedBy: "hybrid",
  }),
);
if (!closeout.ok) {
  fail("rule draft should remain compatible with closeout builder", closeout);
}

const emptyRecordDraft = buildRuleCloseoutDraft({ ...issue, suspectedDirections: [], suggestedActions: [] }, []);
if (
  emptyRecordDraft.rootCause.trim().length === 0 ||
  emptyRecordDraft.resolution.trim().length === 0 ||
  emptyRecordDraft.prevention.trim().length === 0
) {
  fail("empty-record draft should still provide reviewable placeholders", emptyRecordDraft);
}

const appSource = readFileSync(resolve(process.cwd(), "src", "App.tsx"), "utf8");
for (const expected of [
  'data-testid="closeout-draft-panel"',
  'data-testid="closeout-draft-generate"',
  'data-testid="closeout-draft-apply"',
  'data-testid="closeout-draft-preview"',
  "buildRuleCloseoutDraft",
]) {
  if (!appSource.includes(expected)) {
    fail(`App.tsx should expose closeout draft panel marker: ${expected}`);
  }
}

console.log("[AI-READY-CLOSEOUT-DRAFT-PANEL verify] PASS: rule draft generates all closeout fields");
console.log("[AI-READY-CLOSEOUT-DRAFT-PANEL verify] PASS: generated draft remains compatible with closeout builder");
console.log("[AI-READY-CLOSEOUT-DRAFT-PANEL verify] PASS: App.tsx exposes draft panel UI markers");
