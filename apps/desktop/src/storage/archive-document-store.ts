// apps/desktop/src/storage/archive-document-store.ts
// S2-A4：ArchiveDocument 本地存储。阶段内仍使用 localStorage，键前缀与其它实体隔离。

import type { ZodIssue } from "zod";
import {
  ArchiveDocumentSchema,
  type ArchiveDocument,
} from "../domain/schemas/archive-document.ts";

const KEY_PREFIX = "repo-debug:archive-document:";

export type LoadArchiveDocumentError =
  | { kind: "not_found"; fileName: string }
  | { kind: "parse_error"; fileName: string; message: string }
  | { kind: "validation_error"; fileName: string; issues: ZodIssue[] };

export type LoadArchiveDocumentResult =
  | { ok: true; document: ArchiveDocument }
  | { ok: false; error: LoadArchiveDocumentError };

function storageKey(fileName: string): string {
  return KEY_PREFIX + fileName;
}

export function saveArchiveDocument(document: ArchiveDocument): void {
  window.localStorage.setItem(storageKey(document.fileName), JSON.stringify(document));
}

export function loadArchiveDocument(fileName: string): LoadArchiveDocumentResult {
  const raw = window.localStorage.getItem(storageKey(fileName));
  if (raw === null) {
    return { ok: false, error: { kind: "not_found", fileName } };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "parse_error",
        fileName,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
  const result = ArchiveDocumentSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: { kind: "validation_error", fileName, issues: result.error.issues },
    };
  }
  return { ok: true, document: result.data };
}
