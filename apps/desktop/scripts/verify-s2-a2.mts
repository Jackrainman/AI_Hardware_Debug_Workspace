// apps/desktop/scripts/verify-s2-a2.mts
// S2-A2 黑盒验证：在 Node 侧用 Map-based polyfill 模拟 window.localStorage，
// 覆盖 listIssueCards() 的四条路径：
//   1. 空存储 → valid=[] invalid=[]
//   2. save 两张合法卡 → valid.length===2，按 createdAt 倒序
//   3. 存在一条 JSON 损坏的 key → 进 invalid（kind=parse_error），不影响合法条目
//   4. 存在一条 JSON 合法但 schema 不符的 key → 进 invalid（kind=validation_error）
//   5. 存在一条非本应用前缀的 key → 被忽略，不出现在任何桶里
//
// 运行方式：
//   cd apps/desktop && node --experimental-strip-types scripts/verify-s2-a2.mts

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
const { saveIssueCard, listIssueCards } = await import(
  "../src/storage/issue-card-store.ts"
);

function fail(reason: string, detail?: unknown): never {
  console.error(`[S2-A2 verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

// --- Case 1: empty storage ---
const empty = listIssueCards();
if (empty.valid.length !== 0 || empty.invalid.length !== 0) {
  fail("expected empty list on empty storage", empty);
}

// --- Case 2: save two valid cards ---
const BUILD_OPTS_OLDER = defaultIntakeOptions("2026-04-21T03:00:00+08:00", "issue-list-a");
const BUILD_OPTS_NEWER = defaultIntakeOptions("2026-04-21T03:30:00+08:00", "issue-list-b");
const older = buildIssueCardFromIntake(
  { title: "Older card", description: "earlier", severity: "low" },
  BUILD_OPTS_OLDER,
);
const newer = buildIssueCardFromIntake(
  { title: "Newer card", description: "later", severity: "high" },
  BUILD_OPTS_NEWER,
);
if (!older.ok || !newer.ok) fail("intake build failed on seed data", { older, newer });
saveIssueCard(older.card);
saveIssueCard(newer.card);

const afterTwo = listIssueCards();
if (afterTwo.valid.length !== 2) {
  fail(`expected 2 valid summaries, got ${afterTwo.valid.length}`, afterTwo);
}
if (afterTwo.invalid.length !== 0) {
  fail(`expected 0 invalid entries after clean saves, got ${afterTwo.invalid.length}`, afterTwo.invalid);
}
// createdAt desc => newer first
if (afterTwo.valid[0]?.id !== "issue-list-b") {
  fail(`expected newer card first, got id=${afterTwo.valid[0]?.id}`, afterTwo.valid);
}
if (afterTwo.valid[0]?.severity !== "high") {
  fail(`summary severity mismatch: ${afterTwo.valid[0]?.severity}`);
}
if (afterTwo.valid[1]?.id !== "issue-list-a") {
  fail(`expected older card second, got id=${afterTwo.valid[1]?.id}`);
}

// --- Case 3: corrupt JSON entry under our prefix ---
polyfill.setItem("repo-debug:issue-card:issue-broken-json", "{not valid json");
const afterBroken = listIssueCards();
if (afterBroken.valid.length !== 2) {
  fail(`broken JSON should not reduce valid count; got ${afterBroken.valid.length}`, afterBroken.valid);
}
const parseErr = afterBroken.invalid.find((e) => e.kind === "parse_error");
if (!parseErr) fail("expected at least one parse_error invalid entry", afterBroken.invalid);
if (parseErr && parseErr.id !== "issue-broken-json") {
  fail(`parse_error id mismatch: ${parseErr.id}`);
}

// --- Case 4: schema-invalid JSON under our prefix ---
polyfill.setItem(
  "repo-debug:issue-card:issue-schema-bad",
  JSON.stringify({ id: "issue-schema-bad", title: "missing most fields" }),
);
const afterSchemaBad = listIssueCards();
const validationErr = afterSchemaBad.invalid.find((e) => e.kind === "validation_error");
if (!validationErr) fail("expected at least one validation_error invalid entry", afterSchemaBad.invalid);
if (validationErr && validationErr.id !== "issue-schema-bad") {
  fail(`validation_error id mismatch: ${validationErr.id}`);
}
if (afterSchemaBad.valid.length !== 2) {
  fail(`schema-bad entry should not reduce valid count; got ${afterSchemaBad.valid.length}`);
}

// --- Case 5: foreign prefix must be ignored entirely ---
polyfill.setItem("some-other-app:unrelated", "whatever");
const afterForeign = listIssueCards();
const touchedForeign =
  afterForeign.valid.some((s) => s.id === "unrelated") ||
  afterForeign.invalid.some((e) => e.id === "unrelated" || e.key === "some-other-app:unrelated");
if (touchedForeign) fail("foreign prefix key must be ignored by listIssueCards", afterForeign);
if (afterForeign.valid.length !== 2) {
  fail(`foreign prefix must not reduce valid count; got ${afterForeign.valid.length}`);
}
if (afterForeign.invalid.length !== 2) {
  fail(`foreign prefix must not increase invalid count; got ${afterForeign.invalid.length}`);
}

console.log(`[S2-A2 verify] PASS: empty storage → valid=0 invalid=0`);
console.log(`[S2-A2 verify] PASS: two valid saves → valid=2 sorted desc by createdAt, invalid=0`);
console.log(`[S2-A2 verify] PASS: corrupt JSON under prefix → routed to invalid[kind=parse_error]`);
console.log(`[S2-A2 verify] PASS: schema-invalid JSON → routed to invalid[kind=validation_error]`);
console.log(`[S2-A2 verify] PASS: foreign-prefix key ignored by listIssueCards`);
