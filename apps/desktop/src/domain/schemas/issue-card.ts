import { z } from "zod";
import { RepoSnapshotSchema } from "./repo-snapshot.ts";

export const IssueSeverity = z.enum(["low", "medium", "high", "critical"]);

export const IssueStatus = z.enum([
  "open",
  "investigating",
  "resolved",
  "archived",
  "needs_manual_review",
]);

export const IssueCardSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  rawInput: z.string(),
  normalizedSummary: z.string(),
  symptomSummary: z.string(),
  suspectedDirections: z.array(z.string()),
  suggestedActions: z.array(z.string()),
  status: IssueStatus,
  severity: IssueSeverity,
  tags: z.array(z.string()),
  repoSnapshot: RepoSnapshotSchema,
  relatedFiles: z.array(z.string()),
  relatedCommits: z.array(z.string()),
  relatedHistoricalIssueIds: z.array(z.string()),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type IssueCard = z.infer<typeof IssueCardSchema>;
