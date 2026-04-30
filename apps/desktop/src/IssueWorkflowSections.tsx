import type { ReactNode } from "react";

type KnowledgeAssistPanelProps = {
  searchPanel?: ReactNode;
  recurrencePromptPanel?: ReactNode;
  relatedHistoricalIssuesPanel?: ReactNode;
  similarIssuesPanel?: ReactNode;
};

type IssueMainFlowProps = {
  selectedIssueId: string | null;
  quickIssueEntry: ReactNode;
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
          <p>规则辅助，不自动判因或写库。</p>
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
  quickIssueEntry,
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
          <p className="empty-state issue-next-step">
            未选中问题。先快速建卡，或从左侧选择已有卡。
          </p>
          <div className="quick-issue-test-controls">
            {issueStorageControls}
          </div>
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
