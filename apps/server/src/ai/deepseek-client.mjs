export const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
export const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
export const DEFAULT_DEEPSEEK_TIMEOUT_MS = 20000;

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function parseTimeoutMs(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_DEEPSEEK_TIMEOUT_MS;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DEEPSEEK_TIMEOUT_MS;
  return Math.floor(parsed);
}

function stringFromEnv(env, key, fallback = "") {
  const value = env?.[key];
  return typeof value === "string" ? value.trim() : fallback;
}

export function getDeepSeekConfig(env = process.env) {
  const apiKey = stringFromEnv(env, "DEEPSEEK_API_KEY");
  const baseUrl = stringFromEnv(env, "DEEPSEEK_BASE_URL", DEFAULT_DEEPSEEK_BASE_URL) || DEFAULT_DEEPSEEK_BASE_URL;
  const model = stringFromEnv(env, "DEEPSEEK_MODEL", DEFAULT_DEEPSEEK_MODEL) || DEFAULT_DEEPSEEK_MODEL;
  return {
    provider: "deepseek",
    configured: apiKey.length > 0,
    apiKey,
    baseUrl: trimTrailingSlash(baseUrl),
    model,
    timeoutMs: parseTimeoutMs(env?.DEEPSEEK_TIMEOUT_MS),
  };
}

export function getDeepSeekStatus(env = process.env) {
  const config = getDeepSeekConfig(env);
  return {
    provider: config.provider,
    configured: config.configured,
    model: config.model,
    timeoutMs: config.timeoutMs,
  };
}

function createAiError(code, message, statusCode, retryable, details = {}) {
  return {
    ok: false,
    statusCode,
    error: {
      code,
      message,
      retryable,
      details,
    },
  };
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "messages must be a non-empty array";
  }
  for (const message of messages) {
    if (message?.role !== "system" && message?.role !== "user") {
      return "messages[].role must be system or user";
    }
    if (typeof message.content !== "string" || message.content.trim().length === 0) {
      return "messages[].content must be a non-empty string";
    }
  }
  return null;
}

function normalizeDraftPayload(payload) {
  const messagesError = validateMessages(payload?.messages);
  if (messagesError) {
    return { ok: false, reason: messagesError };
  }
  if (typeof payload.task !== "string" || payload.task.trim().length === 0) {
    return { ok: false, reason: "task must be a non-empty string" };
  }
  return {
    ok: true,
    task: payload.task.trim(),
    messages: payload.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}

async function readErrorBody(response) {
  try {
    const text = await response.text();
    return text.slice(0, 600);
  } catch {
    return "";
  }
}

function parseJsonObject(content) {
  const parsed = JSON.parse(content);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI response JSON must be an object");
  }
  return parsed;
}

export async function generateDeepSeekDraft(payload, options = {}) {
  const normalized = normalizeDraftPayload(payload);
  if (!normalized.ok) {
    return createAiError("BAD_REQUEST", normalized.reason, 400, false);
  }

  const config = options.config ?? getDeepSeekConfig(options.env ?? process.env);
  if (!config.configured) {
    return createAiError(
      "AI_NOT_CONFIGURED",
      "DeepSeek API key is not configured on the server",
      503,
      false,
      { provider: config.provider, model: config.model },
    );
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return createAiError("AI_FETCH_UNAVAILABLE", "global fetch is not available", 500, false);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: normalized.messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await readErrorBody(response);
      return createAiError(
        "AI_PROVIDER_ERROR",
        `DeepSeek request failed with HTTP ${response.status}`,
        response.status >= 500 ? 502 : 400,
        response.status >= 500 || response.status === 429,
        { provider: config.provider, status: response.status, body },
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      return createAiError("AI_EMPTY_RESPONSE", "DeepSeek returned an empty draft", 502, true, {
        provider: config.provider,
      });
    }

    try {
      return {
        ok: true,
        provider: config.provider,
        model: config.model,
        task: normalized.task,
        output: parseJsonObject(content),
      };
    } catch (error) {
      return createAiError("AI_INVALID_JSON", "DeepSeek response was not valid JSON", 502, false, {
        provider: config.provider,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      return createAiError("AI_TIMEOUT", "DeepSeek request timed out", 504, true, {
        provider: config.provider,
        timeoutMs: config.timeoutMs,
      });
    }
    return createAiError("AI_NETWORK_ERROR", "DeepSeek request failed before a response", 502, true, {
      provider: config.provider,
      reason: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }
}
