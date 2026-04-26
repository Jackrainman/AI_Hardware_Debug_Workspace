import { z } from "zod";
import { IssueCardSchema, type IssueCard } from "../domain/schemas/issue-card.ts";
import {
  InvestigationRecordSchema,
  type InvestigationRecord,
} from "../domain/schemas/investigation-record.ts";

export const AiPromptTaskSchema = z.enum([
  "polish_closeout",
  "summarize_records",
  "suggest_prevention",
]);

export const AiCloseoutDraftSchema = z.object({
  category: z.string(),
  rootCause: z.string(),
  resolution: z.string(),
  prevention: z.string(),
});

export const AiPromptInputSchema = z.object({
  task: AiPromptTaskSchema,
  locale: z.literal("zh-CN"),
  issue: IssueCardSchema,
  records: z.array(InvestigationRecordSchema),
  closeoutDraft: AiCloseoutDraftSchema.optional(),
});

const SystemPromptMessageSchema = z.object({
  role: z.literal("system"),
  content: z.string().trim().min(1),
});

const UserPromptMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string().trim().min(1),
});

export const AiPromptTemplateSchema = z.object({
  task: AiPromptTaskSchema,
  outputSchemaName: z.literal("AiDraftOutput"),
  outputContract: z.string().trim().min(1),
  messages: z.tuple([SystemPromptMessageSchema, UserPromptMessageSchema]),
});

const DraftConfidenceSchema = z.enum(["low", "medium", "high"]);

const DraftOutputBaseSchema = z.object({
  draftOnly: z.literal(true),
  confidence: DraftConfidenceSchema,
  caveats: z.array(z.string()),
});

export const PolishCloseoutOutputSchema = DraftOutputBaseSchema.extend({
  task: z.literal("polish_closeout"),
  category: z.string().trim().min(1),
  rootCause: z.string().trim().min(1),
  resolution: z.string().trim().min(1),
  prevention: z.string().trim().min(1),
});

export const SummarizeRecordsOutputSchema = DraftOutputBaseSchema.extend({
  task: z.literal("summarize_records"),
  summary: z.string().trim().min(1),
  keySignals: z.array(z.string().trim().min(1)),
  unresolvedQuestions: z.array(z.string().trim().min(1)),
});

export const SuggestPreventionOutputSchema = DraftOutputBaseSchema.extend({
  task: z.literal("suggest_prevention"),
  prevention: z.string().trim().min(1),
  checklistItems: z.array(z.string().trim().min(1)),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
});

export const AiDraftOutputSchema = z.discriminatedUnion("task", [
  PolishCloseoutOutputSchema,
  SummarizeRecordsOutputSchema,
  SuggestPreventionOutputSchema,
]);

export type AiPromptTask = z.infer<typeof AiPromptTaskSchema>;
export type AiCloseoutDraft = z.infer<typeof AiCloseoutDraftSchema>;
export type AiPromptInput = z.infer<typeof AiPromptInputSchema>;
export type AiPromptTemplate = z.infer<typeof AiPromptTemplateSchema>;
export type AiDraftOutput = z.infer<typeof AiDraftOutputSchema>;

const SYSTEM_PROMPT = [
  "你是 ProbeFlash 的调试结案草稿助手。",
  "只根据用户提供的问题卡、排查记录和当前结案草稿生成中文草稿。",
  "不要编造没有出现在输入中的硬件事实、文件、提交、仪器结果或根因。",
  "输出只是草稿，不能声明已经写库、已经归档或已经执行修复。",
  "必须只返回符合 AiDraftOutput schema 的 JSON，不要返回 Markdown。",
].join("\n");

const TASK_INSTRUCTIONS: Record<AiPromptTask, string> = {
  polish_closeout:
    "优化现有结案字段的措辞，保留事实边界，补齐更清楚的 category / rootCause / resolution / prevention 草稿。",
  summarize_records:
    "把排查记录压缩成结案前可审阅的时间线总结，列出关键信号和仍未确认的问题。",
  suggest_prevention:
    "基于问题、排查记录和解决方案草稿生成预防建议，不要把建议写成已执行事实。",
};

const OUTPUT_CONTRACTS: Record<AiPromptTask, string> = {
  polish_closeout: JSON.stringify(
    {
      task: "polish_closeout",
      draftOnly: true,
      confidence: "low|medium|high",
      category: "non-empty string",
      rootCause: "non-empty string",
      resolution: "non-empty string",
      prevention: "non-empty string",
      caveats: ["string"],
    },
    null,
    2,
  ),
  summarize_records: JSON.stringify(
    {
      task: "summarize_records",
      draftOnly: true,
      confidence: "low|medium|high",
      summary: "non-empty string",
      keySignals: ["non-empty string"],
      unresolvedQuestions: ["non-empty string"],
      caveats: ["string"],
    },
    null,
    2,
  ),
  suggest_prevention: JSON.stringify(
    {
      task: "suggest_prevention",
      draftOnly: true,
      confidence: "low|medium|high",
      prevention: "non-empty string",
      checklistItems: ["non-empty string"],
      riskLevel: "low|medium|high|critical",
      caveats: ["string"],
    },
    null,
    2,
  ),
};

function normalizeCloseoutDraft(draft: AiCloseoutDraft | undefined): AiCloseoutDraft | undefined {
  if (!draft) return undefined;
  return {
    category: draft.category.trim(),
    rootCause: draft.rootCause.trim(),
    resolution: draft.resolution.trim(),
    prevention: draft.prevention.trim(),
  };
}

function sortRecords(records: InvestigationRecord[]): InvestigationRecord[] {
  return [...records].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
}

function formatList(values: string[]): string {
  if (values.length === 0) return "- (none)";
  return values.map((value) => `- ${value}`).join("\n");
}

function formatRecords(records: InvestigationRecord[]): string {
  if (records.length === 0) return "- (no investigation records)";
  return records
    .map((record) => {
      const text = record.polishedText || record.rawText || "(empty)";
      return `- ${record.createdAt} [${record.type}] ${text}`;
    })
    .join("\n");
}

function formatCloseoutDraft(draft: AiCloseoutDraft | undefined): string {
  if (!draft) return "(not provided)";
  return [
    `- category: ${draft.category || "(empty)"}`,
    `- rootCause: ${draft.rootCause || "(empty)"}`,
    `- resolution: ${draft.resolution || "(empty)"}`,
    `- prevention: ${draft.prevention || "(empty)"}`,
  ].join("\n");
}

function renderUserPrompt(input: AiPromptInput): string {
  return [
    `Task: ${input.task}`,
    `Instruction: ${TASK_INSTRUCTIONS[input.task]}`,
    "",
    "IssueCard:",
    `- id: ${input.issue.id}`,
    `- projectId: ${input.issue.projectId}`,
    `- title: ${input.issue.title}`,
    `- severity: ${input.issue.severity}`,
    `- status: ${input.issue.status}`,
    `- rawInput: ${input.issue.rawInput}`,
    `- normalizedSummary: ${input.issue.normalizedSummary}`,
    `- symptomSummary: ${input.issue.symptomSummary}`,
    "- suspectedDirections:",
    formatList(input.issue.suspectedDirections),
    "- suggestedActions:",
    formatList(input.issue.suggestedActions),
    "- relatedFiles:",
    formatList(input.issue.relatedFiles),
    "- relatedCommits:",
    formatList(input.issue.relatedCommits),
    "",
    "InvestigationRecords:",
    formatRecords(input.records),
    "",
    "CurrentCloseoutDraft:",
    formatCloseoutDraft(input.closeoutDraft),
    "",
    "OutputContract:",
    OUTPUT_CONTRACTS[input.task],
  ].join("\n");
}

export function buildAiPromptInput(
  task: AiPromptTask,
  issue: IssueCard,
  records: InvestigationRecord[],
  closeoutDraft?: AiCloseoutDraft,
): AiPromptInput {
  return AiPromptInputSchema.parse({
    task,
    locale: "zh-CN",
    issue,
    records: sortRecords(records),
    closeoutDraft: normalizeCloseoutDraft(closeoutDraft),
  });
}

export function buildAiPromptTemplate(input: AiPromptInput): AiPromptTemplate {
  const parsed = AiPromptInputSchema.parse(input);
  return AiPromptTemplateSchema.parse({
    task: parsed.task,
    outputSchemaName: "AiDraftOutput",
    outputContract: OUTPUT_CONTRACTS[parsed.task],
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: renderUserPrompt(parsed) },
    ],
  });
}
