// apps/desktop/src/storage/error-entry-store.ts
// S2-A4：ErrorEntry 本地存储。相当于 MVP 阶段的 localStorage error-table 条目。

import type { ZodIssue } from "zod";
import { ErrorEntrySchema, type ErrorEntry } from "../domain/schemas/error-entry.ts";

const KEY_PREFIX = "repo-debug:error-entry:";

export type LoadErrorEntryError =
  | { kind: "not_found"; id: string }
  | { kind: "parse_error"; id: string; message: string }
  | { kind: "validation_error"; id: string; issues: ZodIssue[] };

export type LoadErrorEntryResult =
  | { ok: true; entry: ErrorEntry }
  | { ok: false; error: LoadErrorEntryError };

function storageKey(id: string): string {
  return KEY_PREFIX + id;
}

export function saveErrorEntry(entry: ErrorEntry): void {
  window.localStorage.setItem(storageKey(entry.id), JSON.stringify(entry));
}

export function loadErrorEntry(id: string): LoadErrorEntryResult {
  const raw = window.localStorage.getItem(storageKey(id));
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
