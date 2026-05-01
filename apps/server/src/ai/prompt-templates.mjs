export const AI_PROMPT_TASKS = new Set([
  "polish_closeout",
  "summarize_records",
  "suggest_prevention",
]);

const SYSTEM_PROMPT = [
  "你是 ProbeFlash 的嵌入式调试结案草稿助手。",
  "你的任务是根据用户提供的问题卡、排查记录和当前结案草稿，生成中文结案草稿。",
  "只能使用输入中明确出现的信息。",
  "不要编造硬件事实、测试结果、根因、文件、提交、仪器数据或已执行动作。",
  "如果根因或验证依据不足，要在草稿中保留不确定性。",
  "输出只是草稿，不能声明已经结案、已经归档、已经写库或已经修复。",
  "不要输出 Markdown。",
  "必须只返回符合 OutputContract 的 JSON。",
].join("\n");

const TASK_INSTRUCTIONS = {
  polish_closeout:
    "优化现有结案字段的措辞，保留事实边界，补齐更清楚的 category / rootCause / resolution / prevention 草稿。如果输入证据不足，不要强行下结论，要在 caveats 中说明仍需人工确认。",
  summarize_records:
    "把排查记录压缩成结案前可审阅的时间线总结，列出关键信号和仍未确认的问题。",
  suggest_prevention:
    "基于问题、排查记录和解决方案草稿生成预防建议，不要把建议写成已执行事实。",
};

const OUTPUT_CONTRACTS = {
  polish_closeout: JSON.stringify({
    task: "polish_closeout",
    draftOnly: true,
    confidence: "low|medium|high",
    category: "non-empty string",
    rootCause: "non-empty string",
    resolution: "non-empty string",
    prevention: "non-empty string",
    caveats: ["string"],
  }, null, 2),
  summarize_records: JSON.stringify({
    task: "summarize_records",
    draftOnly: true,
    confidence: "low|medium|high",
    summary: "non-empty string",
    keySignals: ["non-empty string"],
    unresolvedQuestions: ["non-empty string"],
    caveats: ["string"],
  }, null, 2),
  suggest_prevention: JSON.stringify({
    task: "suggest_prevention",
    draftOnly: true,
    confidence: "low|medium|high",
    prevention: "non-empty string",
    checklistItems: ["non-empty string"],
    riskLevel: "low|medium|high|critical",
    caveats: ["string"],
  }, null, 2),
};

function firstString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function formatList(values) {
  return values.length === 0 ? "- (none)" : values.map((value) => `- ${value}`).join("\n");
}

function formatRecords(records) {
  if (!Array.isArray(records) || records.length === 0) return "- (no investigation records)";
  return [...records]
    .sort((a, b) => firstString(a.createdAt).localeCompare(firstString(b.createdAt)))
    .map((record) => {
      const text = firstString(record.polishedText) || firstString(record.rawText) || "(empty)";
      return `- ${firstString(record.createdAt)} [${firstString(record.type)}] ${text}`;
    })
    .join("\n");
}

function normalizeCloseoutDraft(value) {
  const draft = value && typeof value === "object" ? value : {};
  return {
    category: firstString(draft.category).trim(),
    rootCause: firstString(draft.rootCause).trim(),
    resolution: firstString(draft.resolution).trim(),
    prevention: firstString(draft.prevention).trim(),
  };
}

function formatCloseoutDraft(draft) {
  return [
    `- category: ${draft.category || "(empty)"}`,
    `- rootCause: ${draft.rootCause || "(empty)"}`,
    `- resolution: ${draft.resolution || "(empty)"}`,
    `- prevention: ${draft.prevention || "(empty)"}`,
  ].join("\n");
}

function renderUserPrompt({ task, issue, records, closeoutDraft }) {
  return [
    `Task: ${task}`,
    `Instruction: ${TASK_INSTRUCTIONS[task]}`,
    "",
    "IssueCard:",
    `- id: ${firstString(issue.id)}`,
    `- projectId: ${firstString(issue.projectId)}`,
    `- title: ${firstString(issue.title)}`,
    `- severity: ${firstString(issue.severity)}`,
    `- status: ${firstString(issue.status)}`,
    `- rawInput: ${firstString(issue.rawInput)}`,
    `- normalizedSummary: ${firstString(issue.normalizedSummary)}`,
    `- symptomSummary: ${firstString(issue.symptomSummary)}`,
    "- suspectedDirections:",
    formatList(stringArray(issue.suspectedDirections)),
    "- suggestedActions:",
    formatList(stringArray(issue.suggestedActions)),
    "- relatedFiles:",
    formatList(stringArray(issue.relatedFiles)),
    "- relatedCommits:",
    formatList(stringArray(issue.relatedCommits)),
    "",
    "InvestigationRecords:",
    formatRecords(records),
    "",
    "CurrentCloseoutDraft:",
    formatCloseoutDraft(closeoutDraft),
    "",
    "OutputContract:",
    OUTPUT_CONTRACTS[task],
  ].join("\n");
}

export function normalizeAiCloseoutDraftRequest(payload) {
  const task = firstString(payload?.task, "polish_closeout").trim() || "polish_closeout";
  if (!AI_PROMPT_TASKS.has(task)) {
    return { ok: false, reason: "task must be a supported AI prompt task" };
  }
  const issueId = firstString(payload?.issueId).trim();
  if (issueId.length === 0) {
    return { ok: false, reason: "issueId is required" };
  }
  return {
    ok: true,
    task,
    issueId,
    closeoutDraft: normalizeCloseoutDraft(payload?.closeoutDraft),
  };
}

export function buildAiPromptTemplate({ task, issue, records, closeoutDraft }) {
  if (!AI_PROMPT_TASKS.has(task)) {
    throw new Error("unsupported AI prompt task");
  }
  return {
    task,
    outputContract: OUTPUT_CONTRACTS[task],
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: renderUserPrompt({ task, issue, records, closeoutDraft }) },
    ],
  };
}
