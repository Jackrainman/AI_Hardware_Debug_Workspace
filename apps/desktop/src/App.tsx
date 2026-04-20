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
  listIssueCards,
  loadIssueCard,
  saveIssueCard,
  type IssueCardListResult,
  type LoadIssueCardResult,
} from "./storage/issue-card-store";

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

function IssueIntakeForm() {
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

function IssueCardListView() {
  const [result, setResult] = useState<IssueCardListResult | null>(null);

  const handleRefresh = () => {
    setResult(listIssueCards());
  };

  return (
    <div className="list-view" data-testid="issue-card-list">
      <div className="list-header">
        <button type="button" onClick={handleRefresh}>
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
          {result.valid.map((summary) => (
            <li key={summary.id} className="list-item">
              <span className="list-item-title">{summary.title || "(untitled)"}</span>
              <span className="list-item-meta">
                {summary.severity} · {summary.status} · {summary.createdAt}
              </span>
              <span className="list-item-id">id: {summary.id}</span>
            </li>
          ))}
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
    hint: "S2-A2：创建 IssueCard + 列表视图（localStorage scan）",
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
              <div className="issue-pane-stack">
                <IssueIntakeForm />
                <IssueCardListView />
                <IssueStorageControls />
              </div>
            ) : (
              <p className="pane-status">status: placeholder</p>
            )}
          </section>
        ))}
      </main>
      <footer className="app-footer">
        <span>Stage: S2-A2 · IssueCard intake + list view</span>
      </footer>
    </div>
  );
}
