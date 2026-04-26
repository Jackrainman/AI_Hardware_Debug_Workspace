import { buildCloseoutFromIssue, defaultCloseoutOptions } from "../src/domain/closeout.ts";
import type { InvestigationRecord } from "../src/domain/schemas/investigation-record.ts";
import type { IssueCard } from "../src/domain/schemas/issue-card.ts";
import {
  AiDraftOutputSchema,
  AiPromptInputSchema,
  buildAiPromptInput,
  buildAiPromptTemplate,
} from "../src/ai/prompt-templates.ts";

function fail(reason: string, detail?: unknown): never {
  console.error(`[AI-READY-PROMPT-TEMPLATE-SYSTEM verify] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

const issue: IssueCard = {
  id: "issue-ai-ready-uart",
  projectId: "workspace-26-r1",
  title: "UART boot log stuck at 0x40",
  rawInput: "Boot log stops after ROM banner on UART0.",
  normalizedSummary: "UART boot log stops after ROM banner",
  symptomSummary: "UART0 prints ROM banner and then no further boot messages.",
  suspectedDirections: ["weak pull-up", "boot strap sampling"],
  suggestedActions: ["measure UART RX pull-up", "compare strap resistor values"],
  status: "investigating",
  severity: "high",
  tags: ["uart", "boot"],
  repoSnapshot: {
    branch: "master",
    headCommitHash: "0000000000000000000000000000000000000000",
    headCommitMessage: "verify fixture",
    hasUncommittedChanges: false,
    changedFiles: [],
    recentCommits: [],
    capturedAt: "2026-04-26T11:00:00+08:00",
  },
  relatedFiles: ["boards/r1/uart.c"],
  relatedCommits: ["abc1234"],
  relatedHistoricalIssueIds: [],
  createdAt: "2026-04-26T10:00:00+08:00",
  updatedAt: "2026-04-26T10:30:00+08:00",
};

const records: InvestigationRecord[] = [
  {
    id: "record-ai-ready-2",
    issueId: issue.id,
    type: "result",
    rawText: "Replacing the weak pull-up restores normal boot.",
    polishedText: "Replacing the weak pull-up restores normal boot.",
    aiExtractedSignals: [],
    linkedFiles: ["boards/r1/uart.c"],
    linkedCommits: [],
    createdAt: "2026-04-26T10:20:00+08:00",
  },
  {
    id: "record-ai-ready-1",
    issueId: issue.id,
    type: "observation",
    rawText: "ROM banner appears, then log stops.",
    polishedText: "ROM banner appears, then log stops.",
    aiExtractedSignals: [],
    linkedFiles: [],
    linkedCommits: [],
    createdAt: "2026-04-26T10:10:00+08:00",
  },
];

const closeoutDraft = {
  category: " boot ",
  rootCause: " weak pull-up on UART RX ",
  resolution: " replace resistor and confirm boot log completes ",
  prevention: " add pull-up value check to bring-up checklist ",
};

for (const task of ["polish_closeout", "summarize_records", "suggest_prevention"] as const) {
  const input = buildAiPromptInput(task, issue, records, closeoutDraft);
  const promptA = buildAiPromptTemplate(input);
  const promptB = buildAiPromptTemplate(input);
  if (JSON.stringify(promptA) !== JSON.stringify(promptB)) {
    fail("prompt rendering should be deterministic", { task, promptA, promptB });
  }
  if (promptA.messages[0]?.role !== "system" || promptA.messages[1]?.role !== "user") {
    fail("prompt should contain system and user messages", promptA.messages);
  }
  const userPrompt = promptA.messages[1]?.content ?? "";
  if (!userPrompt.includes(`Task: ${task}`) || !userPrompt.includes(issue.title)) {
    fail("prompt should include task and issue context", { task, userPrompt });
  }
  const earlierIndex = userPrompt.indexOf("ROM banner appears");
  const laterIndex = userPrompt.indexOf("Replacing the weak pull-up");
  if (earlierIndex < 0 || laterIndex < 0 || earlierIndex > laterIndex) {
    fail("prompt should include records in chronological order", userPrompt);
  }
}

if (AiPromptInputSchema.safeParse({ task: "polish_closeout", locale: "zh-CN" }).success) {
  fail("prompt input schema should reject missing issue and records");
}

const validOutputs = [
  {
    task: "polish_closeout",
    draftOnly: true,
    confidence: "medium",
    category: "boot",
    rootCause: "weak pull-up on UART RX",
    resolution: "replace resistor and confirm boot log completes",
    prevention: "add pull-up value check to bring-up checklist",
    caveats: ["草稿需人工确认"],
  },
  {
    task: "summarize_records",
    draftOnly: true,
    confidence: "medium",
    summary: "UART boot log stopped after ROM banner and recovered after pull-up replacement.",
    keySignals: ["ROM banner appears", "pull-up replacement restores boot"],
    unresolvedQuestions: ["confirm exact resistor value on all boards"],
    caveats: ["草稿需人工确认"],
  },
  {
    task: "suggest_prevention",
    draftOnly: true,
    confidence: "medium",
    prevention: "Add UART RX pull-up value check to the bring-up checklist.",
    checklistItems: ["Measure UART RX pull-up before boot smoke"],
    riskLevel: "high",
    caveats: ["草稿需人工确认"],
  },
];

for (const output of validOutputs) {
  const parsed = AiDraftOutputSchema.safeParse(output);
  if (!parsed.success) {
    fail("valid AI draft output should pass schema", parsed.error.issues);
  }
}

const invalidOutputs = [
  { task: "polish_closeout", draftOnly: false, confidence: "medium" },
  { task: "summarize_records", draftOnly: true, confidence: "medium", summary: "" },
  {
    task: "suggest_prevention",
    draftOnly: true,
    confidence: "medium",
    prevention: "   ",
    checklistItems: [],
    riskLevel: "high",
    caveats: [],
  },
];

for (const output of invalidOutputs) {
  if (AiDraftOutputSchema.safeParse(output).success) {
    fail("invalid AI draft output should fail schema", output);
  }
}

const closeout = buildCloseoutFromIssue(issue, records, closeoutDraft, defaultCloseoutOptions(
  "2026-04-26T11:10:00+08:00",
  {
    errorEntryId: "error-entry-ai-ready-uart",
    errorCode: "DBG-20260426-001",
    generatedBy: "hybrid",
  },
));
if (!closeout.ok) {
  fail("existing closeout builder should still accept the same input", closeout);
}

console.log("[AI-READY-PROMPT-TEMPLATE-SYSTEM verify] PASS: prompt templates render deterministically for all tasks");
console.log("[AI-READY-PROMPT-TEMPLATE-SYSTEM verify] PASS: prompt input and AI draft output schemas reject invalid payloads");
console.log("[AI-READY-PROMPT-TEMPLATE-SYSTEM verify] PASS: existing closeout builder remains compatible");
