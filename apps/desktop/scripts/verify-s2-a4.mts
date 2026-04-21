// apps/desktop/scripts/verify-s2-a4.mts
// S2-A4 黑盒验证：在 Node 侧用 Map-based polyfill 模拟 window.localStorage，
// 覆盖 closeout 工厂 + ArchiveDocument / ErrorEntry store + IssueCard 回写读回。
//
// 运行方式：
//   cd apps/desktop && node --experimental-strip-types scripts/verify-s2-a4.mts

interface LocalStorageShape {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

function makeLocalStoragePolyfill(): LocalStorageShape {
  const store = new Map<string, string>();
  return {
    getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i) => {
      const keys = Array.from(store.keys());
      return i >= 0 && i < keys.length ? (keys[i] as string) : null;
    },
    get length() {
      return store.size;
    },
  };
}

const polyfill = makeLocalStoragePolyfill();
(globalThis as unknown as { window: { localStorage: LocalStorageShape } }).window = {
  localStorage: polyfill,
};

const { buildIssueCardFromIntake, defaultIntakeOptions } = await import(
  "../src/domain/issue-intake.ts"
);
const { saveIssueCard, loadIssueCard, listIssueCards } = await import(
  "../src/storage/issue-card-store.ts"
);
const { buildInvestigationRecordFromIntake, defaultInvestigationIntakeOptions } =
  await import("../src/domain/investigation-intake.ts");
const { saveInvestigationRecord, listInvestigationRecordsByIssueId } = await import(
  "../src/storage/investigation-record-store.ts"
);
const { buildCloseoutFromIssue, defaultCloseoutOptions } = await import(
  "../src/domain/closeout.ts"
);
const { saveArchiveDocument, loadArchiveDocument } = await import(
  "../src/storage/archive-document-store.ts"
);
const { saveErrorEntry, loadErrorEntry } = await import(
  "../src/storage/error-entry-store.ts"
);

function fail(reason: string, detail?: unknown): never {
  console.error(`[S2-A4 verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

const ISSUE_ID = "issue-closeout-uart";
const ISSUE_CREATED_AT = "2026-04-21T03:00:00+08:00";
const CLOSEOUT_AT = "2026-04-21T05:00:00+08:00";
const CLOSEOUT_OPTS = defaultCloseoutOptions(CLOSEOUT_AT, {
  errorEntryId: "error-entry-uart-closeout",
  errorCode: "DBG-20260421-001",
  generatedBy: "hybrid",
});

// --- Case 1: seed IssueCard + timeline, build closeout, persist all three outputs, read back ---
const issue = buildIssueCardFromIntake(
  {
    title: "UART boot log stuck at 0x40",
    description: "Boot log stops after ROM banner.",
    severity: "high",
  },
  defaultIntakeOptions(ISSUE_CREATED_AT, ISSUE_ID),
);
if (!issue.ok) fail("failed to seed IssueCard", issue);
saveIssueCard(issue.card);

const earlier = buildInvestigationRecordFromIntake(
  {
    issueId: ISSUE_ID,
    type: "observation",
    note: "Boot log reaches ROM banner then stops.",
  },
  defaultInvestigationIntakeOptions("2026-04-21T03:30:00+08:00", "record-uart-1"),
);
const later = buildInvestigationRecordFromIntake(
  {
    issueId: ISSUE_ID,
    type: "result",
    note: "Replacing the weak pull-up restores normal boot.",
  },
  defaultInvestigationIntakeOptions("2026-04-21T04:00:00+08:00", "record-uart-2"),
);
if (!earlier.ok || !later.ok) fail("failed to seed InvestigationRecord", { earlier, later });
saveInvestigationRecord(later.record);
saveInvestigationRecord(earlier.record);

const loadedIssue = loadIssueCard(ISSUE_ID);
if (!loadedIssue.ok) fail("expected seeded issue to load", loadedIssue);
const timeline = listInvestigationRecordsByIssueId(ISSUE_ID);
if (timeline.valid.length !== 2 || timeline.invalid.length !== 0) {
  fail("expected two clean investigation records", timeline);
}

const closeout = buildCloseoutFromIssue(
  loadedIssue.card,
  timeline.valid,
  {
    category: " boot ",
    rootCause: " weak pull-up on UART RX ",
    resolution: " replace resistor and confirm boot log completes ",
    prevention: " add pull-up value check to bring-up checklist ",
  },
  CLOSEOUT_OPTS,
);
if (!closeout.ok) fail("expected closeout to succeed", closeout);
if (closeout.updatedIssueCard.status !== "archived") {
  fail(`expected IssueCard.status archived, got ${closeout.updatedIssueCard.status}`);
}
if (closeout.archiveDocument.fileName !== "2026-04-21_uart-boot-log-stuck-at-0x40.md") {
  fail(`unexpected archive fileName: ${closeout.archiveDocument.fileName}`);
}
if (closeout.errorEntry.errorCode !== "DBG-20260421-001") {
  fail(`unexpected errorCode: ${closeout.errorEntry.errorCode}`);
}
if (closeout.errorEntry.category !== "boot") {
  fail(`expected trimmed category, got "${closeout.errorEntry.category}"`);
}
if (!closeout.archiveDocument.markdownContent.includes("weak pull-up on UART RX")) {
  fail("archive markdown should include root cause", closeout.archiveDocument.markdownContent);
}
const earlierIndex = closeout.archiveDocument.markdownContent.indexOf("Boot log reaches ROM banner");
const laterIndex = closeout.archiveDocument.markdownContent.indexOf("Replacing the weak pull-up");
if (earlierIndex < 0 || laterIndex < 0 || earlierIndex > laterIndex) {
  fail("archive markdown should preserve chronological investigation timeline");
}

saveArchiveDocument(closeout.archiveDocument);
saveErrorEntry(closeout.errorEntry);
saveIssueCard(closeout.updatedIssueCard);

const reloadedArchive = loadArchiveDocument(closeout.archiveDocument.fileName);
if (!reloadedArchive.ok) fail("expected archive read-back to pass", reloadedArchive);
if (reloadedArchive.document.filePath !== closeout.archiveDocument.filePath) {
  fail("archive read-back filePath mismatch", reloadedArchive.document);
}
const reloadedError = loadErrorEntry(closeout.errorEntry.id);
if (!reloadedError.ok) fail("expected error entry read-back to pass", reloadedError);
if (reloadedError.entry.archiveFilePath !== closeout.archiveDocument.filePath) {
  fail("error entry must point to archive file path", reloadedError.entry);
}
const reloadedCard = loadIssueCard(ISSUE_ID);
if (!reloadedCard.ok) fail("expected IssueCard read-back after closeout", reloadedCard);
if (reloadedCard.card.status !== "archived" || reloadedCard.card.updatedAt !== CLOSEOUT_AT) {
  fail("IssueCard should be archived and timestamped on closeout", reloadedCard.card);
}

// --- Case 2: required closeout fields are structurally rejected before persistence ---
const missingRootCause = buildCloseoutFromIssue(
  issue.card,
  [],
  { category: "boot", rootCause: "   ", resolution: "fixed", prevention: "" },
  CLOSEOUT_OPTS,
);
if (missingRootCause.ok) fail("expected blank rootCause to fail", missingRootCause);
if (!missingRootCause.reason.toLowerCase().includes("rootcause")) {
  fail(`blank rootCause failure should mention rootCause; got: "${missingRootCause.reason}"`);
}
const missingResolution = buildCloseoutFromIssue(
  issue.card,
  [],
  { category: "boot", rootCause: "known", resolution: "   ", prevention: "" },
  CLOSEOUT_OPTS,
);
if (missingResolution.ok) fail("expected blank resolution to fail", missingResolution);
if (!missingResolution.reason.toLowerCase().includes("resolution")) {
  fail(`blank resolution failure should mention resolution; got: "${missingResolution.reason}"`);
}

// --- Case 3: archive/error stores route bad JSON and bad schema to structured read errors ---
polyfill.setItem("repo-debug:archive-document:broken.md", "{not valid json");
const brokenArchive = loadArchiveDocument("broken.md");
if (brokenArchive.ok || brokenArchive.error.kind !== "parse_error") {
  fail("expected archive parse_error on corrupt JSON", brokenArchive);
}
polyfill.setItem(
  "repo-debug:error-entry:error-bad-schema",
  JSON.stringify({ id: "error-bad-schema", title: "missing required fields" }),
);
const badError = loadErrorEntry("error-bad-schema");
if (badError.ok || badError.error.kind !== "validation_error") {
  fail("expected error-entry validation_error on schema mismatch", badError);
}

// --- Case 4: archive/error prefixes do not pollute issue-card or investigation-record lists ---
const cards = listIssueCards();
if (cards.valid.length !== 1 || cards.valid[0]?.id !== ISSUE_ID) {
  fail("archive/error keys must not pollute listIssueCards", cards);
}
const recordsAfterArchive = listInvestigationRecordsByIssueId(ISSUE_ID);
if (recordsAfterArchive.valid.length !== 2) {
  fail("archive/error keys must not pollute investigation record list", recordsAfterArchive);
}

console.log("[S2-A4 verify] PASS: closeout builds ArchiveDocument + ErrorEntry + archived IssueCard");
console.log("[S2-A4 verify] PASS: ArchiveDocument / ErrorEntry / IssueCard read-back succeeds");
console.log("[S2-A4 verify] PASS: blank rootCause / resolution rejected structurally");
console.log("[S2-A4 verify] PASS: archive/error stores return structured parse/validation errors");
console.log("[S2-A4 verify] PASS: archive/error prefixes remain isolated from issue and record stores");
