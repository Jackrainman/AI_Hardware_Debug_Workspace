import type { StorageReadError, StorageRepository } from "./storage-repository";

export type ArchiveIndexItem = {
  fileName: string;
  filePath: string;
  issueId: string;
  errorCode: string | null;
  errorEntryId: string | null;
  category: string | null;
  tags: string[];
  generatedAt: string;
  markdownContent: string;
};

export type ArchiveIndex = {
  items: ArchiveIndexItem[];
  invalidCount: number;
  readErrors: StorageReadError[];
};

type IndexedErrorEntry = {
  errorCode: string;
  errorEntryId: string;
  category: string;
  tags: string[];
};

export async function loadArchiveIndex(
  repository: StorageRepository,
  workspaceId?: string,
): Promise<ArchiveIndex> {
  const docList = await repository.archiveDocuments.list();
  const errorList = await repository.errorEntries.list();
  const errorByIssue = new Map<string, IndexedErrorEntry>();

  const entries = workspaceId === undefined
    ? errorList.valid
    : errorList.valid.filter((entry) => entry.projectId === workspaceId);
  for (const entry of entries) {
    if (errorByIssue.has(entry.sourceIssueId)) continue;
    errorByIssue.set(entry.sourceIssueId, {
      errorCode: entry.errorCode,
      errorEntryId: entry.id,
      category: entry.category,
      tags: entry.tags ?? [],
    });
  }

  const docs = workspaceId === undefined
    ? docList.valid
    : docList.valid.filter((doc) => doc.projectId === workspaceId);
  const items: ArchiveIndexItem[] = docs.map((doc) => {
    const matched = errorByIssue.get(doc.issueId);
    return {
      fileName: doc.fileName,
      filePath: doc.filePath,
      issueId: doc.issueId,
      errorCode: matched?.errorCode ?? null,
      errorEntryId: matched?.errorEntryId ?? null,
      category: matched?.category ?? null,
      tags: matched?.tags ?? [],
      generatedAt: doc.generatedAt,
      markdownContent: doc.markdownContent,
    };
  });

  return {
    items,
    invalidCount: docList.invalid.length + errorList.invalid.length,
    readErrors: [docList.readError, errorList.readError].filter(
      (error): error is StorageReadError => error !== null,
    ),
  };
}
