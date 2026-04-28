import type { IssueCard } from "../domain/schemas/issue-card.ts";

function normalizeIssueId(issueId: string): string {
  return issueId.trim();
}

function uniqueIssueIds(issueIds: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const issueId of issueIds) {
    const normalized = normalizeIssueId(issueId);
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

export function addRelatedHistoricalIssue(
  card: IssueCard,
  historicalIssueId: string,
  updatedAt: string,
): IssueCard {
  const normalized = normalizeIssueId(historicalIssueId);
  const current = uniqueIssueIds(card.relatedHistoricalIssueIds ?? []);
  if (normalized.length === 0 || normalized === card.id || current.includes(normalized)) {
    return { ...card, relatedHistoricalIssueIds: current };
  }
  return {
    ...card,
    relatedHistoricalIssueIds: [...current, normalized],
    updatedAt,
  };
}

export function removeRelatedHistoricalIssue(
  card: IssueCard,
  historicalIssueId: string,
  updatedAt: string,
): IssueCard {
  const normalized = normalizeIssueId(historicalIssueId);
  const next = uniqueIssueIds(card.relatedHistoricalIssueIds ?? []).filter(
    (issueId) => issueId !== normalized,
  );
  if (next.length === card.relatedHistoricalIssueIds.length) {
    return { ...card, relatedHistoricalIssueIds: next };
  }
  return {
    ...card,
    relatedHistoricalIssueIds: next,
    updatedAt,
  };
}
