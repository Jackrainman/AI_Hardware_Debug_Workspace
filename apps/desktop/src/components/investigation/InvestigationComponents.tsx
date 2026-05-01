import { useEffect, useState, type FormEvent } from "react";
import {
  buildInvestigationRecordFromIntake,
  defaultInvestigationIntakeOptions,
  nowISO as nowISOInvestigation,
  type InvestigationIntakeInput,
  type InvestigationIntakeResult,
  type InvestigationType,
} from "../../domain/investigation-intake";
import type {
  InvestigationRecordListResult,
  StorageRepository,
} from "../../storage/storage-repository";
import {
  createValidationStorageFeedbackError,
  storageWriteErrorToFeedback,
  type StorageFeedbackError,
} from "../../storage/storage-feedback";
import {
  clearPersistedFormDraft,
  getBrowserFormDraftStorage,
  readPersistedFormDraft,
  writePersistedFormDraft,
} from "../../storage/form-draft-store";

const INVESTIGATION_TYPES: InvestigationType[] = [
  "observation",
  "hypothesis",
  "action",
  "result",
  "conclusion",
  "note",
];

const INVESTIGATION_TYPE_LABELS: Record<InvestigationType, string> = {
  observation: "观察",
  hypothesis: "假设",
  action: "动作",
  result: "结果",
  conclusion: "结论",
  note: "备注",
};

type InvestigationSubmitStatus =
  | { state: "idle" }
  | { state: "saved"; id: string; at: string }
  | { state: "error"; reason: string };

type InvestigationFormDraftStatus =
  | "idle"
  | "restored-server"
  | "restored-local"
  | "stored-server"
  | "stored-local"
  | "unavailable"
  | "cleared";

type InvestigationFormDraft = {
  type: InvestigationType;
  note: string;
};

export function InvestigationAppendForm({
  repository,
  workspaceId,
  issueId,
  isArchived = false,
  onAppended,
  reportStorageError,
  clearStorageFeedback,
}: {
  repository: StorageRepository;
  workspaceId: string;
  issueId: string;
  isArchived?: boolean;
  onAppended: () => void;
  reportStorageError: (error: StorageFeedbackError) => void;
  clearStorageFeedback: () => void;
}) {
  const [type, setType] = useState<InvestigationType>("observation");
  const [note, setNote] = useState<string>("");
  const [status, setStatus] = useState<InvestigationSubmitStatus>({ state: "idle" });
  const [draftStatus, setDraftStatus] = useState<InvestigationFormDraftStatus>("idle");
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const draftScope = { workspaceId, formKind: "investigation", itemId: issueId };

  useEffect(() => {
    let cancelled = false;
    setIsExpanded(false);
    setIsDraftReady(false);
    void readPersistedFormDraft(
      repository.formDrafts,
      getBrowserFormDraftStorage(),
      draftScope,
      parseInvestigationFormDraft,
    ).then((restored) => {
      if (cancelled) return;
      if (restored.state === "restored") {
        setType(restored.data.type);
        setNote(restored.data.note);
        setDraftStatus(restored.source === "server" ? "restored-server" : "restored-local");
      } else {
        setType("observation");
        setNote("");
        setDraftStatus(restored.state === "unavailable" ? "unavailable" : "idle");
      }
      setIsDraftReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [repository.formDrafts, workspaceId, issueId]);

  useEffect(() => {
    if (!isDraftReady) return;
    let cancelled = false;
    if (note.trim().length === 0 && type === "observation") {
      void clearPersistedFormDraft(repository.formDrafts, getBrowserFormDraftStorage(), draftScope);
      return () => {
        cancelled = true;
      };
    }
    void writePersistedFormDraft(
      repository.formDrafts,
      getBrowserFormDraftStorage(),
      draftScope,
      { type, note },
    ).then((stored) => {
      if (cancelled) return;
      setDraftStatus(
        stored === "server" ? "stored-server" : stored === "local" ? "stored-local" : "unavailable",
      );
    });
    return () => {
      cancelled = true;
    };
  }, [repository.formDrafts, workspaceId, issueId, type, note, isDraftReady]);

  const handleClearFormDraft = async () => {
    await clearPersistedFormDraft(repository.formDrafts, getBrowserFormDraftStorage(), draftScope);
    setNote("");
    setType("observation");
    setDraftStatus("cleared");
  };

  const title = isArchived ? "结案补充" : "创建排查记录";
  const description = isArchived ? "归档后补充排查记录。" : "把当前观察、动作或判断追加到排查时间线。";
  const hasLocalDraft =
    draftStatus === "restored-server" || draftStatus === "restored-local" || hasInvestigationFormDraftContent({ type, note });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: InvestigationIntakeInput = { issueId, type, note };
    const result: InvestigationIntakeResult = buildInvestigationRecordFromIntake(
      input,
      defaultInvestigationIntakeOptions(nowISOInvestigation()),
    );
    if (!result.ok) {
      reportStorageError(
        createValidationStorageFeedbackError(
          "investigation_append",
          "save_record",
          result.reason,
        ),
      );
      setStatus({ state: "error", reason: "请查看顶部统一存储提示" });
      return;
    }
    const saved = await repository.investigationRecords.append(result.record);
    if (!saved.ok) {
      reportStorageError(
        storageWriteErrorToFeedback("investigation_append", "save_record", saved.error),
      );
      setStatus({
        state: "error",
        reason: "请查看顶部统一存储提示",
      });
      return;
    }
    clearStorageFeedback();
    await clearPersistedFormDraft(repository.formDrafts, getBrowserFormDraftStorage(), draftScope);
    setStatus({ state: "saved", id: result.record.id, at: result.record.createdAt });
    setNote("");
    setType("observation");
    onAppended();
  };

  return (
    <form
      className="intake-form"
      onSubmit={handleSubmit}
      data-testid="investigation-append-form"
      data-expanded={isExpanded ? "true" : "false"}
    >
      <div className="form-caption investigation-append-caption">
        <div className="investigation-append-caption-row">
          <div>
            <h3>{isExpanded ? title : "排查追记"}</h3>
            <p>{isExpanded ? description : "需要补充观察、动作或判断时再打开。"}</p>
          </div>
          {!isExpanded && (
            <button
              type="button"
              className="button-secondary"
              data-testid="open-investigation-append-form"
              onClick={() => setIsExpanded(true)}
            >
              {title}
            </button>
          )}
        </div>
        {!isExpanded && hasLocalDraft ? (
          <p className="storage-line investigation-append-draft-hint">
            有未提交草稿，可继续编辑。
          </p>
        ) : null}
      </div>
      {isExpanded && (
        <>
          <p className="storage-line" data-testid="investigation-target">
            当前问题：{issueId}
          </p>
          <div className="list-header">
            <span className="storage-line" data-testid="investigation-form-draft-state">
              未提交内容：{renderInvestigationDraftStatus(draftStatus)}
            </span>
            <button type="button" className="button-secondary" onClick={handleClearFormDraft}>
              清除草稿
            </button>
          </div>
          <label className="intake-field">
            <span>记录类型</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as InvestigationType)}
            >
              {INVESTIGATION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {INVESTIGATION_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="intake-field">
            <span>排查记录</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="写下刚看到的现象、尝试过的动作或下一步判断"
            />
          </label>
          <div className="intake-actions">
            <button type="submit">追加记录</button>
          </div>
          <p className="storage-line" data-testid="investigation-status">
            追记状态：{renderInvestigationStatus(status)}
          </p>
        </>
      )}
    </form>
  );
}

export function InvestigationRecordListView({
  result,
  onRefresh,
}: {
  result: InvestigationRecordListResult | null;
  onRefresh: () => void;
}) {
  return (
    <div className="list-view" data-testid="investigation-record-list">
      <div className="form-caption">
        <h3>排查时间线</h3>
        <p>按创建时间展示。</p>
      </div>
      <div className="list-header">
        <button type="button" className="button-secondary" onClick={onRefresh}>
          刷新记录
        </button>
        <span className="storage-line" data-testid="record-list-summary">
          {result === null
            ? "先选中一个问题卡"
            : `记录 ${result.valid.length} 条 · 异常 ${result.invalid.length} 条`}
        </span>
      </div>
      {result && result.readError === null && result.valid.length === 0 && result.invalid.length === 0 && (
        <p className="empty-state">还没有排查记录。</p>
      )}
      {result && result.valid.length > 0 && (
        <ol className="record-timeline" data-testid="record-timeline">
          {result.valid.map((record, index) => (
            <li
              key={record.id}
              className="record-timeline-item"
              data-record-type={record.type}
              data-testid="record-timeline-item"
            >
              <span className="record-timeline-marker" aria-hidden="true">
                {index + 1}
              </span>
              <article className="record-timeline-card">
                <div className="record-timeline-header">
                  <span className="record-type-chip">
                    {labelInvestigationType(record.type)}
                  </span>
                  <time className="record-timeline-time" dateTime={record.createdAt}>
                    {record.createdAt}
                  </time>
                </div>
                <p className="record-timeline-text">{record.polishedText}</p>
                <span className="list-item-id">编号：{record.id}</span>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function renderInvestigationStatus(status: InvestigationSubmitStatus): string {
  switch (status.state) {
    case "idle":
      return "待选择类型并填写记录";
    case "saved":
      return `已追加 · ${status.id} · ${status.at}`;
    case "error":
      return `追加失败：${status.reason}`;
  }
}

function parseInvestigationFormDraft(value: unknown): InvestigationFormDraft | null {
  if (typeof value !== "object" || value === null) return null;
  const draft = value as Partial<Record<keyof InvestigationFormDraft, unknown>>;
  if (typeof draft.note !== "string") return null;
  if (typeof draft.type !== "string" || !INVESTIGATION_TYPES.includes(draft.type as InvestigationType)) {
    return null;
  }
  return { type: draft.type as InvestigationType, note: draft.note };
}

function hasInvestigationFormDraftContent(draft: InvestigationFormDraft): boolean {
  return draft.note.trim().length > 0 || draft.type !== "observation";
}

function renderInvestigationDraftStatus(status: InvestigationFormDraftStatus): string {
  switch (status) {
    case "idle":
      return "后台可用时写入 SQLite；不可用时回退浏览器本地暂存。";
    case "restored-server":
      return "已从后台 / SQLite 恢复上次未提交内容。";
    case "restored-local":
      return "后台不可用或无后台草稿，已从浏览器本地恢复。";
    case "stored-server":
      return "已暂存到后台 / SQLite。";
    case "stored-local":
      return "后台不可用，已暂存在浏览器本地。";
    case "unavailable":
      return "后台和浏览器本地暂存都不可用；当前填写仍可提交。";
    case "cleared":
      return "已清除未提交草稿。";
  }
}

function labelInvestigationType(type: InvestigationType): string {
  return INVESTIGATION_TYPE_LABELS[type];
}
