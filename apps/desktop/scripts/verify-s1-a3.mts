// apps/desktop/scripts/verify-s1-a3.mts
// S1-A3 黑盒验证：在 Node 侧用 Map-based polyfill 模拟 window.localStorage，
// 调用真实的 saveIssueCard / loadIssueCard，走 IssueCardSchema.safeParse，
// 确认 save -> load round-trip + not_found 分支都按预期返回。
//
// 运行方式：
//   cd apps/desktop && node --experimental-strip-types scripts/verify-s1-a3.mts

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

// Install window.localStorage BEFORE importing the store module.
(globalThis as unknown as { window: { localStorage: LocalStorageShape } }).window = {
  localStorage: makeLocalStoragePolyfill(),
};

const { saveIssueCard, loadIssueCard } = await import(
  "../src/storage/issue-card-store.ts"
);

const SAMPLE = {
  id: "verify-sample-0001",
  projectId: "verify-project-0001",
  title: "S1-A3 verification sample",
  rawInput: "verification script sample data",
  normalizedSummary: "round-trip check",
  symptomSummary: "n/a",
  suspectedDirections: ["verification"],
  suggestedActions: [],
  status: "open" as const,
  severity: "low" as const,
  tags: ["verify"],
  repoSnapshot: {
    branch: "master",
    headCommitHash: "0000000000000000000000000000000000000000",
    headCommitMessage: "",
    hasUncommittedChanges: false,
    changedFiles: [],
    recentCommits: [],
    capturedAt: "2026-04-21T02:30:00+08:00",
  },
  relatedFiles: [],
  relatedCommits: [],
  relatedHistoricalIssueIds: [],
  createdAt: "2026-04-21T02:30:00+08:00",
  updatedAt: "2026-04-21T02:30:00+08:00",
};

function fail(reason: string, detail?: unknown): never {
  console.error(`[S1-A3 verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

// Case 1: save then load -> ok + round-trip preserves fields
saveIssueCard(SAMPLE);
const ok = loadIssueCard(SAMPLE.id);
if (!ok.ok) fail("expected ok result after save", ok.error);
if (ok.card.id !== SAMPLE.id) fail(`id mismatch: ${ok.card.id} vs ${SAMPLE.id}`);
if (ok.card.title !== SAMPLE.title) fail(`title mismatch: ${ok.card.title}`);
if (ok.card.status !== SAMPLE.status) fail(`status mismatch: ${ok.card.status}`);
if (ok.card.repoSnapshot.branch !== SAMPLE.repoSnapshot.branch) {
  fail(`nested branch mismatch: ${ok.card.repoSnapshot.branch}`);
}

// Case 2: missing id -> not_found (structured error, not silent null)
const missing = loadIssueCard("nonexistent-xyz");
if (missing.ok) fail("expected error for nonexistent id", missing);
if (missing.error.kind !== "not_found") fail(`expected not_found, got ${missing.error.kind}`);

console.log("[S1-A3 verify] PASS: save -> load -> schema validate round-trip OK");
console.log(`[S1-A3 verify] PASS: loaded card id=${ok.card.id} title="${ok.card.title}"`);
console.log("[S1-A3 verify] PASS: nonexistent id returns { ok:false, error.kind: 'not_found' }");
