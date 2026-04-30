import type { IssueCard } from "../../domain/schemas/issue-card";
import type { CloseoutSummary } from "../closeout/CloseoutForm";
import { formatTags, labelIssueStatus, labelSeverity } from "./issueUiHelpers";

export function MainlineResultPanel({
  selectedCard,
  recordCount,
  lastCloseout,
}: {
  selectedCard: IssueCard | null;
  recordCount: number;
  lastCloseout: CloseoutSummary | null;
}) {
  if (selectedCard === null && lastCloseout === null) {
    return null;
  }
  return (
    <section className="mainline-panel" data-testid="mainline-panel">
      <header className="mainline-panel-header">
        <span className="mainline-panel-badge">主线状态</span>
        <h3>当前闭环进度</h3>
      </header>
      {selectedCard !== null && (
        <div className="mainline-panel-section" data-testid="mainline-current">
          <div className="mainline-section-label">当前问题卡</div>
          <div className="mainline-card-row">
            <span className="mainline-card-title">
              {selectedCard.title || "未命名问题"}
            </span>
            <span
              className={`mainline-status-chip mainline-status-${selectedCard.status}`}
              data-testid="mainline-status-chip"
            >
              {labelIssueStatus(selectedCard.status)}
            </span>
          </div>
          <ul className="mainline-card-meta">
            <li>
              <span className="mainline-meta-label">编号</span>
              <span className="mainline-meta-value">{selectedCard.id}</span>
            </li>
            <li>
              <span className="mainline-meta-label">严重度</span>
              <span className="mainline-meta-value">{labelSeverity(selectedCard.severity)}</span>
            </li>
            <li>
              <span className="mainline-meta-label">标签</span>
              <span className="mainline-meta-value" data-testid="mainline-tags">
                {formatTags(selectedCard.tags)}
              </span>
            </li>
            <li>
              <span className="mainline-meta-label">追记</span>
              <span className="mainline-meta-value" data-testid="mainline-record-count">
                {recordCount} 条
              </span>
            </li>
            <li>
              <span className="mainline-meta-label">更新于</span>
              <span className="mainline-meta-value">{selectedCard.updatedAt}</span>
            </li>
          </ul>
        </div>
      )}
      {lastCloseout !== null && (
        <div
          className="mainline-panel-section mainline-closeout"
          data-testid="mainline-closeout"
        >
          <div className="mainline-section-label">最近一次结案归档</div>
          <dl className="mainline-closeout-fields">
            <div>
              <dt>归档文件</dt>
              <dd>{lastCloseout.archiveFileName}</dd>
            </div>
            <div>
              <dt>归档路径（后续写盘位置）</dt>
              <dd>{lastCloseout.archiveFilePath}</dd>
            </div>
            <div>
              <dt>错误表编号</dt>
              <dd>{lastCloseout.errorCode}</dd>
            </div>
            <div>
              <dt>归档时间</dt>
              <dd>{lastCloseout.archivedAt}</dd>
            </div>
            <div>
              <dt>分类</dt>
              <dd>{lastCloseout.category}</dd>
            </div>
            <div>
              <dt>标签</dt>
              <dd>{formatTags(lastCloseout.tags)}</dd>
            </div>
          </dl>
          <details className="mainline-closeout-preview">
            <summary>展开归档摘要预览</summary>
            <pre>{lastCloseout.markdownPreview}</pre>
          </details>
          <p className="mainline-closeout-note">
            归档文档与错误表条目已写入本地 WSL 后端 SQLite；后续接入 .debug_workspace 文件双写后会补真实文件落盘。
          </p>
        </div>
      )}
    </section>
  );
}
