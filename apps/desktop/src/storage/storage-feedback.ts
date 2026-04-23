import type { LoadIssueCardResult, StorageReadError, StorageWriteError } from "./storage-repository.ts";
import type { StorageEntity } from "./storage-result.ts";
import type { CloseoutOrchestrationFailure } from "../use-cases/closeout-orchestrator.ts";

export type StorageConnectionState =
  | { state: "local_ready"; mode: "local_storage" }
  | { state: "checking" }
  | { state: "online"; checkedAt: string }
  | { state: "degraded"; reason: string; checkedAt: string }
  | { state: "unreachable"; reason: string; checkedAt: string };

export const LOCAL_STORAGE_CONNECTION_STATE: StorageConnectionState = {
  state: "local_ready",
  mode: "local_storage",
};

export type StorageFeedbackSurface =
  | "demo"
  | "issue_intake"
  | "issue_list"
  | "issue_detail"
  | "investigation_append"
  | "investigation_list"
  | "closeout"
  | "archive_index";

export type StorageFeedbackOperation =
  | "health"
  | "create_issue"
  | "list_issues"
  | "load_issue"
  | "save_record"
  | "list_records"
  | "closeout"
  | "list_archives";

export type StorageFeedbackCode =
  | "validation_failed"
  | "read_failed"
  | "write_failed"
  | "invalid_data"
  | "server_unreachable"
  | "timeout"
  | "conflict"
  | "not_found";

export interface StorageFeedbackError {
  surface: StorageFeedbackSurface;
  operation: StorageFeedbackOperation;
  code: StorageFeedbackCode;
  message: string;
  detail?: string;
  entity?: StorageEntity;
  retryable: boolean;
  connectionState: StorageConnectionState;
  step?: string;
  completedWrites?: string[];
}

type LoadIssueCardFailure = Extract<LoadIssueCardResult, { ok: false }>["error"];

function labelStorageEntity(entity: StorageEntity): string {
  const labels: Record<StorageEntity, string> = {
    issue_card: "问题卡",
    investigation_record: "排查记录",
    archive_document: "归档摘要",
    error_entry: "错误表条目",
  };
  return labels[entity];
}

function labelSurface(surface: StorageFeedbackSurface): string {
  const labels: Record<StorageFeedbackSurface, string> = {
    demo: "辅助验证",
    issue_intake: "创建问题卡",
    issue_list: "问题卡列表",
    issue_detail: "问题卡详情",
    investigation_append: "追加排查记录",
    investigation_list: "排查时间线",
    closeout: "结案归档",
    archive_index: "归档区",
  };
  return labels[surface];
}

function labelCompletedWrite(entity: string): string {
  switch (entity) {
    case "archive_document":
      return "归档摘要";
    case "error_entry":
      return "错误表条目";
    case "issue_card":
      return "问题卡";
    default:
      return entity;
  }
}

export function describeStorageConnectionState(state: StorageConnectionState): string {
  switch (state.state) {
    case "local_ready":
      return "浏览器本地存储（演示模式）";
    case "checking":
      return "正在检查服务器连接";
    case "online":
      return `服务器在线（${state.checkedAt}）`;
    case "degraded":
      return `服务器降级：${state.reason}`;
    case "unreachable":
      return `服务器不可达：${state.reason}`;
  }
}

export function createValidationStorageFeedbackError(
  surface: StorageFeedbackSurface,
  operation: StorageFeedbackOperation,
  detail: string,
): StorageFeedbackError {
  return {
    surface,
    operation,
    code: "validation_failed",
    message: "输入校验未通过",
    detail,
    retryable: false,
    connectionState: LOCAL_STORAGE_CONNECTION_STATE,
  };
}

export function createInvalidDataStorageFeedbackError(
  surface: StorageFeedbackSurface,
  operation: StorageFeedbackOperation,
  detail: string,
  entity?: StorageEntity,
): StorageFeedbackError {
  return {
    surface,
    operation,
    code: "invalid_data",
    message: "发现异常数据，当前已跳过不可信条目",
    detail,
    entity,
    retryable: false,
    connectionState: LOCAL_STORAGE_CONNECTION_STATE,
  };
}

export function createServerUnreachableStorageFeedbackError(
  surface: StorageFeedbackSurface,
  operation: StorageFeedbackOperation,
  reason: string,
  checkedAt: string,
): StorageFeedbackError {
  return {
    surface,
    operation,
    code: "server_unreachable",
    message: "无法连接服务器长期存储",
    detail: reason,
    retryable: true,
    connectionState: {
      state: "unreachable",
      reason,
      checkedAt,
    },
  };
}

export function createTimeoutStorageFeedbackError(
  surface: StorageFeedbackSurface,
  operation: StorageFeedbackOperation,
  reason: string,
  checkedAt: string,
): StorageFeedbackError {
  return {
    surface,
    operation,
    code: "timeout",
    message: "请求超时，未确认服务器写入结果",
    detail: reason,
    retryable: true,
    connectionState: {
      state: "degraded",
      reason,
      checkedAt,
    },
  };
}

export function storageReadErrorToFeedback(
  surface: StorageFeedbackSurface,
  operation: StorageFeedbackOperation,
  error: StorageReadError,
): StorageFeedbackError {
  return {
    surface,
    operation,
    code: "read_failed",
    message: `${labelStorageEntity(error.entity)}读取失败`,
    detail: error.message,
    entity: error.entity,
    retryable: true,
    connectionState: LOCAL_STORAGE_CONNECTION_STATE,
  };
}

export function storageWriteErrorToFeedback(
  surface: StorageFeedbackSurface,
  operation: StorageFeedbackOperation,
  error: StorageWriteError,
): StorageFeedbackError {
  if (error.code === "validation_failed") {
    return {
      surface,
      operation,
      code: "validation_failed",
      message: `${labelStorageEntity(error.entity)}写入前校验失败`,
      detail: `${error.issues.length} 个字段问题`,
      entity: error.entity,
      retryable: false,
      connectionState: LOCAL_STORAGE_CONNECTION_STATE,
    };
  }

  return {
    surface,
    operation,
    code: "write_failed",
    message: `${labelStorageEntity(error.entity)}写入失败`,
    detail: error.message,
    entity: error.entity,
    retryable: true,
    connectionState: LOCAL_STORAGE_CONNECTION_STATE,
  };
}

export function loadIssueCardFailureToFeedback(
  surface: StorageFeedbackSurface,
  error: LoadIssueCardFailure,
): StorageFeedbackError {
  switch (error.kind) {
    case "not_found":
      return {
        surface,
        operation: "load_issue",
        code: "not_found",
        message: "未找到问题卡",
        detail: error.id,
        entity: "issue_card",
        retryable: false,
        connectionState: LOCAL_STORAGE_CONNECTION_STATE,
      };
    case "parse_error":
      return createInvalidDataStorageFeedbackError(
        surface,
        "load_issue",
        `问题卡 JSON 解析失败（${error.id}）：${error.message}`,
        "issue_card",
      );
    case "validation_error":
      return createInvalidDataStorageFeedbackError(
        surface,
        "load_issue",
        `问题卡结构校验失败（${error.id}，${error.issues.length} 个字段问题）`,
        "issue_card",
      );
    case "read_failed":
      return storageReadErrorToFeedback(surface, "load_issue", error);
  }
}

export function closeoutFailureToFeedback(
  failure: CloseoutOrchestrationFailure,
): StorageFeedbackError {
  switch (failure.reason) {
    case "issue_load_failed":
      return {
        ...loadIssueCardFailureToFeedback("closeout", failure.error),
        step: failure.step,
      };
    case "record_list_failed":
      return {
        ...storageReadErrorToFeedback("closeout", "closeout", failure.error),
        step: failure.step,
      };
    case "record_list_invalid":
      return {
        ...createInvalidDataStorageFeedbackError(
          "closeout",
          "closeout",
          `排查记录里有 ${failure.invalidCount} 条异常数据，已阻断结案。`,
          "investigation_record",
        ),
        step: failure.step,
      };
    case "closeout_validation_failed":
      return {
        ...createValidationStorageFeedbackError("closeout", "closeout", failure.error.reason),
        step: failure.step,
      };
    case "archive_save_failed":
    case "error_entry_save_failed":
    case "issue_card_save_failed": {
      const mapped = storageWriteErrorToFeedback("closeout", "closeout", failure.error);
      return {
        ...mapped,
        step: failure.step,
        completedWrites: failure.completedWrites,
        detail:
          failure.completedWrites.length > 0
            ? `${mapped.detail ?? ""}；已完成写入：${failure.completedWrites
                .map(labelCompletedWrite)
                .join("、")}`
            : mapped.detail,
      };
    }
  }
}

export function formatStorageFeedbackError(error: StorageFeedbackError): string {
  const detail = error.detail ? `：${error.detail}` : "";
  const retry = error.retryable ? "可重试" : "需先修正后再试";
  const step = error.step ? ` · 步骤=${error.step}` : "";
  const partial =
    error.completedWrites && error.completedWrites.length > 0
      ? ` · 已完成=${error.completedWrites.map(labelCompletedWrite).join("、")}`
      : "";
  return `${labelSurface(error.surface)}：${error.message}${detail}${step}${partial}（${retry}）`;
}
