import "./App.css";

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
    hint: "IssueCard 列表、追记 InvestigationRecord（占位）",
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
            <p className="pane-status">status: placeholder</p>
          </section>
        ))}
      </main>
      <footer className="app-footer">
        <span>Stage: S1-A1 · atomic bootstrap · no business logic yet</span>
      </footer>
    </div>
  );
}
