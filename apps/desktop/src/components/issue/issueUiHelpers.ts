import type { IssueCard } from "../../domain/schemas/issue-card";
import type { IntakeSeverity } from "../../domain/issue-intake";
import type { StorageSearchResultItem } from "../../storage/storage-repository";

export const SEVERITIES: IntakeSeverity[] = ["low", "medium", "high", "critical"];

export const SEVERITY_LABELS: Record<IntakeSeverity, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "紧急",
};

export function parseTagsInput(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of value.split(/[,，]/)) {
    const tag = item.trim();
    const key = tag.toLocaleLowerCase();
    if (tag.length === 0 || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function formatTags(tags: string[] | undefined): string {
  const normalized = tags?.filter((tag) => tag.trim().length > 0) ?? [];
  return normalized.length > 0 ? normalized.join("、") : "(未加标签)";
}

export function labelSeverity(severity: IssueCard["severity"] | IntakeSeverity): string {
  return SEVERITY_LABELS[severity];
}

export function labelIssueStatus(status: IssueCard["status"]): string {
  const labels: Record<IssueCard["status"], string> = {
    open: "处理中",
    investigating: "排查中",
    resolved: "已解决",
    archived: "已归档",
    needs_manual_review: "需人工复核",
  };
  return labels[status];
}

export function labelSearchResultKind(kind: StorageSearchResultItem["kind"]): string {
  const labels: Record<StorageSearchResultItem["kind"], string> = {
    issue: "问题卡",
    record: "排查记录",
    archive: "归档摘要",
    error_entry: "错误表",
  };
  return labels[kind];
}

export function labelSearchMatchedFields(item: StorageSearchResultItem): string {
  if (item.matchedFields.length === 0) {
    return "未标注";
  }
  return item.matchedFields.join(" / ");
}
