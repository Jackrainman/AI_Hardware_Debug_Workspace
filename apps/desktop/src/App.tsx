import { useState } from "react";
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
import { saveArchiveDocument } from "./storage/archive-document-store";
import { saveErrorEntry } from "./storage/error-entry-store";

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

function CloseoutForm({
  issueId,
  onClosed,
}: {
  issueId: string;
  onClosed: () => void;
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
    onClosed();
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

function IssuePane() {
  const [cardList, setCardList] = useState<IssueCardListResult | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [recordList, setRecordList] = useState<InvestigationRecordListResult | null>(null);

  const refreshCardList = () => {
    setCardList(listIssueCards());
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
    setRecordList(listInvestigationRecordsByIssueId(id));
  };

  const handleCardCreated = (_id: string) => {
    refreshCardList();
  };

  const handleRecordAppended = () => {
    refreshRecordList();
  };

  const handleIssueClosed = () => {
    refreshCardList();
    refreshRecordList();
  };

  return (
    <div className="issue-pane-stack">
      <DemoHint />
      <div className="flow-guide" aria-label="问题处理步骤">
        <span>
          <strong>01</strong>
          创建
        </span>
        <span>
          <strong>02</strong>
          选择
        </span>
        <span>
          <strong>03</strong>
          追记
        </span>
        <span>
          <strong>04</strong>
          结案
        </span>
      </div>
      <IssueIntakeForm onCreated={handleCardCreated} />
      <IssueCardListView
        result={cardList}
        selectedIssueId={selectedIssueId}
        onRefresh={refreshCardList}
        onSelect={handleSelect}
      />
      {selectedIssueId === null && (
        <p className="empty-state issue-next-step">
          先创建或刷新问题卡列表；选中一张问题卡后，会展开排查追记和结案归档表单。
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

export default function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-title-block">
          <p className="app-eyebrow">本地硬件调试闭环</p>
          <h1>RepoDebug 调试闭环工作台</h1>
          <p className="app-subtitle">
            把硬件调试现场记录收束为问题卡、排查记录和归档摘要。当前是浏览器 SPA 演示版。
          </p>
        </div>
        <div className="header-status-stack">
          <p className="stage-tag" data-testid="stage-tag">
            D1：交差优先中文产品壳
          </p>
          <p className="header-boundary">SPA + localStorage，未接 Electron/fs</p>
        </div>
      </header>
      <main className="app-grid">
        {PANES.map((pane) => (
          <section key={pane.id} className="pane" data-pane={pane.id}>
            <div className="pane-heading">
              <div className="pane-title-row">
                <h2>{pane.title}</h2>
                <span className="pane-badge">{pane.badge}</span>
              </div>
              <p className="pane-hint">{pane.hint}</p>
            </div>
            {pane.id === "issue" ? (
              <IssuePane />
            ) : (
              <StaticPaneShell pane={pane} />
            )}
          </section>
        ))}
      </main>
      <footer className="app-footer">
        <span>当前边界：浏览器 SPA + localStorage；Electron / fs / IPC / .debug_workspace 文件写盘未接入。</span>
      </footer>
    </div>
  );
}
