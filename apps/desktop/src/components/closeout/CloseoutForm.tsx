import { useEffect, useState, type FormEvent } from "react";
import {
  buildRuleCloseoutDraft,
  type RuleCloseoutDraft,
} from "../../ai/rule-closeout-draft";
import {
  generateAiCloseoutDraft,
  type AiDraftFailure,
} from "../../ai/ai-draft-client";
import type { AiDraftOutput } from "../../ai/prompt-templates";
import {
  appendCloseoutDraftHistoryEntry,
  clearCloseoutDraftHistory,
  createCloseoutDraftHistoryEntry,
  getBrowserCloseoutDraftHistoryStorage,
  labelCloseoutDraftHistorySource,
  readCloseoutDraftHistory,
  type CloseoutDraftHistoryEntry,
  type CloseoutDraftHistorySource,
} from "../../ai/rule-closeout-draft-history";
import { type CloseoutInput } from "../../domain/closeout";
import type { IssueCard } from "../../domain/schemas/issue-card";
import type { InvestigationRecord } from "../../domain/schemas/investigation-record";
import type { StorageRepository } from "../../storage/storage-repository";
import {
  closeoutFailureToFeedback,
  type StorageFeedbackError,
} from "../../storage/storage-feedback";
import { orchestrateIssueCloseout } from "../../use-cases/closeout-orchestrator";
import { buildCloseoutFailureFeedbackCopy } from "../../use-cases/closeout-failure-feedback";

export const CLOSEOUT_FORM_ID = "closeout-form";

type CloseoutSubmitStatus =
  | { state: "idle" }
  | { state: "saved"; fileName: string; errorCode: string; at: string }
  | { state: "error"; reason: string; preservationHint?: string };

export type CloseoutSummary = {
  issueId: string;
  archiveFileName: string;
  archiveFilePath: string;
  errorCode: string;
  errorEntryId: string;
  archivedAt: string;
  category: string;
  tags: string[];
  markdownPreview: string;
};

type DraftHistoryStatus = "idle" | "stored" | "session-only" | "cleared";

type DraftGenerateStatus =
  | { state: "idle" }
  | { state: "generating" }
  | { state: "deepseek"; model: string }
  | { state: "fallback"; reason: string };

export function CloseoutForm({
  repository,
  issueId,
  issueCard,
  records,
  onClosed,
  reportStorageError,
  clearStorageFeedback,
}: {
  repository: StorageRepository;
  issueId: string;
  issueCard: IssueCard | null;
  records: InvestigationRecord[];
  onClosed: (summary: CloseoutSummary) => void;
  reportStorageError: (error: StorageFeedbackError) => void;
  clearStorageFeedback: () => void;
}) {
  const [category, setCategory] = useState<string>("");
  const [rootCause, setRootCause] = useState<string>("");
  const [resolution, setResolution] = useState<string>("");
  const [prevention, setPrevention] = useState<string>("");
  const [draft, setDraft] = useState<RuleCloseoutDraft | null>(null);
  const [activeDraftEntryId, setActiveDraftEntryId] = useState<string | null>(null);
  const [draftHistory, setDraftHistory] = useState<CloseoutDraftHistoryEntry[]>([]);
  const [draftHistoryStatus, setDraftHistoryStatus] = useState<DraftHistoryStatus>("idle");
  const [draftGenerateStatus, setDraftGenerateStatus] = useState<DraftGenerateStatus>({ state: "idle" });
  const [status, setStatus] = useState<CloseoutSubmitStatus>({ state: "idle" });
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const categoryReady = category.trim().length > 0;
  const rootCauseReady = rootCause.trim().length > 0;
  const resolutionReady = resolution.trim().length > 0;
  const preventionReady = prevention.trim().length > 0;
  const missingRequiredLabels = [
    rootCauseReady ? null : "根因",
    resolutionReady ? null : "修复/结论",
  ].filter((label): label is string => label !== null);
  const showRequiredHints = hasAttemptedSubmit && missingRequiredLabels.length > 0;
  const closeoutQualityItems = [
    {
      id: "category",
      testId: "closeout-quality-item-category",
      label: "归档分类",
      requirement: "建议",
      ready: categoryReady,
      hint: categoryReady ? "已填写分类，后续更容易筛选复用。" : "建议填写模块或故障类型；留空会进入未分类。",
    },
    {
      id: "rootCause",
      testId: "closeout-quality-item-rootCause",
      label: "根因",
      requirement: "必填",
      ready: rootCauseReady,
      hint: rootCauseReady ? "已写明为什么发生。" : "必须写出已确认或当前最可信的根因。",
    },
    {
      id: "resolution",
      testId: "closeout-quality-item-resolution",
      label: "修复/结论",
      requirement: "必填",
      ready: resolutionReady,
      hint: resolutionReady ? "已写明修复动作或结案依据。" : "必须写清处理动作、绕过方案或结案依据。",
    },
    {
      id: "prevention",
      testId: "closeout-quality-item-prevention",
      label: "预防建议",
      requirement: "建议",
      ready: preventionReady,
      hint: preventionReady
        ? "已写入复发预防动作。"
        : "建议补充可执行检查项；留空时会按修复结论生成默认预防项。",
    },
  ] as const;
  const activeDraftHistoryEntry = draftHistory.find((entry) => entry.id === activeDraftEntryId) ?? null;

  useEffect(() => {
    setDraft(null);
    setActiveDraftEntryId(null);
    setDraftHistory(readCloseoutDraftHistory(getBrowserCloseoutDraftHistoryStorage(), issueId));
    setDraftHistoryStatus("idle");
    setDraftGenerateStatus({ state: "idle" });
    setHasAttemptedSubmit(false);
  }, [issueId]);

  const handleGenerateDraft = async () => {
    if (issueCard === null) return;
    setDraftGenerateStatus({ state: "generating" });
    let generatedDraft = buildRuleCloseoutDraft(issueCard, records);
    let source: CloseoutDraftHistorySource = "local-rule";
    const aiResult = await generateAiCloseoutDraft({
      issue: issueCard,
      records,
      closeoutDraft: { category, rootCause, resolution, prevention },
    });
    if (aiResult.ok) {
      generatedDraft = closeoutDraftFromAiOutput(aiResult.output, generatedDraft);
      source = "deepseek";
      setDraftGenerateStatus({ state: "deepseek", model: aiResult.model });
    } else {
      setDraftGenerateStatus({
        state: "fallback",
        reason: describeAiDraftFailure(aiResult.failure),
      });
    }
    const historyEntry = createCloseoutDraftHistoryEntry({
      issueId,
      issueTitle: issueCard.title,
      generatedAt: new Date().toISOString(),
      source,
      recordCount: records.length,
      draft: generatedDraft,
      sequence: draftHistory.length + 1,
    });
    const historyResult = appendCloseoutDraftHistoryEntry(
      getBrowserCloseoutDraftHistoryStorage(),
      historyEntry,
    );
    setDraft(generatedDraft);
    setActiveDraftEntryId(historyEntry.id);
    setDraftHistory(historyResult.entries);
    setDraftHistoryStatus(historyResult.persisted ? "stored" : "session-only");
  };

  const handleApplyDraft = () => {
    if (draft === null) return;
    setCategory(draft.category);
    setRootCause(draft.rootCause);
    setResolution(draft.resolution);
    setPrevention(draft.prevention);
    setStatus({ state: "idle" });
    setHasAttemptedSubmit(false);
  };

  const handleReviewDraftHistoryEntry = (entry: CloseoutDraftHistoryEntry) => {
    setDraft(entry.draft);
    setActiveDraftEntryId(entry.id);
  };

  const handleClearDraftHistory = () => {
    clearCloseoutDraftHistory(getBrowserCloseoutDraftHistoryStorage(), issueId);
    setDraft(null);
    setActiveDraftEntryId(null);
    setDraftHistory([]);
    setDraftHistoryStatus("cleared");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (missingRequiredLabels.length > 0) {
      setStatus({
        state: "error",
        reason: `请先补齐${missingRequiredLabels.join("、")}`,
      });
      return;
    }
    const input: CloseoutInput = { category, rootCause, resolution, prevention };
    const result = await orchestrateIssueCloseout(issueId, input, { repository });
    if (!result.ok) {
      const failureCopy = buildCloseoutFailureFeedbackCopy(result);
      reportStorageError(closeoutFailureToFeedback(result));
      setStatus({
        state: "error",
        reason: failureCopy.statusReason,
        preservationHint: failureCopy.retryHint,
      });
      return;
    }
    clearStorageFeedback();
    setStatus({
      state: "saved",
      fileName: result.archiveDocument.fileName,
      errorCode: result.errorEntry.errorCode,
      at: result.archiveDocument.generatedAt,
    });
    setCategory("");
    setRootCause("");
    setResolution("");
    setPrevention("");
    setDraft(null);
    setHasAttemptedSubmit(false);
    const markdownContent = result.archiveDocument.markdownContent;
    const markdownPreview =
      markdownContent.length > 500
        ? markdownContent.slice(0, 500) + "\n..."
        : markdownContent;
    onClosed({
      issueId: result.updatedIssueCard.id,
      archiveFileName: result.archiveDocument.fileName,
      archiveFilePath: result.archiveDocument.filePath,
      errorCode: result.errorEntry.errorCode,
      errorEntryId: result.errorEntry.id,
      archivedAt: result.archiveDocument.generatedAt,
      category: result.errorEntry.category,
      tags: result.errorEntry.tags ?? [],
      markdownPreview,
    });
  };

  return (
    <form
      id={CLOSEOUT_FORM_ID}
      className="intake-form"
      onSubmit={handleSubmit}
      data-testid="closeout-form"
    >
      <div className="form-caption">
        <h3>结案归档</h3>
        <p>写入归档摘要与错误表。</p>
      </div>
      <p className="storage-line" data-testid="closeout-target">
        结案对象：{issueId}
      </p>
      <section className="closeout-quality-panel" data-testid="closeout-quality-panel" aria-label="结案填写检查">
        <div className="closeout-quality-header">
          <span>结案填写检查</span>
          <p>根因和修复/结论必填。</p>
        </div>
        <div className="closeout-quality-grid">
          {closeoutQualityItems.map((item) => (
            <div
              key={item.id}
              className="closeout-quality-item"
              data-state={item.ready ? "ready" : "missing"}
              data-requirement={item.requirement}
              data-testid={item.testId}
            >
              <span>
                {item.label}
                <small>{item.requirement}</small>
              </span>
              <p>{item.hint}</p>
            </div>
          ))}
        </div>
        {showRequiredHints && (
          <p className="field-error" data-testid="closeout-required-error">
            请先补齐：{missingRequiredLabels.join("、")}。空格不会被视为有效内容。
          </p>
        )}
      </section>
      <section className="closeout-draft-panel" data-testid="closeout-draft-panel">
        <div className="closeout-draft-header">
          <div>
            <span className="closeout-draft-eyebrow">DeepSeek AI 草稿</span>
            <p>优先调用 server-side DeepSeek；失败或无 key 时使用本地规则兜底，不自动写库。</p>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={handleGenerateDraft}
            disabled={issueCard === null || draftGenerateStatus.state === "generating"}
            data-testid="closeout-draft-generate"
          >
            {draftGenerateStatus.state === "generating" ? "生成中..." : "生成 AI 草稿"}
          </button>
        </div>
        {issueCard === null && (
          <p className="storage-line">问题卡详情仍在读取中，稍后可生成草稿。</p>
        )}
        <p className="storage-line" data-testid="closeout-draft-history-state">
          草稿历史：{renderDraftHistoryStatus(draftHistoryStatus)}
        </p>
        <p className="storage-line" data-testid="closeout-draft-generate-state">
          草稿来源：{renderDraftGenerateStatus(draftGenerateStatus)}
        </p>
        {draft !== null && (
          <div className="closeout-draft-body">
            <div className="closeout-draft-grid" data-testid="closeout-draft-preview">
              <div>
                <span>问题描述优化</span>
                <p>{draft.problemSummary}</p>
              </div>
              <div>
                <span>根因总结草稿</span>
                <p>{draft.rootCause}</p>
              </div>
              <div>
                <span>解决方案草稿</span>
                <p>{draft.resolution}</p>
              </div>
              <div>
                <span>预防建议草稿</span>
                <p>{draft.prevention}</p>
              </div>
            </div>
            <div className="closeout-draft-meta">
              <span>置信度：{labelDraftConfidence(draft.confidence)}</span>
              <span>关键信号：{draft.keySignals.length} 条</span>
              <span>检查项：{draft.checklistItems.length} 条</span>
              {activeDraftHistoryEntry !== null && <span>正在审阅：{activeDraftHistoryEntry.generatedAt}</span>}
            </div>
            <div className="intake-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={handleApplyDraft}
                data-testid="closeout-draft-apply"
              >
                套用到结案表单
              </button>
            </div>
          </div>
        )}
        <div className="closeout-draft-history" data-testid="closeout-draft-history">
          <div className="closeout-draft-history-header">
            <span>草稿历史</span>
            <button
              type="button"
              className="button-secondary"
              onClick={handleClearDraftHistory}
              disabled={draftHistory.length === 0 && draft === null}
              data-testid="closeout-draft-history-clear"
            >
              清除草稿历史
            </button>
          </div>
          {draftHistory.length === 0 ? (
            <p className="storage-line" data-testid="closeout-draft-history-empty">
              尚无本问题的草稿历史。
            </p>
          ) : (
            <ol className="closeout-draft-history-list" data-testid="closeout-draft-history-list">
              {draftHistory.map((entry, index) => (
                <li
                  key={entry.id}
                  className="closeout-draft-history-item"
                  data-active={entry.id === activeDraftEntryId}
                  data-testid="closeout-draft-history-item"
                >
                  <div className="closeout-draft-history-item-header">
                    <span>第 {draftHistory.length - index} 版 · {entry.generatedAt}</span>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => handleReviewDraftHistoryEntry(entry)}
                      data-testid="closeout-draft-history-review"
                    >
                      查看此版
                    </button>
                  </div>
                  <p className="closeout-draft-history-boundary">
                    来源：{labelCloseoutDraftHistorySource(entry.source)}；问题边界：{entry.issueTitle || entry.issueId}；
                    排查记录：{entry.recordCount} 条。
                  </p>
                  <details>
                    <summary>展开草稿内容</summary>
                    <div className="closeout-draft-grid">
                      <div>
                        <span>问题描述优化</span>
                        <p>{entry.draft.problemSummary}</p>
                      </div>
                      <div>
                        <span>根因总结草稿</span>
                        <p>{entry.draft.rootCause}</p>
                      </div>
                      <div>
                        <span>解决方案草稿</span>
                        <p>{entry.draft.resolution}</p>
                      </div>
                      <div>
                        <span>预防建议草稿</span>
                        <p>{entry.draft.prevention}</p>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
      <label className="intake-field">
        <span className="field-label-row">
          归档分类 <span className="field-recommended-badge">建议</span>
        </span>
        <input
          type="text"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="例如：启动、电源、时序"
          aria-describedby="closeout-category-help"
        />
        <small id="closeout-category-help" className="field-help">
          用于后续筛选复用。
        </small>
      </label>
      <label className="intake-field">
        <span className="field-label-row">
          根因 <span className="field-required-badge">必填</span>
        </span>
        <textarea
          value={rootCause}
          onChange={(event) => setRootCause(event.target.value)}
          rows={3}
          placeholder="说明已经确认或当前最可信的根因"
          required
          aria-describedby="closeout-root-cause-help"
          aria-invalid={hasAttemptedSubmit && !rootCauseReady}
        />
        <small id="closeout-root-cause-help" className="field-help">
          写为什么发生。
        </small>
        {hasAttemptedSubmit && !rootCauseReady && (
          <small className="field-error" data-testid="closeout-root-cause-error">
            根因是必填项，不能只输入空格。
          </small>
        )}
      </label>
      <label className="intake-field">
        <span className="field-label-row">
          修复/结论 <span className="field-required-badge">必填</span>
        </span>
        <textarea
          value={resolution}
          onChange={(event) => setResolution(event.target.value)}
          rows={3}
          placeholder="说明修复动作、绕过方案或结案依据"
          required
          aria-describedby="closeout-resolution-help"
          aria-invalid={hasAttemptedSubmit && !resolutionReady}
        />
        <small id="closeout-resolution-help" className="field-help">
          写实际动作、验证结果或结案依据。
        </small>
        {hasAttemptedSubmit && !resolutionReady && (
          <small className="field-error" data-testid="closeout-resolution-error">
            修复/结论是必填项，不能只输入空格。
          </small>
        )}
      </label>
      <label className="intake-field">
        <span className="field-label-row">
          预防建议 <span className="field-recommended-badge">建议</span>
        </span>
        <textarea
          value={prevention}
          onChange={(event) => setPrevention(event.target.value)}
          rows={2}
          placeholder="后续如何避免复发，例如检查清单、测试项或设计约束"
          aria-describedby="closeout-prevention-help"
        />
        <small id="closeout-prevention-help" className="field-help">
          可留空；默认按修复/结论生成。
        </small>
      </label>
      <div className="intake-actions">
        <button type="submit">结案并生成归档摘要</button>
      </div>
      <p className="storage-line" data-testid="closeout-status">
        结案状态：{renderCloseoutStatus(status)}
      </p>
      {status.state === "error" && status.preservationHint !== undefined && (
        <p className="storage-line" data-testid="closeout-failure-retry-hint">
          {status.preservationHint}
        </p>
      )}
    </form>
  );
}

function labelDraftConfidence(confidence: RuleCloseoutDraft["confidence"]): string {
  switch (confidence) {
    case "low":
      return "低，需要补充人工确认";
    case "medium":
      return "中，建议复核后使用";
    case "high":
      return "高，仍需人工确认";
  }
}

function closeoutDraftFromAiOutput(
  output: AiDraftOutput,
  fallback: RuleCloseoutDraft,
): RuleCloseoutDraft {
  if (output.task !== "polish_closeout") return fallback;
  return {
    ...fallback,
    category: output.category,
    rootCause: output.rootCause,
    resolution: output.resolution,
    prevention: output.prevention,
    caveats: Array.from(new Set([...output.caveats, "DeepSeek AI 草稿，需人工确认后才能结案写库"])),
    confidence: output.confidence,
  };
}

function describeAiDraftFailure(failure: AiDraftFailure): string {
  switch (failure.code) {
    case "AI_NOT_CONFIGURED":
      return "server 未配置 DeepSeek API key，已使用本地规则草稿。";
    case "AI_TIMEOUT":
    case "AI_CLIENT_TIMEOUT":
      return "DeepSeek 请求超时，已使用本地规则草稿。";
    case "AI_DRAFT_SCHEMA_ERROR":
    case "AI_RESPONSE_SCHEMA_ERROR":
    case "AI_INVALID_JSON":
      return "AI 返回结构未通过校验，已使用本地规则草稿。";
    default:
      return `${failure.message}；已使用本地规则草稿。`;
  }
}

function renderDraftGenerateStatus(status: DraftGenerateStatus): string {
  switch (status.state) {
    case "idle":
      return "尚未生成；点击后优先调用 DeepSeek，失败时本地规则兜底。";
    case "generating":
      return "正在请求 server-side DeepSeek；不会暴露 API key 到浏览器。";
    case "deepseek":
      return `DeepSeek 已生成 · ${status.model} · 仍需人工确认。`;
    case "fallback":
      return status.reason;
  }
}

function renderDraftHistoryStatus(status: DraftHistoryStatus): string {
  switch (status) {
    case "idle":
      return "浏览器本地保存，仅用于审阅，不写入归档 / 错误表 / 问题卡。";
    case "stored":
      return "已保存到浏览器本地历史；仅供审阅，不自动写库。";
    case "session-only":
      return "localStorage 不可用，本次会话内可审阅；不会自动写库。";
    case "cleared":
      return "已清除当前问题的本地草稿历史。";
  }
}

function renderCloseoutStatus(status: CloseoutSubmitStatus): string {
  switch (status.state) {
    case "idle":
      return "待填写根因和修复结论";
    case "saved":
      return `已结案 · ${status.errorCode} · ${status.fileName} · ${status.at}`;
    case "error":
      return `结案失败：${status.reason}`;
  }
}
