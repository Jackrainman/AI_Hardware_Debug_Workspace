import { z } from "zod";

export const InvestigationRecordType = z.enum([
  "observation",
  "hypothesis",
  "action",
  "result",
  "conclusion",
  "note",
]);

export const InvestigationRecordSchema = z.object({
  id: z.string().min(1),
  issueId: z.string().min(1),
  type: InvestigationRecordType,
  rawText: z.string(),
  polishedText: z.string(),
  aiExtractedSignals: z.array(z.string()),
  linkedFiles: z.array(z.string()),
  linkedCommits: z.array(z.string()),
  createdAt: z.string().datetime({ offset: true }),
});

export type InvestigationRecord = z.infer<typeof InvestigationRecordSchema>;
