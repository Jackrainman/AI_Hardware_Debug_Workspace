import { z } from "zod";

export const ArchiveGeneratedBy = z.enum(["ai", "manual", "hybrid"]);

export const ArchiveFileNamePattern = /^\d{4}-\d{2}-\d{2}_[a-z0-9-]+\.md$/;

export const ArchiveDocumentSchema = z.object({
  issueId: z.string().min(1),
  projectId: z.string().min(1),
  fileName: z
    .string()
    .regex(ArchiveFileNamePattern, "fileName must match YYYY-MM-DD_<slug>.md"),
  filePath: z.string().min(1),
  markdownContent: z.string(),
  generatedBy: ArchiveGeneratedBy,
  generatedAt: z.string().datetime({ offset: true }),
});

export type ArchiveDocument = z.infer<typeof ArchiveDocumentSchema>;
