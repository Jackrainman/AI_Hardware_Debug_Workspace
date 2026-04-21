// apps/desktop/src/storage/archive-document-store.ts
// S2-A4：ArchiveDocument 本地存储。阶段内仍使用 localStorage，键前缀与其它实体隔离。
// D1-ARCHIVE-PERSIST-INDEX：新增 listArchiveDocuments()，供右侧归档区跨刷新读回累计归档与最近一次摘要。

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

export type ArchiveDocumentListInvalidEntry =
  | { kind: "parse_error"; key: string; fileName: string; message: string }
  | { kind: "validation_error"; key: string; fileName: string; issues: ZodIssue[] };

export interface ArchiveDocumentListResult {
  valid: ArchiveDocument[];
  invalid: ArchiveDocumentListInvalidEntry[];
}

function storageKey(fileName: string): string {
  return KEY_PREFIX + fileName;
}

function fileNameFromKey(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key.slice(KEY_PREFIX.length) : key;
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

export function listArchiveDocuments(): ArchiveDocumentListResult {
  const storage = window.localStorage;
  const valid: ArchiveDocument[] = [];
  const invalid: ArchiveDocumentListInvalidEntry[] = [];

  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key !== null && key.startsWith(KEY_PREFIX)) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    const fileName = fileNameFromKey(key);
    const raw = storage.getItem(key);
    if (raw === null) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      invalid.push({
        kind: "parse_error",
        key,
        fileName,
        message: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    const result = ArchiveDocumentSchema.safeParse(parsed);
    if (!result.success) {
      invalid.push({
        kind: "validation_error",
        key,
        fileName,
        issues: result.error.issues,
      });
      continue;
    }
    valid.push(result.data);
  }

  valid.sort((a, b) =>
    a.generatedAt < b.generatedAt ? 1 : a.generatedAt > b.generatedAt ? -1 : 0,
  );
  invalid.sort((a, b) => (a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0));

  return { valid, invalid };
}
