// apps/desktop/src/domain/workspace.ts
// S3-PREP-WORKSPACE-FOUNDATION-A1：默认共用工作区基础。
// 当前前端 schema 仍只有 projectId；S3 准备期先把默认 workspace 映射到现有
// projectId 字段，避免在今晚改 IssueCard / InvestigationRecord / Archive schema。

export const DEFAULT_WORKSPACE_ID = "workspace-26-r1";
export const DEFAULT_WORKSPACE_NAME = "26年 R1";

export interface WorkspaceIdentity {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

export interface Workspace extends WorkspaceIdentity {
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_WORKSPACE: WorkspaceIdentity = {
  id: DEFAULT_WORKSPACE_ID,
  name: DEFAULT_WORKSPACE_NAME,
  description: "S3 准备期的默认共用工作区；后续 server storage 会以此作为 workspace 边界。",
  isDefault: true,
};

export function resolveWorkspaceId(input?: string | null): string {
  const trimmed = input?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : DEFAULT_WORKSPACE_ID;
}
