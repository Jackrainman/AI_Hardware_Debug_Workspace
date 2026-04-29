import type { IssueCard } from "../domain/schemas/issue-card.ts";

export interface RecentIssueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type RecentIssueReopenState =
  | { state: "checking" }
  | { state: "none" }
  | { state: "restored"; issueId: string }
  | { state: "recorded"; issueId: string }
  | { state: "missing"; issueId: string }
  | { state: "archived"; issueId: string }
  | { state: "unavailable" };

export type RecentIssueCandidate = Pick<IssueCard, "id" | "status">;

export const RECENT_ISSUE_STORAGE_KEY_PREFIX = "probeflash:recent-active-issue:";

export function getBrowserRecentIssueStorage(): RecentIssueStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function recentIssueStorageKey(workspaceId: string): string {
  return `${RECENT_ISSUE_STORAGE_KEY_PREFIX}${encodeURIComponent(workspaceId)}`;
}

export function readRecentIssueIdForWorkspace(
  storage: RecentIssueStorage | null,
  workspaceId: string,
): string | null {
  if (storage === null) return null;
  try {
    const raw = storage.getItem(recentIssueStorageKey(workspaceId));
    const issueId = raw?.trim() ?? "";
    return issueId.length > 0 ? issueId : null;
  } catch {
    return null;
  }
}

export function writeRecentIssueIdForWorkspace(
  storage: RecentIssueStorage | null,
  workspaceId: string,
  issueId: string,
): boolean {
  if (storage === null) return false;
  const normalizedIssueId = issueId.trim();
  if (normalizedIssueId.length === 0) return false;
  try {
    storage.setItem(recentIssueStorageKey(workspaceId), normalizedIssueId);
    return true;
  } catch {
    return false;
  }
}

export function clearRecentIssueIdForWorkspace(
  storage: RecentIssueStorage | null,
  workspaceId: string,
): boolean {
  if (storage === null) return false;
  try {
    storage.removeItem(recentIssueStorageKey(workspaceId));
    return true;
  } catch {
    return false;
  }
}

export function isRecentIssueReopenableStatus(status: IssueCard["status"]): boolean {
  return status !== "archived";
}

export function rememberRecentIssueForReopen(
  storage: RecentIssueStorage | null,
  workspaceId: string,
  issue: RecentIssueCandidate,
): RecentIssueReopenState {
  if (!isRecentIssueReopenableStatus(issue.status)) {
    clearRecentIssueIdForWorkspace(storage, workspaceId);
    return { state: "archived", issueId: issue.id };
  }
  return writeRecentIssueIdForWorkspace(storage, workspaceId, issue.id)
    ? { state: "recorded", issueId: issue.id }
    : { state: "unavailable" };
}

export function resolveRecentIssueReopen(
  storage: RecentIssueStorage | null,
  workspaceId: string,
  candidates: RecentIssueCandidate[],
): { state: RecentIssueReopenState; issueIdToOpen: string | null } {
  if (storage === null) {
    return { state: { state: "unavailable" }, issueIdToOpen: null };
  }
  const issueId = readRecentIssueIdForWorkspace(storage, workspaceId);
  if (issueId === null) {
    return { state: { state: "none" }, issueIdToOpen: null };
  }
  const candidate = candidates.find((item) => item.id === issueId);
  if (candidate === undefined) {
    clearRecentIssueIdForWorkspace(storage, workspaceId);
    return { state: { state: "missing", issueId }, issueIdToOpen: null };
  }
  if (!isRecentIssueReopenableStatus(candidate.status)) {
    clearRecentIssueIdForWorkspace(storage, workspaceId);
    return { state: { state: "archived", issueId }, issueIdToOpen: null };
  }
  return { state: { state: "restored", issueId }, issueIdToOpen: issueId };
}
