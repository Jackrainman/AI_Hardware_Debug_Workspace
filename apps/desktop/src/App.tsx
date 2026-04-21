import { useEffect, useState } from "react";
import "./App.css";
import type { IssueCard } from "./domain/schemas/issue-card";
import {
  buildIssueCardFromIntake,
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
  buildCloseoutFromIssue,
  defaultCloseoutOptions,
  nowISO as nowISOCloseout,
  type CloseoutInput,
} from "./domain/closeout";
import {
  listIssueCards,
  loadIssueCard,
  saveIssueCard,
  type IssueCardListResult,
  type LoadIssueCardResult,
} from "./storage/issue-card-store";
import {
  listInvestigationRecordsByIssueId,
  saveInvestigationRecord,
  type InvestigationRecordListResult,
} from "./storage/investigation-record-store";
import {
  listArchiveDocuments,
  saveArchiveDocument,
} from "./storage/archive-document-store";
import {
  listErrorEntries,
  saveErrorEntry,
} from "./storage/error-entry-store";

const SAMPLE_ISSUE_ID = "sample-issue-0001";
const SAMPLE_TIMESTAMP = "2026-04-21T02:30:00+08:00";

const SAMPLE_CARD: IssueCard = {
  id: SAMPLE_ISSUE_ID,
  projectId: "sample-project-0001",
  title: "示例问题卡：启动日志停在握手阶段",
  rawInput: "用于演示 localStorage 保存与读回的示例问题卡。",
  normalizedSummary: "验证问题卡可以写入浏览器本地存储并通过结构校验读回。",
  symptomSummary: "演示数据：启动流程卡在握手阶段，尚未绑定真实硬件日志。",
  suspectedDirections: ["本地存储读写演示路径"],
  suggestedActions: [
    "点击“保存示例卡”写入浏览器 localStorage。",
    "点击“读取示例卡”执行结构化读回。",
  ],
  status: "open",
  severity: "low",
  tags: ["示例", "本地存储"],
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

type SaveStatus = { state: "idle" } | { state: "saved"; at: string };

function DemoHint() {
  return (
    <div className="demo-hint" data-testid="demo-hint">
      <div className="demo-hint-title">🎯 最小演示路径</div>
      <div className="demo-hint-steps">
        <span>1️⃣ 填写上方表单 → 2️⃣ 点「刷新列表」选中 → 3️⃣ 追加排查记录 → 4️⃣ 填写结案归档</span>
      </div>
      <p className="demo-hint-note">以上步骤全部在浏览器本地执行，无需真实硬件或 Git 仓库。</p>
    </div>
  );
}

function IssueStorageControls() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: "idle" });
  const [loadResult, setLoadResult] = useState<LoadIssueCardResult | null>(null);

  const handleSave = () => {
    saveIssueCard(SAMPLE_CARD);
    setSaveStatus({ state: "saved", at: new Date().toISOString() });
  };

  const handleLoad = () => {
    setLoadResult(loadIssueCard(SAMPLE_ISSUE_ID));
  };

  return (
    <div className="storage-controls" data-testid="issue-storage-controls">
      <div className="form-caption form-caption-muted">
        <h3>辅助验证</h3>
        <p>保存/读取示例卡，验证本地存储链路。</p>
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
        保存状态：{saveStatus.state === "idle" ? "尚未保存" : `已保存 · ${saveStatus.at}`}
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

type IntakeSubmitStatus =
  | { state: "idle" }
  | { state: "saved"; id: string; at: string }
  | { state: "error"; reason: string };

function IssueIntakeForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [severity, setSeverity] = useState<IntakeSeverity>("medium");
  const [status, setStatus] = useState<IntakeSubmitStatus>({ state: "idle" });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: IntakeInput = { title, description, severity };
    const result: IntakeResult = buildIssueCardFromIntake(
      input,
      defaultIntakeOptions(nowISO()),
    );
    if (!result.ok) {
      setStatus({ state: "error", reason: result.reason });
      return;
    }
    saveIssueCard(result.card);
    setStatus({ state: "saved", id: result.card.id, at: result.card.createdAt });
    setTitle("");
    setDescription("");
    setSeverity("medium");
    onCreated(result.card.id);
  };

  return (
    <form className="intake-form" onSubmit={handleSubmit} data-testid="issue-intake-form">
      <div className="form-caption">
        <h3>1. 创建问题卡</h3>
        <p>先把现场现象记下来，系统会生成一张可追踪的问题卡。</p>
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

function IssueCardListView({
  result,
  selectedIssueId,
  onRefresh,
  onSelect,
}: {
  result: IssueCardListResult | null;
  selectedIssueId: string | null;
  onRefresh: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="list-view" data-testid="issue-card-list">
      <div className="form-caption">
        <h3>2. 选择问题卡</h3>
        <p>刷新后选择一张问题卡，再继续追加排查记录或结案。</p>
      </div>
      <div className="list-header">
        <button type="button" className="button-secondary" onClick={onRefresh}>
          刷新列表
        </button>
        <span className="storage-line" data-testid="list-summary">
          {result === null
            ? "尚未刷新"
            : `有效 ${result.valid.length} 条 · 异常 ${result.invalid.length} 条`}
        </span>
      </div>
      {result && result.valid.length === 0 && result.invalid.length === 0 && (
        <p className="empty-state">暂无问题卡。请先在上方表单填写标题并创建一张卡。</p>
      )}
      {result && result.valid.length > 0 && (
        <ul className="list-items" data-testid="list-valid">
          {result.valid.map((summary) => {
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
      {result && result.invalid.length > 0 && (
        <ul className="list-invalid" data-testid="list-invalid">
          {result.invalid.map((entry) => (
            <li key={entry.key} className="storage-line">
              异常数据 · {entry.kind === "parse_error" ? "JSON 解析失败" : "结构校验失败"} ·
              key={entry.key}
              {entry.kind === "parse_error"
                ? ` · ${entry.message}`
                : ` · ${entry.issues.length} 个字段问题`}
            </li>
          ))}
        </ul>
      )}
    </div>
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
  issueId,
  onAppended,
}: {
  issueId: string;
  onAppended: () => void;
}) {
  const [type, setType] = useState<InvestigationType>("observation");
  const [note, setNote] = useState<string>("");
  const [status, setStatus] = useState<InvestigationSubmitStatus>({ state: "idle" });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: InvestigationIntakeInput = { issueId, type, note };
    const result: InvestigationIntakeResult = buildInvestigationRecordFromIntake(
      input,
      defaultInvestigationIntakeOptions(nowISOInvestigation()),
    );
    if (!result.ok) {
      setStatus({ state: "error", reason: result.reason });
      return;
    }
    saveInvestigationRecord(result.record);
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
      {result && result.valid.length === 0 && result.invalid.length === 0 && (
        <p className="empty-state">还没有排查记录。选中问题后，在上方追加第一条记录。</p>
      )}
      {result && result.valid.length > 0 && (
        <ul className="list-items" data-testid="record-list-valid">
          {result.valid.map((record) => (
            <li key={record.id} className="list-item list-item-static">
              <span className="list-item-title">
                [{labelInvestigationType(record.type)}] {record.polishedText}
              </span>
              <span className="list-item-meta">{record.createdAt}</span>
              <span className="list-item-id">编号：{record.id}</span>
            </li>
          ))}
        </ul>
      )}
      {result && result.invalid.length > 0 && (
        <ul className="list-invalid" data-testid="record-list-invalid">
          {result.invalid.map((entry) => (
            <li key={entry.key} className="storage-line">
              异常数据 · {entry.kind === "parse_error" ? "JSON 解析失败" : "结构校验失败"} ·
              key={entry.key}
              {entry.kind === "parse_error"
                ? ` · ${entry.message}`
                : ` · ${entry.issues.length} 个字段问题`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type CloseoutSubmitStatus =
  | { state: "idle" }
  | { state: "saved"; fileName: string; errorCode: string; at: string }
  | { state: "error"; reason: string };

type CloseoutSummary = {
  issueId: string;
  archiveFileName: string;
  archiveFilePath: string;
  errorCode: string;
  errorEntryId: string;
  archivedAt: string;
  category: string;
  markdownPreview: string;
};

function CloseoutForm({
  issueId,
  onClosed,
}: {
  issueId: string;
  onClosed: (summary: CloseoutSummary) => void;
}) {
  const [category, setCategory] = useState<string>("");
  const [rootCause, setRootCause] = useState<string>("");
  const [resolution, setResolution] = useState<string>("");
  const [prevention, setPrevention] = useState<string>("");
  const [status, setStatus] = useState<CloseoutSubmitStatus>({ state: "idle" });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const loaded = loadIssueCard(issueId);
    if (!loaded.ok) {
      setStatus({
        state: "error",
        reason: `读取问题卡失败：${loaded.error.kind}`,
      });
      return;
    }

    const records = listInvestigationRecordsByIssueId(issueId);
    if (records.invalid.length > 0) {
      setStatus({
        state: "error",
        reason: `排查记录校验失败：有 ${records.invalid.length} 条异常记录`,
      });
      return;
    }

    const input: CloseoutInput = { category, rootCause, resolution, prevention };
    const now = nowISOCloseout();
    const result = buildCloseoutFromIssue(
      loaded.card,
      records.valid,
      input,
      defaultCloseoutOptions(now),
    );
    if (!result.ok) {
      setStatus({ state: "error", reason: result.reason });
      return;
    }

    saveArchiveDocument(result.archiveDocument);
    saveErrorEntry(result.errorEntry);
    saveIssueCard(result.updatedIssueCard);
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
      markdownPreview,
    });
  };

  return (
    <form className="intake-form" onSubmit={handleSubmit} data-testid="closeout-form">
      <div className="form-caption">
        <h3>4. 结案归档</h3>
        <p>填写根因和处理结论，生成浏览器本地归档摘要与错误表条目。</p>
      </div>
      <p className="storage-line" data-testid="closeout-target">
        结案对象：{issueId}
      </p>
      <label className="intake-field">
        <span>归档分类</span>
        <input
          type="text"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="例如：启动、电源、时序"
        />
      </label>
      <label className="intake-field">
        <span>根因</span>
        <textarea
          value={rootCause}
          onChange={(event) => setRootCause(event.target.value)}
          rows={3}
          placeholder="说明已经确认或当前最可信的根因"
          required
        />
      </label>
      <label className="intake-field">
        <span>修复/结论</span>
        <textarea
          value={resolution}
          onChange={(event) => setResolution(event.target.value)}
          rows={3}
          placeholder="说明修复动作、绕过方案或结案依据"
          required
        />
      </label>
      <label className="intake-field">
        <span>预防建议</span>
        <textarea
          value={prevention}
          onChange={(event) => setPrevention(event.target.value)}
          rows={2}
          placeholder="后续如何避免复发，可留空"
        />
      </label>
      <div className="intake-actions">
        <button type="submit">结案并生成归档摘要</button>
      </div>
      <p className="storage-line" data-testid="closeout-status">
        结案状态：{renderCloseoutStatus(status)}
      </p>
    </form>
  );
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
          </dl>
          <details className="mainline-closeout-preview">
            <summary>展开归档摘要预览</summary>
            <pre>{lastCloseout.markdownPreview}</pre>
          </details>
          <p className="mainline-closeout-note">
            归档文档与错误表条目已写入浏览器本地存储；后续接入 .debug_workspace 文件系统双写后将落到上面的路径。
          </p>
        </div>
      )}
    </section>
  );
}

function IssuePane({ onCloseoutResult }: { onCloseoutResult: (summary: CloseoutSummary) => void }) {
  const [cardList, setCardList] = useState<IssueCardListResult | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<IssueCard | null>(null);
  const [recordList, setRecordList] = useState<InvestigationRecordListResult | null>(null);
  const [lastCloseout, setLastCloseout] = useState<CloseoutSummary | null>(null);

  const refreshCardList = () => {
    setCardList(listIssueCards());
  };

  const reloadSelectedCard = (id: string) => {
    const loaded = loadIssueCard(id);
    setSelectedCard(loaded.ok ? loaded.card : null);
  };

  const refreshRecordList = () => {
    if (selectedIssueId === null) {
      setRecordList(null);
      return;
    }
    setRecordList(listInvestigationRecordsByIssueId(selectedIssueId));
  };

  const handleSelect = (id: string) => {
    setSelectedIssueId(id);
    reloadSelectedCard(id);
    setRecordList(listInvestigationRecordsByIssueId(id));
    setLastCloseout(null);
  };

  const handleCardCreated = (id: string) => {
    refreshCardList();
    setSelectedIssueId(id);
    reloadSelectedCard(id);
    setRecordList(listInvestigationRecordsByIssueId(id));
    setLastCloseout(null);
  };

  const handleRecordAppended = () => {
    refreshRecordList();
  };

  const handleIssueClosed = (summary: CloseoutSummary) => {
    setLastCloseout(summary);
    onCloseoutResult(summary);
    refreshCardList();
    setRecordList(listInvestigationRecordsByIssueId(summary.issueId));
    reloadSelectedCard(summary.issueId);
  };

  const recordCount = recordList?.valid.length ?? 0;

  return (
    <div className="issue-pane-stack">
      <DemoHint />
      <IssueIntakeForm onCreated={handleCardCreated} />
      <IssueCardListView
        result={cardList}
        selectedIssueId={selectedIssueId}
        onRefresh={refreshCardList}
        onSelect={handleSelect}
      />
      <MainlineResultPanel
        selectedCard={selectedCard}
        recordCount={recordCount}
        lastCloseout={lastCloseout}
      />
      {selectedIssueId === null && (
        <p className="empty-state issue-next-step">
          创建问题卡后会自动选中最新一张，随即展开排查追记和结案归档表单；也可以点「刷新列表」从已有卡中挑选继续处理。
        </p>
      )}
      {selectedIssueId !== null && (
        <>
          <InvestigationAppendForm
            issueId={selectedIssueId}
            onAppended={handleRecordAppended}
          />
          <InvestigationRecordListView
            result={recordList}
            onRefresh={refreshRecordList}
          />
          <CloseoutForm issueId={selectedIssueId} onClosed={handleIssueClosed} />
        </>
      )}
      <IssueStorageControls />
    </div>
  );
}

function renderLoadStatus(result: LoadIssueCardResult | null): string {
  if (result === null) return "尚未读取";
  if (result.ok) {
    return `读取成功 · ${result.card.id} · ${result.card.title} · ${labelIssueStatus(result.card.status)}`;
  }
  switch (result.error.kind) {
    case "not_found":
      return `未找到示例卡（${result.error.id}）`;
    case "parse_error":
      return `JSON 解析失败（${result.error.id}）：${result.error.message}`;
    case "validation_error":
      return `结构校验失败（${result.error.id}，${result.error.issues.length} 个字段问题）`;
  }
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
    hint: "展示当前调试项目的上下文边界。",
    status: "当前演示：浏览器 SPA + localStorage",
    bullets: [
      "当前项目：演示工作区",
      "仓库快照：后续接入 Git",
      "文件写盘：后续接入 .debug_workspace",
    ],
  },
  {
    id: "issue",
    title: "问题卡区",
    badge: "主流程",
    hint: "创建问题卡、追加排查记录、结案生成本地归档摘要。",
    status: "当前可用：问题卡、排查记录、结案归档的浏览器本地链路",
    bullets: [],
  },
  {
    id: "archive",
    title: "归档区",
    badge: "沉淀物",
    hint: "结案后会沉淀的归档资产。",
    status: "当前演示：localStorage，后续接文件系统",
    bullets: [
      "归档文档：结案摘要（localStorage）",
      "错误表条目：复发检索入口（localStorage）",
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

export type ArchiveIndexItem = {
  fileName: string;
  filePath: string;
  issueId: string;
  errorCode: string | null;
  category: string | null;
  generatedAt: string;
};

export type ArchiveIndex = {
  items: ArchiveIndexItem[];
  invalidCount: number;
};

export function loadArchiveIndex(): ArchiveIndex {
  const docList = listArchiveDocuments();
  const errorList = listErrorEntries();
  const errorByIssue = new Map<string, { errorCode: string; category: string }>();
  for (const entry of errorList.valid) {
    if (errorByIssue.has(entry.sourceIssueId)) continue;
    errorByIssue.set(entry.sourceIssueId, {
      errorCode: entry.errorCode,
      category: entry.category,
    });
  }
  const items: ArchiveIndexItem[] = docList.valid.map((doc) => {
    const matched = errorByIssue.get(doc.issueId);
    return {
      fileName: doc.fileName,
      filePath: doc.filePath,
      issueId: doc.issueId,
      errorCode: matched?.errorCode ?? null,
      category: matched?.category ?? null,
      generatedAt: doc.generatedAt,
    };
  });
  return {
    items,
    invalidCount: docList.invalid.length + errorList.invalid.length,
  };
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
          有 {archiveIndex.invalidCount} 条归档数据校验失败，已跳过。
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
            已生成 ArchiveDocument 与 ErrorEntry，已写入浏览器本地存储；刷新页面仍可读回。
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
}: {
  open: boolean;
  archivePane: Pane;
  archiveIndex: ArchiveIndex;
  onClose: () => void;
}) {
  if (!open) return null;
  const { items } = archiveIndex;
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
          <div className="archive-drawer-section">
            <div className="archive-drawer-section-label">全部归档条目</div>
            <ul className="archive-drawer-list" data-testid="archive-drawer-list">
              {items.map((item) => (
                <li key={item.fileName} className="archive-drawer-item">
                  <div className="archive-drawer-item-row">
                    <span className="archive-drawer-file">{item.fileName}</span>
                    <span className="archive-drawer-time">{item.generatedAt}</span>
                  </div>
                  <dl className="archive-drawer-meta">
                    <div>
                      <dt>错误表编号</dt>
                      <dd>{item.errorCode ?? "(未记录)"}</dd>
                    </div>
                    <div>
                      <dt>分类</dt>
                      <dd>{item.category ?? "(未记录)"}</dd>
                    </div>
                    <div>
                      <dt>来源问题</dt>
                      <dd>{item.issueId}</dd>
                    </div>
                    <div>
                      <dt>后续写盘位置</dt>
                      <dd>{item.filePath}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="archive-drawer-note">
          当前归档仍在浏览器 localStorage，不是 .debug_workspace 文件写盘；接入 Electron / fs 后这里会切换到真实文件路径。
        </p>
      </div>
    </div>
  );
}

function ProjectSelector({
  pane,
  open,
  onToggle,
  onClose,
}: {
  pane: Pane;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
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
        <span className="header-entry-label">项目：演示工作区</span>
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
          <StaticPaneShell pane={pane} />
          <p className="project-selector-note">
            当前仅演示工作区；多项目选择与仓库绑定能力后续接入。
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

export default function App() {
  const [archiveIndex, setArchiveIndex] = useState<ArchiveIndex>({
    items: [],
    invalidCount: 0,
  });
  const [isArchiveListOpen, setIsArchiveListOpen] = useState<boolean>(false);
  const [isProjectEntryOpen, setIsProjectEntryOpen] = useState<boolean>(false);

  const refreshArchiveIndex = () => {
    setArchiveIndex(loadArchiveIndex());
  };

  useEffect(() => {
    refreshArchiveIndex();
  }, []);

  const handleCloseoutResult = (_summary: CloseoutSummary) => {
    refreshArchiveIndex();
  };

  const projectPane = PANES.find((p) => p.id === "project")!;
  const issuePane = PANES.find((p) => p.id === "issue")!;
  const archivePane = PANES.find((p) => p.id === "archive")!;
  const archiveTotal = archiveIndex.items.length;

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <div className="app-title-block">
            <p className="app-eyebrow">嵌入式调试现场 · 问题闪记</p>
            <h1>ProbeFlash</h1>
            <p className="app-subtitle">
              面向嵌入式调试现场的问题闪记与知识归档系统。当前是浏览器 SPA 演示版。
            </p>
          </div>
          <div className="header-status-stack">
            <p className="stage-tag" data-testid="stage-tag">
              D1：交差优先中文产品壳
            </p>
            <p className="header-boundary">SPA + localStorage，未接 Electron/fs</p>
          </div>
        </div>
        <div className="app-header-toolbar" data-testid="app-header-toolbar">
          <div className="header-entry-slot header-entry-slot-left">
            <ProjectSelector
              pane={projectPane}
              open={isProjectEntryOpen}
              onToggle={() => setIsProjectEntryOpen((prev) => !prev)}
              onClose={() => setIsProjectEntryOpen(false)}
            />
          </div>
          <div className="header-entry-slot header-entry-slot-right">
            <ArchiveEntryButton
              count={archiveTotal}
              onClick={() => setIsArchiveListOpen(true)}
            />
          </div>
        </div>
      </header>
      <main className="app-main">
        <section className="pane" data-pane="issue">
          <div className="pane-heading">
            <div className="pane-title-row">
              <h2>{issuePane.title}</h2>
              <span className="pane-badge">{issuePane.badge}</span>
            </div>
            <p className="pane-hint">{issuePane.hint}</p>
          </div>
          <IssuePane onCloseoutResult={handleCloseoutResult} />
        </section>
      </main>
      <footer className="app-footer">
        <span>当前边界：浏览器 SPA + localStorage；Electron / fs / IPC / .debug_workspace 文件写盘未接入。</span>
      </footer>
      <ArchiveListDrawer
        open={isArchiveListOpen}
        archivePane={archivePane}
        archiveIndex={archiveIndex}
        onClose={() => setIsArchiveListOpen(false)}
      />
    </div>
  );
}
