import type { ZodIssue } from "zod";

export type StorageEntity =
  | "issue_card"
  | "investigation_record"
  | "archive_document"
  | "error_entry";

export interface StorageErrorConnection {
  state: "degraded" | "unreachable";
  reason: string;
  checkedAt: string;
}

export interface StorageReadError {
  kind: "read_failed";
  code: "read_failed" | "server_unreachable" | "timeout" | "not_found";
  entity: StorageEntity;
  target: string;
  message: string;
  connection?: StorageErrorConnection;
}

export type StorageWriteError =
  | {
      kind: "validation_failed";
      code: "validation_failed";
      entity: StorageEntity;
      target: string;
      message: string;
      issues: ZodIssue[];
      connection?: StorageErrorConnection;
    }
  | {
      kind: "serialize_failed";
      code: "serialize_failed";
      entity: StorageEntity;
      target: string;
      message: string;
      connection?: StorageErrorConnection;
    }
  | {
      kind: "unexpected_write_error";
      code: "unexpected_write_error";
      entity: StorageEntity;
      target: string;
      message: string;
      connection?: StorageErrorConnection;
    }
  | {
      kind: "server_unreachable";
      code: "server_unreachable";
      entity: StorageEntity;
      target: string;
      message: string;
      connection: StorageErrorConnection;
    }
  | {
      kind: "timeout";
      code: "timeout";
      entity: StorageEntity;
      target: string;
      message: string;
      connection: StorageErrorConnection;
    }
  | {
      kind: "conflict";
      code: "conflict";
      entity: StorageEntity;
      target: string;
      message: string;
      connection?: StorageErrorConnection;
    }
  | {
      kind: "not_found";
      code: "not_found";
      entity: StorageEntity;
      target: string;
      message: string;
      connection?: StorageErrorConnection;
    };

export type StorageWriteResult = { ok: true } | { ok: false; error: StorageWriteError };

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return fallback;
}

export function createDegradedConnection(reason: string, checkedAt: string): StorageErrorConnection {
  return {
    state: "degraded",
    reason,
    checkedAt,
  };
}

export function createUnreachableConnection(
  reason: string,
  checkedAt: string,
): StorageErrorConnection {
  return {
    state: "unreachable",
    reason,
    checkedAt,
  };
}

export function createReadFailed(
  entity: StorageEntity,
  target: string,
  error: unknown,
  connection?: StorageErrorConnection,
): StorageReadError {
  return {
    kind: "read_failed",
    code: "read_failed",
    entity,
    target,
    message: normalizeErrorMessage(error, `${entity} read failed`),
    connection,
  };
}

export function createServerUnreachableReadError(
  entity: StorageEntity,
  target: string,
  reason: string,
  checkedAt: string,
): StorageReadError {
  return {
    kind: "read_failed",
    code: "server_unreachable",
    entity,
    target,
    message: reason,
    connection: createUnreachableConnection(reason, checkedAt),
  };
}

export function createTimeoutReadError(
  entity: StorageEntity,
  target: string,
  reason: string,
  checkedAt: string,
): StorageReadError {
  return {
    kind: "read_failed",
    code: "timeout",
    entity,
    target,
    message: reason,
    connection: createDegradedConnection(reason, checkedAt),
  };
}

export function createNotFoundReadError(
  entity: StorageEntity,
  target: string,
  reason: string,
): StorageReadError {
  return {
    kind: "read_failed",
    code: "not_found",
    entity,
    target,
    message: reason,
  };
}

export function createValidationFailed(
  entity: StorageEntity,
  target: string,
  issues: ZodIssue[],
): StorageWriteError {
  return {
    kind: "validation_failed",
    code: "validation_failed",
    entity,
    target,
    message: `${entity} schema validation failed before write`,
    issues,
  };
}

export function createRemoteValidationFailed(
  entity: StorageEntity,
  target: string,
  message: string,
  connection?: StorageErrorConnection,
): StorageWriteError {
  return {
    kind: "validation_failed",
    code: "validation_failed",
    entity,
    target,
    message: normalizeErrorMessage(message, `${entity} remote validation failed`),
    issues: [],
    connection,
  };
}

export function createSerializeFailed(
  entity: StorageEntity,
  target: string,
  error: unknown,
): StorageWriteError {
  return {
    kind: "serialize_failed",
    code: "serialize_failed",
    entity,
    target,
    message: normalizeErrorMessage(error, `${entity} serialization failed`),
  };
}

export function createUnexpectedWriteError(
  entity: StorageEntity,
  target: string,
  error: unknown,
  connection?: StorageErrorConnection,
): StorageWriteError {
  return {
    kind: "unexpected_write_error",
    code: "unexpected_write_error",
    entity,
    target,
    message: normalizeErrorMessage(error, `${entity} write failed`),
    connection,
  };
}

export function createServerUnreachableWriteError(
  entity: StorageEntity,
  target: string,
  reason: string,
  checkedAt: string,
): StorageWriteError {
  return {
    kind: "server_unreachable",
    code: "server_unreachable",
    entity,
    target,
    message: reason,
    connection: createUnreachableConnection(reason, checkedAt),
  };
}

export function createTimeoutWriteError(
  entity: StorageEntity,
  target: string,
  reason: string,
  checkedAt: string,
): StorageWriteError {
  return {
    kind: "timeout",
    code: "timeout",
    entity,
    target,
    message: reason,
    connection: createDegradedConnection(reason, checkedAt),
  };
}

export function createConflictWriteError(
  entity: StorageEntity,
  target: string,
  reason: string,
): StorageWriteError {
  return {
    kind: "conflict",
    code: "conflict",
    entity,
    target,
    message: reason,
  };
}

export function createNotFoundWriteError(
  entity: StorageEntity,
  target: string,
  reason: string,
): StorageWriteError {
  return {
    kind: "not_found",
    code: "not_found",
    entity,
    target,
    message: reason,
  };
}

export function storageWriteOk(): StorageWriteResult {
  return { ok: true };
}
