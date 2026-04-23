// apps/desktop/scripts/verify-s3-arch-async-storage-port.mts
// 验证 S3-ARCH-ASYNC-STORAGE-PORT：
//   1. 当前业务级 storageRepository 已是 Promise 边界；
//   2. localStorage 仍能通过该边界跑通 issue / record / archive / error-entry 主路径；
//   3. 写操作失败不再是假定成功，至少能返回 validation_failed / unexpected_write_error；
//   4. 读操作异常会返回 read_failed，而不是抛出到 UI。

interface LocalStorageShape {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

function fail(reason: string, detail?: unknown): never {
  console.error(`[S3-ARCH-ASYNC-STORAGE-PORT verify] FAIL: ${reason}`);
  if (detail !== undefined) {
    console.error(JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

function setWindowLocalStorage(storage: LocalStorageShape): void {
  (globalThis as unknown as { window: { localStorage: LocalStorageShape } }).window = {
    localStorage: storage,
  };
}

function makeLocalStoragePolyfill(options?: {
  seed?: Record<string, string>;
  throwOnGetItem?: string;
  throwOnSetItem?: string;
  throwOnKey?: string;
}): LocalStorageShape {
  const store = new Map<string, string>(Object.entries(options?.seed ?? {}));
  return {
    getItem(key) {
      if (options?.throwOnGetItem) {
        throw new Error(options.throwOnGetItem);
      }
      return store.has(key) ? (store.get(key) as string) : null;
    },
    setItem(key, value) {
      if (options?.throwOnSetItem) {
        throw new Error(options.throwOnSetItem);
      }
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index) {
      if (options?.throwOnKey) {
        throw new Error(options.throwOnKey);
      }
      const keys = Array.from(store.keys());
      return index >= 0 && index < keys.length ? (keys[index] as string) : null;
    },
    get length() {
      return store.size;
    },
  };
}

setWindowLocalStorage(makeLocalStoragePolyfill());

const { storageRepository } = await import("../src/storage/storage-repository.ts");
const { buildIssueCardFromIntake, defaultIntakeOptions } = await import(
  "../src/domain/issue-intake.ts"
);
const { buildInvestigationRecordFromIntake, defaultInvestigationIntakeOptions } = await import(
  "../src/domain/investigation-intake.ts"
);
const { buildCloseoutFromIssue, defaultCloseoutOptions } = await import(
  "../src/domain/closeout.ts"
);

const issue = buildIssueCardFromIntake(
  {
    title: "SPI flash read timeout",
    description: "Boot hangs before device ID is read back.",
    severity: "high",
  },
  defaultIntakeOptions("2026-04-23T10:00:00+08:00", "issue-s3-async-port"),
);
if (!issue.ok) fail("failed to build issue fixture", issue);

const pendingIssueSave = storageRepository.issueCards.save(issue.card);
if (!(pendingIssueSave instanceof Promise)) {
  fail("issueCards.save must return Promise");
}
const issueSave = await pendingIssueSave;
if (!issueSave.ok) fail("issueCards.save should succeed", issueSave);

const pendingCardList = storageRepository.issueCards.list();
if (!(pendingCardList instanceof Promise)) {
  fail("issueCards.list must return Promise");
}
const cardList = await pendingCardList;
if (cardList.readError !== null) fail("issueCards.list should not read_fail on happy path", cardList);
if (cardList.valid.length !== 1 || cardList.valid[0]?.id !== issue.card.id) {
  fail("issueCards.list should return saved issue summary", cardList);
}

const pendingLoadedIssue = storageRepository.issueCards.load(issue.card.id);
if (!(pendingLoadedIssue instanceof Promise)) {
  fail("issueCards.load must return Promise");
}
const loadedIssue = await pendingLoadedIssue;
if (!loadedIssue.ok) fail("issueCards.load should return saved issue", loadedIssue);

const record = buildInvestigationRecordFromIntake(
  {
    issueId: issue.card.id,
    type: "action",
    note: "Swap SPI flash and confirm read ID recovers.",
  },
  defaultInvestigationIntakeOptions("2026-04-23T10:15:00+08:00", "record-s3-async-port"),
);
if (!record.ok) fail("failed to build investigation fixture", record);

const recordSave = await storageRepository.investigationRecords.append(record.record);
if (!recordSave.ok) fail("investigationRecords.append should succeed", recordSave);

const recordList = await storageRepository.investigationRecords.listByIssueId(issue.card.id);
if (recordList.readError !== null) {
  fail("investigationRecords.listByIssueId should not read_fail on happy path", recordList);
}
if (recordList.valid.length !== 1 || recordList.valid[0]?.id !== record.record.id) {
  fail("investigationRecords.listByIssueId should return appended record", recordList);
}

const closeout = buildCloseoutFromIssue(
  loadedIssue.card,
  recordList.valid,
  {
    category: "boot",
    rootCause: "SPI flash solder joint intermittently open",
    resolution: "Rework flash soldering and verify JEDEC ID readback",
    prevention: "Add SPI read-ID check to bring-up checklist",
  },
  defaultCloseoutOptions("2026-04-23T11:00:00+08:00", {
    errorEntryId: "error-entry-s3-async-port",
    errorCode: "DBG-20260423-001",
    generatedBy: "hybrid",
  }),
);
if (!closeout.ok) fail("buildCloseoutFromIssue should succeed", closeout);

const archiveSave = await storageRepository.archiveDocuments.save(closeout.archiveDocument);
if (!archiveSave.ok) fail("archiveDocuments.save should succeed", archiveSave);
const errorEntrySave = await storageRepository.errorEntries.save(closeout.errorEntry);
if (!errorEntrySave.ok) fail("errorEntries.save should succeed", errorEntrySave);
const archivedIssueSave = await storageRepository.issueCards.save(closeout.updatedIssueCard);
if (!archivedIssueSave.ok) fail("issueCards.save should support closeout write-back", archivedIssueSave);

const archiveList = await storageRepository.archiveDocuments.list();
if (archiveList.readError !== null) fail("archiveDocuments.list should not read_fail on happy path", archiveList);
if (archiveList.valid.length !== 1 || archiveList.valid[0]?.fileName !== closeout.archiveDocument.fileName) {
  fail("archiveDocuments.list should return saved archive", archiveList);
}

const errorList = await storageRepository.errorEntries.list();
if (errorList.readError !== null) fail("errorEntries.list should not read_fail on happy path", errorList);
if (errorList.valid.length !== 1 || errorList.valid[0]?.id !== closeout.errorEntry.id) {
  fail("errorEntries.list should return saved error entry", errorList);
}

const validationFailed = await storageRepository.issueCards.save({ id: "broken-card" } as never);
if (validationFailed.ok || validationFailed.error.code !== "validation_failed") {
  fail("invalid write should return validation_failed", validationFailed);
}

setWindowLocalStorage(
  makeLocalStoragePolyfill({
    throwOnSetItem: "quota exceeded",
  }),
);
const unexpectedWrite = await storageRepository.issueCards.save(issue.card);
if (unexpectedWrite.ok || unexpectedWrite.error.code !== "unexpected_write_error") {
  fail("setItem exception should return unexpected_write_error", unexpectedWrite);
}

setWindowLocalStorage(
  makeLocalStoragePolyfill({
    throwOnGetItem: "read blocked",
  }),
);
const readFailedLoad = await storageRepository.issueCards.load(issue.card.id);
if (readFailedLoad.ok || readFailedLoad.error.kind !== "read_failed") {
  fail("getItem exception should return read_failed on load", readFailedLoad);
}

setWindowLocalStorage(
  makeLocalStoragePolyfill({
    seed: {
      "repo-debug:issue-card:any": JSON.stringify(issue.card),
    },
    throwOnKey: "list blocked",
  }),
);
const readFailedList = await storageRepository.issueCards.list();
if (readFailedList.readError?.code !== "read_failed") {
  fail("listKeys exception should populate readError on list", readFailedList);
}

console.log("[S3-ARCH-ASYNC-STORAGE-PORT verify] PASS: storageRepository methods expose Promise-based business port");
console.log("[S3-ARCH-ASYNC-STORAGE-PORT verify] PASS: localStorage still runs issue / record / archive / error-entry happy path");
console.log("[S3-ARCH-ASYNC-STORAGE-PORT verify] PASS: invalid writes return validation_failed");
console.log("[S3-ARCH-ASYNC-STORAGE-PORT verify] PASS: setItem exceptions return unexpected_write_error");
console.log("[S3-ARCH-ASYNC-STORAGE-PORT verify] PASS: getItem / listKeys exceptions return read_failed");
