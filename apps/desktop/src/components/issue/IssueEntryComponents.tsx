import { useEffect, useState, type FormEvent } from "react";
import {
  buildIssueCardFromIntake,
  buildQuickIssueCardFromLine,
  defaultIntakeOptions,
  nowISO,
  type IntakeInput,
  type IntakeResult,
  type IntakeSeverity,
} from "../../domain/issue-intake";
import type {
  IssueCardListResult,
  StorageRepository,
} from "../../storage/storage-repository";
import type { RecentIssueReopenState } from "../../storage/recent-issue-reopen";
import {
  createValidationStorageFeedbackError,
  storageWriteErrorToFeedback,
  type StorageFeedbackError,
} from "../../storage/storage-feedback";
import {
  clearFormDraft,
  getBrowserFormDraftStorage,
  readFormDraft,
  writeFormDraft,
} from "../../storage/form-draft-store";
import {
  labelIssueStatus,
  labelSeverity,
  parseTagsInput,
  SEVERITIES,
  SEVERITY_LABELS,
} from "./issueUiHelpers";

type IntakeSubmitStatus =
  | { state: "idle" }
  | { state: "saved"; id: string; at: string }
  | { state: "error"; reason: string };

type IssueFormDraftStatus = "idle" | "restored" | "stored" | "unavailable" | "cleared";

type QuickIssueFormDraft = {
  line: string;
  severity: IntakeSeverity;
  tagsInput: string;
};

type IssueIntakeFormDraft = {
  title: string;
  description: string;
  severity: IntakeSeverity;
  tagsInput: string;
};

export function QuickIssueCreateBar({
  repository,
  workspaceId,
  onCreated,
  reportStorageError,
  clearStorageFeedback,
}: {
  repository: StorageRepository;
  workspaceId: string;
  onCreated: (id: string) => void;
  reportStorageError: (error: StorageFeedbackError) => void;
  clearStorageFeedback: () => void;
}) {
  const [line, setLine] = useState<string>("");
  const [severity, setSeverity] = useState<IntakeSeverity>("medium");
  const [tagsInput, setTagsInput] = useState<string>("");
  const [status, setStatus] = useState<IntakeSubmitStatus>({ state: "idle" });
  const [draftStatus, setDraftStatus] = useState<IssueFormDraftStatus>("idle");
  const [isDraftReady, setIsDraftReady] = useState(false);
  const canSubmit = line.trim().length > 0;
  const draftScope = { workspaceId, formKind: "quick-issue", itemId: "new" };

  useEffect(() => {
    const restored = readFormDraft(getBrowserFormDraftStorage(), draftScope, parseQuickIssueDraft);
    if (restored.state === "restored") {
      setLine(restored.data.line);
      setSeverity(restored.data.severity);
      setTagsInput(restored.data.tagsInput);
      setDraftStatus("restored");
    } else {
      setDraftStatus(restored.state === "unavailable" ? "unavailable" : "idle");
    }
    setIsDraftReady(true);
  }, [workspaceId]);

  useEffect(() => {
    if (!isDraftReady) return;
    const draftValue: QuickIssueFormDraft = { line, severity, tagsInput };
    if (!hasQuickIssueDraftContent(draftValue)) {
      clearFormDraft(getBrowserFormDraftStorage(), draftScope);
      return;
    }
    const stored = writeFormDraft(getBrowserFormDraftStorage(), draftScope, draftValue);
    setDraftStatus(stored ? "stored" : "unavailable");
  }, [workspaceId, line, severity, tagsInput, isDraftReady]);

  const handleClearFormDraft = () => {
    clearFormDraft(getBrowserFormDraftStorage(), draftScope);
    setLine("");
    setSeverity("medium");
    setTagsInput("");
    setDraftStatus("cleared");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildQuickIssueCardFromLine(
      line,
      defaultIntakeOptions(nowISO(), undefined, workspaceId),
      parseTagsInput(tagsInput),
      severity,
    );
    if (!result.ok) {
      reportStorageError(
        createValidationStorageFeedbackError("issue_intake", "create_issue", result.reason),
      );
      setStatus({ state: "error", reason: "请查看顶部统一存储提示" });
      return;
    }
    const saved = await repository.issueCards.save(result.card);
    if (!saved.ok) {
      reportStorageError(storageWriteErrorToFeedback("issue_intake", "create_issue", saved.error));
      setStatus({ state: "error", reason: "请查看顶部统一存储提示" });
      return;
    }
    clearStorageFeedback();
    clearFormDraft(getBrowserFormDraftStorage(), draftScope);
    setStatus({ state: "saved", id: result.card.id, at: result.card.createdAt });
    setLine("");
    setSeverity("medium");
    setTagsInput("");
    onCreated(result.card.id);
  };

  return (
    <form
      className="quick-issue-bar"
      onSubmit={handleSubmit}
      data-testid="quick-issue-create-form"
    >
      <div className="quick-issue-copy">
        <span className="quick-issue-label">快速建卡</span>
        <strong>一句话记录现场问题</strong>
        <p>创建后自动打开追记 / 结案区。</p>
        <p className="storage-line" data-testid="quick-issue-create-status">
          快速建卡状态：{renderIntakeStatus(status)}
        </p>
        <p className="storage-line" data-testid="quick-issue-draft-status">
          未提交内容：{renderIssueDraftStatus(draftStatus)}
        </p>
      </div>
      <div className="quick-issue-input-row">
        <input
          type="text"
          value={line}
          onChange={(event) => setLine(event.target.value)}
          placeholder="例如：CAN 心跳偶发丢包，底盘急停"
          aria-label="一句话描述问题"
          data-testid="quick-issue-create-input"
          required
        />
        <input
          type="text"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="标签：CAN, 底盘"
          aria-label="问题标签，逗号分隔"
          data-testid="quick-issue-tags-input"
        />
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value as IntakeSeverity)}
          aria-label="严重程度"
          data-testid="quick-issue-severity-select"
        >
          {SEVERITIES.map((value) => (
            <option key={value} value={value}>
              {SEVERITY_LABELS[value]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={!canSubmit} data-testid="quick-issue-create-submit">
          创建并打开
        </button>
        <button type="button" className="button-secondary" onClick={handleClearFormDraft}>
          清除本地草稿
        </button>
      </div>
    </form>
  );
}

export function IssueIntakeForm({
  repository,
  workspaceId,
  isDefaultMode,
  onCreated,
  reportStorageError,
  clearStorageFeedback,
}: {
  repository: StorageRepository;
  workspaceId: string;
  isDefaultMode: boolean;
  onCreated: (id: string) => void;
  reportStorageError: (error: StorageFeedbackError) => void;
  clearStorageFeedback: () => void;
}) {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [severity, setSeverity] = useState<IntakeSeverity>("medium");
  const [tagsInput, setTagsInput] = useState<string>("");
  const [status, setStatus] = useState<IntakeSubmitStatus>({ state: "idle" });
  const [draftStatus, setDraftStatus] = useState<IssueFormDraftStatus>("idle");
  const [isDraftReady, setIsDraftReady] = useState(false);
  const draftScope = {
    workspaceId,
    formKind: "issue-intake",
    itemId: isDefaultMode ? "new-default" : "new-active",
  };

  useEffect(() => {
    const restored = readFormDraft(getBrowserFormDraftStorage(), draftScope, parseIssueIntakeDraft);
    if (restored.state === "restored") {
      setTitle(restored.data.title);
      setDescription(restored.data.description);
      setSeverity(restored.data.severity);
      setTagsInput(restored.data.tagsInput);
      setDraftStatus("restored");
    } else {
      setDraftStatus(restored.state === "unavailable" ? "unavailable" : "idle");
    }
    setIsDraftReady(true);
  }, [workspaceId, isDefaultMode]);

  useEffect(() => {
    if (!isDraftReady) return;
    const draftValue: IssueIntakeFormDraft = { title, description, severity, tagsInput };
    if (!hasIssueIntakeDraftContent(draftValue)) {
      clearFormDraft(getBrowserFormDraftStorage(), draftScope);
      return;
    }
    const stored = writeFormDraft(getBrowserFormDraftStorage(), draftScope, draftValue);
    setDraftStatus(stored ? "stored" : "unavailable");
  }, [workspaceId, isDefaultMode, title, description, severity, tagsInput, isDraftReady]);

  const handleClearFormDraft = () => {
    clearFormDraft(getBrowserFormDraftStorage(), draftScope);
    setTitle("");
    setDescription("");
    setSeverity("medium");
    setTagsInput("");
    setDraftStatus("cleared");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: IntakeInput = { title, description, severity, tags: parseTagsInput(tagsInput) };
    const result: IntakeResult = buildIssueCardFromIntake(
      input,
      defaultIntakeOptions(nowISO(), undefined, workspaceId),
    );
    if (!result.ok) {
      reportStorageError(
        createValidationStorageFeedbackError("issue_intake", "create_issue", result.reason),
      );
      setStatus({ state: "error", reason: "请查看顶部统一存储提示" });
      return;
    }
    const saved = await repository.issueCards.save(result.card);
    if (!saved.ok) {
      reportStorageError(storageWriteErrorToFeedback("issue_intake", "create_issue", saved.error));
      setStatus({
        state: "error",
        reason: "请查看顶部统一存储提示",
      });
      return;
    }
    clearStorageFeedback();
    clearFormDraft(getBrowserFormDraftStorage(), draftScope);
    setStatus({ state: "saved", id: result.card.id, at: result.card.createdAt });
    setTitle("");
    setDescription("");
    setSeverity("medium");
    setTagsInput("");
    onCreated(result.card.id);
  };

  return (
    <form
      className={`intake-form create-issue-entry${
        isDefaultMode ? " create-issue-entry-default" : ""
      }`}
      onSubmit={handleSubmit}
      data-testid="issue-intake-form"
      data-mode={isDefaultMode ? "default" : "active-entry"}
    >
      <div className="form-caption create-entry-caption">
        <div className="create-entry-title-row">
          <span className="create-entry-badge">
            {isDefaultMode ? "默认主界面" : "主动入口"}
          </span>
          <h3>{isDefaultMode ? "创建问题卡" : "创建新问题卡"}</h3>
        </div>
        <p>
          {isDefaultMode
            ? "先记录现场现象。"
            : "创建后自动切换到新卡。"}
        </p>
      </div>
      <label className="intake-field">
        <span>问题标题</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：UART 启动日志停在 0x40"
          required
        />
      </label>
      <label className="intake-field">
        <span>现场描述</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="记录原始现象、触发条件、刚看到的日志或操作背景"
        />
      </label>
      <label className="intake-field">
        <span>严重程度</span>
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value as IntakeSeverity)}
        >
          {SEVERITIES.map((value) => (
            <option key={value} value={value}>
              {SEVERITY_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="intake-field">
        <span>标签</span>
        <input
          type="text"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="例如：CAN, 底盘, 电机"
          data-testid="issue-tags-input"
        />
        <small className="field-help">逗号分隔。</small>
      </label>
      <div className="intake-actions">
        <button type="submit">创建问题卡</button>
      </div>
      <p className="storage-line" data-testid="intake-status">
        创建状态：{renderIntakeStatus(status)}
      </p>
      <div className="list-header">
        <span className="storage-line" data-testid="issue-intake-draft-status">
          未提交内容：{renderIssueDraftStatus(draftStatus)}
        </span>
        <button type="button" className="button-secondary" onClick={handleClearFormDraft}>
          清除本地草稿
        </button>
      </div>
    </form>
  );
}

export function IssueCardListView({
  result,
  selectedIssueId,
  recentIssueReopenState,
  onCreateNew,
  onRefresh,
  onSelect,
}: {
  result: IssueCardListResult | null;
  selectedIssueId: string | null;
  recentIssueReopenState: RecentIssueReopenState;
  onCreateNew: () => void;
  onRefresh: () => void;
  onSelect: (id: string) => void;
}) {
  const activeCards = result
    ? result.valid.filter((summary) => summary.status !== "archived")
    : [];
  return (
    <div className="list-view" data-testid="issue-card-list">
      <div className="issue-rail-header">
        <div className="form-caption">
          <h3>问题卡选择区</h3>
          <p>未归档问题卡。</p>
        </div>
        <button
          type="button"
          className="button-secondary issue-rail-create-button"
          onClick={onCreateNew}
          disabled={selectedIssueId === null}
          data-testid="issue-create-entry-button"
        >
          {selectedIssueId === null ? "新问题入口已打开" : "创建新问题卡"}
        </button>
      </div>
      <div className="list-header">
        <button type="button" className="button-secondary" onClick={() => onRefresh()}>
          刷新列表
        </button>
        <span className="storage-line" data-testid="list-summary">
          {result === null
            ? "正在读取问题卡"
            : `未归档 ${activeCards.length} 条 · 异常 ${result.invalid.length} 条`}
        </span>
        <span
          className="storage-line"
          data-testid="recent-issue-reopen-state"
          data-state={recentIssueReopenState.state}
        >
          {renderRecentIssueReopenState(recentIssueReopenState)}
        </span>
      </div>
      {result && result.readError !== null && (
        <p className="empty-state issue-list-error" data-testid="issue-list-error">
          问题卡读取失败。确认上方项目与存储状态后刷新。
        </p>
      )}
      {result && result.readError === null && activeCards.length === 0 && result.invalid.length === 0 && (
        <p className="empty-state" data-testid="issue-list-empty">
          暂无未归档问题卡。
        </p>
      )}
      {result && activeCards.length > 0 && (
        <ul className="list-items" data-testid="list-valid">
          {activeCards.map((summary) => {
            const isSelected = summary.id === selectedIssueId;
            return (
              <li
                key={summary.id}
                className={`list-item${isSelected ? " list-item-selected" : ""}`}
                data-selected={isSelected ? "true" : "false"}
              >
                <button
                  type="button"
                  className="list-item-select"
                  onClick={() => onSelect(summary.id)}
                  aria-pressed={isSelected}
                 >
                  <span className="list-item-title">{summary.title || "未命名问题"}</span>
                  <span className="list-item-meta">
                    {labelSeverity(summary.severity)} · {labelIssueStatus(summary.status)}
                  </span>
                  <span className="list-item-meta">{formatCreatedAt(summary.createdAt)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function parseSeverity(value: unknown): IntakeSeverity | null {
  return typeof value === "string" && SEVERITIES.includes(value as IntakeSeverity)
    ? value as IntakeSeverity
    : null;
}

function parseQuickIssueDraft(value: unknown): QuickIssueFormDraft | null {
  if (typeof value !== "object" || value === null) return null;
  const draft = value as Partial<Record<keyof QuickIssueFormDraft, unknown>>;
  const severity = parseSeverity(draft.severity);
  if (typeof draft.line !== "string" || typeof draft.tagsInput !== "string" || severity === null) {
    return null;
  }
  return { line: draft.line, severity, tagsInput: draft.tagsInput };
}

function parseIssueIntakeDraft(value: unknown): IssueIntakeFormDraft | null {
  if (typeof value !== "object" || value === null) return null;
  const draft = value as Partial<Record<keyof IssueIntakeFormDraft, unknown>>;
  const severity = parseSeverity(draft.severity);
  if (
    typeof draft.title !== "string" ||
    typeof draft.description !== "string" ||
    typeof draft.tagsInput !== "string" ||
    severity === null
  ) {
    return null;
  }
  return {
    title: draft.title,
    description: draft.description,
    severity,
    tagsInput: draft.tagsInput,
  };
}

function hasQuickIssueDraftContent(draft: QuickIssueFormDraft): boolean {
  return draft.line.trim().length > 0 || draft.tagsInput.trim().length > 0 || draft.severity !== "medium";
}

function hasIssueIntakeDraftContent(draft: IssueIntakeFormDraft): boolean {
  return [draft.title, draft.description, draft.tagsInput].some((value) => value.trim().length > 0) ||
    draft.severity !== "medium";
}

function renderIssueDraftStatus(status: IssueFormDraftStatus): string {
  switch (status) {
    case "idle":
      return "同一域名 / 地址下会自动暂存。";
    case "restored":
      return "已恢复上次未提交内容。";
    case "stored":
      return "已暂存在本地浏览器。";
    case "unavailable":
      return "浏览器本地暂存不可用；当前填写仍可提交。";
    case "cleared":
      return "已清除本地未提交内容。";
  }
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderIntakeStatus(status: IntakeSubmitStatus): string {
  switch (status.state) {
    case "idle":
      return "待填写后创建";
    case "saved":
      return `已创建 · ${status.id} · ${status.at}`;
    case "error":
      return `创建失败：${status.reason}`;
  }
}

function renderRecentIssueReopenState(state: RecentIssueReopenState): string {
  switch (state.state) {
    case "checking":
      return "最近现场：正在检查当前项目的本地记录";
    case "none":
      return "最近现场：当前项目暂无本地记录";
    case "restored":
      return `最近现场：已回到 ${state.issueId}`;
    case "recorded":
      return `最近现场：已记录 ${state.issueId}，刷新后会优先回到这里`;
    case "missing":
      return `最近现场：${state.issueId} 不在当前项目内，已安全降级`;
    case "archived":
      return `最近现场：${state.issueId} 已归档，刷新不会自动重开`;
    case "unavailable":
      return "最近现场：浏览器本地状态不可用，暂不自动恢复";
  }
}
