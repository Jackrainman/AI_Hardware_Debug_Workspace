import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  clearFormDraft,
  formDraftStorageKey,
  readFormDraft,
  type FormDraftStorage,
  writeFormDraft,
} from "../src/storage/form-draft-store.ts";

class MemoryDraftStorage implements FormDraftStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

interface LocalStorageShape extends FormDraftStorage {
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

function makeLocalStoragePolyfill(): LocalStorageShape {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

(globalThis as unknown as { window: { localStorage: LocalStorageShape } }).window = {
  localStorage: makeLocalStoragePolyfill(),
};

function fail(reason: string, detail?: unknown): never {
  console.error(`[CORE-CLOSEOUT-CONTINUATION-UX verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

const storage = new MemoryDraftStorage();
const scope = { workspaceId: "workspace-26-r1", formKind: "closeout", itemId: "issue-continuation" };
const key = formDraftStorageKey(scope);
if (!key.includes("workspace-26-r1") || !key.includes("closeout") || !key.includes("issue-continuation")) {
  fail("form draft key should be scoped by workspace, form kind and item id", key);
}

const draft = {
  category: "boot",
  rootCause: "pending root cause",
  resolution: "pending fix",
  prevention: "pending checklist",
};
if (!writeFormDraft(storage, scope, draft)) {
  fail("form draft should write to available storage");
}
const readBack = readFormDraft(storage, scope, (value) => {
  if (typeof value !== "object" || value === null) return null;
  return value as typeof draft;
});
if (readBack.state !== "restored" || readBack.data.rootCause !== draft.rootCause) {
  fail("form draft should restore saved value", readBack);
}
if (!clearFormDraft(storage, scope)) {
  fail("form draft should clear from storage");
}
if (readFormDraft(storage, scope, () => draft).state !== "empty") {
  fail("cleared form draft should read as empty");
}

const appSource = readFileSync(resolve(process.cwd(), "src", "App.tsx"), "utf8");
const closeoutSource = readFileSync(
  resolve(process.cwd(), "src", "components", "closeout", "CloseoutForm.tsx"),
  "utf8",
);
const investigationSource = readFileSync(
  resolve(process.cwd(), "src", "components", "investigation", "InvestigationComponents.tsx"),
  "utf8",
);
const issueEntrySource = readFileSync(
  resolve(process.cwd(), "src", "components", "issue", "IssueEntryComponents.tsx"),
  "utf8",
);
for (const expected of [
  "clearFormDraft",
  "closeout-form-draft-state",
  "investigation-form-draft-state",
  "quick-issue-draft-status",
  "issue-intake-draft-status",
]) {
  const source = [appSource, closeoutSource, investigationSource, issueEntrySource].join("\n");
  if (!source.includes(expected)) {
    fail(`UI source should contain form draft marker: ${expected}`);
  }
}

console.log("[CORE-CLOSEOUT-CONTINUATION-UX verify] PASS: form drafts write, restore and clear by scoped key");
console.log("[CORE-CLOSEOUT-CONTINUATION-UX verify] PASS: UI exposes local draft persistence markers");
