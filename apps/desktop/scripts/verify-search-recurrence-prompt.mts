import { readFileSync } from "node:fs";

import type { ErrorEntry } from "../src/domain/schemas/error-entry.ts";
import type { IssueCard } from "../src/domain/schemas/issue-card.ts";
import {
  buildRecurrencePrompt,
  RECURRENCE_PROMPT_SCORE_THRESHOLD,
} from "../src/search/recurrence-prompt.ts";
import { rankSimilarIssues, type SimilarIssuesResult } from "../src/search/similar-issues.ts";
import { buildSearchIssue, SEARCH_VERIFY_WORKSPACE_ID } from "./search-verify-fixtures.mts";

const WORKSPACE_ID = SEARCH_VERIFY_WORKSPACE_ID;
const OTHER_WORKSPACE_ID = "workspace-recurrence-other";
const NOW = "2026-04-28T22:45:00+08:00";

function fail(reason: string, detail?: unknown): never {
  console.error(`[SEARCH-RECURRENCE desktop verify] FAIL: ${reason}`);
  if (detail !== undefined) {
    console.error(JSON.stringify(detail, null, 2));
  }
  throw new Error(reason);
}

function assert(condition: unknown, reason: string, detail?: unknown): asserts condition {
  if (!condition) fail(reason, detail);
}

function buildIssue(
  workspaceId: string,
  id: string,
  title: string,
  description: string,
  tags: string[],
  status: IssueCard["status"] = "open",
): IssueCard {
  return buildSearchIssue({ workspaceId, id, title, description, tags, status, now: NOW });
}

function errorEntry(workspaceId: string, issueId: string): ErrorEntry {
  return {
    id: `error-entry-recurrence-${issueId}`,
    projectId: workspaceId,
    sourceIssueId: issueId,
    errorCode: "DBG-20260428-801",
    title: "CAN timeout recurrence from loose gyro connector",
    category: "CAN",
    symptom: "CAN handshake timeout returns when chassis harness is moved.",
    rootCause: "Loose gyro connector caused CAN handshake timeout.",
    resolution: "Reseat the gyro connector and secure the harness before startup.",
    prevention: "Inspect gyro connector before every match.",
    tags: ["CAN", "Chassis", "Gyro"],
    relatedFiles: [],
    relatedCommits: [],
    archiveFilePath: `.debug_workspace/archive/2026-04-28_${issueId}.md`,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const current = buildIssue(
  WORKSPACE_ID,
  "issue-recurrence-current",
  "CAN handshake timeout after gyro connector move",
  "Chassis startup fails with CAN handshake timeout after the loose gyro connector moved.",
  ["CAN", "Chassis"],
);
const historical = buildIssue(
  WORKSPACE_ID,
  "issue-recurrence-history",
  "CAN handshake dropout from loose gyro connector",
  "Archived CAN timeout caused by gyro connector movement.",
  ["CAN", "Chassis", "Gyro"],
  "archived",
);
const otherWorkspaceHistorical = buildIssue(
  OTHER_WORKSPACE_ID,
  "issue-recurrence-other-history",
  "CAN handshake dropout from loose gyro connector",
  "Other workspace issue must not create prompt.",
  ["CAN", "Chassis", "Gyro"],
  "archived",
);

const ranked = rankSimilarIssues({
  currentIssue: current,
  issues: [current, historical, otherWorkspaceHistorical],
  errorEntries: [errorEntry(WORKSPACE_ID, historical.id), errorEntry(OTHER_WORKSPACE_ID, otherWorkspaceHistorical.id)],
});
const result: SimilarIssuesResult = {
  currentIssueId: current.id,
  items: ranked,
  readError: null,
};

const prompt = buildRecurrencePrompt(result);
assert(prompt !== null, "high similarity should create recurrence prompt", result);
assert(prompt.issueId === historical.id, "recurrence prompt should point to same-workspace history", prompt);
assert(prompt.score >= RECURRENCE_PROMPT_SCORE_THRESHOLD, "prompt should meet score threshold", prompt);
assert(prompt.rootCauseSummary?.includes("Loose gyro connector"), "prompt should include root cause summary", prompt);
assert(prompt.resolutionSummary?.includes("Reseat"), "prompt should include resolution summary", prompt);

const ignoredPrompt = buildRecurrencePrompt(result, [historical.id]);
assert(ignoredPrompt === null, "ignored recurrence prompt should stay hidden", ignoredPrompt);

const emptyPrompt = buildRecurrencePrompt({ currentIssueId: current.id, items: [], readError: null });
assert(emptyPrompt === null, "no similar issues should not create prompt", emptyPrompt);

const lowScorePrompt = buildRecurrencePrompt({
  currentIssueId: current.id,
  readError: null,
  items: [
    {
      issueId: "issue-low-score",
      title: "Low score history",
      status: "archived",
      tags: ["Power"],
      score: RECURRENCE_PROMPT_SCORE_THRESHOLD - 1,
      reasons: ["低相似度 fixture"],
      matchedTags: [],
      matchedKeywords: [],
      matchedRootCauseTerms: [],
      matchedResolutionTerms: [],
      updatedAt: NOW,
    },
  ],
});
assert(lowScorePrompt === null, "low similarity should not create prompt", lowScorePrompt);

const crossWorkspaceRanked = rankSimilarIssues({
  currentIssue: current,
  issues: [current, otherWorkspaceHistorical],
  errorEntries: [errorEntry(OTHER_WORKSPACE_ID, otherWorkspaceHistorical.id)],
});
assert(crossWorkspaceRanked.length === 0, "cross-workspace similar issue should not rank", crossWorkspaceRanked);
assert(
  buildRecurrencePrompt({ currentIssueId: current.id, items: crossWorkspaceRanked, readError: null }) === null,
  "cross-workspace history should not create prompt",
  crossWorkspaceRanked,
);

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const knowledgeSource = readFileSync(new URL("../src/components/knowledge/KnowledgePanels.tsx", import.meta.url), "utf8");
const uiSource = [appSource, knowledgeSource].join("\n");
assert(uiSource.includes("recurrence-prompt-panel"), "UI should expose recurrence prompt panel marker");
assert(uiSource.includes("recurrence-prompt-dismiss"), "UI should expose recurrence prompt dismiss marker");
assert(uiSource.includes("recurrence-prompt-link"), "UI should expose recurrence prompt link marker");

console.log("[SEARCH-RECURRENCE desktop verify] PASS: high similarity creates an explainable recurrence prompt");
console.log("[SEARCH-RECURRENCE desktop verify] PASS: empty, ignored, low-score, and cross-workspace cases do not prompt");
console.log("[SEARCH-RECURRENCE desktop verify] PASS: recurrence prompt UI markers are present");
