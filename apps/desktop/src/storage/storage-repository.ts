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
import { createRemoteValidationFailed, createUnexpectedWriteError } from "./storage-result.ts";

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

const LOCAL_DEFAULT_WORKSPACE_TIMESTAMP = "2026-04-23T00:00:00+08:00";

const LOCAL_DEFAULT_WORKSPACE: Workspace = {
  ...DEFAULT_WORKSPACE,
  createdAt: LOCAL_DEFAULT_WORKSPACE_TIMESTAMP,
  updatedAt: LOCAL_DEFAULT_WORKSPACE_TIMESTAMP,
};

export interface StorageRepository {
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
