import type { ArchiveDocument } from "../domain/schemas/archive-document.ts";
import type { ErrorEntry } from "../domain/schemas/error-entry.ts";
import type { InvestigationRecord } from "../domain/schemas/investigation-record.ts";
import type { IssueCard } from "../domain/schemas/issue-card.ts";
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
  StorageReadError,
  StorageWriteError,
  StorageWriteResult,
} from "./storage-result.ts";

export type {
  ArchiveDocumentListResult,
  ErrorEntryListResult,
  InvestigationRecordListResult,
  IssueCardListResult,
  LoadIssueCardResult,
  StorageReadError,
  StorageWriteError,
  StorageWriteResult,
};

export interface StorageRepository {
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

export const storageRepository: StorageRepository = localStorageStorageRepository;
