import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  clearFormDraft,
  formDraftStorageKey,
  readFormDraft,
  type FormDraftStorage,
  writeFormDraft,
} from "../src/storage/form-draft-store.ts";
import type { ArchiveDocument } from "../src/domain/schemas/archive-document.ts";
import type { ErrorEntry } from "../src/domain/schemas/error-entry.ts";
import type { IssueCard } from "../src/domain/schemas/issue-card.ts";
import { listArchiveDocuments, saveArchiveDocument } from "../src/storage/archive-document-store.ts";
import { listErrorEntries, saveErrorEntry } from "../src/storage/error-entry-store.ts";
import { loadIssueCard, saveIssueCard } from "../src/storage/issue-card-store.ts";

class MemoryDraftStorage implements FormDraftStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

interface LocalStorageShape extends FormDraftStorage {
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

function makeLocalStoragePolyfill(): LocalStorageShape {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

(globalThis as unknown as { window: { localStorage: LocalStorageShape } }).window = {
  localStorage: makeLocalStoragePolyfill(),
};

function fail(reason: string, detail?: unknown): never {
  console.error(`[CORE-CLOSEOUT-CONTINUATION-UX verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

function countOccurrences(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

function assertSourceContainsExactly(
  sourceName: string,
  source: string,
  needle: string,
  expectedCount: number,
): void {
  const actualCount = countOccurrences(source, needle);
  if (actualCount !== expectedCount) {
    fail(`${sourceName} should contain "${needle}" exactly ${expectedCount} time(s)`, {
      actualCount,
    });
  }
}

function assertSourceDoesNotContain(sourceName: string, source: string, needle: string): void {
  if (source.includes(needle)) {
    fail(`${sourceName} should not contain duplicate investigation append entry marker: ${needle}`);
  }
}

function extractFunctionSource(sourceName: string, source: string, signature: string): string {
  const start = source.indexOf(signature);
  if (start < 0) {
    fail(`${sourceName} should contain function signature: ${signature}`);
  }
  const bodyMarkerStart = source.indexOf(") {", start);
  const bodyStart = bodyMarkerStart >= 0 ? bodyMarkerStart + 2 : source.indexOf("{", start);
  if (bodyStart < 0) {
    fail(`${sourceName} function should have a body: ${signature}`);
  }
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  fail(`${sourceName} function body should be balanced: ${signature}`);
}

const storage = new MemoryDraftStorage();
const scope = { workspaceId: "workspace-26-r1", formKind: "closeout", itemId: "issue-continuation" };
const key = formDraftStorageKey(scope);
if (!key.includes("workspace-26-r1") || !key.includes("closeout") || !key.includes("issue-continuation")) {
  fail("form draft key should be scoped by workspace, form kind and item id", key);
}

const draft = {
  category: "boot",
  rootCause: "pending root cause",
  resolution: "pending fix",
  prevention: "pending checklist",
};
if (!writeFormDraft(storage, scope, draft)) {
  fail("form draft should write to available storage");
}
const readBack = readFormDraft(storage, scope, (value) => {
  if (typeof value !== "object" || value === null) return null;
  return value as typeof draft;
});
if (readBack.state !== "restored" || readBack.data.rootCause !== draft.rootCause) {
  fail("form draft should restore saved value", readBack);
}
if (!clearFormDraft(storage, scope)) {
  fail("form draft should clear from storage");
}
if (readFormDraft(storage, scope, () => draft).state !== "empty") {
  fail("cleared form draft should read as empty");
}

const issue: IssueCard = {
  id: "issue-continuation-unarchive",
  projectId: "workspace-26-r1",
  title: "Archived issue can reopen",
  rawInput: "archive reopen smoke",
  normalizedSummary: "archive reopen smoke",
  symptomSummary: "archive reopen smoke",
  suspectedDirections: [],
  suggestedActions: [],
  status: "archived",
  severity: "medium",
  tags: ["archive"],
  repoSnapshot: {
    branch: "master",
    headCommitHash: "0000000000000000000000000000000000000000",
    headCommitMessage: "verify fixture",
    hasUncommittedChanges: false,
    changedFiles: [],
    recentCommits: [],
    capturedAt: "2026-05-01T12:00:00+08:00",
  },
  relatedFiles: [],
  relatedCommits: [],
  relatedHistoricalIssueIds: [],
  createdAt: "2026-05-01T12:00:00+08:00",
  updatedAt: "2026-05-01T12:10:00+08:00",
};
const archive: ArchiveDocument = {
  issueId: issue.id,
  projectId: issue.projectId,
  fileName: "2026-05-01_archived-issue-can-reopen.md",
  filePath: ".debug_workspace/archive/2026-05-01_archived-issue-can-reopen.md",
  markdownContent: "# archived issue",
  generatedBy: "hybrid",
  generatedAt: "2026-05-01T12:15:00+08:00",
};
const entry: ErrorEntry = {
  id: "error-entry-continuation-unarchive",
  projectId: issue.projectId,
  sourceIssueId: issue.id,
  errorCode: "DBG-20260501-901",
  title: issue.title,
  category: "archive",
  symptom: issue.symptomSummary,
  rootCause: "verify root cause",
  resolution: "verify resolution",
  prevention: "verify prevention",
  tags: issue.tags,
  relatedFiles: [],
  relatedCommits: [],
  archiveFilePath: archive.filePath,
  createdAt: archive.generatedAt,
  updatedAt: archive.generatedAt,
};
if (!saveIssueCard(issue).ok || !saveArchiveDocument(archive).ok || !saveErrorEntry(entry).ok) {
  fail("verify fixture should save issue/archive/error-entry");
}
const reopened: IssueCard = {
  ...issue,
  status: "investigating",
  updatedAt: "2026-05-01T12:30:00+08:00",
};
if (!saveIssueCard(reopened).ok) {
  fail("unarchive should update issue status without deleting history");
}
const loaded = loadIssueCard(issue.id);
if (!loaded.ok || loaded.card.status !== "investigating") {
  fail("reopened issue should read back as investigating", loaded);
}
if (!listArchiveDocuments().valid.some((doc) => doc.issueId === issue.id)) {
  fail("archive document should remain after unarchive");
}
if (!listErrorEntries().valid.some((item) => item.sourceIssueId === issue.id)) {
  fail("error entry should remain after unarchive");
}

const appSource = readFileSync(resolve(process.cwd(), "src", "App.tsx"), "utf8");
const issueWorkflowSource = readFileSync(
  resolve(process.cwd(), "src", "IssueWorkflowSections.tsx"),
  "utf8",
);
const archivedSummarySource = readFileSync(
  resolve(process.cwd(), "src", "components", "closeout", "ArchivedCloseoutSummary.tsx"),
  "utf8",
);
const closeoutSource = readFileSync(
  resolve(process.cwd(), "src", "components", "closeout", "CloseoutForm.tsx"),
  "utf8",
);
const investigationSource = readFileSync(
  resolve(process.cwd(), "src", "components", "investigation", "InvestigationComponents.tsx"),
  "utf8",
);
const issueEntrySource = readFileSync(
  resolve(process.cwd(), "src", "components", "issue", "IssueEntryComponents.tsx"),
  "utf8",
);
for (const expected of [
  "unarchive-issue-button",
  'status: "investigating"',
  'investigationAppendForm={selectedIssueId !== null ? (',
  "<InvestigationAppendForm",
  'isArchived={selectedCard?.status === "archived"}',
  "InvestigationAppendForm",
  "const [isExpanded, setIsExpanded] = useState(false)",
  "setIsExpanded(false)",
  "onClick={() => setIsExpanded(true)}",
  'data-testid="investigation-append-form"',
  'data-expanded={isExpanded ? "true" : "false"}',
  'data-testid="open-investigation-append-form"',
  "investigation-append-caption-row",
  "investigation-append-draft-hint",
  "hasInvestigationFormDraftContent",
  "排查追记",
  "有未提交草稿，可继续编辑。",
  "创建排查记录",
  "结案补充",
  "clearFormDraft",
  "closeout-form-draft-state",
  "investigation-form-draft-state",
  "quick-issue-draft-status",
  "issue-intake-draft-status",
]) {
  const source = [appSource, archivedSummarySource, closeoutSource, investigationSource, issueEntrySource].join("\n");
  if (!source.includes(expected)) {
    fail(`UI source should contain continuation marker: ${expected}`);
  }
}

const issueMainFlowSource = extractFunctionSource(
  "IssueWorkflowSections.tsx",
  issueWorkflowSource,
  "export function IssueMainFlow",
);
const investigationAppendFormSource = extractFunctionSource(
  "InvestigationComponents.tsx",
  investigationSource,
  "export function InvestigationAppendForm",
);
const mainFlowSources = [appSource, issueWorkflowSource, investigationSource].join("\n");

assertSourceContainsExactly("App.tsx", appSource, "<InvestigationAppendForm", 1);
assertSourceContainsExactly(
  "App.tsx",
  appSource,
  "investigationAppendForm={selectedIssueId !== null ? (",
  1,
);
assertSourceContainsExactly("IssueMainFlow", issueMainFlowSource, "{investigationAppendForm}", 1);
assertSourceContainsExactly(
  "InvestigationAppendForm",
  investigationAppendFormSource,
  'data-testid="investigation-append-form"',
  1,
);
assertSourceContainsExactly(
  "InvestigationAppendForm",
  investigationAppendFormSource,
  'data-testid="open-investigation-append-form"',
  1,
);

for (const forbidden of [
  "InvestigationAppendSection",
  'data-testid="investigation-append-entry"',
  'className="investigation-append-action"',
  "investigation-append-entry-body",
]) {
  assertSourceDoesNotContain("main flow investigation append sources", mainFlowSources, forbidden);
}

assertSourceContainsExactly(
  "App.tsx",
  appSource,
  'key={`investigation:${activeWorkspace.id}:${selectedIssueId}`}',
  1,
);
assertSourceContainsExactly(
  "App.tsx",
  appSource,
  'key={`closeout:${activeWorkspace.id}:${selectedIssueId}`}',
  1,
);
assertSourceDoesNotContain(
  "App.tsx",
  appSource,
  'key={`${activeWorkspace.id}:${selectedIssueId}`}',
);
if (!investigationAppendFormSource.includes('const title = isArchived ? "结案补充" : "创建排查记录"')) {
  fail("investigation append entry should keep archived and active issue titles distinct");
}
if (
  !/useEffect\(\(\) => \{\s*setIsExpanded\(false\);[\s\S]*?\}, \[workspaceId, issueId\]\);/.test(
    investigationAppendFormSource,
  )
) {
  fail("InvestigationAppendForm should reset collapsed state when workspaceId or issueId changes");
}

const expandedFieldsGateIndex = investigationAppendFormSource.indexOf("{isExpanded && (");
if (expandedFieldsGateIndex < 0) {
  fail("InvestigationAppendForm should gate detailed fields behind collapsed/expanded state");
}
const collapsedOpenButtonIndex = investigationAppendFormSource.indexOf(
  'data-testid="open-investigation-append-form"',
);
if (collapsedOpenButtonIndex < 0 || collapsedOpenButtonIndex > expandedFieldsGateIndex) {
  fail("collapsed investigation append button should render before the expanded detailed field gate");
}
for (const detailedFieldMarker of [
  'data-testid="investigation-target"',
  'data-testid="investigation-form-draft-state"',
  "<select",
  "<textarea",
  "<button type=\"submit\">追加记录</button>",
  'data-testid="investigation-status"',
]) {
  const markerIndex = investigationAppendFormSource.indexOf(detailedFieldMarker);
  if (markerIndex < 0) {
    fail(`InvestigationAppendForm should contain detailed field marker: ${detailedFieldMarker}`);
  }
  if (markerIndex < expandedFieldsGateIndex) {
    fail(`InvestigationAppendForm detailed field should be hidden while collapsed: ${detailedFieldMarker}`);
  }
}

console.log("[CORE-CLOSEOUT-CONTINUATION-UX verify] PASS: form drafts write, restore and clear by scoped key");
console.log("[CORE-CLOSEOUT-CONTINUATION-UX verify] PASS: unarchive reopens issue while preserving archive/error history");
console.log("[CORE-CLOSEOUT-CONTINUATION-UX verify] PASS: UI exposes one-card collapsed investigation append flow and local draft markers");
