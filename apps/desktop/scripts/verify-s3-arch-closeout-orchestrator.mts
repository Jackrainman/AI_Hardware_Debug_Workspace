// apps/desktop/scripts/verify-s3-arch-closeout-orchestrator.mts
// 验证 S3-ARCH-CLOSEOUT-ORCHESTRATOR：
//   1. UI 可通过单一 orchestrator 完成 closeout 主路径；
//   2. orchestrator 返回统一 result，而不是由 UI 自己协调多实体写入；
//   3. 至少覆盖 happy path 与部分失败路径，并暴露已完成写入的实体。

interface LocalStorageShape {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

function fail(reason: string, detail?: unknown): never {
  console.error(`[S3-ARCH-CLOSEOUT-ORCHESTRATOR verify] FAIL: ${reason}`);
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

function makeLocalStoragePolyfill(): LocalStorageShape {
  const store = new Map<string, string>();
  return {
    getItem(key) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index) {
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
const { loadArchiveDocument } = await import("../src/storage/archive-document-store.ts");
const { loadErrorEntry } = await import("../src/storage/error-entry-store.ts");
const { loadIssueCard } = await import("../src/storage/issue-card-store.ts");
const { buildIssueCardFromIntake, defaultIntakeOptions } = await import(
  "../src/domain/issue-intake.ts"
);
const {
  buildInvestigationRecordFromIntake,
  defaultInvestigationIntakeOptions,
} = await import("../src/domain/investigation-intake.ts");
const {
  orchestrateIssueCloseout,
  formatCloseoutOrchestrationFailure,
} = await import("../src/use-cases/closeout-orchestrator.ts");

const issue = buildIssueCardFromIntake(
  {
    title: "PMIC 上电后 SPI Flash 读超时",
    description: "设备上电后 JEDEC ID 读取偶发失败。",
    severity: "high",
  },
  defaultIntakeOptions("2026-04-23T13:00:00+08:00", "issue-closeout-orchestrator"),
);
if (!issue.ok) fail("failed to build issue fixture", issue);
const saveIssue = await storageRepository.issueCards.save(issue.card);
if (!saveIssue.ok) fail("failed to seed issue fixture", saveIssue);

const observation = buildInvestigationRecordFromIntake(
  {
    issueId: issue.card.id,
    type: "observation",
    note: "示波器看到上电 5ms 内 SPI CLK 幅值异常。",
  },
  defaultInvestigationIntakeOptions("2026-04-23T13:05:00+08:00", "record-orchestrator-1"),
);
const result = buildInvestigationRecordFromIntake(
  {
    issueId: issue.card.id,
    type: "result",
    note: "更换 PMIC 去耦后，JEDEC ID 读回恢复稳定。",
  },
  defaultInvestigationIntakeOptions("2026-04-23T13:15:00+08:00", "record-orchestrator-2"),
);
if (!observation.ok || !result.ok) fail("failed to build record fixtures", { observation, result });
const saveObservation = await storageRepository.investigationRecords.append(observation.record);
if (!saveObservation.ok) fail("failed to seed observation record", saveObservation);
const saveResult = await storageRepository.investigationRecords.append(result.record);
if (!saveResult.ok) fail("failed to seed result record", saveResult);

const closeout = await orchestrateIssueCloseout(
  issue.card.id,
  {
    category: "电源",
    rootCause: "PMIC 去耦不足导致上电早期供电抖动",
    resolution: "补充去耦电容并复测 SPI Flash JEDEC ID",
    prevention: "把上电纹波检查纳入 bring-up checklist",
  },
  {
    repository: storageRepository,
    now: () => "2026-04-23T14:00:00+08:00",
    closeoutOptionsOverrides: {
      errorEntryId: "error-entry-orchestrator",
      errorCode: "DBG-20260423-101",
      generatedBy: "hybrid",
    },
  },
);

if (!closeout.ok) fail("expected orchestrated closeout happy path", closeout);
if (
  closeout.completedWrites.join(",") !==
  ["archive_document", "error_entry", "issue_card"].join(",")
) {
  fail("happy path should report all three writes completed", closeout.completedWrites);
}

const reloadedArchive = loadArchiveDocument(closeout.archiveDocument.fileName);
if (!reloadedArchive.ok) fail("expected archive read-back after orchestrator success", reloadedArchive);
const reloadedErrorEntry = loadErrorEntry(closeout.errorEntry.id);
if (!reloadedErrorEntry.ok) {
  fail("expected error-entry read-back after orchestrator success", reloadedErrorEntry);
}
const reloadedIssueCard = loadIssueCard(closeout.updatedIssueCard.id);
if (!reloadedIssueCard.ok) fail("expected issue read-back after orchestrator success", reloadedIssueCard);
if (reloadedIssueCard.card.status !== "archived") {
  fail(`expected archived issue card, got ${reloadedIssueCard.card.status}`);
}

const partialFailureIssue = buildIssueCardFromIntake(
  {
    title: "DDR 初始化后偶发训练失败",
    description: "用于验证 orchestrator 第二步写入失败时的部分成功暴露。",
    severity: "medium",
  },
  defaultIntakeOptions("2026-04-23T15:10:00+08:00", "issue-closeout-partial-failure"),
);
if (!partialFailureIssue.ok) fail("failed to build partial-failure issue fixture", partialFailureIssue);
const savePartialIssue = await storageRepository.issueCards.save(partialFailureIssue.card);
if (!savePartialIssue.ok) fail("failed to seed partial-failure issue", savePartialIssue);

const partialFailureRecord = buildInvestigationRecordFromIntake(
  {
    issueId: partialFailureIssue.card.id,
    type: "observation",
    note: "训练失败前 VDDQ 有短时下跌。",
  },
  defaultInvestigationIntakeOptions("2026-04-23T15:12:00+08:00", "record-partial-failure-1"),
);
if (!partialFailureRecord.ok) {
  fail("failed to build partial-failure record fixture", partialFailureRecord);
}
const savePartialRecord = await storageRepository.investigationRecords.append(partialFailureRecord.record);
if (!savePartialRecord.ok) fail("failed to seed partial-failure record", savePartialRecord);

const partialFailure = await orchestrateIssueCloseout(
  partialFailureIssue.card.id,
  {
    category: "电源",
    rootCause: "should fail on second write",
    resolution: "n/a",
    prevention: "",
  },
  {
    now: () => "2026-04-23T15:00:00+08:00",
    closeoutOptionsOverrides: {
      errorEntryId: "error-entry-partial-failure",
      errorCode: "DBG-20260423-102",
      generatedBy: "hybrid",
    },
    repository: {
      issueCards: {
        load: storageRepository.issueCards.load,
        save: storageRepository.issueCards.save,
        list: storageRepository.issueCards.list,
      },
      investigationRecords: {
        listByIssueId: storageRepository.investigationRecords.listByIssueId,
        append: storageRepository.investigationRecords.append,
      },
      archiveDocuments: {
        list: storageRepository.archiveDocuments.list,
        save: storageRepository.archiveDocuments.save,
      },
      errorEntries: {
        list: storageRepository.errorEntries.list,
        async save(_entry) {
          return {
            ok: false,
            error: {
              kind: "unexpected_write_error",
              code: "unexpected_write_error",
              entity: "error_entry",
              target: "error-entry-partial-failure",
              message: "forced verify failure",
            },
          };
        },
      },
    },
  },
);

if (partialFailure.ok) fail("expected partial failure on error-entry save", partialFailure);
if (partialFailure.reason !== "error_entry_save_failed") {
  fail(`expected error_entry_save_failed, got ${partialFailure.reason}`, partialFailure);
}
if (partialFailure.completedWrites.join(",") !== "archive_document") {
  fail("partial failure should report only archive_document completed", partialFailure);
}
const partialFailureMessage = formatCloseoutOrchestrationFailure(partialFailure);
if (!partialFailureMessage.includes("错误表条目写入失败")) {
  fail("formatted partial failure should mention error-entry save failure", partialFailureMessage);
}

console.log("[S3-ARCH-CLOSEOUT-ORCHESTRATOR verify] PASS: orchestrator completes closeout happy path");
console.log("[S3-ARCH-CLOSEOUT-ORCHESTRATOR verify] PASS: archive / error-entry / issue-card are written via one orchestrator result");
console.log("[S3-ARCH-CLOSEOUT-ORCHESTRATOR verify] PASS: partial failure exposes completedWrites for downstream error-state handling");
