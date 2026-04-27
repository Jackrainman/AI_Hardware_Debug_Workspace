import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildCloseoutFromIssue, defaultCloseoutOptions } from "../src/domain/closeout.ts";
import type { IssueCard } from "../src/domain/schemas/issue-card.ts";

function fail(reason: string, detail?: unknown): never {
  console.error(`[CORE-05-CLOSEOUT-UX-POLISH verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

const issue: IssueCard = {
  id: "issue-closeout-ux-polish",
  projectId: "workspace-26-r1",
  title: "Motor controller browns out under load",
  rawInput: "Chassis motor controller resets when drivetrain accelerates.",
  normalizedSummary: "Motor controller resets under drivetrain load",
  symptomSummary: "Controller browns out during acceleration and recovers after throttle drops.",
  suspectedDirections: ["battery sag", "loose power connector"],
  suggestedActions: ["measure bus voltage", "inspect XT60 connector"],
  status: "investigating",
  severity: "high",
  tags: ["power"],
  repoSnapshot: {
    branch: "master",
    headCommitHash: "0000000000000000000000000000000000000000",
    headCommitMessage: "verify fixture",
    hasUncommittedChanges: false,
    changedFiles: [],
    recentCommits: [],
    capturedAt: "2026-04-27T18:20:00+08:00",
  },
  relatedFiles: ["firmware/power.c"],
  relatedCommits: [],
  relatedHistoricalIssueIds: [],
  createdAt: "2026-04-27T18:00:00+08:00",
  updatedAt: "2026-04-27T18:10:00+08:00",
};

const optionalFieldsResult = buildCloseoutFromIssue(
  issue,
  [],
  {
    category: " ",
    rootCause: " Loose power connector causes voltage drop ",
    resolution: " Replaced the connector and verified acceleration no longer resets the controller ",
    prevention: " ",
  },
  defaultCloseoutOptions("2026-04-27T18:30:00+08:00", {
    errorEntryId: "error-entry-closeout-ux-polish",
    errorCode: "DBG-20260427-005",
    generatedBy: "hybrid",
  }),
);

if (!optionalFieldsResult.ok) {
  fail("closeout should still allow optional category/prevention fields", optionalFieldsResult);
}
if (optionalFieldsResult.errorEntry.category !== "uncategorized") {
  fail("empty category should keep existing uncategorized fallback", optionalFieldsResult.errorEntry);
}
if (!optionalFieldsResult.errorEntry.prevention.includes("Replaced the connector")) {
  fail("empty prevention should keep existing resolution-derived fallback", optionalFieldsResult.errorEntry);
}

const missingRootCause = buildCloseoutFromIssue(
  issue,
  [],
  {
    category: "power",
    rootCause: "   ",
    resolution: "Replaced the connector",
    prevention: "Add connector pull-test to pit checklist",
  },
  defaultCloseoutOptions("2026-04-27T18:35:00+08:00", {
    errorEntryId: "error-entry-closeout-ux-polish-rootCause",
    errorCode: "DBG-20260427-006",
    generatedBy: "hybrid",
  }),
);
if (missingRootCause.ok || missingRootCause.path?.join(".") !== "rootCause") {
  fail("whitespace-only rootCause should remain blocked by closeout validation", missingRootCause);
}

const missingResolution = buildCloseoutFromIssue(
  issue,
  [],
  {
    category: "power",
    rootCause: "Loose connector",
    resolution: "   ",
    prevention: "Add connector pull-test to pit checklist",
  },
  defaultCloseoutOptions("2026-04-27T18:40:00+08:00", {
    errorEntryId: "error-entry-closeout-ux-polish-resolution",
    errorCode: "DBG-20260427-007",
    generatedBy: "hybrid",
  }),
);
if (missingResolution.ok || missingResolution.path?.join(".") !== "resolution") {
  fail("whitespace-only resolution should remain blocked by closeout validation", missingResolution);
}

const appSource = readFileSync(resolve(process.cwd(), "src", "App.tsx"), "utf8");
const cssSource = readFileSync(resolve(process.cwd(), "src", "App.css"), "utf8");

for (const marker of [
  'data-testid="closeout-quality-panel"',
  "closeout-quality-item-category",
  "closeout-quality-item-rootCause",
  "closeout-quality-item-resolution",
  "closeout-quality-item-prevention",
  'data-testid="closeout-required-error"',
  'data-testid="closeout-root-cause-error"',
  'data-testid="closeout-resolution-error"',
  'aria-describedby="closeout-root-cause-help"',
  'aria-describedby="closeout-resolution-help"',
  'aria-describedby="closeout-prevention-help"',
  "setHasAttemptedSubmit(true)",
  "missingRequiredLabels.join",
  "空格不会被视为有效内容",
]) {
  if (!appSource.includes(marker)) fail(`App.tsx missing closeout UX marker: ${marker}`);
}

for (const marker of [
  ".closeout-quality-panel",
  ".closeout-quality-item[data-state=\"ready\"]",
  ".closeout-quality-item[data-state=\"missing\"][data-requirement=\"必填\"]",
  ".field-required-badge",
  ".field-recommended-badge",
  ".field-help",
  ".field-error",
]) {
  if (!cssSource.includes(marker)) fail(`App.css missing closeout UX style marker: ${marker}`);
}

console.log("[CORE-05-CLOSEOUT-UX-POLISH verify] PASS: optional category/prevention behavior is unchanged");
console.log("[CORE-05-CLOSEOUT-UX-POLISH verify] PASS: whitespace-only required fields remain blocked");
console.log("[CORE-05-CLOSEOUT-UX-POLISH verify] PASS: App exposes closeout quality panel, hints and inline required errors");
