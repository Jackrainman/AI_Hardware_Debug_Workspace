import { formatTags } from "../issue/issueUiHelpers";

export type ArchivedCloseoutDisplayData = {
  errorCode: string;
  archivedAt: string;
  category: string;
  rootCause: string;
  resolution: string;
  prevention: string;
  tags: string[];
};

export function ArchivedCloseoutSummary({
  data,
}: {
  data: ArchivedCloseoutDisplayData;
}) {
  return (
    <section
      className="mainline-panel"
      data-testid="archived-closeout-summary"
    >
      <header className="mainline-panel-header">
        <span className="mainline-panel-badge">已归档</span>
        <h3>归档结案摘要</h3>
      </header>
      <div className="mainline-panel-section" data-testid="archived-closeout-body">
        <dl className="mainline-closeout-fields">
          <div>
            <dt>错误表编号</dt>
            <dd>{data.errorCode}</dd>
          </div>
          <div>
            <dt>归档时间</dt>
            <dd>{data.archivedAt}</dd>
          </div>
          <div>
            <dt>归档分类</dt>
            <dd>{data.category || "未分类"}</dd>
          </div>
          <div>
            <dt>标签</dt>
            <dd>{formatTags(data.tags)}</dd>
          </div>
        </dl>
      </div>
      <div className="mainline-panel-section" data-testid="archived-closeout-fields">
        <div className="mainline-section-label">结案填写检查</div>
        <dl className="mainline-closeout-fields">
          <div>
            <dt>根因</dt>
            <dd>{data.rootCause || "—"}</dd>
          </div>
          <div>
            <dt>修复/结论</dt>
            <dd>{data.resolution || "—"}</dd>
          </div>
          <div>
            <dt>预防建议</dt>
            <dd>{data.prevention || "—"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
