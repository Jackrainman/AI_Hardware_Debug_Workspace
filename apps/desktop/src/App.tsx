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
  title: "Sample IssueCard for S1-A3 save/load verification",
  rawInput: "Synthetic card used to exercise the localStorage round-trip.",
  normalizedSummary: "Verify localStorage save/load with schema validation.",
  symptomSummary: "n/a — fixture card.",
  suspectedDirections: ["S1-A3 storage loop regression"],
  suggestedActions: [
    "Click Save to write the sample card to localStorage.",
    "Click Load to read it back and revalidate via IssueCardSchema.",
  ],
  status: "open",
  severity: "low",
  tags: ["sample", "s1-a3"],
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
      <div className="storage-buttons">
        <button type="button" onClick={handleSave}>
          Save sample IssueCard
        </button>
        <button type="button" onClick={handleLoad}>
          Load sample IssueCard
        </button>
      </div>
      <p className="storage-line" data-testid="save-status">
        save: {saveStatus.state === "idle" ? "(not saved yet)" : `saved at ${saveStatus.at}`}
      </p>
      <p className="storage-line" data-testid="load-status">
        load: {renderLoadStatus(loadResult)}
      </p>
    </div>
  );
}

const SEVERITIES: IntakeSeverity[] = ["low", "medium", "high", "critical"];

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
      <label className="intake-field">
        <span>Title</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. UART boot log stuck at 0x40"
          required
        />
      </label>
      <label className="intake-field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Raw context / symptoms / what you just saw..."
        />
      </label>
      <label className="intake-field">
        <span>Severity</span>
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value as IntakeSeverity)}
        >
          {SEVERITIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <div className="intake-actions">
        <button type="submit">Create IssueCard</button>
      </div>
      <p className="storage-line" data-testid="intake-status">
        intake: {renderIntakeStatus(status)}
      </p>
    </form>
  );
}

function renderIntakeStatus(status: IntakeSubmitStatus): string {
  switch (status.state) {
    case "idle":
      return "(not submitted yet)";
    case "saved":
      return `OK — saved id=${status.id} at ${status.at}`;
    case "error":
      return `ERROR — ${status.reason}`;
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
      <div className="list-header">
        <button type="button" onClick={onRefresh}>
          Refresh list
        </button>
        <span className="storage-line" data-testid="list-summary">
          {result === null
            ? "(not refreshed yet)"
            : `valid: ${result.valid.length} · invalid: ${result.invalid.length}`}
        </span>
      </div>
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
                  <span className="list-item-title">{summary.title || "(untitled)"}</span>
                  <span className="list-item-meta">
                    {summary.severity} · {summary.status} · {summary.createdAt}
                  </span>
                  <span className="list-item-id">id: {summary.id}</span>
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
              invalid · {entry.kind} · key={entry.key}
              {entry.kind === "parse_error" ? ` · ${entry.message}` : ` · ${entry.issues.length} issue(s)`}
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
      <p className="storage-line" data-testid="investigation-target">
        target issue: {issueId}
      </p>
      <label className="intake-field">
        <span>Type</span>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as InvestigationType)}
        >
          {INVESTIGATION_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="intake-field">
        <span>Note</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="What you observed / what you tried / what to do next..."
        />
      </label>
      <div className="intake-actions">
        <button type="submit">Append record</button>
      </div>
      <p className="storage-line" data-testid="investigation-status">
        append: {renderInvestigationStatus(status)}
      </p>
    </form>
  );
}

function renderInvestigationStatus(status: InvestigationSubmitStatus): string {
  switch (status.state) {
    case "idle":
      return "(not appended yet)";
    case "saved":
      return `OK — saved id=${status.id} at ${status.at}`;
    case "error":
      return `ERROR — ${status.reason}`;
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
      <div className="list-header">
        <button type="button" onClick={onRefresh}>
          Refresh records
        </button>
        <span className="storage-line" data-testid="record-list-summary">
          {result === null
            ? "(select an issue first)"
            : `records: ${result.valid.length} · invalid: ${result.invalid.length}`}
        </span>
      </div>
      {result && result.valid.length > 0 && (
        <ul className="list-items" data-testid="record-list-valid">
          {result.valid.map((record) => (
            <li key={record.id} className="list-item">
              <span className="list-item-title">[{record.type}] {record.polishedText}</span>
              <span className="list-item-meta">{record.createdAt}</span>
              <span className="list-item-id">id: {record.id}</span>
            </li>
          ))}
        </ul>
      )}
      {result && result.invalid.length > 0 && (
        <ul className="list-invalid" data-testid="record-list-invalid">
          {result.invalid.map((entry) => (
            <li key={entry.key} className="storage-line">
              invalid · {entry.kind} · key={entry.key}
              {entry.kind === "parse_error" ? ` · ${entry.message}` : ` · ${entry.issues.length} issue(s)`}
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
        reason: `failed to load issue: ${loaded.error.kind}`,
      });
      return;
    }

    const records = listInvestigationRecordsByIssueId(issueId);
    if (records.invalid.length > 0) {
      setStatus({
        state: "error",
        reason: `investigation record validation failed: ${records.invalid.length} invalid entr${
          records.invalid.length === 1 ? "y" : "ies"
        }`,
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
      <p className="storage-line" data-testid="closeout-target">
        close issue: {issueId}
      </p>
      <label className="intake-field">
        <span>Category</span>
        <input
          type="text"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="e.g. boot, power, timing"
        />
      </label>
      <label className="intake-field">
        <span>Root cause</span>
        <textarea
          value={rootCause}
          onChange={(event) => setRootCause(event.target.value)}
          rows={3}
          placeholder="What caused the issue..."
          required
        />
      </label>
      <label className="intake-field">
        <span>Resolution</span>
        <textarea
          value={resolution}
          onChange={(event) => setResolution(event.target.value)}
          rows={3}
          placeholder="What fixed or closed the issue..."
          required
        />
      </label>
      <label className="intake-field">
        <span>Prevention</span>
        <textarea
          value={prevention}
          onChange={(event) => setPrevention(event.target.value)}
          rows={2}
          placeholder="How to avoid recurrence..."
        />
      </label>
      <div className="intake-actions">
        <button type="submit">Close issue</button>
      </div>
      <p className="storage-line" data-testid="closeout-status">
        closeout: {renderCloseoutStatus(status)}
      </p>
    </form>
  );
}

function renderCloseoutStatus(status: CloseoutSubmitStatus): string {
  switch (status.state) {
    case "idle":
      return "(not closed yet)";
    case "saved":
      return `OK — ${status.errorCode} → ${status.fileName} at ${status.at}`;
    case "error":
      return `ERROR — ${status.reason}`;
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
      <IssueIntakeForm onCreated={handleCardCreated} />
      <IssueCardListView
        result={cardList}
        selectedIssueId={selectedIssueId}
        onRefresh={refreshCardList}
        onSelect={handleSelect}
      />
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
  if (result === null) return "(not loaded yet)";
  if (result.ok) {
    return `OK — id=${result.card.id}, title="${result.card.title}", status=${result.card.status}`;
  }
  switch (result.error.kind) {
    case "not_found":
      return `ERROR not_found (id=${result.error.id})`;
    case "parse_error":
      return `ERROR parse_error (id=${result.error.id}): ${result.error.message}`;
    case "validation_error":
      return `ERROR validation_error (id=${result.error.id}, ${result.error.issues.length} issue(s))`;
  }
}

type Pane = {
  id: "project" | "issue" | "archive";
  title: string;
  hint: string;
};

const PANES: Pane[] = [
  {
    id: "project",
    title: "项目区 (Project)",
    hint: "绑定仓库、展示快照、切换活跃项目（占位）",
  },
  {
    id: "issue",
    title: "问题卡区 (Issue / Debug)",
    hint: "S2-A4：创建 IssueCard + 追记 + 结案归档",
  },
  {
    id: "archive",
    title: "归档区 (Archive)",
    hint: "ArchiveDocument 与 error-table 浏览（占位）",
  },
];

export default function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>RepoDebug Harness</h1>
        <p className="stage-tag" data-testid="stage-tag">
          Desktop shell initialized
        </p>
      </header>
      <main className="app-grid">
        {PANES.map((pane) => (
          <section key={pane.id} className="pane" data-pane={pane.id}>
            <h2>{pane.title}</h2>
            <p className="pane-hint">{pane.hint}</p>
            {pane.id === "issue" ? (
              <IssuePane />
            ) : (
              <p className="pane-status">status: placeholder</p>
            )}
          </section>
        ))}
      </main>
      <footer className="app-footer">
        <span>Stage: S2-A4 · IssueCard closeout + ErrorEntry + ArchiveDocument</span>
      </footer>
    </div>
  );
}
