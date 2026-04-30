import type { ReactNode } from "react";

type ProjectContextShellProps = {
  projectSelector: ReactNode;
  closeoutEntryButton: ReactNode;
  archiveEntryButton: ReactNode;
};

type WorkspaceChromeProps = ProjectContextShellProps & {
  storageStatusBanner: ReactNode;
};

export function ProjectContextShell({
  projectSelector,
  closeoutEntryButton,
  archiveEntryButton,
}: ProjectContextShellProps) {
  return (
    <div className="app-header-toolbar" data-testid="app-header-toolbar">
      <div className="header-entry-slot header-entry-slot-left">
        {projectSelector}
      </div>
      <div className="header-entry-slot header-entry-slot-right">
        <div className="header-entry-actions">
          {closeoutEntryButton}
          {archiveEntryButton}
        </div>
      </div>
    </div>
  );
}

export function WorkspaceChrome({
  projectSelector,
  closeoutEntryButton,
  archiveEntryButton,
  storageStatusBanner,
}: WorkspaceChromeProps) {
  return (
    <>
      <header className="app-header">
        <div className="app-header-top">
          <div className="app-title-block">
            <p className="app-eyebrow">嵌入式调试现场 · 问题闪记</p>
            <h1>ProbeFlash</h1>
            <p className="app-subtitle">
              面向嵌入式调试现场的问题闪记与知识归档系统。当前主路径已切到本地 HTTP + SQLite 联调版。
            </p>
          </div>
          <div className="header-status-stack">
            <p className="stage-tag" data-testid="stage-tag">
              S3：本地 HTTP + SQLite 闭环
            </p>
            <p className="header-boundary">前端 /api + 本地 WSL backend + SQLite；独立部署未验证</p>
          </div>
        </div>
        <ProjectContextShell
          projectSelector={projectSelector}
          closeoutEntryButton={closeoutEntryButton}
          archiveEntryButton={archiveEntryButton}
        />
      </header>
      {storageStatusBanner}
    </>
  );
}
