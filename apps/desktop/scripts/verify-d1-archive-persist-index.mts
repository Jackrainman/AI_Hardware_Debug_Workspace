// apps/desktop/scripts/verify-d1-archive-persist-index.mts
// D1-ARCHIVE-PERSIST-INDEX 黑盒验证：
//   - listArchiveDocuments() / listErrorEntries() 能读回并倒序排序
//   - 坏 JSON / 坏 schema 路由到 invalid 桶，不污染 valid
//   - archive 前缀与 error 前缀互不污染
//
// 运行方式：
//   cd apps/desktop && node --experimental-strip-types scripts/verify-d1-archive-persist-index.mts

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

const { saveArchiveDocument, listArchiveDocuments } = await import(
  "../src/storage/archive-document-store.ts"
);
const { saveErrorEntry, listErrorEntries } = await import(
  "../src/storage/error-entry-store.ts"
);

function fail(reason: string, detail?: unknown): never {
  console.error(`[D1-ARCHIVE-PERSIST-INDEX verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

// --- Seed: two archive documents + matching error entries ---
saveArchiveDocument({
  issueId: "issue-a",
  projectId: "proj-a",
  fileName: "2026-04-20_uart-timing.md",
  filePath: ".debug_workspace/archive/2026-04-20_uart-timing.md",
  markdownContent: "# earlier archive",
  generatedBy: "hybrid",
  generatedAt: "2026-04-20T09:00:00+08:00",
});
saveArchiveDocument({
  issueId: "issue-b",
  projectId: "proj-a",
  fileName: "2026-04-21_can-bus-noise.md",
  filePath: ".debug_workspace/archive/2026-04-21_can-bus-noise.md",
  markdownContent: "# later archive",
  generatedBy: "hybrid",
  generatedAt: "2026-04-21T10:00:00+08:00",
});
saveErrorEntry({
  id: "error-entry-uart",
  projectId: "proj-a",
  sourceIssueId: "issue-a",
  errorCode: "DBG-20260420-001",
  title: "uart timing issue",
  category: "启动",
  symptom: "boot stall",
  rootCause: "weak pullup",
  resolution: "replace resistor",
  prevention: "checklist",
  relatedFiles: [],
  relatedCommits: [],
  archiveFilePath: ".debug_workspace/archive/2026-04-20_uart-timing.md",
  createdAt: "2026-04-20T09:00:00+08:00",
  updatedAt: "2026-04-20T09:00:00+08:00",
});
saveErrorEntry({
  id: "error-entry-can",
  projectId: "proj-a",
  sourceIssueId: "issue-b",
  errorCode: "DBG-20260421-042",
  title: "can bus noise",
  category: "总线",
  symptom: "frame loss",
  rootCause: "grounding",
  resolution: "reroute ground",
  prevention: "grounding checklist",
  relatedFiles: [],
  relatedCommits: [],
  archiveFilePath: ".debug_workspace/archive/2026-04-21_can-bus-noise.md",
  createdAt: "2026-04-21T10:00:00+08:00",
  updatedAt: "2026-04-21T10:00:00+08:00",
});

// --- Case 1: listArchiveDocuments returns both docs, sorted newest first ---
const docs = listArchiveDocuments();
if (docs.valid.length !== 2 || docs.invalid.length !== 0) {
  fail("expected 2 valid archive docs, 0 invalid", docs);
}
if (docs.valid[0]!.fileName !== "2026-04-21_can-bus-noise.md") {
  fail(
    `expected newest archive first, got ${docs.valid[0]!.fileName}`,
    docs.valid.map((d) => d.fileName),
  );
}
if (docs.valid[1]!.fileName !== "2026-04-20_uart-timing.md") {
  fail(
    `expected older archive second, got ${docs.valid[1]!.fileName}`,
    docs.valid.map((d) => d.fileName),
  );
}

// --- Case 2: listErrorEntries returns both entries, sorted newest first ---
const errs = listErrorEntries();
if (errs.valid.length !== 2 || errs.invalid.length !== 0) {
  fail("expected 2 valid error entries, 0 invalid", errs);
}
if (errs.valid[0]!.errorCode !== "DBG-20260421-042") {
  fail(
    `expected newest error entry first, got ${errs.valid[0]!.errorCode}`,
    errs.valid.map((e) => e.errorCode),
  );
}

// --- Case 3: joining by sourceIssueId gives errorCode + category per archive doc ---
const errorByIssue = new Map(errs.valid.map((e) => [e.sourceIssueId, e]));
const joined = docs.valid.map((doc) => ({
  fileName: doc.fileName,
  issueId: doc.issueId,
  errorCode: errorByIssue.get(doc.issueId)?.errorCode ?? null,
  category: errorByIssue.get(doc.issueId)?.category ?? null,
}));
const joinedCan = joined.find((j) => j.issueId === "issue-b");
if (
  !joinedCan ||
  joinedCan.errorCode !== "DBG-20260421-042" ||
  joinedCan.category !== "总线"
) {
  fail("expected join by sourceIssueId to resolve errorCode + category", joined);
}

// --- Case 4: corrupt archive JSON routes to invalid; valid docs unaffected ---
polyfill.setItem(
  "repo-debug:archive-document:broken.md",
  "{not valid json",
);
const docsAfterCorrupt = listArchiveDocuments();
if (docsAfterCorrupt.valid.length !== 2) {
  fail("valid archive list must not shrink when another key is corrupt", docsAfterCorrupt);
}
if (
  docsAfterCorrupt.invalid.length !== 1 ||
  docsAfterCorrupt.invalid[0]!.kind !== "parse_error" ||
  docsAfterCorrupt.invalid[0]!.fileName !== "broken.md"
) {
  fail("expected one parse_error invalid archive entry", docsAfterCorrupt.invalid);
}

// --- Case 5: bad-schema error entry routes to invalid; valid entries unaffected ---
polyfill.setItem(
  "repo-debug:error-entry:bad-schema",
  JSON.stringify({ id: "bad-schema", title: "missing required fields" }),
);
const errsAfterBad = listErrorEntries();
if (errsAfterBad.valid.length !== 2) {
  fail("valid error list must not shrink when another key is invalid", errsAfterBad);
}
if (
  errsAfterBad.invalid.length !== 1 ||
  errsAfterBad.invalid[0]!.kind !== "validation_error" ||
  errsAfterBad.invalid[0]!.id !== "bad-schema"
) {
  fail("expected one validation_error invalid error entry", errsAfterBad.invalid);
}

// --- Case 6: archive list ignores error-entry keys and vice versa ---
const archiveFileNames = listArchiveDocuments().valid.map((d) => d.fileName);
if (archiveFileNames.some((name) => name.startsWith("error-entry-"))) {
  fail("archive list must not include error-entry keys", archiveFileNames);
}
const errorIds = listErrorEntries().valid.map((e) => e.id);
if (errorIds.some((id) => id.endsWith(".md"))) {
  fail("error list must not include archive-document keys", errorIds);
}

console.log("[D1-ARCHIVE-PERSIST-INDEX verify] PASS: listArchiveDocuments returns docs sorted newest first");
console.log("[D1-ARCHIVE-PERSIST-INDEX verify] PASS: listErrorEntries returns entries sorted newest first");
console.log("[D1-ARCHIVE-PERSIST-INDEX verify] PASS: join by sourceIssueId resolves errorCode + category");
console.log("[D1-ARCHIVE-PERSIST-INDEX verify] PASS: corrupt archive JSON routes to invalid bucket without dropping valid docs");
console.log("[D1-ARCHIVE-PERSIST-INDEX verify] PASS: bad-schema error entry routes to invalid bucket without dropping valid entries");
console.log("[D1-ARCHIVE-PERSIST-INDEX verify] PASS: archive and error prefixes remain isolated");
