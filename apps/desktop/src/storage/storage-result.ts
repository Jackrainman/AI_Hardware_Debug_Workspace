import type { ZodIssue } from "zod";

export type StorageEntity =
  | "issue_card"
  | "investigation_record"
  | "archive_document"
  | "error_entry";

export interface StorageReadError {
  kind: "read_failed";
  code: "read_failed";
  entity: StorageEntity;
  target: string;
  message: string;
}

export type StorageWriteError =
  | {
      kind: "validation_failed";
      code: "validation_failed";
      entity: StorageEntity;
      target: string;
      message: string;
      issues: ZodIssue[];
    }
  | {
      kind: "serialize_failed";
      code: "serialize_failed";
      entity: StorageEntity;
      target: string;
      message: string;
    }
  | {
      kind: "unexpected_write_error";
      code: "unexpected_write_error";
      entity: StorageEntity;
      target: string;
      message: string;
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

export function createReadFailed(
  entity: StorageEntity,
  target: string,
  error: unknown,
): StorageReadError {
  return {
    kind: "read_failed",
    code: "read_failed",
    entity,
    target,
    message: normalizeErrorMessage(error, `${entity} read failed`),
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
): StorageWriteError {
  return {
    kind: "unexpected_write_error",
    code: "unexpected_write_error",
    entity,
    target,
    message: normalizeErrorMessage(error, `${entity} write failed`),
  };
}

export function storageWriteOk(): StorageWriteResult {
  return { ok: true };
}
