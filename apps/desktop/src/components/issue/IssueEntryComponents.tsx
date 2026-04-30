import { useState, type FormEvent } from "react";
import {
  buildIssueCardFromIntake,
  buildQuickIssueCardFromLine,
  defaultIntakeOptions,
  nowISO,
  type IntakeInput,
  type IntakeResult,
  type IntakeSeverity,
} from "../../domain/issue-intake";
import type { Workspace } from "../../domain/workspace";
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

export function DemoHint() {
  return (
    <div className="demo-hint" data-testid="demo-hint">
      <div className="demo-hint-title">最小演示路径</div>
      <div className="demo-hint-steps">
        <span>快速建卡 / 选择已有卡 / 追加排查记录 / 结案归档</span>
      </div>
      <p className="demo-hint-note">以上步骤默认走前端 /api → 本地 WSL backend → SQLite；若服务未启动，顶部会明确提示。</p>
    </div>
  );
}

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
  const canSubmit = line.trim().length > 0;

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
        <p>只填标题即可创建 open issue，创建后自动选中并展开追记 / 结案区。</p>
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
        <input
          type="text"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="标签：CAN, 底盘"
          aria-label="问题标签，逗号分隔"
          data-testid="quick-issue-tags-input"
        />
        <button type="submit" disabled={!canSubmit} data-testid="quick-issue-create-submit">
          创建并打开
        </button>
      </div>
      <p className="storage-line" data-testid="quick-issue-create-status">
        快速建卡状态：{renderIntakeStatus(status)}
      </p>
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
            ? "首次进入或未选中问题时，先从这里记录现场现象。"
            : "处理中也可以随时另开一张问题卡，创建后会自动切换到新卡。"}
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
        <small className="field-help">用逗号分隔；标签只在当前项目内搜索和筛选。</small>
      </label>
      <div className="intake-actions">
        <button type="submit">创建问题卡</button>
      </div>
      <p className="storage-line" data-testid="intake-status">
        创建状态：{renderIntakeStatus(status)}
      </p>
    </form>
  );
}

export function IssueCardListView({
  result,
  activeWorkspace,
  selectedIssueId,
  recentIssueReopenState,
  onCreateNew,
  onRefresh,
  onSelect,
}: {
  result: IssueCardListResult | null;
  activeWorkspace: Workspace;
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
          <p>当前项目：{activeWorkspace.name}；默认只显示未归档问题卡，选中后在右侧继续追记或结案。</p>
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
            ? `当前项目「${activeWorkspace.name}」· 正在读取问题卡`
            : `当前项目「${activeWorkspace.name}」· 未归档 ${activeCards.length} 条 · 异常 ${result.invalid.length} 条`}
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
          当前项目「{activeWorkspace.name}」的问题卡读取失败。下一步：先查看上方项目与存储状态，确认 /api 可用后点击刷新列表。
        </p>
      )}
      {result && result.readError === null && activeCards.length === 0 && result.invalid.length === 0 && (
        <p className="empty-state" data-testid="issue-list-empty">
          当前项目「{activeWorkspace.name}」暂无未归档问题卡。使用中间的快速建卡入口记录现场问题，数据会写入该项目。
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
                    {labelSeverity(summary.severity)} · {labelIssueStatus(summary.status)} ·{" "}
                    {summary.createdAt}
                  </span>
                  <span className="list-item-id">编号：{summary.id}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
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
