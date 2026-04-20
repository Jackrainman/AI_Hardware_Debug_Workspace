import { useState } from "react";
import "./App.css";
import type { IssueCard } from "./domain/schemas/issue-card";
import {
  loadIssueCard,
  saveIssueCard,
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
    hint: "S1-A3：localStorage 保存 / 读取 / schema 校验的最小闭环",
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
              <IssueStorageControls />
            ) : (
              <p className="pane-status">status: placeholder</p>
            )}
          </section>
        ))}
      </main>
      <footer className="app-footer">
        <span>Stage: S1-A3 · localStorage save/load loop for IssueCard</span>
      </footer>
    </div>
  );
}
