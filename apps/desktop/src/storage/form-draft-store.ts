export interface FormDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type FormDraftScope = {
  workspaceId: string;
  formKind: string;
  itemId: string;
};

export type ReadFormDraftResult<T> =
  | { state: "unavailable"; data: null }
  | { state: "empty"; data: null }
  | { state: "invalid"; data: null }
  | { state: "restored"; data: T };

const FORM_DRAFT_KEY_PREFIX = "probeflash:form-draft:";

export function getBrowserFormDraftStorage(): FormDraftStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function formDraftStorageKey(scope: FormDraftScope): string {
  return [
    FORM_DRAFT_KEY_PREFIX,
    encodeURIComponent(scope.workspaceId),
    ":",
    encodeURIComponent(scope.formKind),
    ":",
    encodeURIComponent(scope.itemId),
  ].join("");
}

export function readFormDraft<T>(
  storage: FormDraftStorage | null,
  scope: FormDraftScope,
  parse: (value: unknown) => T | null,
): ReadFormDraftResult<T> {
  if (storage === null) return { state: "unavailable", data: null };
  try {
    const raw = storage.getItem(formDraftStorageKey(scope));
    if (raw === null) return { state: "empty", data: null };
    const parsed = parse(JSON.parse(raw));
    return parsed === null
      ? { state: "invalid", data: null }
      : { state: "restored", data: parsed };
  } catch {
    return { state: "invalid", data: null };
  }
}

export function writeFormDraft(
  storage: FormDraftStorage | null,
  scope: FormDraftScope,
  value: unknown,
): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(formDraftStorageKey(scope), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearFormDraft(storage: FormDraftStorage | null, scope: FormDraftScope): boolean {
  if (storage === null) return false;
  try {
    storage.removeItem(formDraftStorageKey(scope));
    return true;
  } catch {
    return false;
  }
}
