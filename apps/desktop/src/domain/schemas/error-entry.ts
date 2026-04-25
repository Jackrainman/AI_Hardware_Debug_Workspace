import { z } from "zod";

export const ErrorCodePattern = /^DBG-\d{8}-\d{3}$/;

export const ErrorEntrySchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  sourceIssueId: z.string().min(1),
  errorCode: z
    .string()
    .regex(ErrorCodePattern, "errorCode must match DBG-YYYYMMDD-NNN"),
  title: z.string().min(1),
  category: z.string(),
  symptom: z.string(),
  rootCause: z.string(),
  resolution: z.string(),
  prevention: z.string().trim().min(1),
  relatedFiles: z.array(z.string()),
  relatedCommits: z.array(z.string()),
  archiveFilePath: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ErrorEntry = z.infer<typeof ErrorEntrySchema>;
