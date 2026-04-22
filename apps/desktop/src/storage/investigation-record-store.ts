// apps/desktop/src/storage/investigation-record-store.ts
// S2-A3：InvestigationRecord 本地存储。独立前缀 `repo-debug:investigation-record:<recordId>`，
// 与 `repo-debug:issue-card:` 完全隔离；list 通过 issueId 外键过滤。
// 读盘必走 safeParse，JSON / schema 异常路由到结构化 invalid 桶。

import type { ZodIssue } from "zod";
import {
  InvestigationRecordSchema,
  type InvestigationRecord,
} from "../domain/schemas/investigation-record.ts";
import { localStorageAdapter } from "./local-storage-adapter.ts";

const KEY_PREFIX = "repo-debug:investigation-record:";

export type InvestigationRecordListInvalidEntry =
  | { kind: "parse_error"; key: string; id: string; message: string }
  | { kind: "validation_error"; key: string; id: string; issues: ZodIssue[] };

export interface InvestigationRecordListResult {
  valid: InvestigationRecord[];
  invalid: InvestigationRecordListInvalidEntry[];
}

function storageKey(id: string): string {
  return KEY_PREFIX + id;
}

function idFromKey(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key.slice(KEY_PREFIX.length) : key;
}

export function saveInvestigationRecord(record: InvestigationRecord): void {
  localStorageAdapter.setItem(storageKey(record.id), JSON.stringify(record));
}

export function listInvestigationRecordsByIssueId(
  issueId: string,
): InvestigationRecordListResult {
  const valid: InvestigationRecord[] = [];
  const invalid: InvestigationRecordListInvalidEntry[] = [];
  const keys = localStorageAdapter.listKeys(KEY_PREFIX);

  for (const key of keys) {
    const id = idFromKey(key);
    const raw = localStorageAdapter.getItem(key);
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
    const result = InvestigationRecordSchema.safeParse(parsed);
    if (!result.success) {
      invalid.push({
        kind: "validation_error",
        key,
        id,
        issues: result.error.issues,
      });
      continue;
    }
    if (result.data.issueId !== issueId) continue;
    valid.push(result.data);
  }

  valid.sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );

  return { valid, invalid };
}
