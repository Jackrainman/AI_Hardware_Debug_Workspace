import type { z, ZodIssue } from "zod";
import {
  IssueCardSchema,
  IssueSeverity,
  IssueStatus,
  type IssueCard,
} from "../domain/schemas/issue-card.ts";
import { persistValidatedEntity } from "./local-storage-store-helpers.ts";
import { localStorageAdapter } from "./local-storage-adapter.ts";
import {
  createReadFailed,
  type StorageReadError,
  type StorageWriteResult,
} from "./storage-result.ts";

const KEY_PREFIX = "repo-debug:issue-card:";

export type LoadIssueCardError =
  | { kind: "not_found"; id: string }
  | { kind: "parse_error"; id: string; message: string }
  | { kind: "validation_error"; id: string; issues: ZodIssue[] }
  | StorageReadError;

export type LoadIssueCardResult =
  | { ok: true; card: IssueCard }
  | { ok: false; error: LoadIssueCardError };

export interface IssueCardSummary {
  id: string;
  title: string;
  severity: z.infer<typeof IssueSeverity>;
  status: z.infer<typeof IssueStatus>;
  createdAt: string;
  updatedAt: string;
}

export type IssueCardListInvalidEntry =
  | { kind: "parse_error"; key: string; id: string; message: string }
  | { kind: "validation_error"; key: string; id: string; issues: ZodIssue[] };

export interface IssueCardListResult {
  valid: IssueCardSummary[];
  invalid: IssueCardListInvalidEntry[];
  readError: StorageReadError | null;
}

function storageKey(id: string): string {
  return KEY_PREFIX + id;
}

function idFromKey(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key.slice(KEY_PREFIX.length) : key;
}

function toSummary(card: IssueCard): IssueCardSummary {
  return {
    id: card.id,
    title: card.title,
    severity: card.severity,
    status: card.status,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

export function saveIssueCard(card: IssueCard): StorageWriteResult {
  return persistValidatedEntity({
    entity: "issue_card",
    target: card.id,
    key: storageKey(card.id),
    value: card,
    schema: IssueCardSchema,
  });
}

export function loadIssueCard(id: string): LoadIssueCardResult {
  let raw: string | null;
  try {
    raw = localStorageAdapter.getItem(storageKey(id));
  } catch (error) {
    return {
      ok: false,
      error: createReadFailed("issue_card", id, error),
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
  const result = IssueCardSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: { kind: "validation_error", id, issues: result.error.issues },
    };
  }
  return { ok: true, card: result.data };
}

export function listIssueCards(): IssueCardListResult {
  const valid: IssueCardSummary[] = [];
  const invalid: IssueCardListInvalidEntry[] = [];
  let keys: string[];
  try {
    keys = localStorageAdapter.listKeys(KEY_PREFIX);
  } catch (error) {
    return {
      valid,
      invalid,
      readError: createReadFailed("issue_card", KEY_PREFIX, error),
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
        readError: createReadFailed("issue_card", key, error),
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
    const result = IssueCardSchema.safeParse(parsed);
    if (!result.success) {
      invalid.push({
        kind: "validation_error",
        key,
        id,
        issues: result.error.issues,
      });
      continue;
    }
    valid.push(toSummary(result.data));
  }

  valid.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  invalid.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return { valid, invalid, readError: null };
}
