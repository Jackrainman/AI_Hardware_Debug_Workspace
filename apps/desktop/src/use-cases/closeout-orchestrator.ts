import {
  buildCloseoutFromIssue,
  defaultCloseoutOptions,
  nowISO as nowISOCloseout,
  type CloseoutFailure,
  type CloseoutInput,
  type CloseoutOptions,
} from "../domain/closeout.ts";
import type { ArchiveDocument } from "../domain/schemas/archive-document.ts";
import type { ErrorEntry } from "../domain/schemas/error-entry.ts";
import type { IssueCard } from "../domain/schemas/issue-card.ts";
import {
  storageRepository,
  type LoadIssueCardResult,
  type StorageReadError,
  type StorageRepository,
  type StorageWriteError,
} from "../storage/storage-repository.ts";
import type { StorageEntity } from "../storage/storage-result.ts";

type CloseoutPersistedEntity = Extract<
  StorageEntity,
  "archive_document" | "error_entry" | "issue_card"
>;

interface CloseoutArtifacts {
  archiveDocument: ArchiveDocument;
  errorEntry: ErrorEntry;
  updatedIssueCard: IssueCard;
}

export type CloseoutOrchestrationFailure =
  | {
      ok: false;
      step: "load_issue_card";
      reason: "issue_load_failed";
      error: Extract<LoadIssueCardResult, { ok: false }>["error"];
      completedWrites: CloseoutPersistedEntity[];
    }
  | {
      ok: false;
      step: "load_investigation_records";
      reason: "record_list_failed";
      error: StorageReadError;
      completedWrites: CloseoutPersistedEntity[];
    }
  | {
      ok: false;
      step: "load_investigation_records";
      reason: "record_list_invalid";
      invalidCount: number;
      completedWrites: CloseoutPersistedEntity[];
    }
  | {
      ok: false;
      step: "build_closeout";
      reason: "closeout_validation_failed";
      error: CloseoutFailure;
      completedWrites: CloseoutPersistedEntity[];
    }
  | {
      ok: false;
      step: "save_archive_document";
      reason: "archive_save_failed";
      error: StorageWriteError;
      artifacts: CloseoutArtifacts;
      completedWrites: CloseoutPersistedEntity[];
    }
  | {
      ok: false;
      step: "save_error_entry";
      reason: "error_entry_save_failed";
      error: StorageWriteError;
      artifacts: CloseoutArtifacts;
      completedWrites: CloseoutPersistedEntity[];
    }
  | {
      ok: false;
      step: "save_issue_card";
      reason: "issue_card_save_failed";
      error: StorageWriteError;
      artifacts: CloseoutArtifacts;
      completedWrites: CloseoutPersistedEntity[];
    };

export type CloseoutOrchestrationSuccess = CloseoutArtifacts & {
  ok: true;
  completedWrites: CloseoutPersistedEntity[];
};

export type CloseoutOrchestrationResult =
  | CloseoutOrchestrationSuccess
  | CloseoutOrchestrationFailure;

export interface CloseoutOrchestratorOptions {
  repository?: StorageRepository;
  now?: () => string;
  closeoutOptionsOverrides?: Partial<Omit<CloseoutOptions, "now">>;
}

function labelStorageEntity(entity: StorageEntity): string {
  const labels: Record<StorageEntity, string> = {
    issue_card: "问题卡",
    investigation_record: "排查记录",
    archive_document: "归档摘要",
    error_entry: "错误表条目",
  };
  return labels[entity];
}

function formatStorageWriteError(error: StorageWriteError): string {
  const entityLabel = labelStorageEntity(error.entity);
  switch (error.code) {
    case "validation_failed":
      return `${entityLabel}写入前校验失败（${error.issues.length} 个字段问题）`;
    case "serialize_failed":
      return `${entityLabel}序列化失败：${error.message}`;
    case "unexpected_write_error":
      return `${entityLabel}写入异常：${error.message}`;
  }
}

function formatLoadIssueCardError(
  error: Extract<LoadIssueCardResult, { ok: false }>["error"],
): string {
  switch (error.kind) {
    case "not_found":
      return `未找到问题卡（${error.id}）`;
    case "parse_error":
      return `问题卡 JSON 解析失败（${error.id}）：${error.message}`;
    case "validation_error":
      return `问题卡结构校验失败（${error.id}，${error.issues.length} 个字段问题）`;
    case "read_failed":
      return `${labelStorageEntity(error.entity)}读取失败（${error.code}）：${error.message}`;
  }
}

export function formatCloseoutOrchestrationFailure(
  failure: CloseoutOrchestrationFailure,
): string {
  switch (failure.reason) {
    case "issue_load_failed":
      return formatLoadIssueCardError(failure.error);
    case "record_list_failed":
      return `排查记录读取失败（${failure.error.code}）：${failure.error.message}`;
    case "record_list_invalid":
      return `排查记录校验失败：有 ${failure.invalidCount} 条异常记录`;
    case "closeout_validation_failed":
      return failure.error.reason;
    case "archive_save_failed":
      return `归档摘要写入失败：${formatStorageWriteError(failure.error)}`;
    case "error_entry_save_failed":
      return `错误表条目写入失败：${formatStorageWriteError(failure.error)}`;
    case "issue_card_save_failed":
      return `问题卡回写失败：${formatStorageWriteError(failure.error)}`;
  }
}

export async function orchestrateIssueCloseout(
  issueId: string,
  input: CloseoutInput,
  options: CloseoutOrchestratorOptions = {},
): Promise<CloseoutOrchestrationResult> {
  const repository = options.repository ?? storageRepository;
  const now = (options.now ?? nowISOCloseout)();
  const completedWrites: CloseoutPersistedEntity[] = [];

  const loaded = await repository.issueCards.load(issueId);
  if (!loaded.ok) {
    return {
      ok: false,
      step: "load_issue_card",
      reason: "issue_load_failed",
      error: loaded.error,
      completedWrites,
    };
  }

  const records = await repository.investigationRecords.listByIssueId(issueId);
  if (records.readError !== null) {
    return {
      ok: false,
      step: "load_investigation_records",
      reason: "record_list_failed",
      error: records.readError,
      completedWrites,
    };
  }
  if (records.invalid.length > 0) {
    return {
      ok: false,
      step: "load_investigation_records",
      reason: "record_list_invalid",
      invalidCount: records.invalid.length,
      completedWrites,
    };
  }

  const closeout = buildCloseoutFromIssue(
    loaded.card,
    records.valid,
    input,
    defaultCloseoutOptions(now, options.closeoutOptionsOverrides),
  );
  if (!closeout.ok) {
    return {
      ok: false,
      step: "build_closeout",
      reason: "closeout_validation_failed",
      error: closeout,
      completedWrites,
    };
  }

  const artifacts: CloseoutArtifacts = {
    archiveDocument: closeout.archiveDocument,
    errorEntry: closeout.errorEntry,
    updatedIssueCard: closeout.updatedIssueCard,
  };

  const savedArchive = await repository.archiveDocuments.save(artifacts.archiveDocument);
  if (!savedArchive.ok) {
    return {
      ok: false,
      step: "save_archive_document",
      reason: "archive_save_failed",
      error: savedArchive.error,
      artifacts,
      completedWrites,
    };
  }
  completedWrites.push("archive_document");

  const savedErrorEntry = await repository.errorEntries.save(artifacts.errorEntry);
  if (!savedErrorEntry.ok) {
    return {
      ok: false,
      step: "save_error_entry",
      reason: "error_entry_save_failed",
      error: savedErrorEntry.error,
      artifacts,
      completedWrites: [...completedWrites],
    };
  }
  completedWrites.push("error_entry");

  const savedIssueCard = await repository.issueCards.save(artifacts.updatedIssueCard);
  if (!savedIssueCard.ok) {
    return {
      ok: false,
      step: "save_issue_card",
      reason: "issue_card_save_failed",
      error: savedIssueCard.error,
      artifacts,
      completedWrites: [...completedWrites],
    };
  }
  completedWrites.push("issue_card");

  return {
    ok: true,
    archiveDocument: artifacts.archiveDocument,
    errorEntry: artifacts.errorEntry,
    updatedIssueCard: artifacts.updatedIssueCard,
    completedWrites: [...completedWrites],
  };
}
