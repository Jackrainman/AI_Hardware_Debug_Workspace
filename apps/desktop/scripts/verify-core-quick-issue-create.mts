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
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index) => {
      const keys = Array.from(store.keys());
      return index >= 0 && index < keys.length ? (keys[index] as string) : null;
    },
    get length() {
      return store.size;
    },
  };
}

(globalThis as unknown as { window: { localStorage: LocalStorageShape } }).window = {
  localStorage: makeLocalStoragePolyfill(),
};

const { buildQuickIssueCardFromLine, defaultIntakeOptions } = await import(
  "../src/domain/issue-intake.ts"
);
const { IssueCardSchema } = await import("../src/domain/schemas/issue-card.ts");
const { saveIssueCard, loadIssueCard, listIssueCards } = await import(
  "../src/storage/issue-card-store.ts"
);

function fail(reason: string, detail?: unknown): never {
  console.error(`[CORE-01-QUICK-ISSUE-CREATE verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

const NOW = "2026-04-27T18:20:00+08:00";
const ISSUE_ID = "issue-core-quick-create-0001";
const WORKSPACE_ID = "workspace-core-quick-create";

const quickIssue = buildQuickIssueCardFromLine(
  "  CAN 心跳偶发丢包，底盘急停  ",
  defaultIntakeOptions(NOW, ISSUE_ID, WORKSPACE_ID),
);
if (!quickIssue.ok) fail("quick issue line should build a schema-valid IssueCard", quickIssue);

const parsed = IssueCardSchema.safeParse(quickIssue.card);
if (!parsed.success) fail("quick issue card should pass IssueCardSchema", parsed.error.issues);
if (quickIssue.card.id !== ISSUE_ID) fail("quick issue should preserve generated id", quickIssue.card);
if (quickIssue.card.projectId !== WORKSPACE_ID) fail("quick issue should use active workspace", quickIssue.card);
if (quickIssue.card.title !== "CAN 心跳偶发丢包，底盘急停") {
  fail("quick issue should trim the one-line title", quickIssue.card.title);
}
if (quickIssue.card.rawInput !== "" || quickIssue.card.normalizedSummary !== "") {
  fail("quick issue should not require a separate description", quickIssue.card);
}
if (quickIssue.card.severity !== "medium" || quickIssue.card.status !== "open") {
  fail("quick issue should default to medium/open", quickIssue.card);
}

const saved = saveIssueCard(quickIssue.card);
if (!saved.ok) fail("quick issue should save through issue storage", saved);

const loaded = loadIssueCard(ISSUE_ID);
if (!loaded.ok) fail("quick issue should read back after save", loaded.error);
if (loaded.card.title !== quickIssue.card.title || loaded.card.projectId !== WORKSPACE_ID) {
  fail("quick issue readback should preserve title and workspace", loaded.card);
}

const listed = listIssueCards();
if (listed.readError !== null) fail("quick issue list should not have readError", listed.readError);
if (!listed.valid.some((summary) => summary.id === ISSUE_ID && summary.status === "open")) {
  fail("quick issue list should include the open issue summary", listed.valid);
}

const selectedAfterCreate = loaded.card.id;
if (selectedAfterCreate !== ISSUE_ID) fail("quick issue create should hand back the created id for selection", selectedAfterCreate);

const emptyLine = buildQuickIssueCardFromLine("   ", defaultIntakeOptions(NOW, "issue-empty-quick", WORKSPACE_ID));
if (emptyLine.ok) fail("empty quick issue line should fail validation", emptyLine);
const emptyLoad = loadIssueCard("issue-empty-quick");
if (emptyLoad.ok) fail("empty quick issue must not be persisted", emptyLoad.card);

console.log("[CORE-01-QUICK-ISSUE-CREATE verify] PASS: one-line quick issue builds an open schema-valid card");
console.log("[CORE-01-QUICK-ISSUE-CREATE verify] PASS: quick issue saves, lists and reads back from storage");
console.log("[CORE-01-QUICK-ISSUE-CREATE verify] PASS: created id is available for auto-selection and empty input is rejected");
