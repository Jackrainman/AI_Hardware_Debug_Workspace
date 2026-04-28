import { buildIssueCardFromIntake, defaultIntakeOptions } from "../src/domain/issue-intake.ts";
import type { IssueCard } from "../src/domain/schemas/issue-card.ts";

export interface SearchVerifyLocalStorageShape {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export const SEARCH_VERIFY_WORKSPACE_ID = "workspace-26-r1";

export function makeSearchVerifyLocalStorage(): SearchVerifyLocalStorageShape {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
  };
}

export function installSearchVerifyLocalStorage(): void {
  (globalThis as unknown as { window: { localStorage: SearchVerifyLocalStorageShape } }).window = {
    localStorage: makeSearchVerifyLocalStorage(),
  };
}

export function buildSearchIssue(input: {
  workspaceId: string;
  id: string;
  title: string;
  description: string;
  tags: string[];
  now: string;
  status?: IssueCard["status"];
}): IssueCard {
  const result = buildIssueCardFromIntake(
    {
      title: input.title,
      description: input.description,
      severity: "medium",
      tags: input.tags,
    },
    defaultIntakeOptions(input.now, input.id, input.workspaceId),
  );
  if (!result.ok) {
    throw new Error(`issue fixture should build: ${JSON.stringify(result)}`);
  }
  return { ...result.card, status: input.status ?? "open", updatedAt: input.now };
}
