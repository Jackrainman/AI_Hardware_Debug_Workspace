// apps/desktop/src/domain/issue-intake.ts
// S2-A1：把最小表单输入转成一张可通过 IssueCardSchema 校验的 IssueCard。
// 工厂函数保持纯函数，便于在 Node 侧直接用 zod 校验做黑盒验证；
// 外部（浏览器 UI 或 Node 验证脚本）负责注入 id / timestamp 以便控制测试确定性。

import type { z } from "zod";
import {
  IssueCardSchema,
  IssueSeverity,
  type IssueCard,
} from "./schemas/issue-card.ts";

export type IntakeSeverity = z.infer<typeof IssueSeverity>;

// 受控表单面向用户的最小输入。symptom / tags / suspected 等字段 S2 后续再扩展。
export interface IntakeInput {
  title: string;
  description: string;
  severity: IntakeSeverity;
}

export interface IntakeOptions {
  id: string;
  projectId: string;
  // 例如 "2026-04-21T03:10:00Z" 或 "2026-04-21T11:10:00+08:00"
  now: string;
}

export type IntakeFailure = {
  ok: false;
  // 人类可读原因（字段名 + 简短描述），用于表单 inline 反馈。
  reason: string;
  // zod issue 路径（如果是 schema 校验失败）。
  path?: (string | number)[];
};

export type IntakeSuccess = {
  ok: true;
  card: IssueCard;
};

export type IntakeResult = IntakeSuccess | IntakeFailure;

function normalizeInput(input: IntakeInput): IntakeInput {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    severity: input.severity,
  };
}

export function buildIssueCardFromIntake(
  rawInput: IntakeInput,
  opts: IntakeOptions,
): IntakeResult {
  const input = normalizeInput(rawInput);

  if (input.title.length === 0) {
    return { ok: false, reason: "title is required", path: ["title"] };
  }

  const draft: IssueCard = {
    id: opts.id,
    projectId: opts.projectId,
    title: input.title,
    rawInput: input.description,
    normalizedSummary: input.description,
    symptomSummary: "",
    suspectedDirections: [],
    suggestedActions: [],
    status: "open",
    severity: input.severity,
    tags: [],
    repoSnapshot: {
      branch: "unknown",
      headCommitHash: "0000000000000000000000000000000000000000",
      headCommitMessage: "",
      hasUncommittedChanges: false,
      changedFiles: [],
      recentCommits: [],
      capturedAt: opts.now,
    },
    relatedFiles: [],
    relatedCommits: [],
    relatedHistoricalIssueIds: [],
    createdAt: opts.now,
    updatedAt: opts.now,
  };

  const parsed = IssueCardSchema.safeParse(draft);
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

  return { ok: true, card: parsed.data };
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function generateIssueId(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID) {
    return `issue-${cryptoRef.randomUUID()}`;
  }
  return `issue-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function defaultIntakeOptions(now: string, id?: string): IntakeOptions {
  return {
    id: id ?? generateIssueId(),
    projectId: "default-project",
    now,
  };
}
