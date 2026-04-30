import type { ReactNode } from "react";

type KnowledgeAssistPanelProps = {
  searchPanel?: ReactNode;
  recurrencePromptPanel?: ReactNode;
  relatedHistoricalIssuesPanel?: ReactNode;
  similarIssuesPanel?: ReactNode;
};

type IssueMainFlowProps = {
  selectedIssueId: string | null;
  activeWorkspaceName: string;
  quickIssueEntry: ReactNode;
  demoHint: ReactNode;
  mainlinePanel: ReactNode;
  investigationAppendForm: ReactNode;
  investigationRecordList: ReactNode;
  closeoutForm: ReactNode;
  issueStorageControls: ReactNode;
};

export function KnowledgeAssistPanel({
  searchPanel,
  recurrencePromptPanel,
  relatedHistoricalIssuesPanel,
  similarIssuesPanel,
}: KnowledgeAssistPanelProps) {
  return (
    <section className="knowledge-assist-panel" aria-label="Knowledge Assist">
      <div className="knowledge-assist-header">
        <span className="knowledge-assist-badge">辅助判断</span>
        <div>
          <h3>Knowledge Assist</h3>
          <p>汇总复发提示、相似历史、人工关联和搜索线索；只辅助判断，不自动判因或写入结案。</p>
        </div>
      </div>
      <div className="knowledge-assist-body">
        {recurrencePromptPanel}
        {relatedHistoricalIssuesPanel}
        {similarIssuesPanel}
        {searchPanel}
      </div>
    </section>
  );
}

export function IssueMainFlow({
  selectedIssueId,
  activeWorkspaceName,
  quickIssueEntry,
  demoHint,
  mainlinePanel,
  investigationAppendForm,
  investigationRecordList,
  closeoutForm,
  issueStorageControls,
}: IssueMainFlowProps) {
  return (
    <section className="issue-workspace" aria-label="问题处理区">
      {selectedIssueId === null && (
        <div className="quick-issue-landing" data-testid="quick-issue-landing">
          {quickIssueEntry}
          <div className="quick-issue-supporting-grid">
            {demoHint}
            {issueStorageControls}
          </div>
          <p className="empty-state issue-next-step">
            当前项目「{activeWorkspaceName}」还没有选中问题。先用快速建卡记录现场，也可以在左侧选择已有卡继续处理；创建后会自动展开追记和结案归档。
          </p>
        </div>
      )}
      {selectedIssueId !== null && (
        <>
          {mainlinePanel}
          {investigationAppendForm}
          {investigationRecordList}
          {closeoutForm}
        </>
      )}
    </section>
  );
}
