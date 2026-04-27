import type { ArchiveDocument } from "../domain/schemas/archive-document.ts";
import type { ErrorEntry } from "../domain/schemas/error-entry.ts";
import type { InvestigationRecord } from "../domain/schemas/investigation-record.ts";
import type { IssueCard } from "../domain/schemas/issue-card.ts";
import { DEFAULT_WORKSPACE, type Workspace } from "../domain/workspace.ts";
import {
  listArchiveDocuments,
  saveArchiveDocument,
  type ArchiveDocumentListResult,
} from "./archive-document-store.ts";
import {
  listErrorEntries,
  saveErrorEntry,
  type ErrorEntryListResult,
} from "./error-entry-store.ts";
import {
  checkHttpStorageHealth,
  createHttpStorageRepository,
  httpStorageRepository,
  type HttpStorageHealthStatus,
} from "./http-storage-repository.ts";
import {
  listInvestigationRecordsByIssueId,
  saveInvestigationRecord,
  type InvestigationRecordListResult,
} from "./investigation-record-store.ts";
import {
  listIssueCards,
  loadIssueCard,
  saveIssueCard,
  type IssueCardListResult,
  type LoadIssueCardResult,
} from "./issue-card-store.ts";
import type {
  StorageErrorConnection,
  StorageReadError,
  StorageWriteError,
  StorageWriteResult,
} from "./storage-result.ts";
import { createReadFailed, createRemoteValidationFailed, createUnexpectedWriteError } from "./storage-result.ts";

export type {
  ArchiveDocumentListResult,
  ErrorEntryListResult,
  InvestigationRecordListResult,
  IssueCardListResult,
  LoadIssueCardResult,
  StorageErrorConnection,
  StorageReadError,
  StorageWriteError,
  StorageWriteResult,
  HttpStorageHealthStatus,
};

export type WorkspaceListInvalidEntry = {
  kind: "validation_error";
  key: string;
  id: string;
  issues: unknown[];
};

export type WorkspaceListResult = {
  valid: Workspace[];
  invalid: WorkspaceListInvalidEntry[];
  readError: StorageReadError | null;
};

export type CreateWorkspaceInput = {
  name: string;
};

export type CreateWorkspaceResult =
  | { ok: true; workspace: Workspace }
  | { ok: false; error: StorageWriteError };

export type StorageSearchResultKind = "issue" | "record" | "archive" | "error_entry";

export interface StorageSearchResultItem {
  kind: StorageSearchResultKind;
  id: string;
  issueId: string;
  title: string;
  matchedFields: string[];
  snippet: string;
  status?: IssueCard["status"];
  recordType?: InvestigationRecord["type"];
  fileName?: string;
  errorCode?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  generatedAt?: string;
}

export interface StorageSearchResult {
  query: string;
  items: StorageSearchResultItem[];
  readError: StorageReadError | null;
}

const LOCAL_DEFAULT_WORKSPACE_TIMESTAMP = "2026-04-23T00:00:00+08:00";

const LOCAL_DEFAULT_WORKSPACE: Workspace = {
  ...DEFAULT_WORKSPACE,
  createdAt: LOCAL_DEFAULT_WORKSPACE_TIMESTAMP,
  updatedAt: LOCAL_DEFAULT_WORKSPACE_TIMESTAMP,
};

function searchTextFromValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(searchTextFromValue).filter(Boolean).join(" ");
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function compactSearchText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function createLocalSearchSnippet(text: string, query: string): string {
  const compacted = compactSearchText(text);
  if (compacted.length <= 160) {
    return compacted;
  }
  const matchIndex = compacted.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  const start = matchIndex < 0 ? 0 : Math.max(0, matchIndex - 60);
  const end = Math.min(compacted.length, start + 160);
  return `${start > 0 ? "..." : ""}${compacted.slice(start, end)}${end < compacted.length ? "..." : ""}`;
}

function findLocalMatchedFields(
  fields: Array<[string, unknown]>,
  query: string,
): { matchedFields: string[]; snippet: string } {
  const normalizedQuery = query.toLocaleLowerCase();
  const matchedFields: string[] = [];
  let snippet = "";
  for (const [name, value] of fields) {
    const text = searchTextFromValue(value);
    if (text.toLocaleLowerCase().includes(normalizedQuery)) {
      matchedFields.push(name);
      if (!snippet) {
        snippet = createLocalSearchSnippet(text, query);
      }
    }
  }
  return { matchedFields, snippet };
}

function searchTimestamp(item: StorageSearchResultItem): string {
  return item.updatedAt ?? item.generatedAt ?? item.createdAt ?? "";
}

async function searchLocalStorage(query: string): Promise<StorageSearchResult> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length === 0) {
    return { query: normalizedQuery, items: [], readError: null };
  }

  const items: StorageSearchResultItem[] = [];
  const issueList = listIssueCards();
  if (issueList.readError !== null) {
    return { query: normalizedQuery, items: [], readError: issueList.readError };
  }

  for (const summary of issueList.valid) {
    const loaded = loadIssueCard(summary.id);
    if (!loaded.ok) continue;
    const issue = loaded.card;
    const issueMatch = findLocalMatchedFields(
      [
        ["title", issue.title],
        ["rawInput", issue.rawInput],
        ["normalizedSummary", issue.normalizedSummary],
        ["symptomSummary", issue.symptomSummary],
        ["suspectedDirections", issue.suspectedDirections],
        ["suggestedActions", issue.suggestedActions],
        ["tags", issue.tags],
      ],
      normalizedQuery,
    );
    if (issueMatch.matchedFields.length > 0) {
      items.push({
        kind: "issue",
        id: issue.id,
        issueId: issue.id,
        title: issue.title,
        matchedFields: issueMatch.matchedFields,
        snippet: issueMatch.snippet,
        status: issue.status,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
      });
    }

    const records = listInvestigationRecordsByIssueId(issue.id);
    if (records.readError !== null) {
      return { query: normalizedQuery, items: [], readError: records.readError };
    }
    for (const record of records.valid) {
      const recordMatch = findLocalMatchedFields(
        [
          ["rawText", record.rawText],
          ["polishedText", record.polishedText],
          ["aiExtractedSignals", record.aiExtractedSignals],
        ],
        normalizedQuery,
      );
      if (recordMatch.matchedFields.length === 0) continue;
      items.push({
        kind: "record",
        id: record.id,
        issueId: record.issueId,
        title: `排查记录：${record.issueId}`,
        matchedFields: recordMatch.matchedFields,
        snippet: recordMatch.snippet,
        recordType: record.type,
        createdAt: record.createdAt,
      });
    }
  }

  const archives = listArchiveDocuments();
  if (archives.readError !== null) {
    return { query: normalizedQuery, items: [], readError: archives.readError };
  }
  for (const archive of archives.valid) {
    const archiveMatch = findLocalMatchedFields(
      [
        ["fileName", archive.fileName],
        ["markdownContent", archive.markdownContent],
      ],
      normalizedQuery,
    );
    if (archiveMatch.matchedFields.length === 0) continue;
    items.push({
      kind: "archive",
      id: archive.fileName,
      issueId: archive.issueId,
      title: archive.fileName,
      matchedFields: archiveMatch.matchedFields,
      snippet: archiveMatch.snippet,
      fileName: archive.fileName,
      generatedAt: archive.generatedAt,
    });
  }

  const errorEntries = listErrorEntries();
  if (errorEntries.readError !== null) {
    return { query: normalizedQuery, items: [], readError: errorEntries.readError };
  }
  for (const entry of errorEntries.valid) {
    const entryMatch = findLocalMatchedFields(
      [
        ["errorCode", entry.errorCode],
        ["title", entry.title],
        ["category", entry.category],
        ["symptom", entry.symptom],
        ["rootCause", entry.rootCause],
        ["resolution", entry.resolution],
        ["prevention", entry.prevention],
      ],
      normalizedQuery,
    );
    if (entryMatch.matchedFields.length === 0) continue;
    items.push({
      kind: "error_entry",
      id: entry.id,
      issueId: entry.sourceIssueId,
      title: entry.title,
      matchedFields: entryMatch.matchedFields,
      snippet: entryMatch.snippet,
      errorCode: entry.errorCode,
      category: entry.category,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  }

  items.sort((a, b) => {
    const left = searchTimestamp(a);
    const right = searchTimestamp(b);
    return left < right ? 1 : left > right ? -1 : a.id.localeCompare(b.id);
  });

  return { query: normalizedQuery, items, readError: null };
}

export interface StorageRepository {
  search: {
    query(query: string): Promise<StorageSearchResult>;
  };
  workspaces: {
    list(): Promise<WorkspaceListResult>;
    create(input: CreateWorkspaceInput): Promise<CreateWorkspaceResult>;
  };
  issueCards: {
    list(): Promise<IssueCardListResult>;
    load(id: string): Promise<LoadIssueCardResult>;
    save(card: IssueCard): Promise<StorageWriteResult>;
  };
  investigationRecords: {
    listByIssueId(issueId: string): Promise<InvestigationRecordListResult>;
    append(record: InvestigationRecord): Promise<StorageWriteResult>;
  };
  archiveDocuments: {
    list(): Promise<ArchiveDocumentListResult>;
    save(document: ArchiveDocument): Promise<StorageWriteResult>;
  };
  errorEntries: {
    list(): Promise<ErrorEntryListResult>;
    save(entry: ErrorEntry): Promise<StorageWriteResult>;
  };
}

export const localStorageStorageRepository: StorageRepository = {
  search: {
    async query(query: string): Promise<StorageSearchResult> {
      try {
        return await searchLocalStorage(query);
      } catch (error) {
        return {
          query: query.trim(),
          items: [],
          readError: createReadFailed("issue_card", "local_search", error),
        };
      }
    },
  },
  workspaces: {
    async list(): Promise<WorkspaceListResult> {
      return { valid: [LOCAL_DEFAULT_WORKSPACE], invalid: [], readError: null };
    },
    async create(input: CreateWorkspaceInput): Promise<CreateWorkspaceResult> {
      if (input.name.trim().length === 0) {
        return {
          ok: false,
          error: createRemoteValidationFailed(
            "workspace",
            "create_workspace",
            "workspace.name is required",
          ),
        };
      }
      return {
        ok: false,
        error: createUnexpectedWriteError(
          "workspace",
          "create_workspace",
          "creating workspaces requires the HTTP storage adapter",
        ),
      };
    },
  },
  issueCards: {
    async list(): Promise<IssueCardListResult> {
      return listIssueCards();
    },
    async load(id: string): Promise<LoadIssueCardResult> {
      return loadIssueCard(id);
    },
    async save(card: IssueCard): Promise<StorageWriteResult> {
      return saveIssueCard(card);
    },
  },
  investigationRecords: {
    async listByIssueId(issueId: string): Promise<InvestigationRecordListResult> {
      return listInvestigationRecordsByIssueId(issueId);
    },
    async append(record: InvestigationRecord): Promise<StorageWriteResult> {
      return saveInvestigationRecord(record);
    },
  },
  archiveDocuments: {
    async list(): Promise<ArchiveDocumentListResult> {
      return listArchiveDocuments();
    },
    async save(document: ArchiveDocument): Promise<StorageWriteResult> {
      return saveArchiveDocument(document);
    },
  },
  errorEntries: {
    async list(): Promise<ErrorEntryListResult> {
      return listErrorEntries();
    },
    async save(entry: ErrorEntry): Promise<StorageWriteResult> {
      return saveErrorEntry(entry);
    },
  },
};

export type StorageRepositoryRuntime = "http" | "local_storage";

export const STORAGE_REPOSITORY_RUNTIME: StorageRepositoryRuntime =
  typeof document !== "undefined" && typeof window !== "undefined" ? "http" : "local_storage";

export function createStorageRepository(options: { workspaceId?: string } = {}): StorageRepository {
  return STORAGE_REPOSITORY_RUNTIME === "http"
    ? createHttpStorageRepository({ workspaceId: options.workspaceId })
    : localStorageStorageRepository;
}

export const storageRepository: StorageRepository = createStorageRepository();

export { checkHttpStorageHealth, httpStorageRepository };
