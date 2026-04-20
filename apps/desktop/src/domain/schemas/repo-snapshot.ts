import { z } from "zod";

export const ChangedFileStatus = z.enum([
  "added",
  "modified",
  "deleted",
  "renamed",
  "untracked",
]);

export const ChangedFileSchema = z.object({
  path: z.string().min(1),
  status: ChangedFileStatus,
});

export const RecentCommitSchema = z.object({
  hash: z.string().min(1),
  author: z.string(),
  message: z.string(),
  timestamp: z.string().datetime({ offset: true }),
});

export const RepoSnapshotSchema = z.object({
  branch: z.string().min(1),
  headCommitHash: z.string().min(1),
  headCommitMessage: z.string(),
  hasUncommittedChanges: z.boolean(),
  changedFiles: z.array(ChangedFileSchema),
  recentCommits: z.array(RecentCommitSchema),
  capturedAt: z.string().datetime({ offset: true }),
});

export type ChangedFile = z.infer<typeof ChangedFileSchema>;
export type RecentCommit = z.infer<typeof RecentCommitSchema>;
export type RepoSnapshot = z.infer<typeof RepoSnapshotSchema>;
