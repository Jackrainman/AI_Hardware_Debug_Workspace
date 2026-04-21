// apps/desktop/src/domain/investigation-intake.ts
// S2-A3：把"选中的 IssueCard + 追记表单输入"转成一条可通过 InvestigationRecordSchema 的记录。
// 与 issue-intake 同一套反馈闭环：trim → 结构化 reject（空 issueId / 空 note）→ safeParse → 结构化失败。
// 外部（浏览器 UI 或 Node 验证脚本）负责注入 id / now，以便 Node 侧做确定性黑盒验证。

import type { z } from "zod";
import {
  InvestigationRecordSchema,
  InvestigationRecordType,
  type InvestigationRecord,
} from "./schemas/investigation-record.ts";

export type InvestigationType = z.infer<typeof InvestigationRecordType>;

export interface InvestigationIntakeInput {
  issueId: string;
  type: InvestigationType;
  note: string;
}

export interface InvestigationIntakeOptions {
  id: string;
  now: string;
}

export type InvestigationIntakeFailure = {
  ok: false;
  reason: string;
  path?: (string | number)[];
};

export type InvestigationIntakeSuccess = {
  ok: true;
  record: InvestigationRecord;
};

export type InvestigationIntakeResult =
  | InvestigationIntakeSuccess
  | InvestigationIntakeFailure;

function normalizeInput(input: InvestigationIntakeInput): InvestigationIntakeInput {
  return {
    issueId: input.issueId.trim(),
    type: input.type,
    note: input.note.trim(),
  };
}

export function buildInvestigationRecordFromIntake(
  rawInput: InvestigationIntakeInput,
  opts: InvestigationIntakeOptions,
): InvestigationIntakeResult {
  const input = normalizeInput(rawInput);

  if (input.issueId.length === 0) {
    return { ok: false, reason: "issueId is required", path: ["issueId"] };
  }
  if (input.note.length === 0) {
    return { ok: false, reason: "note is required", path: ["note"] };
  }

  const draft: InvestigationRecord = {
    id: opts.id,
    issueId: input.issueId,
    type: input.type,
    rawText: input.note,
    polishedText: input.note,
    aiExtractedSignals: [],
    linkedFiles: [],
    linkedCommits: [],
    createdAt: opts.now,
  };

  const parsed = InvestigationRecordSchema.safeParse(draft);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      reason: first
        ? `${first.path.join(".") || "(root)"}: ${first.message}`
        : "schema validation failed",
      path: first?.path as (string | number)[] | undefined,
    };
  }

  return { ok: true, record: parsed.data };
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function generateRecordId(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID) {
    return `record-${cryptoRef.randomUUID()}`;
  }
  return `record-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function defaultInvestigationIntakeOptions(
  now: string,
  id?: string,
): InvestigationIntakeOptions {
  return {
    id: id ?? generateRecordId(),
    now,
  };
}
