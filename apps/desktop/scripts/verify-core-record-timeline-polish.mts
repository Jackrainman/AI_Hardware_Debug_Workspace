import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const { buildInvestigationRecordFromIntake, defaultInvestigationIntakeOptions } = await import(
  "../src/domain/investigation-intake.ts"
);
const { saveInvestigationRecord, listInvestigationRecordsByIssueId } = await import(
  "../src/storage/investigation-record-store.ts"
);

function fail(reason: string, detail?: unknown): never {
  console.error(`[CORE-04-RECORD-TIMELINE-POLISH verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

const ISSUE_ID = "issue-record-timeline-polish";
const fixtures = [
  ["record-timeline-03", "action", "复位底盘控制板并重新观察。", "2026-04-27T18:02:00+08:00"],
  ["record-timeline-01", "observation", "CAN 心跳 3 秒后中断。", "2026-04-27T18:00:00+08:00"],
  ["record-timeline-04", "result", "复位后心跳恢复，但 5 分钟后复现。", "2026-04-27T18:03:00+08:00"],
  ["record-timeline-02", "hypothesis", "疑似电源纹波导致通信模块重启。", "2026-04-27T18:01:00+08:00"],
  ["record-timeline-05", "conclusion", "先记录复现条件，结案时补预防清单。", "2026-04-27T18:04:00+08:00"],
] as const;

for (const [id, type, note, now] of fixtures) {
  const built = buildInvestigationRecordFromIntake(
    { issueId: ISSUE_ID, type, note },
    defaultInvestigationIntakeOptions(now, id),
  );
  if (!built.ok) fail("record fixture should build", built);
  const saved = saveInvestigationRecord(built.record);
  if (!saved.ok) fail("record fixture should save", saved);
}

const listed = listInvestigationRecordsByIssueId(ISSUE_ID);
if (listed.readError !== null) fail("timeline list should not have readError", listed.readError);
if (listed.invalid.length !== 0 || listed.valid.length !== fixtures.length) {
  fail("timeline list should read back all clean fixtures", listed);
}

const expectedOrder = fixtures
  .slice()
  .sort((a, b) => (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0))
  .map(([id]) => id);
const actualOrder = listed.valid.map((record) => record.id);
if (actualOrder.join(",") !== expectedOrder.join(",")) {
  fail("timeline list should stay chronological", { expectedOrder, actualOrder });
}

const appSource = readFileSync(resolve("src/App.tsx"), "utf8");
const investigationComponentsSource = readFileSync(
  resolve("src/components/investigation/InvestigationComponents.tsx"),
  "utf8",
);
const uiSource = [appSource, investigationComponentsSource].join("\n");
const cssSource = readFileSync(resolve("src/App.css"), "utf8");
const requiredAppMarkers = [
  'data-testid="record-timeline"',
  'data-testid="record-timeline-item"',
  "data-record-type={record.type}",
  "record-timeline-marker",
  "record-type-chip",
  "record-timeline-time",
];
for (const marker of requiredAppMarkers) {
  if (!uiSource.includes(marker)) fail(`UI source missing timeline marker: ${marker}`);
}

for (const type of ["observation", "hypothesis", "action", "result", "conclusion", "note"]) {
  const selector = `.record-timeline-item[data-record-type="${type}"]`;
  if (!cssSource.includes(selector)) fail(`App.css missing type selector: ${selector}`);
}

if (!cssSource.includes(".record-timeline::before")) {
  fail("App.css should render a visible timeline spine");
}

console.log("[CORE-04-RECORD-TIMELINE-POLISH verify] PASS: records read back chronologically across types");
console.log("[CORE-04-RECORD-TIMELINE-POLISH verify] PASS: App exposes timeline item, type chip, marker and timestamp UI markers");
console.log("[CORE-04-RECORD-TIMELINE-POLISH verify] PASS: CSS differentiates observation/hypothesis/action/result/conclusion/note");
