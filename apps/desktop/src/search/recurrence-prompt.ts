import type { SimilarIssueMatch, SimilarIssuesResult } from "./similar-issues.ts";

export interface RecurrencePrompt {
  issueId: string;
  title: string;
  score: number;
  tags: string[];
  reasons: string[];
  rootCauseSummary?: string;
  resolutionSummary?: string;
  errorCode?: string;
}

export const RECURRENCE_PROMPT_SCORE_THRESHOLD = 10;

function toPrompt(match: SimilarIssueMatch): RecurrencePrompt {
  return {
    issueId: match.issueId,
    title: match.title,
    score: match.score,
    tags: match.tags,
    reasons: match.reasons,
    rootCauseSummary: match.rootCauseSummary,
    resolutionSummary: match.resolutionSummary,
    errorCode: match.errorCode,
  };
}

export function buildRecurrencePrompt(
  similarIssues: SimilarIssuesResult | null,
  ignoredIssueIds: string[] = [],
  threshold = RECURRENCE_PROMPT_SCORE_THRESHOLD,
): RecurrencePrompt | null {
  if (similarIssues === null || similarIssues.readError !== null) {
    return null;
  }
  const ignored = new Set(ignoredIssueIds);
  const match = similarIssues.items.find(
    (item) => item.score >= threshold && !ignored.has(item.issueId),
  );
  return match ? toPrompt(match) : null;
}
