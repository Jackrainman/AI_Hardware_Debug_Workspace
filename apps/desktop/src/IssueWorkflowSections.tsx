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
  createIssueForm: ReactNode;
  demoHint: ReactNode;
  mainlinePanel: ReactNode;
  knowledgeAssistPanel: ReactNode;
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
    <>
      {searchPanel}
      {recurrencePromptPanel}
      {relatedHistoricalIssuesPanel}
      {similarIssuesPanel}
    </>
  );
}

export function IssueMainFlow({
  selectedIssueId,
  activeWorkspaceName,
  createIssueForm,
  demoHint,
  mainlinePanel,
  knowledgeAssistPanel,
  investigationAppendForm,
  investigationRecordList,
  closeoutForm,
  issueStorageControls,
}: IssueMainFlowProps) {
  return (
    <section className="issue-workspace" aria-label="问题处理区">
      {selectedIssueId === null && (
        <>
          {createIssueForm}
          {demoHint}
        </>
      )}
      {mainlinePanel}
      {knowledgeAssistPanel}
      {selectedIssueId === null && (
        <p className="empty-state issue-next-step">
          当前项目「{activeWorkspaceName}」还没有选中问题。创建问题卡后会自动选中最新一张，随即展开排查追记和结案归档表单；也可以在左侧点「刷新列表」从已有卡中挑选继续处理。
        </p>
      )}
      {selectedIssueId !== null && (
        <>
          {investigationAppendForm}
          {investigationRecordList}
          {closeoutForm}
        </>
      )}
      {selectedIssueId === null && issueStorageControls}
    </section>
  );
}
