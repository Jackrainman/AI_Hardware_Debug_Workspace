// apps/desktop/src/storage/error-entry-store.ts
// S2-A4：ErrorEntry 本地存储。相当于 MVP 阶段的 localStorage error-table 条目。
// D1-ARCHIVE-PERSIST-INDEX：新增 listErrorEntries()，让归档抽屉列表能展示 errorCode / category / 来源问题。

import type { ZodIssue } from "zod";
import { ErrorEntrySchema, type ErrorEntry } from "../domain/schemas/error-entry.ts";
import { persistValidatedEntity } from "./local-storage-store-helpers.ts";
import { localStorageAdapter } from "./local-storage-adapter.ts";
import {
  createReadFailed,
  type StorageReadError,
  type StorageWriteResult,
} from "./storage-result.ts";

const KEY_PREFIX = "repo-debug:error-entry:";

export type LoadErrorEntryError =
  | { kind: "not_found"; id: string }
  | { kind: "parse_error"; id: string; message: string }
  | { kind: "validation_error"; id: string; issues: ZodIssue[] }
  | StorageReadError;

export type LoadErrorEntryResult =
  | { ok: true; entry: ErrorEntry }
  | { ok: false; error: LoadErrorEntryError };

export type ErrorEntryListInvalidEntry =
  | { kind: "parse_error"; key: string; id: string; message: string }
  | { kind: "validation_error"; key: string; id: string; issues: ZodIssue[] };

export interface ErrorEntryListResult {
  valid: ErrorEntry[];
  invalid: ErrorEntryListInvalidEntry[];
  readError: StorageReadError | null;
}

function storageKey(id: string): string {
  return KEY_PREFIX + id;
}

function idFromKey(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key.slice(KEY_PREFIX.length) : key;
}

export function saveErrorEntry(entry: ErrorEntry): StorageWriteResult {
  return persistValidatedEntity({
    entity: "error_entry",
    target: entry.id,
    key: storageKey(entry.id),
    value: entry,
    schema: ErrorEntrySchema,
  });
}

export function loadErrorEntry(id: string): LoadErrorEntryResult {
  let raw: string | null;
  try {
    raw = localStorageAdapter.getItem(storageKey(id));
  } catch (error) {
    return {
      ok: false,
      error: createReadFailed("error_entry", id, error),
    };
  }
  if (raw === null) {
    return { ok: false, error: { kind: "not_found", id } };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "parse_error",
        id,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
  const result = ErrorEntrySchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: { kind: "validation_error", id, issues: result.error.issues },
    };
  }
  return { ok: true, entry: result.data };
}

export function listErrorEntries(): ErrorEntryListResult {
  const valid: ErrorEntry[] = [];
  const invalid: ErrorEntryListInvalidEntry[] = [];
  let keys: string[];
  try {
    keys = localStorageAdapter.listKeys(KEY_PREFIX);
  } catch (error) {
    return {
      valid,
      invalid,
      readError: createReadFailed("error_entry", KEY_PREFIX, error),
    };
  }

  for (const key of keys) {
    const id = idFromKey(key);
    let raw: string | null;
    try {
      raw = localStorageAdapter.getItem(key);
    } catch (error) {
      return {
        valid,
        invalid,
        readError: createReadFailed("error_entry", key, error),
      };
    }
    if (raw === null) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      invalid.push({
        kind: "parse_error",
        key,
        id,
        message: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    const result = ErrorEntrySchema.safeParse(parsed);
    if (!result.success) {
      invalid.push({
        kind: "validation_error",
        key,
        id,
        issues: result.error.issues,
      });
      continue;
    }
    valid.push(result.data);
  }

  valid.sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
  invalid.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return { valid, invalid, readError: null };
}
