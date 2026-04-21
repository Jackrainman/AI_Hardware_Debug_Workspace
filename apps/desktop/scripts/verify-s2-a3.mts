// apps/desktop/scripts/verify-s2-a3.mts
// S2-A3 黑盒验证：在 Node 侧用 Map-based polyfill 模拟 window.localStorage，
// 覆盖 InvestigationRecord 追记 + listInvestigationRecordsByIssueId() 的核心路径：
//   1. 空存储 → listByIssueId(A) 空
//   2. A 两条 + B 一条 → listByIssueId(A).length===2 按 createdAt 升序；listByIssueId(B).length===1
//   3. 空 note → 工厂结构化失败（reason 含 "note"），不落盘
//   4. 损坏 JSON 在 record 前缀下 → invalid[kind=parse_error]，valid 不减少
//   5. schema 不符（IssueCard 数据意外放进 record 前缀）→ invalid[kind=validation_error]；
//      外来前缀 / IssueCard 前缀不被 record 列表触碰
//   6. 跨 store 隔离：saveInvestigationRecord 不污染 listIssueCards，反之亦然
//
// 运行方式：
//   cd apps/desktop && node --experimental-strip-types scripts/verify-s2-a3.mts

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

const { buildInvestigationRecordFromIntake, defaultInvestigationIntakeOptions } = await import(
  "../src/domain/investigation-intake.ts"
);
const { saveInvestigationRecord, listInvestigationRecordsByIssueId } = await import(
  "../src/storage/investigation-record-store.ts"
);
const { buildIssueCardFromIntake, defaultIntakeOptions } = await import(
  "../src/domain/issue-intake.ts"
);
const { saveIssueCard, listIssueCards } = await import(
  "../src/storage/issue-card-store.ts"
);

function fail(reason: string, detail?: unknown): never {
  console.error(`[S2-A3 verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

// --- Case 1: empty storage ---
const emptyA = listInvestigationRecordsByIssueId("issue-a");
if (emptyA.valid.length !== 0 || emptyA.invalid.length !== 0) {
  fail("expected empty list on empty storage", emptyA);
}

// --- Case 2: two records for A (in inverse chronological save order) + one record for B ---
const A_EARLIER = buildInvestigationRecordFromIntake(
  { issueId: "issue-a", type: "observation", note: "  first observation for A  " },
  defaultInvestigationIntakeOptions("2026-04-21T03:00:00+08:00", "record-a-1"),
);
const A_LATER = buildInvestigationRecordFromIntake(
  { issueId: "issue-a", type: "hypothesis", note: "  second hypothesis for A  " },
  defaultInvestigationIntakeOptions("2026-04-21T03:30:00+08:00", "record-a-2"),
);
const B_ONLY = buildInvestigationRecordFromIntake(
  { issueId: "issue-b", type: "action", note: "single action on B" },
  defaultInvestigationIntakeOptions("2026-04-21T03:15:00+08:00", "record-b-1"),
);

if (!A_EARLIER.ok || !A_LATER.ok || !B_ONLY.ok) {
  fail("intake build failed on seed data", { A_EARLIER, A_LATER, B_ONLY });
}
// Save in reverse chronological to confirm the store sorts ascending on read.
saveInvestigationRecord(A_LATER.record);
saveInvestigationRecord(B_ONLY.record);
saveInvestigationRecord(A_EARLIER.record);

const listA = listInvestigationRecordsByIssueId("issue-a");
if (listA.valid.length !== 2) {
  fail(`expected 2 records for issue-a, got ${listA.valid.length}`, listA);
}
if (listA.invalid.length !== 0) {
  fail(`expected 0 invalid for clean state, got ${listA.invalid.length}`, listA.invalid);
}
if (listA.valid[0]?.id !== "record-a-1") {
  fail(`expected ascending order: record-a-1 first, got ${listA.valid[0]?.id}`, listA.valid);
}
if (listA.valid[1]?.id !== "record-a-2") {
  fail(`expected record-a-2 second, got ${listA.valid[1]?.id}`, listA.valid);
}
if (listA.valid[0]?.rawText !== "first observation for A") {
  fail(`expected trimmed note, got "${listA.valid[0]?.rawText}"`);
}
if (listA.valid[0]?.type !== "observation") {
  fail(`type mismatch: ${listA.valid[0]?.type}`);
}

const listB = listInvestigationRecordsByIssueId("issue-b");
if (listB.valid.length !== 1) {
  fail(`expected 1 record for issue-b, got ${listB.valid.length}`, listB);
}
if (listB.valid[0]?.id !== "record-b-1") {
  fail(`expected record-b-1 for issue-b, got ${listB.valid[0]?.id}`, listB.valid);
}

// Cross-check: listByIssueId filters strictly — C has nothing even though store is non-empty.
const listC = listInvestigationRecordsByIssueId("issue-c-missing");
if (listC.valid.length !== 0) {
  fail(`listByIssueId must filter by issueId foreign key; got ${listC.valid.length}`, listC);
}

// --- Case 3: empty note is rejected structurally ---
const emptyNote = buildInvestigationRecordFromIntake(
  { issueId: "issue-a", type: "note", note: "   " },
  defaultInvestigationIntakeOptions("2026-04-21T03:45:00+08:00", "record-empty-note"),
);
if (emptyNote.ok) fail("expected empty-note intake to fail", emptyNote);
if (!emptyNote.reason.toLowerCase().includes("note")) {
  fail(`empty note failure should mention note; got: "${emptyNote.reason}"`);
}
const shouldStillBeTwo = listInvestigationRecordsByIssueId("issue-a");
if (shouldStillBeTwo.valid.length !== 2) {
  fail(`rejected intake must not persist; A count ${shouldStillBeTwo.valid.length}`);
}

// --- Case 3b: empty issueId is rejected structurally ---
const emptyIssue = buildInvestigationRecordFromIntake(
  { issueId: "   ", type: "note", note: "whatever" },
  defaultInvestigationIntakeOptions("2026-04-21T03:45:00+08:00", "record-empty-issue"),
);
if (emptyIssue.ok) fail("expected empty-issueId intake to fail", emptyIssue);
if (!emptyIssue.reason.toLowerCase().includes("issueid")) {
  fail(`empty issueId failure should mention issueId; got: "${emptyIssue.reason}"`);
}

// --- Case 4: corrupt JSON under record prefix ---
polyfill.setItem("repo-debug:investigation-record:record-broken", "{not valid json");
const afterBroken = listInvestigationRecordsByIssueId("issue-a");
if (afterBroken.valid.length !== 2) {
  fail(`broken JSON should not reduce valid count; got ${afterBroken.valid.length}`, afterBroken);
}
const parseErr = afterBroken.invalid.find((e) => e.kind === "parse_error");
if (!parseErr) fail("expected parse_error invalid entry", afterBroken.invalid);
if (parseErr && parseErr.id !== "record-broken") {
  fail(`parse_error id mismatch: ${parseErr.id}`);
}

// --- Case 5: schema-invalid JSON under record prefix + foreign prefix isolation ---
polyfill.setItem(
  "repo-debug:investigation-record:record-schema-bad",
  JSON.stringify({ id: "record-schema-bad", issueId: "issue-a", type: "nonsense-type", rawText: "x" }),
);
const afterSchemaBad = listInvestigationRecordsByIssueId("issue-a");
const validationErr = afterSchemaBad.invalid.find((e) => e.kind === "validation_error");
if (!validationErr) fail("expected validation_error invalid entry", afterSchemaBad.invalid);
if (validationErr && validationErr.id !== "record-schema-bad") {
  fail(`validation_error id mismatch: ${validationErr.id}`);
}
if (afterSchemaBad.valid.length !== 2) {
  fail(`schema-bad entry must not reduce valid count; got ${afterSchemaBad.valid.length}`);
}

// Foreign prefix + IssueCard prefix must not be touched by record list.
polyfill.setItem("some-other-app:unrelated", "whatever");
const issueCardOpts = defaultIntakeOptions("2026-04-21T03:50:00+08:00", "issue-card-seed");
const seededIssueCard = buildIssueCardFromIntake(
  { title: "seed card", description: "for cross-store isolation check", severity: "low" },
  issueCardOpts,
);
if (!seededIssueCard.ok) fail("failed to build seed IssueCard for isolation check", seededIssueCard);
saveIssueCard(seededIssueCard.card);

const afterForeign = listInvestigationRecordsByIssueId("issue-a");
const touchedForeign =
  afterForeign.valid.some((r) => r.id === "unrelated" || r.id === "issue-card-seed") ||
  afterForeign.invalid.some((e) => e.id === "unrelated" || e.id === "issue-card-seed");
if (touchedForeign) fail("record list must not touch foreign / issue-card keys", afterForeign);
if (afterForeign.valid.length !== 2) {
  fail(`foreign / issue-card keys must not reduce valid count; got ${afterForeign.valid.length}`);
}

// --- Case 6: cross-store isolation — listIssueCards must not be polluted by record entries ---
const cards = listIssueCards();
const cardLeak =
  cards.valid.some((s) => s.id.startsWith("record-")) ||
  cards.invalid.some((e) => e.id.startsWith("record-"));
if (cardLeak) fail("listIssueCards must not see investigation-record keys", cards);
if (cards.valid.length !== 1 || cards.valid[0]?.id !== "issue-card-seed") {
  fail(`listIssueCards should only see the seeded card; got valid=${cards.valid.length}`, cards);
}

console.log(`[S2-A3 verify] PASS: empty storage → listByIssueId returns empty`);
console.log(`[S2-A3 verify] PASS: 2 records for A + 1 for B, listByIssueId filters + sorts asc`);
console.log(`[S2-A3 verify] PASS: empty note / empty issueId rejected structurally, not persisted`);
console.log(`[S2-A3 verify] PASS: corrupt JSON → invalid[parse_error], valid unchanged`);
console.log(`[S2-A3 verify] PASS: schema-invalid JSON + foreign prefix + issue-card prefix → ignored / validation_error`);
console.log(`[S2-A3 verify] PASS: cross-store isolation (records vs issue-cards) holds`);
