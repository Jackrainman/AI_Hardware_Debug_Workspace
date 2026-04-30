import { useEffect, useState } from "react";
import "./App.css";
import {
  buildRuleCloseoutDraft,
  type RuleCloseoutDraft,
} from "./ai/rule-closeout-draft";
import {
  appendCloseoutDraftHistoryEntry,
  clearCloseoutDraftHistory,
  createCloseoutDraftHistoryEntry,
  getBrowserCloseoutDraftHistoryStorage,
  labelCloseoutDraftHistorySource,
  readCloseoutDraftHistory,
  type CloseoutDraftHistoryEntry,
} from "./ai/rule-closeout-draft-history";
import type { IssueCard } from "./domain/schemas/issue-card";
import type { InvestigationRecord } from "./domain/schemas/investigation-record";
import {
  buildIssueCardFromIntake,
  buildQuickIssueCardFromLine,
  defaultIntakeOptions,
  nowISO,
  type IntakeInput,
  type IntakeResult,
  type IntakeSeverity,
} from "./domain/issue-intake";
import {
  buildInvestigationRecordFromIntake,
  defaultInvestigationIntakeOptions,
  nowISO as nowISOInvestigation,
  type InvestigationIntakeInput,
  type InvestigationIntakeResult,
  type InvestigationType,
} from "./domain/investigation-intake";
import {
  type CloseoutInput,
} from "./domain/closeout";
import {
  DEFAULT_WORKSPACE,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_NAME,
  type Workspace,
} from "./domain/workspace";
import {
  STORAGE_REPOSITORY_RUNTIME,
  checkHttpStorageHealth,
  createStorageRepository,
  type CreateWorkspaceResult,
  type HttpStorageHealthStatus,
  type IssueCardListResult,
  type LoadIssueCardResult,
  type InvestigationRecordListResult,
  type StorageRepository,
  type StorageSearchFilters,
  type StorageSearchResult,
  type StorageSearchResultItem,
  type WorkspaceListResult,
} from "./storage/storage-repository";
import { loadArchiveIndex, type ArchiveIndex } from "./storage/archive-index";
import {
  findSimilarIssuesForIssue,
  type SimilarIssuesResult,
} from "./search/similar-issues";
import {
  addRelatedHistoricalIssue,
  removeRelatedHistoricalIssue,
} from "./search/related-historical-issues";
import {
  getBrowserRecentIssueStorage,
  rememberRecentIssueForReopen,
  resolveRecentIssueReopen,
  type RecentIssueReopenState,
} from "./storage/recent-issue-reopen";
import {
  buildRecurrencePrompt,
  type RecurrencePrompt,
} from "./search/recurrence-prompt";
import { orchestrateIssueCloseout } from "./use-cases/closeout-orchestrator";
import { buildCloseoutFailureFeedbackCopy } from "./use-cases/closeout-failure-feedback";
import { IssueMainFlow, KnowledgeAssistPanel } from "./IssueWorkflowSections";
import { WorkspaceChrome } from "./WorkspaceChrome";
import {
  CHECKING_STORAGE_CONNECTION_STATE,
  LOCAL_STORAGE_CONNECTION_STATE,
  closeoutFailureToFeedback,
  createInvalidDataStorageFeedbackError,
  createOnlineStorageConnectionState,
  createValidationStorageFeedbackError,
  describeStorageConnectionState,
  formatStorageFeedbackError,
  healthCheckErrorToFeedback,
  loadIssueCardFailureToFeedback,
  storageReadErrorToFeedback,
  storageWriteErrorToFeedback,
  type StorageConnectionState,
  type StorageFeedbackError,
} from "./storage/storage-feedback";

const SAMPLE_ISSUE_ID = "sample-issue-0001";
const SAMPLE_TIMESTAMP = "2026-04-21T02:30:00+08:00";
const CLOSEOUT_FORM_ID = "closeout-form";

const DEFAULT_WORKSPACE_SUMMARY: Workspace = {
  ...DEFAULT_WORKSPACE,
  createdAt: SAMPLE_TIMESTAMP,
  updatedAt: SAMPLE_TIMESTAMP,
};

const SAMPLE_CARD: IssueCard = {
  id: SAMPLE_ISSUE_ID,
  projectId: DEFAULT_WORKSPACE_ID,
  title: "示例问题卡：启动日志停在握手阶段",
  rawInput: "用于演示 HTTP 存储链路保存与读回的示例问题卡。",
  normalizedSummary: "验证问题卡可以经 /api 写入本地 WSL backend，并通过结构校验读回。",
  symptomSummary: "演示数据：启动流程卡在握手阶段，尚未绑定真实硬件日志。",
  suspectedDirections: ["HTTP 存储适配链路"],
  suggestedActions: [
    "点击“保存示例卡”经 /api 写入本地 WSL backend。",
    "点击“读取示例卡”执行结构化读回。",
  ],
  status: "open",
  severity: "low",
  tags: ["示例", "HTTP 存储"],
  repoSnapshot: {
    branch: "master",
    headCommitHash: "0000000000000000000000000000000000000000",
    headCommitMessage: "fixture snapshot",
    hasUncommittedChanges: false,
    changedFiles: [],
    recentCommits: [],
    capturedAt: SAMPLE_TIMESTAMP,
  },
  relatedFiles: [],
  relatedCommits: [],
  relatedHistoricalIssueIds: [],
  createdAt: SAMPLE_TIMESTAMP,
  updatedAt: SAMPLE_TIMESTAMP,
};

function sampleIssueIdForWorkspace(workspaceId: string): string {
  const safeWorkspaceId = workspaceId
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${SAMPLE_ISSUE_ID}-${safeWorkspaceId || "workspace"}`;
}

function buildSampleCard(workspaceId: string): IssueCard {
  return {
    ...SAMPLE_CARD,
    id: sampleIssueIdForWorkspace(workspaceId),
    projectId: workspaceId,
  };
}

function RepairTaskPanel({
  repairTask,
}: {
  repairTask: NonNullable<StorageFeedbackError["repairTask"]>;
}) {
  return (
    <aside className="repair-task-panel" data-testid="repair-task-panel">
      <div className="repair-task-header">
        <span>只读 Repair Task</span>
        <strong>{repairTask.problemType}</strong>
      </div>
      <p className="repair-task-risk">风险：{repairTask.risk}</p>
      <div className="repair-task-grid">
        <div>
          <span className="repair-task-label">受影响实体</span>
          <ul>
            {repairTask.affectedEntities.map((entity) => (
              <li key={`${entity.entityType}:${entity.entityId}`}>
                {entity.entityType} / {entity.entityId}
                {entity.description ? `（${entity.description}）` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="repair-task-label">建议修复步骤</span>
          <ol>
            {repairTask.suggestedRepairSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
      <p className="repair-task-check">
        人工确认：{repairTask.requiresManualConfirmation ? "需要" : "不需要"}；验证方式：{repairTask.verification}
      </p>
    </aside>
  );
}

type SaveStatus =
  | { state: "idle" }
  | { state: "saved"; at: string }
  | { state: "error"; reason: string };

function DemoHint() {
  return (
    <div className="demo-hint" data-testid="demo-hint">
      <div className="demo-hint-title">🎯 最小演示路径</div>
      <div className="demo-hint-steps">
        <span>1️⃣ 填写上方表单 → 2️⃣ 创建后自动选中 / 左侧选择已有卡 → 3️⃣ 追加排查记录 → 4️⃣ 填写结案归档</span>
      </div>
      <p className="demo-hint-note">以上步骤默认走前端 /api → 本地 WSL backend → SQLite；若服务未启动，顶部会明确提示。</p>
    </div>
  );
}

function StorageStatusBanner({
  connectionState,
  error,
  healthStatus,
  activeWorkspace,
  workspaceList,
}: {
  connectionState: StorageConnectionState;
  error: StorageFeedbackError | null;
  healthStatus: HttpStorageHealthStatus | null;
  activeWorkspace: Workspace;
  workspaceList: WorkspaceListResult | null;
}) {
  const workspaceListStatus = describeWorkspaceListStatus(workspaceList, activeWorkspace);
  const healthDetail = healthStatus
    ? [
        healthStatus.serverReady ? "服务就绪" : "服务未就绪",
        `${healthStatus.storageKind} ${healthStatus.storageReady ? "就绪" : "未就绪"}`,
        healthStatus.dbPathClass ? `DB=${healthStatus.dbPathClass}` : null,
        healthStatus.defaultWorkspaceName
          ? `默认项目=${healthStatus.defaultWorkspaceName}`
          : null,
        healthStatus.releaseVersion
          ? `版本=${healthStatus.releaseVersion} / ${healthStatus.releaseTag ?? "no tag"}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <section
      className={`storage-feedback-banner${error === null ? "" : " storage-feedback-banner-error"}`}
      data-testid="storage-feedback-banner"
      data-connection-state={connectionState.state}
    >
      <div className="storage-feedback-row">
        <span className="storage-feedback-label">项目与存储状态</span>
        <span className="storage-feedback-connection">
          {describeStorageConnectionState(connectionState)}
        </span>
      </div>
      <div className="project-context-summary" data-testid="project-context-summary">
        <div className="project-context-identity">
          <span className="project-context-eyebrow">当前数据归属</span>
          <strong>{activeWorkspace.name}</strong>
          <span>项目 ID：{activeWorkspace.id}</span>
        </div>
        <p className="project-context-state" data-testid="workspace-list-state">
          {workspaceListStatus}
        </p>
      </div>
      <p className="storage-feedback-message" data-testid="storage-feedback-message">
        {renderProjectStorageMessage(connectionState, error, activeWorkspace)}
      </p>
      {healthDetail && error === null ? (
        <p className="storage-feedback-detail" data-testid="storage-health-detail">
          {healthDetail}
        </p>
      ) : null}
      {error?.repairTask ? <RepairTaskPanel repairTask={error.repairTask} /> : null}
    </section>
  );
}

function describeWorkspaceListStatus(
  workspaceList: WorkspaceListResult | null,
  activeWorkspace: Workspace,
): string {
  if (workspaceList === null) {
    return `当前项目「${activeWorkspace.name}」可用；项目列表正在读取。`;
  }
  if (workspaceList.readError !== null) {
    return `当前仍停留在「${activeWorkspace.name}」；项目列表读取失败，请修复存储状态后重试。`;
  }
  const invalidNote = workspaceList.invalid.length > 0
    ? `，${workspaceList.invalid.length} 个异常项目已跳过`
    : "";
  return `当前项目「${activeWorkspace.name}」；可切换项目 ${workspaceList.valid.length} 个${invalidNote}。`;
}

function renderProjectStorageMessage(
  connectionState: StorageConnectionState,
  error: StorageFeedbackError | null,
  activeWorkspace: Workspace,
): string {
  if (error !== null) {
    return `${formatStorageFeedbackError(error)} 当前项目「${activeWorkspace.name}」的读写可能受影响；请按提示修复后刷新或重试。`;
  }
  if (connectionState.state === "checking") {
    return `正在检查 /api 与「${activeWorkspace.name}」的长期存储状态…`;
  }
  return `当前项目「${activeWorkspace.name}」通过 HTTP + SQLite 读写；创建或切换项目不会删除、迁移已有数据。`;
}

function IssueStorageControls({
  repository,
  workspaceId,
  reportStorageError,
  clearStorageFeedback,
}: {
  repository: StorageRepository;
  workspaceId: string;
  reportStorageError: (error: StorageFeedbackError) => void;
  clearStorageFeedback: () => void;
}) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: "idle" });
  const [loadResult, setLoadResult] = useState<LoadIssueCardResult | null>(null);

  const handleSave = async () => {
    const saved = await repository.issueCards.save(buildSampleCard(workspaceId));
    if (!saved.ok) {
      reportStorageError(storageWriteErrorToFeedback("demo", "create_issue", saved.error));
      setSaveStatus({
        state: "error",
        reason: "请查看顶部统一存储提示",
      });
      return;
    }
    clearStorageFeedback();
    setSaveStatus({ state: "saved", at: new Date().toISOString() });
  };

  const handleLoad = async () => {
    const loaded = await repository.issueCards.load(sampleIssueIdForWorkspace(workspaceId));
    setLoadResult(loaded);
    if (!loaded.ok) {
      reportStorageError(loadIssueCardFailureToFeedback("demo", loaded.error));
      return;
    }
    clearStorageFeedback();
  };

  return (
    <div className="storage-controls" data-testid="issue-storage-controls">
      <div className="form-caption form-caption-muted">
        <h3>辅助验证</h3>
        <p>保存/读取示例卡，验证 HTTP 存储链路。</p>
      </div>
      <div className="storage-buttons">
        <button type="button" className="button-secondary" onClick={handleSave}>
          保存示例卡
        </button>
        <button type="button" className="button-secondary" onClick={handleLoad}>
          读取示例卡
        </button>
      </div>
      <p className="storage-line" data-testid="save-status">
        保存状态：{renderSaveStatus(saveStatus)}
      </p>
      <p className="storage-line" data-testid="load-status">
        读取状态：{renderLoadStatus(loadResult)}
      </p>
    </div>
  );
}

const SEVERITIES: IntakeSeverity[] = ["low", "medium", "high", "critical"];

const SEVERITY_LABELS: Record<IntakeSeverity, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "紧急",
};

function parseTagsInput(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of value.split(/[,，]/)) {
    const tag = item.trim();
    const key = tag.toLocaleLowerCase();
    if (tag.length === 0 || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

function formatTags(tags: string[] | undefined): string {
  const normalized = tags?.filter((tag) => tag.trim().length > 0) ?? [];
  return normalized.length > 0 ? normalized.join("、") : "(未加标签)";
}

type IntakeSubmitStatus =
  | { state: "idle" }
  | { state: "saved"; id: string; at: string }
  | { state: "error"; reason: string };

function QuickIssueCreateBar({
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
  const [tagsInput, setTagsInput] = useState<string>("");
  const [status, setStatus] = useState<IntakeSubmitStatus>({ state: "idle" });
  const canSubmit = line.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildQuickIssueCardFromLine(
      line,
      defaultIntakeOptions(nowISO(), undefined, workspaceId),
      parseTagsInput(tagsInput),
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

function IssueIntakeForm({
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

function IssueCardListView({
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
        {selectedIssueId !== null && (
          <button
            type="button"
            className="button-secondary issue-rail-create-button"
            onClick={onCreateNew}
            data-testid="issue-create-entry-button"
          >
            创建新问题卡
          </button>
        )}
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
          当前项目「{activeWorkspace.name}」暂无未归档问题卡。使用上方一句话快速建卡，或在右侧完整表单创建，数据会写入该项目。
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

function SearchPanel({
  repository,
  currentIssueId,
  relatedHistoricalIssueIds,
  onOpenIssue,
  onLinkHistoricalIssue,
  reportStorageError,
  clearStorageFeedback,
}: {
  repository: StorageRepository;
  currentIssueId: string | null;
  relatedHistoricalIssueIds: string[];
  onOpenIssue: (id: string) => void;
  onLinkHistoricalIssue: (id: string) => void;
  reportStorageError: (error: StorageFeedbackError) => void;
  clearStorageFeedback: () => void;
}) {
  const [query, setQuery] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<StorageSearchFilters["kind"]>("all");
  const [statusFilter, setStatusFilter] = useState<StorageSearchFilters["status"]>("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [fromFilter, setFromFilter] = useState<string>("");
  const [toFilter, setToFilter] = useState<string>("");
  const [result, setResult] = useState<StorageSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const canSearch = query.trim().length > 0 && !isSearching;

  const buildSearchFilters = (): StorageSearchResult["filters"] => ({
    kind: kindFilter ?? "all",
    status: statusFilter ?? "all",
    tag: tagFilter.trim(),
    from: fromFilter,
    to: toFilter,
  });

  const countActiveSearchFilters = (filters: StorageSearchResult["filters"]): number =>
    [
      filters.kind !== "all",
      filters.status !== "all",
      filters.tag.length > 0,
      filters.from.length > 0,
      filters.to.length > 0,
    ].filter(Boolean).length;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    const filters = buildSearchFilters();
    if (trimmedQuery.length === 0) {
      setResult({ query: "", filters, items: [], readError: null });
      return;
    }
    setIsSearching(true);
    const searchResult = await repository.search.query(trimmedQuery, filters);
    setResult(searchResult);
    setIsSearching(false);
    if (searchResult.readError !== null) {
      reportStorageError(
        storageReadErrorToFeedback("knowledge_search", "search", searchResult.readError),
      );
      return;
    }
    clearStorageFeedback();
  };

  return (
    <section className="search-panel" data-testid="knowledge-search-panel">
      <form className="search-form" onSubmit={handleSubmit} data-testid="knowledge-search-form">
        <div className="form-caption">
          <h3>历史问题搜索</h3>
          <p>按关键词搜索当前项目的问题卡、排查记录、归档摘要与错误表；不会跨项目读取。</p>
        </div>
        <div className="search-input-row">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：CAN / 握手 / 预防清单"
            aria-label="搜索历史问题关键词"
            data-testid="knowledge-search-input"
          />
          <button type="submit" disabled={!canSearch} data-testid="knowledge-search-submit">
            {isSearching ? "搜索中" : "搜索"}
          </button>
        </div>
        <div className="search-filter-row" data-testid="knowledge-search-filters">
          <label>
            <span>结果类型</span>
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as StorageSearchFilters["kind"])}
              data-testid="knowledge-search-kind-filter"
            >
              <option value="all">全部</option>
              <option value="issue">问题卡</option>
              <option value="record">排查记录</option>
              <option value="archive">归档摘要</option>
              <option value="error_entry">错误表</option>
            </select>
          </label>
          <label>
            <span>问题状态</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StorageSearchFilters["status"])}
              data-testid="knowledge-search-status-filter"
            >
              <option value="all">全部</option>
              <option value="open">处理中</option>
              <option value="investigating">排查中</option>
              <option value="resolved">已解决</option>
              <option value="archived">已归档</option>
              <option value="needs_manual_review">需人工复核</option>
            </select>
          </label>
          <label>
            <span>标签筛选</span>
            <input
              type="text"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              placeholder="例如：CAN, 底盘"
              data-testid="knowledge-search-tag-filter"
            />
          </label>
          <label>
            <span>起始日期</span>
            <input
              type="date"
              value={fromFilter}
              onChange={(event) => setFromFilter(event.target.value)}
              data-testid="knowledge-search-from-filter"
            />
          </label>
          <label>
            <span>结束日期</span>
            <input
              type="date"
              value={toFilter}
              onChange={(event) => setToFilter(event.target.value)}
              data-testid="knowledge-search-to-filter"
            />
          </label>
        </div>
      </form>
      {result !== null && result.readError === null && (
        <div className="search-result-block" data-testid="knowledge-search-result-block">
          <p className="storage-line" data-testid="knowledge-search-summary">
            {result.query.length === 0
              ? "输入关键词后开始搜索"
              : `“${result.query}” 命中 ${result.items.length} 条 · 筛选 ${countActiveSearchFilters(result.filters)} 项`}
          </p>
          {result.query.length > 0 && result.items.length === 0 && (
            <p className="empty-state" data-testid="knowledge-search-empty">
              当前项目没有匹配结果。可以换一个关键词，或先完成结案归档让错误表可被搜索。
            </p>
          )}
          {result.items.length > 0 && (
            <ul className="search-result-list" data-testid="knowledge-search-results">
              {result.items.map((item) => {
                const isCurrentIssue = currentIssueId === item.issueId;
                const isLinked = relatedHistoricalIssueIds.includes(item.issueId);
                return (
                  <li key={`${item.kind}:${item.id}`} className="search-result-item">
                    <button
                      type="button"
                      className="search-result-button"
                      onClick={() => onOpenIssue(item.issueId)}
                      data-testid="knowledge-search-result-item"
                    >
                      <span className="search-result-title-row">
                        <span className="search-result-kind">{labelSearchResultKind(item.kind)}</span>
                        <span className="search-result-title">{item.title}</span>
                      </span>
                      <span className="search-result-snippet">{item.snippet || "(空内容命中)"}</span>
                      <span className="search-result-meta">
                        来源问题：{item.issueId} · 字段：{labelSearchMatchedFields(item)}
                        {item.status ? ` · 状态：${labelIssueStatus(item.status)}` : ""}
                        {item.errorCode ? ` · ${item.errorCode}` : ""}
                        {item.tags && item.tags.length > 0 ? ` · 标签：${formatTags(item.tags)}` : ""}
                      </span>
                    </button>
                    {currentIssueId !== null && !isCurrentIssue && (
                      <div className="search-result-actions">
                        <button
                          type="button"
                          className="link-history-button"
                          onClick={() => onLinkHistoricalIssue(item.issueId)}
                          disabled={isLinked}
                          data-testid="knowledge-search-link-result"
                        >
                          {isLinked ? "已关联到当前问题" : "关联到当前问题"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function SimilarIssuesPanel({
  result,
  isLoading,
  currentIssueId,
  relatedHistoricalIssueIds,
  onOpenIssue,
  onLinkHistoricalIssue,
}: {
  result: SimilarIssuesResult | null;
  isLoading: boolean;
  currentIssueId: string | null;
  relatedHistoricalIssueIds: string[];
  onOpenIssue: (id: string) => void;
  onLinkHistoricalIssue: (id: string) => void;
}) {
  if (result === null && !isLoading) {
    return null;
  }
  return (
    <section className="similar-issues-panel" data-testid="similar-issues-panel">
      <header className="similar-issues-header">
        <span className="similar-issues-badge">规则匹配</span>
        <div>
          <h3>相似历史问题</h3>
          <p>基于标题、现象、标签、根因和处理方式的可解释重合；不做 AI 判因。</p>
        </div>
      </header>
      {isLoading && <p className="storage-line">正在扫描当前项目历史问题...</p>}
      {!isLoading && result !== null && result.items.length === 0 && (
        <p className="empty-state" data-testid="similar-issues-empty">
          当前项目暂未发现足够相似的已解决 / 已归档历史问题。
        </p>
      )}
      {!isLoading && result !== null && result.items.length > 0 && (
        <ul className="similar-issues-list" data-testid="similar-issues-results">
          {result.items.map((item) => {
            const isCurrentIssue = currentIssueId === item.issueId;
            const isLinked = relatedHistoricalIssueIds.includes(item.issueId);
            return (
              <li key={item.issueId} className="similar-issues-item">
                <button
                  type="button"
                  className="similar-issues-button"
                  onClick={() => onOpenIssue(item.issueId)}
                  data-testid="similar-issues-result-item"
                >
                  <span className="similar-issues-title-row">
                    <span className="similar-issues-score">{item.score}</span>
                    <span className="similar-issues-title">{item.title}</span>
                  </span>
                  <span className="similar-issues-meta">
                    {item.issueId} · {labelIssueStatus(item.status)}
                    {item.errorCode ? ` · ${item.errorCode}` : ""}
                    {item.archiveFileName ? ` · ${item.archiveFileName}` : ""}
                  </span>
                  <span className="similar-issues-reasons">{item.reasons.join("；")}</span>
                  {item.rootCauseSummary && (
                    <span className="similar-issues-summary">根因：{item.rootCauseSummary}</span>
                  )}
                  {item.resolutionSummary && (
                    <span className="similar-issues-summary">处理：{item.resolutionSummary}</span>
                  )}
                </button>
                {currentIssueId !== null && !isCurrentIssue && (
                  <div className="search-result-actions">
                    <button
                      type="button"
                      className="link-history-button"
                      onClick={() => onLinkHistoricalIssue(item.issueId)}
                      disabled={isLinked}
                      data-testid="similar-issues-link-result"
                    >
                      {isLinked ? "已关联到当前问题" : "关联到当前问题"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RelatedHistoricalIssuesPanel({
  issue,
  onOpenIssue,
  onUnlinkHistoricalIssue,
}: {
  issue: IssueCard | null;
  onOpenIssue: (id: string) => void;
  onUnlinkHistoricalIssue: (id: string) => void;
}) {
  const relatedIssueIds = issue?.relatedHistoricalIssueIds ?? [];
  if (issue === null || relatedIssueIds.length === 0) {
    return null;
  }
  return (
    <section className="related-history-panel" data-testid="related-history-panel">
      <header className="related-history-header">
        <span className="similar-issues-badge">人工关联</span>
        <div>
          <h3>已关联历史问题</h3>
          <p>这些引用只帮助人工复盘，不会自动改根因、解决方案或结案状态。</p>
        </div>
      </header>
      <ul className="related-history-list" data-testid="related-history-list">
        {relatedIssueIds.map((issueId) => (
          <li key={issueId} className="related-history-item">
            <button
              type="button"
              className="related-history-open"
              onClick={() => onOpenIssue(issueId)}
              data-testid="related-history-open"
            >
              {issueId}
            </button>
            <button
              type="button"
              className="link-history-button link-history-button-danger"
              onClick={() => onUnlinkHistoricalIssue(issueId)}
              data-testid="related-history-unlink"
            >
              取消关联
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecurrencePromptPanel({
  prompt,
  relatedHistoricalIssueIds,
  onOpenIssue,
  onLinkHistoricalIssue,
  onDismiss,
}: {
  prompt: RecurrencePrompt | null;
  relatedHistoricalIssueIds: string[];
  onOpenIssue: (id: string) => void;
  onLinkHistoricalIssue: (id: string) => void;
  onDismiss: () => void;
}) {
  if (prompt === null) {
    return null;
  }
  const isLinked = relatedHistoricalIssueIds.includes(prompt.issueId);
  return (
    <section className="recurrence-prompt-panel" data-testid="recurrence-prompt-panel">
      <header className="recurrence-prompt-header">
        <span className="recurrence-prompt-badge">可能复发</span>
        <div>
          <h3>可参考历史处理方式</h3>
          <p>这是规则提示，不是事实判断；请人工确认后再复用处理方案。</p>
        </div>
      </header>
      <div className="recurrence-prompt-body">
        <button
          type="button"
          className="recurrence-prompt-title"
          onClick={() => onOpenIssue(prompt.issueId)}
          data-testid="recurrence-prompt-open"
        >
          {prompt.title}
        </button>
        <p className="recurrence-prompt-meta">
          来源问题：{prompt.issueId} · 相似度 {prompt.score}
          {prompt.errorCode ? ` · ${prompt.errorCode}` : ""}
          {prompt.tags.length > 0 ? ` · 标签：${formatTags(prompt.tags)}` : ""}
        </p>
        <p className="recurrence-prompt-reasons">依据：{prompt.reasons.join("；")}</p>
        {prompt.rootCauseSummary && (
          <p className="recurrence-prompt-summary">历史根因：{prompt.rootCauseSummary}</p>
        )}
        {prompt.resolutionSummary && (
          <p className="recurrence-prompt-summary">历史处理：{prompt.resolutionSummary}</p>
        )}
      </div>
      <div className="recurrence-prompt-actions">
        <button
          type="button"
          className="link-history-button"
          onClick={() => onLinkHistoricalIssue(prompt.issueId)}
          disabled={isLinked}
          data-testid="recurrence-prompt-link"
        >
          {isLinked ? "已关联到当前问题" : "关联这条历史问题"}
        </button>
        <button
          type="button"
          className="recurrence-prompt-dismiss"
          onClick={onDismiss}
          data-testid="recurrence-prompt-dismiss"
        >
          忽略本次提示
        </button>
      </div>
    </section>
  );
}

const INVESTIGATION_TYPES: InvestigationType[] = [
  "observation",
  "hypothesis",
  "action",
  "result",
  "conclusion",
  "note",
];

const INVESTIGATION_TYPE_LABELS: Record<InvestigationType, string> = {
  observation: "观察",
  hypothesis: "假设",
  action: "动作",
  result: "结果",
  conclusion: "结论",
  note: "备注",
};

type InvestigationSubmitStatus =
  | { state: "idle" }
  | { state: "saved"; id: string; at: string }
  | { state: "error"; reason: string };

function InvestigationAppendForm({
  repository,
  issueId,
  onAppended,
  reportStorageError,
  clearStorageFeedback,
}: {
  repository: StorageRepository;
  issueId: string;
  onAppended: () => void;
  reportStorageError: (error: StorageFeedbackError) => void;
  clearStorageFeedback: () => void;
}) {
  const [type, setType] = useState<InvestigationType>("observation");
  const [note, setNote] = useState<string>("");
  const [status, setStatus] = useState<InvestigationSubmitStatus>({ state: "idle" });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: InvestigationIntakeInput = { issueId, type, note };
    const result: InvestigationIntakeResult = buildInvestigationRecordFromIntake(
      input,
      defaultInvestigationIntakeOptions(nowISOInvestigation()),
    );
    if (!result.ok) {
      reportStorageError(
        createValidationStorageFeedbackError(
          "investigation_append",
          "save_record",
          result.reason,
        ),
      );
      setStatus({ state: "error", reason: "请查看顶部统一存储提示" });
      return;
    }
    const saved = await repository.investigationRecords.append(result.record);
    if (!saved.ok) {
      reportStorageError(
        storageWriteErrorToFeedback("investigation_append", "save_record", saved.error),
      );
      setStatus({
        state: "error",
        reason: "请查看顶部统一存储提示",
      });
      return;
    }
    clearStorageFeedback();
    setStatus({ state: "saved", id: result.record.id, at: result.record.createdAt });
    setNote("");
    setType("observation");
    onAppended();
  };

  return (
    <form className="intake-form" onSubmit={handleSubmit} data-testid="investigation-append-form">
      <div className="form-caption">
        <h3>3. 追加排查记录</h3>
        <p>把观察、假设、动作和结果按时间线沉淀下来。</p>
      </div>
      <p className="storage-line" data-testid="investigation-target">
        当前问题：{issueId}
      </p>
      <label className="intake-field">
        <span>记录类型</span>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as InvestigationType)}
        >
          {INVESTIGATION_TYPES.map((value) => (
            <option key={value} value={value}>
              {INVESTIGATION_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="intake-field">
        <span>排查记录</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="写下刚看到的现象、尝试过的动作或下一步判断"
        />
      </label>
      <div className="intake-actions">
        <button type="submit">追加记录</button>
      </div>
      <p className="storage-line" data-testid="investigation-status">
        追记状态：{renderInvestigationStatus(status)}
      </p>
    </form>
  );
}

function renderInvestigationStatus(status: InvestigationSubmitStatus): string {
  switch (status.state) {
    case "idle":
      return "待选择类型并填写记录";
    case "saved":
      return `已追加 · ${status.id} · ${status.at}`;
    case "error":
      return `追加失败：${status.reason}`;
  }
}

function InvestigationRecordListView({
  result,
  onRefresh,
}: {
  result: InvestigationRecordListResult | null;
  onRefresh: () => void;
}) {
  return (
    <div className="list-view" data-testid="investigation-record-list">
      <div className="form-caption">
        <h3>排查时间线</h3>
        <p>读回当前问题卡下的排查记录，按创建时间从早到晚展示。</p>
      </div>
      <div className="list-header">
        <button type="button" className="button-secondary" onClick={onRefresh}>
          刷新记录
        </button>
        <span className="storage-line" data-testid="record-list-summary">
          {result === null
            ? "先选中一个问题卡"
            : `记录 ${result.valid.length} 条 · 异常 ${result.invalid.length} 条`}
        </span>
      </div>
      {result && result.readError === null && result.valid.length === 0 && result.invalid.length === 0 && (
        <p className="empty-state">还没有排查记录。选中问题后，在上方追加第一条记录。</p>
      )}
      {result && result.valid.length > 0 && (
        <ol className="record-timeline" data-testid="record-timeline">
          {result.valid.map((record, index) => (
            <li
              key={record.id}
              className="record-timeline-item"
              data-record-type={record.type}
              data-testid="record-timeline-item"
            >
              <span className="record-timeline-marker" aria-hidden="true">
                {index + 1}
              </span>
              <article className="record-timeline-card">
                <div className="record-timeline-header">
                  <span className="record-type-chip">
                    {labelInvestigationType(record.type)}
                  </span>
                  <time className="record-timeline-time" dateTime={record.createdAt}>
                    {record.createdAt}
                  </time>
                </div>
                <p className="record-timeline-text">{record.polishedText}</p>
                <span className="list-item-id">编号：{record.id}</span>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

type CloseoutSubmitStatus =
  | { state: "idle" }
  | { state: "saved"; fileName: string; errorCode: string; at: string }
  | { state: "error"; reason: string; preservationHint?: string };

type CloseoutSummary = {
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

function CloseoutForm({
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
    setHasAttemptedSubmit(false);
  }, [issueId]);

  const handleGenerateDraft = () => {
    if (issueCard === null) return;
    const generatedDraft = buildRuleCloseoutDraft(issueCard, records);
    const historyEntry = createCloseoutDraftHistoryEntry({
      issueId,
      issueTitle: issueCard.title,
      generatedAt: new Date().toISOString(),
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
        <h3>4. 结案归档</h3>
        <p>填写根因和处理结论，经 HTTP 写入归档摘要与错误表条目。</p>
      </div>
      <p className="storage-line" data-testid="closeout-target">
        结案对象：{issueId}
      </p>
      <section className="closeout-quality-panel" data-testid="closeout-quality-panel" aria-label="结案填写检查">
        <div className="closeout-quality-header">
          <span>结案填写检查</span>
          <p>提交前至少补齐根因和修复/结论；分类和预防建议会提升后续检索复用。</p>
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
            <span className="closeout-draft-eyebrow">AI-ready 规则草稿</span>
            <p>本区只用本地规则生成可审阅草稿，不调用外部 AI，也不会自动写库。</p>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={handleGenerateDraft}
            disabled={issueCard === null}
            data-testid="closeout-draft-generate"
          >
            生成规则草稿
          </button>
        </div>
        {issueCard === null && (
          <p className="storage-line">问题卡详情仍在读取中，稍后可生成草稿。</p>
        )}
        <p className="storage-line" data-testid="closeout-draft-history-state">
          草稿历史：{renderDraftHistoryStatus(draftHistoryStatus)}
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
              尚无本问题的草稿历史；生成后会保存在浏览器本地，便于对比多次规则输出。
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
          用模块、故障类型或场景命名，后续错误表和搜索会更容易复用。
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
          写“为什么发生”，不要只写“已修好”或复述现象。
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
          写清实际动作、验证结果或为什么可以结案。
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
          可留空；系统会按修复/结论生成默认预防项，但人工填写通常更可执行。
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

function renderDraftHistoryStatus(status: DraftHistoryStatus): string {
  switch (status) {
    case "idle":
      return "浏览器本地保存，仅用于审阅，不写入归档 / 错误表 / 问题卡。";
    case "stored":
      return "已保存到浏览器本地历史；仍是规则草稿，未调用真实 AI。";
    case "session-only":
      return "localStorage 不可用，本次会话内可审阅；未调用真实 AI。";
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

function renderSaveStatus(status: SaveStatus): string {
  switch (status.state) {
    case "idle":
      return "尚未保存";
    case "saved":
      return `已保存 · ${status.at}`;
    case "error":
      return `保存失败：${status.reason}`;
  }
}

function MainlineResultPanel({
  selectedCard,
  recordCount,
  lastCloseout,
}: {
  selectedCard: IssueCard | null;
  recordCount: number;
  lastCloseout: CloseoutSummary | null;
}) {
  if (selectedCard === null && lastCloseout === null) {
    return null;
  }
  return (
    <section className="mainline-panel" data-testid="mainline-panel">
      <header className="mainline-panel-header">
        <span className="mainline-panel-badge">主线状态</span>
        <h3>当前闭环进度</h3>
      </header>
      {selectedCard !== null && (
        <div className="mainline-panel-section" data-testid="mainline-current">
          <div className="mainline-section-label">当前问题卡</div>
          <div className="mainline-card-row">
            <span className="mainline-card-title">
              {selectedCard.title || "未命名问题"}
            </span>
            <span
              className={`mainline-status-chip mainline-status-${selectedCard.status}`}
              data-testid="mainline-status-chip"
            >
              {labelIssueStatus(selectedCard.status)}
            </span>
          </div>
          <ul className="mainline-card-meta">
            <li>
              <span className="mainline-meta-label">编号</span>
              <span className="mainline-meta-value">{selectedCard.id}</span>
            </li>
            <li>
              <span className="mainline-meta-label">严重度</span>
              <span className="mainline-meta-value">{labelSeverity(selectedCard.severity)}</span>
            </li>
            <li>
              <span className="mainline-meta-label">标签</span>
              <span className="mainline-meta-value" data-testid="mainline-tags">
                {formatTags(selectedCard.tags)}
              </span>
            </li>
            <li>
              <span className="mainline-meta-label">追记</span>
              <span className="mainline-meta-value" data-testid="mainline-record-count">
                {recordCount} 条
              </span>
            </li>
            <li>
              <span className="mainline-meta-label">更新于</span>
              <span className="mainline-meta-value">{selectedCard.updatedAt}</span>
            </li>
          </ul>
        </div>
      )}
      {lastCloseout !== null && (
        <div
          className="mainline-panel-section mainline-closeout"
          data-testid="mainline-closeout"
        >
          <div className="mainline-section-label">最近一次结案归档</div>
          <dl className="mainline-closeout-fields">
            <div>
              <dt>归档文件</dt>
              <dd>{lastCloseout.archiveFileName}</dd>
            </div>
            <div>
              <dt>归档路径（后续写盘位置）</dt>
              <dd>{lastCloseout.archiveFilePath}</dd>
            </div>
            <div>
              <dt>错误表编号</dt>
              <dd>{lastCloseout.errorCode}</dd>
            </div>
            <div>
              <dt>归档时间</dt>
              <dd>{lastCloseout.archivedAt}</dd>
            </div>
            <div>
              <dt>分类</dt>
              <dd>{lastCloseout.category}</dd>
            </div>
            <div>
              <dt>标签</dt>
              <dd>{formatTags(lastCloseout.tags)}</dd>
            </div>
          </dl>
          <details className="mainline-closeout-preview">
            <summary>展开归档摘要预览</summary>
            <pre>{lastCloseout.markdownPreview}</pre>
          </details>
          <p className="mainline-closeout-note">
            归档文档与错误表条目已写入本地 WSL 后端 SQLite；后续接入 .debug_workspace 文件双写后会补真实文件落盘。
          </p>
        </div>
      )}
    </section>
  );
}

function IssuePane({
  repository,
  activeWorkspace,
  externalSelectedIssueId,
  onCloseoutResult,
  onSelectedIssueChange,
  reportStorageError,
  clearStorageFeedback,
}: {
  repository: StorageRepository;
  activeWorkspace: Workspace;
  externalSelectedIssueId: string | null;
  onCloseoutResult: (summary: CloseoutSummary) => void;
  onSelectedIssueChange: (id: string | null) => void;
  reportStorageError: (error: StorageFeedbackError) => void;
  clearStorageFeedback: () => void;
}) {
  const [cardList, setCardList] = useState<IssueCardListResult | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<IssueCard | null>(null);
  const [recordList, setRecordList] = useState<InvestigationRecordListResult | null>(null);
  const [lastCloseout, setLastCloseout] = useState<CloseoutSummary | null>(null);
  const [similarIssues, setSimilarIssues] = useState<SimilarIssuesResult | null>(null);
  const [isLoadingSimilarIssues, setIsLoadingSimilarIssues] = useState<boolean>(false);
  const [recentIssueReopenState, setRecentIssueReopenState] = useState<RecentIssueReopenState>({
    state: "checking",
  });
  const [dismissedRecurrencePrompt, setDismissedRecurrencePrompt] = useState<{
    currentIssueId: string;
    historicalIssueId: string;
  } | null>(null);

  const recentIssueStorage = getBrowserRecentIssueStorage();

  const refreshCardList = async (options: { restoreRecent?: boolean } = {}) => {
    const shouldRestoreRecent = options.restoreRecent ?? true;
    const result = await repository.issueCards.list();
    setCardList(result);
    if (result.readError !== null) {
      setRecentIssueReopenState({ state: "unavailable" });
      reportStorageError(storageReadErrorToFeedback("issue_list", "list_issues", result.readError));
      return;
    }
    if (result.invalid.length > 0) {
      reportStorageError(
        createInvalidDataStorageFeedbackError(
          "issue_list",
          "list_issues",
          `问题卡列表中有 ${result.invalid.length} 条异常数据，已跳过。`,
          "issue_card",
        ),
      );
      return;
    }
    clearStorageFeedback();
    if (shouldRestoreRecent && selectedIssueId === null && externalSelectedIssueId === null) {
      const resolved = resolveRecentIssueReopen(recentIssueStorage, activeWorkspace.id, result.valid);
      setRecentIssueReopenState(resolved.state);
      if (resolved.issueIdToOpen !== null) {
        setSelectedIssueId(resolved.issueIdToOpen);
        onSelectedIssueChange(resolved.issueIdToOpen);
        void reloadSelectedCard(resolved.issueIdToOpen, { recentState: "restored" });
        void loadRecordList(resolved.issueIdToOpen);
        setLastCloseout(null);
        setSimilarIssues(null);
        setDismissedRecurrencePrompt(null);
      }
    }
  };

  useEffect(() => {
    void refreshCardList({ restoreRecent: true });
  }, []);

  const reloadSelectedCard = async (
    id: string,
    options: { recentState?: "recorded" | "restored" | null } = {},
  ) => {
    const loaded = await repository.issueCards.load(id);
    setSelectedCard(loaded.ok ? loaded.card : null);
    if (!loaded.ok) {
      reportStorageError(loadIssueCardFailureToFeedback("issue_detail", loaded.error));
      return;
    }
    const nextRecentState = rememberRecentIssueForReopen(
      recentIssueStorage,
      activeWorkspace.id,
      loaded.card,
    );
    setRecentIssueReopenState(
      nextRecentState.state === "recorded" && options.recentState === "restored"
        ? { state: "restored", issueId: loaded.card.id }
        : nextRecentState,
    );
    clearStorageFeedback();
  };

  const loadRecordList = async (issueId: string) => {
    const result = await repository.investigationRecords.listByIssueId(issueId);
    setRecordList(result);
    if (result.readError !== null) {
      reportStorageError(
        storageReadErrorToFeedback("investigation_list", "list_records", result.readError),
      );
      return;
    }
    if (result.invalid.length > 0) {
      reportStorageError(
        createInvalidDataStorageFeedbackError(
          "investigation_list",
          "list_records",
          `排查时间线里有 ${result.invalid.length} 条异常数据，已跳过。`,
          "investigation_record",
        ),
      );
      return;
    }
    clearStorageFeedback();
  };

  const loadSimilarIssues = async (card: IssueCard) => {
    setIsLoadingSimilarIssues(true);
    const result = await findSimilarIssuesForIssue(repository, card);
    setSimilarIssues(result);
    setIsLoadingSimilarIssues(false);
    if (result.readError !== null) {
      reportStorageError(
        storageReadErrorToFeedback("knowledge_search", "search", result.readError),
      );
    }
  };

  const refreshRecordList = () => {
    if (selectedIssueId === null) {
      setRecordList(null);
      return;
    }
    void loadRecordList(selectedIssueId);
  };

  const handleSelect = (id: string) => {
    setSelectedIssueId(id);
    onSelectedIssueChange(id);
    void reloadSelectedCard(id, { recentState: "recorded" });
    void loadRecordList(id);
    setLastCloseout(null);
  };

  useEffect(() => {
    if (externalSelectedIssueId === null || externalSelectedIssueId === selectedIssueId) {
      return;
    }
    handleSelect(externalSelectedIssueId);
  }, [externalSelectedIssueId]);

  useEffect(() => {
    if (selectedCard === null) {
      setSimilarIssues(null);
      setIsLoadingSimilarIssues(false);
      return;
    }
    void loadSimilarIssues(selectedCard);
  }, [selectedCard?.id, selectedCard?.updatedAt, repository]);

  const handleCreateNew = () => {
    setSelectedIssueId(null);
    onSelectedIssueChange(null);
    setSelectedCard(null);
    setRecordList(null);
    setLastCloseout(null);
    setSimilarIssues(null);
    setDismissedRecurrencePrompt(null);
  };

  const handleCardCreated = (id: string) => {
    void refreshCardList({ restoreRecent: false });
    setSelectedIssueId(id);
    onSelectedIssueChange(id);
    void reloadSelectedCard(id, { recentState: "recorded" });
    void loadRecordList(id);
    setLastCloseout(null);
    setSimilarIssues(null);
    setDismissedRecurrencePrompt(null);
  };

  const handleRecordAppended = () => {
    refreshRecordList();
  };

  const handleIssueClosed = (summary: CloseoutSummary) => {
    setLastCloseout(summary);
    onCloseoutResult(summary);
    void refreshCardList({ restoreRecent: false });
    void loadRecordList(summary.issueId);
    void reloadSelectedCard(summary.issueId, { recentState: null });
  };

  const saveSelectedCardUpdate = async (updatedCard: IssueCard) => {
    const saved = await repository.issueCards.save(updatedCard);
    if (!saved.ok) {
      reportStorageError(
        storageWriteErrorToFeedback("issue_detail", "create_issue", saved.error),
      );
      return false;
    }
    setSelectedCard(updatedCard);
    void refreshCardList({ restoreRecent: false });
    clearStorageFeedback();
    return true;
  };

  const handleLinkHistoricalIssue = (issueId: string) => {
    if (selectedCard === null) return;
    const updatedCard = addRelatedHistoricalIssue(selectedCard, issueId, new Date().toISOString());
    if (
      updatedCard.updatedAt === selectedCard.updatedAt &&
      updatedCard.relatedHistoricalIssueIds.join("\0") === selectedCard.relatedHistoricalIssueIds.join("\0")
    ) {
      return;
    }
    void saveSelectedCardUpdate(updatedCard);
  };

  const handleUnlinkHistoricalIssue = (issueId: string) => {
    if (selectedCard === null) return;
    const updatedCard = removeRelatedHistoricalIssue(selectedCard, issueId, new Date().toISOString());
    if (
      updatedCard.updatedAt === selectedCard.updatedAt &&
      updatedCard.relatedHistoricalIssueIds.join("\0") === selectedCard.relatedHistoricalIssueIds.join("\0")
    ) {
      return;
    }
    void saveSelectedCardUpdate(updatedCard);
  };

  const recordCount = recordList?.valid.length ?? 0;
  const relatedHistoricalIssueIds = selectedCard?.relatedHistoricalIssueIds ?? [];
  const ignoredRecurrenceIssueIds =
    dismissedRecurrencePrompt !== null && dismissedRecurrencePrompt.currentIssueId === selectedIssueId
      ? [dismissedRecurrencePrompt.historicalIssueId]
      : [];
  const recurrencePrompt = buildRecurrencePrompt(similarIssues, ignoredRecurrenceIssueIds);

  return (
    <div className="issue-pane-stack">
      <QuickIssueCreateBar
        repository={repository}
        workspaceId={activeWorkspace.id}
        onCreated={handleCardCreated}
        reportStorageError={reportStorageError}
        clearStorageFeedback={clearStorageFeedback}
      />
      <KnowledgeAssistPanel
        searchPanel={(
          <SearchPanel
            repository={repository}
            currentIssueId={selectedIssueId}
            relatedHistoricalIssueIds={relatedHistoricalIssueIds}
            onOpenIssue={handleSelect}
            onLinkHistoricalIssue={handleLinkHistoricalIssue}
            reportStorageError={reportStorageError}
            clearStorageFeedback={clearStorageFeedback}
          />
        )}
      />
      <div className="issue-workbench">
        <aside className="issue-rail" aria-label="问题卡选择区">
          <IssueCardListView
            result={cardList}
            activeWorkspace={activeWorkspace}
            selectedIssueId={selectedIssueId}
            recentIssueReopenState={recentIssueReopenState}
            onCreateNew={handleCreateNew}
            onRefresh={refreshCardList}
            onSelect={handleSelect}
          />
        </aside>
        <IssueMainFlow
          selectedIssueId={selectedIssueId}
          activeWorkspaceName={activeWorkspace.name}
          createIssueForm={(
            <IssueIntakeForm
              repository={repository}
              workspaceId={activeWorkspace.id}
              isDefaultMode
              onCreated={handleCardCreated}
              reportStorageError={reportStorageError}
              clearStorageFeedback={clearStorageFeedback}
            />
          )}
          demoHint={<DemoHint />}
          mainlinePanel={(
            <MainlineResultPanel
              selectedCard={selectedCard}
              recordCount={recordCount}
              lastCloseout={lastCloseout}
            />
          )}
          knowledgeAssistPanel={(
            <KnowledgeAssistPanel
              recurrencePromptPanel={selectedIssueId !== null && !isLoadingSimilarIssues ? (
                <RecurrencePromptPanel
                  prompt={recurrencePrompt}
                  relatedHistoricalIssueIds={relatedHistoricalIssueIds}
                  onOpenIssue={handleSelect}
                  onLinkHistoricalIssue={handleLinkHistoricalIssue}
                  onDismiss={() => {
                    if (selectedIssueId !== null && recurrencePrompt !== null) {
                      setDismissedRecurrencePrompt({
                        currentIssueId: selectedIssueId,
                        historicalIssueId: recurrencePrompt.issueId,
                      });
                    }
                  }}
                />
              ) : null}
              relatedHistoricalIssuesPanel={(
                <RelatedHistoricalIssuesPanel
                  issue={selectedCard}
                  onOpenIssue={handleSelect}
                  onUnlinkHistoricalIssue={handleUnlinkHistoricalIssue}
                />
              )}
              similarIssuesPanel={selectedIssueId !== null ? (
                <SimilarIssuesPanel
                  result={similarIssues}
                  isLoading={isLoadingSimilarIssues}
                  currentIssueId={selectedIssueId}
                  relatedHistoricalIssueIds={relatedHistoricalIssueIds}
                  onOpenIssue={handleSelect}
                  onLinkHistoricalIssue={handleLinkHistoricalIssue}
                />
              ) : null}
            />
          )}
          investigationAppendForm={selectedIssueId !== null ? (
            <InvestigationAppendForm
              repository={repository}
              issueId={selectedIssueId}
              onAppended={handleRecordAppended}
              reportStorageError={reportStorageError}
              clearStorageFeedback={clearStorageFeedback}
            />
          ) : null}
          investigationRecordList={(
            <InvestigationRecordListView
              result={recordList}
              onRefresh={refreshRecordList}
            />
          )}
          closeoutForm={selectedIssueId !== null ? (
            <CloseoutForm
              repository={repository}
              issueId={selectedIssueId}
              issueCard={selectedCard}
              records={recordList?.valid ?? []}
              onClosed={handleIssueClosed}
              reportStorageError={reportStorageError}
              clearStorageFeedback={clearStorageFeedback}
            />
          ) : null}
          issueStorageControls={(
            <IssueStorageControls
              repository={repository}
              workspaceId={activeWorkspace.id}
              reportStorageError={reportStorageError}
              clearStorageFeedback={clearStorageFeedback}
            />
          )}
        />
      </div>
    </div>
  );
}

function renderLoadStatus(result: LoadIssueCardResult | null): string {
  if (result === null) return "尚未读取";
  if (result.ok) {
    return `读取成功 · ${result.card.id} · ${result.card.title} · ${labelIssueStatus(result.card.status)}`;
  }
  return "读取失败：请查看顶部统一存储提示";
}

type Pane = {
  id: "project" | "issue" | "archive";
  title: string;
  badge: string;
  hint: string;
  status: string;
  bullets: string[];
};

const PANES: Pane[] = [
  {
    id: "project",
    title: "项目区",
    badge: "上下文",
    hint: "选择或创建当前调试项目，后续问题卡都落在该项目边界内。",
    status: "当前联调：项目列表与创建走 /api + 本地 WSL backend + SQLite",
    bullets: [
      `默认工作区：${DEFAULT_WORKSPACE_NAME} 保留`,
      "新项目：创建成功后自动切换",
      "仓库快照：后续接入 Git",
      "文件写盘：后续接入 .debug_workspace",
    ],
  },
  {
    id: "issue",
    title: "问题卡区",
    badge: "主流程",
    hint: "创建问题卡、追加排查记录、结案生成本地归档摘要。",
    status: "当前可用：问题卡、排查记录、结案归档经 HTTP 写入 SQLite",
    bullets: [],
  },
  {
    id: "archive",
    title: "归档区",
    badge: "沉淀物",
    hint: "结案后会沉淀的归档资产。",
    status: "当前演示：服务器 SQLite，后续补文件双写",
    bullets: [
      "归档文档：结案摘要（SQLite）",
      "错误表条目：复发检索入口（SQLite）",
      "后续：.debug_workspace 文件双写",
    ],
  },
];

function labelSeverity(severity: IssueCard["severity"] | IntakeSeverity): string {
  return SEVERITY_LABELS[severity];
}

function labelIssueStatus(status: IssueCard["status"]): string {
  const labels: Record<IssueCard["status"], string> = {
    open: "处理中",
    investigating: "排查中",
    resolved: "已解决",
    archived: "已归档",
    needs_manual_review: "需人工复核",
  };
  return labels[status];
}

function labelSearchResultKind(kind: StorageSearchResultItem["kind"]): string {
  const labels: Record<StorageSearchResultItem["kind"], string> = {
    issue: "问题卡",
    record: "排查记录",
    archive: "归档摘要",
    error_entry: "错误表",
  };
  return labels[kind];
}

function labelSearchMatchedFields(item: StorageSearchResultItem): string {
  if (item.matchedFields.length === 0) {
    return "未标注";
  }
  return item.matchedFields.join(" / ");
}

function labelInvestigationType(type: InvestigationType): string {
  return INVESTIGATION_TYPE_LABELS[type];
}

function StaticPaneShell({ pane }: { pane: Pane }) {
  return (
    <div className="demo-shell">
      <div className="demo-status-row">
        <span className="demo-status-label">当前状态</span>
        <p className="pane-status">{pane.status}</p>
      </div>
      <ul className="demo-list">
        {pane.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ArchivePaneShell({
  pane,
  archiveIndex,
  onOpenList,
}: {
  pane: Pane;
  archiveIndex: ArchiveIndex;
  onOpenList?: () => void;
}) {
  const latest = archiveIndex.items[0] ?? null;
  const total = archiveIndex.items.length;
  return (
    <div className="archive-pane-stack" data-testid="archive-panel">
      <StaticPaneShell pane={pane} />
      {onOpenList !== undefined && (
        <div className="archive-summary-row" data-testid="archive-summary-row">
          <span
            className="archive-count-chip"
            data-testid="archive-count-chip"
            data-total={total}
          >
            累计归档 {total} 条
          </span>
          <button
            type="button"
            className="button-secondary"
            onClick={onOpenList}
            disabled={total === 0}
            data-testid="archive-open-list-button"
          >
            查看归档列表
          </button>
        </div>
      )}
      {archiveIndex.invalidCount > 0 && (
        <p className="storage-line" data-testid="archive-invalid-note">
          有 {archiveIndex.invalidCount} 条归档相关异常数据已跳过；详细原因见顶部统一存储提示。
        </p>
      )}
      {latest === null ? (
        <p className="empty-state archive-empty-state" data-testid="archive-empty-state">
          尚无归档结果。完成问题卡区第 4 步“结案并生成归档摘要”后，这里会显示累计归档数量与最近一次归档摘要，刷新也不会丢失。
        </p>
      ) : (
        <section className="archive-result-panel" data-testid="archive-result-panel">
          <header className="archive-result-header">
            <span className="archive-result-badge">最近一次</span>
            <h3>最近一次归档摘要</h3>
          </header>
          <p className="archive-result-status" data-testid="archive-result-status">
            已生成 ArchiveDocument 与 ErrorEntry，已写入本地 WSL 后端 SQLite；刷新页面仍可读回。
          </p>
          <dl className="archive-result-fields">
            <div>
              <dt>归档摘要</dt>
              <dd>{latest.fileName}</dd>
            </div>
            <div>
              <dt>错误表编号</dt>
              <dd>{latest.errorCode ?? "(未记录)"}</dd>
            </div>
            <div>
              <dt>来源问题</dt>
              <dd>{latest.issueId}</dd>
            </div>
            <div>
              <dt>分类</dt>
              <dd>{latest.category ?? "(未记录)"}</dd>
            </div>
            <div>
              <dt>标签</dt>
              <dd>{formatTags(latest.tags)}</dd>
            </div>
            <div>
              <dt>归档时间</dt>
              <dd>{latest.generatedAt}</dd>
            </div>
          </dl>
          <p className="archive-result-note">
            后续文件写盘位置：{latest.filePath}。当前阶段不伪装为已接入 .debug_workspace。
          </p>
        </section>
      )}
    </div>
  );
}

export function ArchiveListDrawer({
  open,
  archivePane,
  archiveIndex,
  onClose,
  onOpenIssue,
}: {
  open: boolean;
  archivePane: Pane;
  archiveIndex: ArchiveIndex;
  onClose: () => void;
  onOpenIssue?: (issueId: string) => void;
}) {
  const { items } = archiveIndex;
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedFilePath((current) => {
      if (current !== null && items.some((item) => item.filePath === current)) {
        return current;
      }
      return items[0]?.filePath ?? null;
    });
  }, [open, items]);

  if (!open) return null;
  const selectedItem = items.find((item) => item.filePath === selectedFilePath) ?? items[0] ?? null;

  const handleOpenIssue = (issueId: string) => {
    onOpenIssue?.(issueId);
  };

  return (
    <div
      className="archive-drawer-overlay"
      data-testid="archive-drawer"
      role="dialog"
      aria-label="归档列表"
      onClick={onClose}
    >
      <div
        className="archive-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="archive-drawer-header">
          <div className="archive-drawer-title">
            <h3>归档区</h3>
            <span className="archive-drawer-count">共 {items.length} 条（按归档时间倒序）</span>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={onClose}
            data-testid="archive-drawer-close"
          >
            关闭
          </button>
        </header>
        <ArchivePaneShell pane={archivePane} archiveIndex={archiveIndex} />
        {items.length > 0 && (
          <div className="archive-review-layout" data-testid="archive-review-page">
            <div className="archive-drawer-section">
              <div className="archive-drawer-section-label">全部归档条目</div>
              <ul className="archive-drawer-list" data-testid="archive-drawer-list">
                {items.map((item) => {
                  const selected = selectedItem?.filePath === item.filePath;
                  return (
                    <li key={item.filePath} className="archive-drawer-item">
                      <button
                        type="button"
                        className="archive-drawer-item-button"
                        aria-current={selected ? "true" : undefined}
                        data-selected={selected ? "true" : "false"}
                        onClick={() => setSelectedFilePath(item.filePath)}
                        data-testid="archive-review-select"
                      >
                        <span className="archive-drawer-item-row">
                          <span className="archive-drawer-file">{item.fileName}</span>
                          <span className="archive-drawer-time">{item.generatedAt}</span>
                        </span>
                        <span className="archive-drawer-item-hint">
                          {item.errorCode ?? "未绑定错误表"} · {formatTags(item.tags)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            {selectedItem !== null && (
              <section className="archive-review-panel" data-testid="archive-review-panel">
                <div className="archive-drawer-section-label">归档复盘预览</div>
                <div className="archive-review-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => handleOpenIssue(selectedItem.issueId)}
                    data-testid="archive-review-open-issue"
                  >
                    打开来源问题
                  </button>
                </div>
                <dl className="archive-drawer-meta archive-review-meta">
                  <div>
                    <dt>来源问题</dt>
                    <dd>{selectedItem.issueId}</dd>
                  </div>
                  <div>
                    <dt>错误表编号</dt>
                    <dd>{selectedItem.errorCode ?? "(未记录)"}</dd>
                  </div>
                  <div>
                    <dt>错误表条目</dt>
                    <dd data-testid="archive-review-error-entry-link">{selectedItem.errorEntryId ?? "(未记录)"}</dd>
                  </div>
                  <div>
                    <dt>分类</dt>
                    <dd>{selectedItem.category ?? "(未记录)"}</dd>
                  </div>
                  <div>
                    <dt>标签</dt>
                    <dd>{formatTags(selectedItem.tags)}</dd>
                  </div>
                  <div>
                    <dt>后续写盘位置</dt>
                    <dd>{selectedItem.filePath}</dd>
                  </div>
                </dl>
                <pre className="archive-review-markdown" data-testid="archive-review-markdown">{selectedItem.markdownContent}</pre>
              </section>
            )}
          </div>
        )}
        <p className="archive-drawer-note">
          当前归档来自本地 WSL 后端 SQLite，不是 .debug_workspace 文件写盘；接入 Electron / fs 后这里会补真实文件路径。
        </p>
      </div>
    </div>
  );
}

type WorkspaceCreateStatus =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; id: string }
  | { state: "error"; reason: string };

function renderWorkspaceCreateStatus(status: WorkspaceCreateStatus): string {
  switch (status.state) {
    case "idle":
      return "输入名称后创建";
    case "saving":
      return "正在创建并写入服务器";
    case "saved":
      return `已创建并切换 · ${status.id}`;
    case "error":
      return `项目创建失败：${status.reason}；确认上方项目与存储状态后可重试`;
  }
}

function mergeWorkspaceItems(
  result: WorkspaceListResult | null,
  activeWorkspace: Workspace,
): Workspace[] {
  const items = result?.valid ?? [];
  if (items.some((workspace) => workspace.id === activeWorkspace.id)) {
    return items;
  }
  return [activeWorkspace, ...items];
}

function ProjectSelector({
  pane,
  open,
  activeWorkspace,
  workspaceList,
  onToggle,
  onClose,
  onRefreshWorkspaces,
  onSelectWorkspace,
  onCreateWorkspace,
}: {
  pane: Pane;
  open: boolean;
  activeWorkspace: Workspace;
  workspaceList: WorkspaceListResult | null;
  onToggle: () => void;
  onClose: () => void;
  onRefreshWorkspaces: () => void;
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: (name: string) => Promise<CreateWorkspaceResult>;
}) {
  const [name, setName] = useState<string>("");
  const [createStatus, setCreateStatus] = useState<WorkspaceCreateStatus>({ state: "idle" });
  const workspaces = mergeWorkspaceItems(workspaceList, activeWorkspace);
  const workspaceListReadFailed = workspaceList?.readError !== null && workspaceList?.readError !== undefined;
  const workspaceListEmpty = workspaceList !== null && workspaceList.readError === null && workspaceList.valid.length === 0;

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setCreateStatus({ state: "error", reason: "项目名称不能为空" });
      return;
    }
    setCreateStatus({ state: "saving" });
    const result = await onCreateWorkspace(trimmedName);
    if (!result.ok) {
      setCreateStatus({ state: "error", reason: "请查看上方项目与存储状态" });
      return;
    }
    setName("");
    setCreateStatus({ state: "saved", id: result.workspace.id });
  };

  return (
    <div className="project-selector" data-testid="project-selector">
      <button
        type="button"
        className="project-entry-button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="project-selector-popover"
        data-testid="project-selector-button"
      >
        <span className="header-entry-icon" aria-hidden="true">📁</span>
        <span className="header-entry-label project-entry-label">
          <span className="project-entry-kicker">当前项目</span>
          <span>{activeWorkspace.name}</span>
        </span>
        <span className="project-entry-id">{activeWorkspace.id}</span>
        <span className="project-entry-caret" aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div
          id="project-selector-popover"
          className="project-selector-popover"
          data-testid="project-selector-popover"
          role="dialog"
          aria-label="项目详情"
        >
          <div className="project-selector-popover-header">
            <h3>{pane.title}</h3>
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
              aria-label="关闭项目详情"
            >
              关闭
            </button>
          </div>
          <p className="pane-hint">{pane.hint}</p>
          <section className="project-current-card" data-testid="project-current-card">
            <span className="project-current-label">当前项目</span>
            <strong>{activeWorkspace.name}</strong>
            <span className="project-current-id">{activeWorkspace.id}</span>
            <p className="project-current-note" data-testid="project-current-note">
              问题卡、排查记录、归档和错误表都会写入这个项目；切换项目会清空当前选中问题，但不会删除已有数据。
            </p>
          </section>
          <div className="project-selector-section">
            <div className="project-selector-section-header">
              <span>可用项目</span>
              <button type="button" className="button-secondary" onClick={onRefreshWorkspaces}>
                刷新
              </button>
            </div>
            {workspaceListReadFailed && (
              <p className="empty-state project-state-warning" data-testid="workspace-list-error">
                项目列表读取失败；当前仍停留在「{activeWorkspace.name}」。下一步：确认上方项目与存储状态后点击刷新。
              </p>
            )}
            {workspaceListEmpty && (
              <p className="empty-state project-state-empty" data-testid="workspace-list-empty">
                服务器暂未返回可切换项目；当前使用「{activeWorkspace.name}」。可以在下方创建新项目，创建后会自动切换。
              </p>
            )}
            {workspaceList !== null && workspaceList.invalid.length > 0 && (
              <p className="storage-line">有 {workspaceList.invalid.length} 个异常项目已跳过。</p>
            )}
            <ul className="project-workspace-list" data-testid="workspace-list">
              {workspaces.map((workspace) => {
                const selected = workspace.id === activeWorkspace.id;
                return (
                  <li key={workspace.id}>
                    <button
                      type="button"
                      className="project-workspace-option"
                      data-selected={selected ? "true" : "false"}
                      onClick={() => onSelectWorkspace(workspace)}
                    >
                      <span className="project-workspace-name">
                        {workspace.name}{workspace.isDefault ? "（默认）" : ""}
                      </span>
                      <span className="project-workspace-id">{workspace.id}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <form className="project-create-form" onSubmit={handleCreate} data-testid="workspace-create-form">
            <label className="intake-field">
              <span>创建新项目（创建后自动切换）</span>
              <input
                type="text"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：27年 R1 / 舵轮调试"
              />
              <small className="field-help">
                适用于不同赛季、机器人或调试分支；不会删除或迁移已有项目数据。
              </small>
            </label>
            <div className="intake-actions">
              <button type="submit" disabled={createStatus.state === "saving"}>
                创建并切换
              </button>
            </div>
            <p className="storage-line workspace-create-status" data-state={createStatus.state} data-testid="workspace-create-status">
              创建状态：{renderWorkspaceCreateStatus(createStatus)}
            </p>
          </form>
          <p className="project-selector-note">
            当前只做创建与切换；删除、重命名、成员和权限后续再接入。
          </p>
        </div>
      )}
    </div>
  );
}

function ArchiveEntryButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="archive-entry-button"
      onClick={onClick}
      disabled={count === 0}
      data-testid="archive-open-list-button"
      aria-label="查看归档列表"
    >
      <span className="header-entry-icon" aria-hidden="true">📦</span>
      <span className="header-entry-label">查看归档列表</span>
      <span
        className="archive-entry-count"
        data-testid="archive-count-chip"
        data-total={count}
      >
        {count}
      </span>
    </button>
  );
}

function CloseoutEntryButton({ issueId }: { issueId: string | null }) {
  if (issueId === null) return null;

  const handleClick = () => {
    document.getElementById(CLOSEOUT_FORM_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <button
      type="button"
      className="closeout-entry-button"
      onClick={handleClick}
      data-testid="closeout-header-action"
      aria-label={`结案当前问题 ${issueId}`}
    >
      <span className="header-entry-icon" aria-hidden="true">✅</span>
      <span className="header-entry-label">结案</span>
    </button>
  );
}

export default function App() {
  const [storageConnectionState, setStorageConnectionState] = useState<StorageConnectionState>(
    STORAGE_REPOSITORY_RUNTIME === "http"
      ? CHECKING_STORAGE_CONNECTION_STATE
      : LOCAL_STORAGE_CONNECTION_STATE,
  );
  const [storageFeedbackError, setStorageFeedbackError] = useState<StorageFeedbackError | null>(
    null,
  );
  const [storageHealthStatus, setStorageHealthStatus] = useState<HttpStorageHealthStatus | null>(
    null,
  );
  const [workspaceRepository, setWorkspaceRepository] = useState<StorageRepository>(() =>
    createStorageRepository({ workspaceId: DEFAULT_WORKSPACE_ID }),
  );
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE_SUMMARY);
  const [workspaceList, setWorkspaceList] = useState<WorkspaceListResult | null>(null);
  const [archiveIndex, setArchiveIndex] = useState<ArchiveIndex>({
    items: [],
    invalidCount: 0,
    readErrors: [],
  });
  const [isArchiveListOpen, setIsArchiveListOpen] = useState<boolean>(false);
  const [isProjectEntryOpen, setIsProjectEntryOpen] = useState<boolean>(false);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);

  const normalizeStorageFeedbackForRuntime = (error: StorageFeedbackError): StorageFeedbackError => {
    if (STORAGE_REPOSITORY_RUNTIME !== "http" || error.connectionState.state !== "local_ready") {
      return error;
    }
    return {
      ...error,
      connectionState:
        storageConnectionState.state === "local_ready"
          ? createOnlineStorageConnectionState()
          : storageConnectionState,
    };
  };

  const reportStorageError = (error: StorageFeedbackError) => {
    const normalizedError = normalizeStorageFeedbackForRuntime(error);
    setStorageConnectionState(normalizedError.connectionState);
    setStorageFeedbackError(normalizedError);
  };

  const clearStorageFeedback = () => {
    setStorageConnectionState(
      STORAGE_REPOSITORY_RUNTIME === "http"
        ? createOnlineStorageConnectionState()
        : LOCAL_STORAGE_CONNECTION_STATE,
    );
    setStorageFeedbackError(null);
  };

  const refreshWorkspaceList = async () => {
    const result = await workspaceRepository.workspaces.list();
    setWorkspaceList(result);
    if (result.readError !== null) {
      reportStorageError(
        storageReadErrorToFeedback("workspace_selector", "list_workspaces", result.readError),
      );
      return;
    }
    if (result.invalid.length > 0) {
      reportStorageError(
        createInvalidDataStorageFeedbackError(
          "workspace_selector",
          "list_workspaces",
          `项目列表中有 ${result.invalid.length} 条异常数据，已跳过。`,
          "workspace",
          createOnlineStorageConnectionState(),
        ),
      );
      return;
    }
    clearStorageFeedback();
  };

  const refreshArchiveIndex = async () => {
    const index = await loadArchiveIndex(workspaceRepository, activeWorkspace.id);
    setArchiveIndex(index);
    if (index.readErrors.length > 0) {
      reportStorageError(storageReadErrorToFeedback("archive_index", "list_archives", index.readErrors[0]!));
      return;
    }
    if (index.invalidCount > 0) {
      reportStorageError(
        createInvalidDataStorageFeedbackError(
          "archive_index",
          "list_archives",
          `归档区有 ${index.invalidCount} 条异常数据，已跳过。`,
          undefined,
          createOnlineStorageConnectionState(),
        ),
      );
      return;
    }
    clearStorageFeedback();
  };

  useEffect(() => {
    if (STORAGE_REPOSITORY_RUNTIME !== "http") {
      return;
    }
    let cancelled = false;
    const checkConnection = async () => {
      setStorageConnectionState(CHECKING_STORAGE_CONNECTION_STATE);
      const result = await checkHttpStorageHealth();
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setStorageHealthStatus(null);
        reportStorageError(healthCheckErrorToFeedback(result.error));
        return;
      }
      setStorageConnectionState(createOnlineStorageConnectionState(result.checkedAt));
      setStorageHealthStatus(result.status);
      setStorageFeedbackError(null);
    };
    void checkConnection();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshWorkspaceList();
  }, []);

  useEffect(() => {
    void refreshArchiveIndex();
  }, [workspaceRepository]);

  const handleWorkspaceSelected = (workspace: Workspace) => {
    setActiveWorkspace(workspace);
    setWorkspaceRepository(createStorageRepository({ workspaceId: workspace.id }));
    setActiveIssueId(null);
    setArchiveIndex({ items: [], invalidCount: 0, readErrors: [] });
    setIsArchiveListOpen(false);
    setIsProjectEntryOpen(false);
    clearStorageFeedback();
  };

  const handleWorkspaceCreate = async (name: string): Promise<CreateWorkspaceResult> => {
    const result = await workspaceRepository.workspaces.create({ name });
    if (!result.ok) {
      reportStorageError(
        storageWriteErrorToFeedback("workspace_selector", "create_workspace", result.error),
      );
      return result;
    }
    handleWorkspaceSelected(result.workspace);
    void refreshWorkspaceList();
    return result;
  };

  const handleCloseoutResult = (_summary: CloseoutSummary) => {
    void refreshArchiveIndex();
  };

  const projectPane = PANES.find((p) => p.id === "project")!;
  const issuePane = PANES.find((p) => p.id === "issue")!;
  const archivePane = PANES.find((p) => p.id === "archive")!;
  const archiveTotal = archiveIndex.items.length;

  return (
    <div className="app-root">
      <WorkspaceChrome
        projectSelector={(
          <ProjectSelector
            pane={projectPane}
            open={isProjectEntryOpen}
            activeWorkspace={activeWorkspace}
            workspaceList={workspaceList}
            onToggle={() => setIsProjectEntryOpen((prev) => !prev)}
            onClose={() => setIsProjectEntryOpen(false)}
            onRefreshWorkspaces={() => void refreshWorkspaceList()}
            onSelectWorkspace={handleWorkspaceSelected}
            onCreateWorkspace={handleWorkspaceCreate}
          />
        )}
        closeoutEntryButton={<CloseoutEntryButton issueId={activeIssueId} />}
        archiveEntryButton={(
          <ArchiveEntryButton
            count={archiveTotal}
            onClick={() => setIsArchiveListOpen(true)}
          />
        )}
        storageStatusBanner={(
          <StorageStatusBanner
            connectionState={storageConnectionState}
            error={storageFeedbackError}
            healthStatus={storageHealthStatus}
            activeWorkspace={activeWorkspace}
            workspaceList={workspaceList}
          />
        )}
      />
      <main className="app-main">
        <section className="pane" data-pane="issue">
          <div className="pane-heading">
            <div className="pane-title-row">
              <h2>{issuePane.title}</h2>
              <span className="pane-badge">{issuePane.badge}</span>
            </div>
            <p className="pane-hint">{issuePane.hint}</p>
          </div>
          <IssuePane
            key={activeWorkspace.id}
            repository={workspaceRepository}
            activeWorkspace={activeWorkspace}
            externalSelectedIssueId={activeIssueId}
            onCloseoutResult={handleCloseoutResult}
            onSelectedIssueChange={setActiveIssueId}
            reportStorageError={reportStorageError}
            clearStorageFeedback={clearStorageFeedback}
          />
        </section>
      </main>
      <footer className="app-footer">
        <span>当前边界：前端 /api + 本地 WSL backend + SQLite；独立部署、Electron / fs / IPC / .debug_workspace 文件写盘未接入。</span>
      </footer>
      <ArchiveListDrawer
        open={isArchiveListOpen}
        archivePane={archivePane}
        archiveIndex={archiveIndex}
        onClose={() => setIsArchiveListOpen(false)}
        onOpenIssue={(issueId) => {
          setActiveIssueId(issueId);
          setIsArchiveListOpen(false);
        }}
      />
    </div>
  );
}
