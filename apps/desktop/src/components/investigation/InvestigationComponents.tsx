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
  clearFormDraft,
  getBrowserFormDraftStorage,
  readFormDraft,
  writeFormDraft,
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

type InvestigationFormDraftStatus = "idle" | "restored" | "stored" | "unavailable" | "cleared";

type InvestigationFormDraft = {
  type: InvestigationType;
  note: string;
};

export function InvestigationAppendForm({
  repository,
  workspaceId,
  issueId,
  onAppended,
  reportStorageError,
  clearStorageFeedback,
}: {
  repository: StorageRepository;
  workspaceId: string;
  issueId: string;
  onAppended: () => void;
  reportStorageError: (error: StorageFeedbackError) => void;
  clearStorageFeedback: () => void;
}) {
  const [type, setType] = useState<InvestigationType>("observation");
  const [note, setNote] = useState<string>("");
  const [status, setStatus] = useState<InvestigationSubmitStatus>({ state: "idle" });
  const [draftStatus, setDraftStatus] = useState<InvestigationFormDraftStatus>("idle");
  const [isDraftReady, setIsDraftReady] = useState(false);
  const draftScope = { workspaceId, formKind: "investigation", itemId: issueId };

  useEffect(() => {
    setIsDraftReady(false);
    const restored = readFormDraft(
      getBrowserFormDraftStorage(),
      draftScope,
      parseInvestigationFormDraft,
    );
    if (restored.state === "restored") {
      setType(restored.data.type);
      setNote(restored.data.note);
      setDraftStatus("restored");
    } else {
      setType("observation");
      setNote("");
      setDraftStatus(restored.state === "unavailable" ? "unavailable" : "idle");
    }
    setIsDraftReady(true);
  }, [workspaceId, issueId]);

  useEffect(() => {
    if (!isDraftReady) return;
    if (note.trim().length === 0 && type === "observation") {
      clearFormDraft(getBrowserFormDraftStorage(), draftScope);
      return;
    }
    const stored = writeFormDraft(getBrowserFormDraftStorage(), draftScope, { type, note });
    setDraftStatus(stored ? "stored" : "unavailable");
  }, [workspaceId, issueId, type, note, isDraftReady]);

  const handleClearFormDraft = () => {
    clearFormDraft(getBrowserFormDraftStorage(), draftScope);
    setNote("");
    setType("observation");
    setDraftStatus("cleared");
  };

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
    clearFormDraft(getBrowserFormDraftStorage(), draftScope);
    setStatus({ state: "saved", id: result.record.id, at: result.record.createdAt });
    setNote("");
    setType("observation");
    onAppended();
  };

  return (
    <form className="intake-form" onSubmit={handleSubmit} data-testid="investigation-append-form">
      <div className="form-caption">
        <h3>结案补充</h3>
        <p>归档后补充排查记录。</p>
      </div>
      <p className="storage-line" data-testid="investigation-target">
        当前问题：{issueId}
      </p>
      <div className="list-header">
        <span className="storage-line" data-testid="investigation-form-draft-state">
          未提交内容：{renderInvestigationDraftStatus(draftStatus)}
        </span>
        <button type="button" className="button-secondary" onClick={handleClearFormDraft}>
          清除本地草稿
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

function renderInvestigationDraftStatus(status: InvestigationFormDraftStatus): string {
  switch (status) {
    case "idle":
      return "同一域名 / 地址下会自动暂存。";
    case "restored":
      return "已恢复上次未提交内容。";
    case "stored":
      return "已暂存在本地浏览器。";
    case "unavailable":
      return "浏览器本地暂存不可用；当前填写仍可提交。";
    case "cleared":
      return "已清除本地未提交内容。";
  }
}

function labelInvestigationType(type: InvestigationType): string {
  return INVESTIGATION_TYPE_LABELS[type];
}
