import type { ZodIssue } from "zod";
import { IssueCardSchema, type IssueCard } from "../domain/schemas/issue-card.ts";

const KEY_PREFIX = "repo-debug:issue-card:";

export type LoadIssueCardError =
  | { kind: "not_found"; id: string }
  | { kind: "parse_error"; id: string; message: string }
  | { kind: "validation_error"; id: string; issues: ZodIssue[] };

export type LoadIssueCardResult =
  | { ok: true; card: IssueCard }
  | { ok: false; error: LoadIssueCardError };

function storageKey(id: string): string {
  return KEY_PREFIX + id;
}

export function saveIssueCard(card: IssueCard): void {
  window.localStorage.setItem(storageKey(card.id), JSON.stringify(card));
}

export function loadIssueCard(id: string): LoadIssueCardResult {
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
  const result = IssueCardSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: { kind: "validation_error", id, issues: result.error.issues },
    };
  }
  return { ok: true, card: result.data };
}
