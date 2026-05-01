import { z } from "zod";

import type { IssueCard } from "../domain/schemas/issue-card.ts";
import {
  createHttpStorageClient,
  type HttpStorageClientOptions,
  type HttpStorageRequestError,
} from "../storage/http-storage-client.ts";
import {
  AiDraftOutputSchema,
  type AiCloseoutDraft,
  type AiDraftOutput,
  type AiPromptTask,
} from "./prompt-templates.ts";

const AiStatusResponseSchema = z.object({
  provider: z.string().min(1),
  configured: z.boolean(),
  model: z.string().min(1),
  timeoutMs: z.number().int().positive(),
});

const AiDraftResponseSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  task: z.string().min(1),
  output: z.unknown(),
});

const DEFAULT_AI_HTTP_TIMEOUT_MS = 25000;

export type AiProviderStatus = z.infer<typeof AiStatusResponseSchema>;

export type AiDraftFailure = {
  code: string;
  message: string;
  retryable: boolean;
};

export type GenerateAiDraftResult =
  | {
      ok: true;
      provider: string;
      model: string;
      output: AiDraftOutput;
    }
  | {
      ok: false;
      failure: AiDraftFailure;
    };

function pathForWorkspace(workspaceId: string, suffix: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}${suffix}`;
}

function failureFromRequestError(error: HttpStorageRequestError): AiDraftFailure {
  switch (error.type) {
    case "http_error":
      return {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
      };
    case "timeout":
      return {
        code: "AI_CLIENT_TIMEOUT",
        message: error.message,
        retryable: true,
      };
    case "server_unreachable":
      return {
        code: "AI_SERVER_UNREACHABLE",
        message: error.message,
        retryable: true,
      };
    case "invalid_envelope":
      return {
        code: "AI_INVALID_ENVELOPE",
        message: error.message,
        retryable: false,
      };
  }
}

function failureFromUnknown(error: unknown): AiDraftFailure {
  if (typeof error === "object" && error !== null && "type" in error) {
    return failureFromRequestError(error as HttpStorageRequestError);
  }
  return {
    code: "AI_CLIENT_ERROR",
    message: error instanceof Error ? error.message : String(error),
    retryable: false,
  };
}

export async function loadAiProviderStatus(
  workspaceId: string,
  options: HttpStorageClientOptions = {},
): Promise<AiProviderStatus | null> {
  const client = createHttpStorageClient({ timeoutMs: DEFAULT_AI_HTTP_TIMEOUT_MS, ...options });
  try {
    const response = await client.request<unknown>(pathForWorkspace(workspaceId, "/ai/status"));
    const parsed = AiStatusResponseSchema.safeParse(response);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function generateAiCloseoutDraft({
  issue,
  closeoutDraft,
  task = "polish_closeout",
  options = {},
}: {
  issue: IssueCard;
  closeoutDraft: AiCloseoutDraft;
  task?: AiPromptTask;
  options?: HttpStorageClientOptions;
}): Promise<GenerateAiDraftResult> {
  const client = createHttpStorageClient({ timeoutMs: DEFAULT_AI_HTTP_TIMEOUT_MS, ...options });

  try {
    const response = await client.request<unknown>(
      pathForWorkspace(issue.projectId, "/ai/closeout-draft"),
      {
        method: "POST",
        body: JSON.stringify({
          issueId: issue.id,
          task,
          closeoutDraft,
        }),
      },
    );
    const envelope = AiDraftResponseSchema.safeParse(response);
    if (!envelope.success) {
      return {
        ok: false,
        failure: {
          code: "AI_RESPONSE_SCHEMA_ERROR",
          message: "AI response envelope did not match the expected schema",
          retryable: false,
        },
      };
    }
    const output = AiDraftOutputSchema.safeParse(envelope.data.output);
    if (!output.success) {
      return {
        ok: false,
        failure: {
          code: "AI_DRAFT_SCHEMA_ERROR",
          message: "AI draft output did not match the expected schema",
          retryable: false,
        },
      };
    }
    return {
      ok: true,
      provider: envelope.data.provider,
      model: envelope.data.model,
      output: output.data,
    };
  } catch (error) {
    return { ok: false, failure: failureFromUnknown(error) };
  }
}
