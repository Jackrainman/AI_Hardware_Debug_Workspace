import { useState, type FormEvent } from "react";
import type { IssueCard } from "../../domain/schemas/issue-card";
import type { RecurrencePrompt } from "../../search/recurrence-prompt";
import type { SimilarIssuesResult } from "../../search/similar-issues";
import type {
  StorageRepository,
  StorageSearchFilters,
  StorageSearchResult,
} from "../../storage/storage-repository";
import {
  storageReadErrorToFeedback,
  type StorageFeedbackError,
} from "../../storage/storage-feedback";
import {
  formatTags,
  labelIssueStatus,
  labelSearchMatchedFields,
  labelSearchResultKind,
} from "../issue/issueUiHelpers";

export function SearchPanel({
  repository,
  currentIssueId,
  relatedHistoricalIssueIds,
  onOpenIssue,
  onLinkHistoricalIssue,
  reportStorageError,
  clearStorageFeedback,
}: {
  repository: StorageRepository;
  currentIssueId: string | null;
  relatedHistoricalIssueIds: string[];
  onOpenIssue: (id: string) => void;
  onLinkHistoricalIssue: (id: string) => void;
  reportStorageError: (error: StorageFeedbackError) => void;
  clearStorageFeedback: () => void;
}) {
  const [query, setQuery] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<StorageSearchFilters["kind"]>("all");
  const [statusFilter, setStatusFilter] = useState<StorageSearchFilters["status"]>("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [fromFilter, setFromFilter] = useState<string>("");
  const [toFilter, setToFilter] = useState<string>("");
  const [result, setResult] = useState<StorageSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const canSearch = query.trim().length > 0 && !isSearching;

  const buildSearchFilters = (): StorageSearchResult["filters"] => ({
    kind: kindFilter ?? "all",
    status: statusFilter ?? "all",
    tag: tagFilter.trim(),
    from: fromFilter,
    to: toFilter,
  });

  const countActiveSearchFilters = (filters: StorageSearchResult["filters"]): number =>
    [
      filters.kind !== "all",
      filters.status !== "all",
      filters.tag.length > 0,
      filters.from.length > 0,
      filters.to.length > 0,
    ].filter(Boolean).length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    const filters = buildSearchFilters();
    if (trimmedQuery.length === 0) {
      setResult({ query: "", filters, items: [], readError: null });
      return;
    }
    setIsSearching(true);
    const searchResult = await repository.search.query(trimmedQuery, filters);
    setResult(searchResult);
    setIsSearching(false);
    if (searchResult.readError !== null) {
      reportStorageError(
        storageReadErrorToFeedback("knowledge_search", "search", searchResult.readError),
      );
      return;
    }
    clearStorageFeedback();
  };

  return (
    <section className="search-panel" data-testid="knowledge-search-panel">
      <form className="search-form" onSubmit={handleSubmit} data-testid="knowledge-search-form">
        <div className="form-caption">
          <h3>历史问题搜索</h3>
          <p>当前项目内搜索。</p>
        </div>
        <div className="search-input-row">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：CAN / 握手 / 预防清单"
            aria-label="搜索历史问题关键词"
            data-testid="knowledge-search-input"
          />
          <button type="submit" disabled={!canSearch} data-testid="knowledge-search-submit">
            {isSearching ? "搜索中" : "搜索"}
          </button>
        </div>
        <div className="search-filter-row" data-testid="knowledge-search-filters">
          <label>
            <span>结果类型</span>
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as StorageSearchFilters["kind"])}
              data-testid="knowledge-search-kind-filter"
            >
              <option value="all">全部</option>
              <option value="issue">问题卡</option>
              <option value="record">排查记录</option>
              <option value="archive">归档摘要</option>
              <option value="error_entry">错误表</option>
            </select>
          </label>
          <label>
            <span>问题状态</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StorageSearchFilters["status"])}
              data-testid="knowledge-search-status-filter"
            >
              <option value="all">全部</option>
              <option value="open">处理中</option>
              <option value="investigating">排查中</option>
              <option value="resolved">已解决</option>
              <option value="archived">已归档</option>
              <option value="needs_manual_review">需人工复核</option>
            </select>
          </label>
          <label>
            <span>标签筛选</span>
            <input
              type="text"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              placeholder="例如：CAN, 底盘"
              data-testid="knowledge-search-tag-filter"
            />
          </label>
          <label>
            <span>起始日期</span>
            <input
              type="date"
              value={fromFilter}
              onChange={(event) => setFromFilter(event.target.value)}
              data-testid="knowledge-search-from-filter"
            />
          </label>
          <label>
            <span>结束日期</span>
            <input
              type="date"
              value={toFilter}
              onChange={(event) => setToFilter(event.target.value)}
              data-testid="knowledge-search-to-filter"
            />
          </label>
        </div>
      </form>
      {result !== null && result.readError === null && (
        <div className="search-result-block" data-testid="knowledge-search-result-block">
          <p className="storage-line" data-testid="knowledge-search-summary">
            {result.query.length === 0
              ? "输入关键词后开始搜索"
              : `“${result.query}” 命中 ${result.items.length} 条 · 筛选 ${countActiveSearchFilters(result.filters)} 项`}
          </p>
          {result.query.length > 0 && result.items.length === 0 && (
            <p className="empty-state" data-testid="knowledge-search-empty">
              无匹配结果。
            </p>
          )}
          {result.items.length > 0 && (
            <ul className="search-result-list" data-testid="knowledge-search-results">
              {result.items.map((item) => {
                const isCurrentIssue = currentIssueId === item.issueId;
                const isLinked = relatedHistoricalIssueIds.includes(item.issueId);
                return (
                  <li key={`${item.kind}:${item.id}`} className="search-result-item">
                    <button
                      type="button"
                      className="search-result-button"
                      onClick={() => onOpenIssue(item.issueId)}
                      data-testid="knowledge-search-result-item"
                    >
                      <span className="search-result-title-row">
                        <span className="search-result-kind">{labelSearchResultKind(item.kind)}</span>
                        <span className="search-result-title">{item.title}</span>
                      </span>
                      <span className="search-result-snippet">{item.snippet || "(空内容命中)"}</span>
                      <span className="search-result-meta">
                        来源问题：{item.issueId} · 字段：{labelSearchMatchedFields(item)}
                        {item.status ? ` · 状态：${labelIssueStatus(item.status)}` : ""}
                        {item.errorCode ? ` · ${item.errorCode}` : ""}
                        {item.tags && item.tags.length > 0 ? ` · 标签：${formatTags(item.tags)}` : ""}
                      </span>
                    </button>
                    {currentIssueId !== null && !isCurrentIssue && (
                      <div className="search-result-actions">
                        <button
                          type="button"
                          className="link-history-button"
                          onClick={() => onLinkHistoricalIssue(item.issueId)}
                          disabled={isLinked}
                          data-testid="knowledge-search-link-result"
                        >
                          {isLinked ? "已关联到当前问题" : "关联到当前问题"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function SimilarIssuesPanel({
  result,
  isLoading,
  currentIssueId,
  relatedHistoricalIssueIds,
  onOpenIssue,
  onLinkHistoricalIssue,
}: {
  result: SimilarIssuesResult | null;
  isLoading: boolean;
  currentIssueId: string | null;
  relatedHistoricalIssueIds: string[];
  onOpenIssue: (id: string) => void;
  onLinkHistoricalIssue: (id: string) => void;
}) {
  if (result === null && !isLoading) {
    return null;
  }
  return (
    <section className="similar-issues-panel" data-testid="similar-issues-panel">
      <header className="similar-issues-header">
        <span className="similar-issues-badge">规则匹配</span>
        <div>
          <h3>相似历史问题</h3>
          <p>规则匹配，不做 AI 判因。</p>
        </div>
      </header>
      {isLoading && <p className="storage-line">正在扫描当前项目历史问题...</p>}
      {!isLoading && result !== null && result.items.length === 0 && (
        <p className="empty-state" data-testid="similar-issues-empty">
          暂无相似历史问题。
        </p>
      )}
      {!isLoading && result !== null && result.items.length > 0 && (
        <ul className="similar-issues-list" data-testid="similar-issues-results">
          {result.items.map((item) => {
            const isCurrentIssue = currentIssueId === item.issueId;
            const isLinked = relatedHistoricalIssueIds.includes(item.issueId);
            return (
              <li key={item.issueId} className="similar-issues-item">
                <button
                  type="button"
                  className="similar-issues-button"
                  onClick={() => onOpenIssue(item.issueId)}
                  data-testid="similar-issues-result-item"
                >
                  <span className="similar-issues-title-row">
                    <span className="similar-issues-score">{item.score}</span>
                    <span className="similar-issues-title">{item.title}</span>
                  </span>
                  <span className="similar-issues-meta">
                    {item.issueId} · {labelIssueStatus(item.status)}
                    {item.errorCode ? ` · ${item.errorCode}` : ""}
                    {item.archiveFileName ? ` · ${item.archiveFileName}` : ""}
                  </span>
                  <span className="similar-issues-reasons">{item.reasons.join("；")}</span>
                  {item.rootCauseSummary && (
                    <span className="similar-issues-summary">根因：{item.rootCauseSummary}</span>
                  )}
                  {item.resolutionSummary && (
                    <span className="similar-issues-summary">处理：{item.resolutionSummary}</span>
                  )}
                </button>
                {currentIssueId !== null && !isCurrentIssue && (
                  <div className="search-result-actions">
                    <button
                      type="button"
                      className="link-history-button"
                      onClick={() => onLinkHistoricalIssue(item.issueId)}
                      disabled={isLinked}
                      data-testid="similar-issues-link-result"
                    >
                      {isLinked ? "已关联到当前问题" : "关联到当前问题"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function RelatedHistoricalIssuesPanel({
  issue,
  onOpenIssue,
  onUnlinkHistoricalIssue,
}: {
  issue: IssueCard | null;
  onOpenIssue: (id: string) => void;
  onUnlinkHistoricalIssue: (id: string) => void;
}) {
  const relatedIssueIds = issue?.relatedHistoricalIssueIds ?? [];
  if (issue === null || relatedIssueIds.length === 0) {
    return null;
  }
  return (
    <section className="related-history-panel" data-testid="related-history-panel">
      <header className="related-history-header">
        <span className="similar-issues-badge">人工关联</span>
        <div>
          <h3>已关联历史问题</h3>
          <p>人工复盘引用，不自动改结案。</p>
        </div>
      </header>
      <ul className="related-history-list" data-testid="related-history-list">
        {relatedIssueIds.map((issueId) => (
          <li key={issueId} className="related-history-item">
            <button
              type="button"
              className="related-history-open"
              onClick={() => onOpenIssue(issueId)}
              data-testid="related-history-open"
            >
              {issueId}
            </button>
            <button
              type="button"
              className="link-history-button link-history-button-danger"
              onClick={() => onUnlinkHistoricalIssue(issueId)}
              data-testid="related-history-unlink"
            >
              取消关联
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecurrencePromptPanel({
  prompt,
  relatedHistoricalIssueIds,
  onOpenIssue,
  onLinkHistoricalIssue,
  onDismiss,
}: {
  prompt: RecurrencePrompt | null;
  relatedHistoricalIssueIds: string[];
  onOpenIssue: (id: string) => void;
  onLinkHistoricalIssue: (id: string) => void;
  onDismiss: () => void;
}) {
  if (prompt === null) {
    return null;
  }
  const isLinked = relatedHistoricalIssueIds.includes(prompt.issueId);
  return (
    <section className="recurrence-prompt-panel" data-testid="recurrence-prompt-panel">
      <header className="recurrence-prompt-header">
        <span className="recurrence-prompt-badge">可能复发</span>
        <div>
          <h3>可参考历史处理方式</h3>
          <p>规则提示，请人工确认。</p>
        </div>
      </header>
      <div className="recurrence-prompt-body">
        <button
          type="button"
          className="recurrence-prompt-title"
          onClick={() => onOpenIssue(prompt.issueId)}
          data-testid="recurrence-prompt-open"
        >
          {prompt.title}
        </button>
        <p className="recurrence-prompt-meta">
          来源问题：{prompt.issueId} · 相似度 {prompt.score}
          {prompt.errorCode ? ` · ${prompt.errorCode}` : ""}
          {prompt.tags.length > 0 ? ` · 标签：${formatTags(prompt.tags)}` : ""}
        </p>
        <p className="recurrence-prompt-reasons">依据：{prompt.reasons.join("；")}</p>
        {prompt.rootCauseSummary && (
          <p className="recurrence-prompt-summary">历史根因：{prompt.rootCauseSummary}</p>
        )}
        {prompt.resolutionSummary && (
          <p className="recurrence-prompt-summary">历史处理：{prompt.resolutionSummary}</p>
        )}
      </div>
      <div className="recurrence-prompt-actions">
        <button
          type="button"
          className="link-history-button"
          onClick={() => onLinkHistoricalIssue(prompt.issueId)}
          disabled={isLinked}
          data-testid="recurrence-prompt-link"
        >
          {isLinked ? "已关联到当前问题" : "关联这条历史问题"}
        </button>
        <button
          type="button"
          className="recurrence-prompt-dismiss"
          onClick={onDismiss}
          data-testid="recurrence-prompt-dismiss"
        >
          忽略本次提示
        </button>
      </div>
    </section>
  );
}
