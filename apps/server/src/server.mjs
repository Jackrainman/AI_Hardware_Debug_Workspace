import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_WORKSPACE, createProbeFlashDatabase } from "./database.mjs";
import { getReleaseMetadata } from "./release-metadata.mjs";

const SERVER_SRC_DIR = dirname(fileURLToPath(import.meta.url));
const SERVER_APP_DIR = resolve(SERVER_SRC_DIR, "..");
export const DEFAULT_DB_PATH = resolve(SERVER_APP_DIR, ".runtime", "probeflash.local.sqlite");

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function ok(res, data, statusCode = 200) {
  json(res, statusCode, { ok: true, data });
}

function fail(res, statusCode, code, message, operation, retryable, details = {}) {
  json(res, statusCode, {
    ok: false,
    error: {
      code,
      message,
      operation,
      retryable,
      details,
    },
  });
}

function parseAppError(error, fallbackOperation) {
  const code = error?.code ?? "STORAGE_ERROR";
  switch (code) {
    case "BAD_REQUEST":
      return [400, "BAD_REQUEST", error.message, false];
    case "NOT_FOUND":
      return [404, "NOT_FOUND", error.message, false];
    case "CONFLICT":
      return [409, "CONFLICT", error.message, false];
    case "VALIDATION_ERROR":
      return [422, "VALIDATION_ERROR", error.message, false];
    case "SERVICE_UNAVAILABLE":
      return [503, "SERVICE_UNAVAILABLE", error.message, true];
    default:
      return [500, "STORAGE_ERROR", error?.message ?? "unexpected storage error", true];
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    const error = new Error("request body is required");
    error.code = "BAD_REQUEST";
    throw error;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("request body must be valid JSON");
    error.code = "BAD_REQUEST";
    throw error;
  }
}

function ensureStorageReady(store) {
  if (store) return;
  const error = new Error("storage is not ready");
  error.code = "SERVICE_UNAVAILABLE";
  throw error;
}

function getConfig(overrides = {}) {
  const dbPath =
    overrides.dbPath ??
    process.env.PROBEFLASH_DB_PATH ??
    DEFAULT_DB_PATH;
  const host = overrides.host ?? process.env.PROBEFLASH_HOST ?? "127.0.0.1";
  const port =
    overrides.port ??
    (process.env.PROBEFLASH_PORT ? Number(process.env.PROBEFLASH_PORT) : 4100);
  const defaultWorkspace = {
    id: overrides.workspaceId ?? process.env.PROBEFLASH_WORKSPACE_ID ?? DEFAULT_WORKSPACE.id,
    name: overrides.workspaceName ?? process.env.PROBEFLASH_WORKSPACE_NAME ?? DEFAULT_WORKSPACE.name,
    description: DEFAULT_WORKSPACE.description,
    isDefault: true,
  };
  const logDir = overrides.logDir ?? process.env.PROBEFLASH_LOG_DIR;
  mkdirSync(dirname(dbPath), { recursive: true });
  if (logDir) {
    mkdirSync(logDir, { recursive: true });
  }
  return {
    dbPath,
    host,
    port,
    defaultWorkspace,
    logDir,
    releaseMetadata: getReleaseMetadata(overrides.releaseMetadata),
  };
}

function serverStatus() {
  return {
    ready: true,
    runtime: "node_http",
    apiBasePath: "/api",
  };
}

function storageInitFailureDetails(releaseMetadata) {
  return {
    release: releaseMetadata,
    server: serverStatus(),
    storage: {
      kind: "sqlite",
      ready: false,
      error: "init_failed",
    },
  };
}

function createRequestHandler({ store, storeInitError, releaseMetadata }) {
  return async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const method = req.method ?? "GET";
    const issueListMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/issues$/);
    const issueDetailMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/issues\/([^/]+)$/);
    const recordListMatch = url.pathname.match(
      /^\/api\/workspaces\/([^/]+)\/issues\/([^/]+)\/records$/,
    );
    const archiveListMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/archives$/);
    const archiveDetailMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/archives\/(.+)$/);
    const errorEntryListMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/error-entries$/);
    const errorEntryDetailMatch = url.pathname.match(
      /^\/api\/workspaces\/([^/]+)\/error-entries\/([^/]+)$/,
    );
    const workspaceDetailMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)$/);

    try {
      if (url.pathname === "/api/version" && method === "GET") {
        return ok(res, releaseMetadata);
      }

      if (url.pathname === "/api/health" && method === "GET") {
        if (storeInitError) {
          return json(res, 503, {
            ok: false,
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: storeInitError.message,
              operation: "health",
              retryable: true,
              details: storageInitFailureDetails(releaseMetadata),
            },
          });
        }
        return ok(res, { ...store.health(), server: serverStatus(), release: releaseMetadata });
      }

      ensureStorageReady(store);

      if (url.pathname === "/api/workspaces" && method === "GET") {
        return ok(res, { items: store.listWorkspaces() });
      }

      if (url.pathname === "/api/workspaces" && method === "POST") {
        const payload = await readJson(req);
        return ok(res, { workspace: store.createWorkspace(payload) }, 201);
      }

      if (workspaceDetailMatch && method === "GET") {
        return ok(res, store.getWorkspace(decodeURIComponent(workspaceDetailMatch[1])));
      }

      if (issueListMatch && method === "GET") {
        const workspaceId = decodeURIComponent(issueListMatch[1]);
        const status = url.searchParams.get("status") ?? "active";
        return ok(res, { items: store.listIssues(workspaceId, status) });
      }

      if (issueListMatch && method === "POST") {
        const workspaceId = decodeURIComponent(issueListMatch[1]);
        const payload = await readJson(req);
        return ok(res, store.createIssue(workspaceId, payload), 201);
      }

      if (issueDetailMatch && method === "GET") {
        const workspaceId = decodeURIComponent(issueDetailMatch[1]);
        const issueId = decodeURIComponent(issueDetailMatch[2]);
        return ok(res, store.getIssue(workspaceId, issueId));
      }

      if (issueDetailMatch && method === "PUT") {
        const workspaceId = decodeURIComponent(issueDetailMatch[1]);
        const issueId = decodeURIComponent(issueDetailMatch[2]);
        const payload = await readJson(req);
        return ok(res, store.updateIssue(workspaceId, issueId, payload));
      }

      if (recordListMatch && method === "GET") {
        const workspaceId = decodeURIComponent(recordListMatch[1]);
        const issueId = decodeURIComponent(recordListMatch[2]);
        return ok(res, { items: store.listRecords(workspaceId, issueId) });
      }

      if (recordListMatch && method === "POST") {
        const workspaceId = decodeURIComponent(recordListMatch[1]);
        const issueId = decodeURIComponent(recordListMatch[2]);
        const payload = await readJson(req);
        return ok(res, store.createRecord(workspaceId, issueId, payload), 201);
      }

      if (archiveListMatch && method === "GET") {
        const workspaceId = decodeURIComponent(archiveListMatch[1]);
        return ok(res, { items: store.listArchives(workspaceId) });
      }

      if (archiveListMatch && method === "POST") {
        const workspaceId = decodeURIComponent(archiveListMatch[1]);
        const payload = await readJson(req);
        return ok(res, store.createArchive(workspaceId, payload), 201);
      }

      if (archiveDetailMatch && method === "GET") {
        const workspaceId = decodeURIComponent(archiveDetailMatch[1]);
        const fileName = decodeURIComponent(archiveDetailMatch[2]);
        return ok(res, store.getArchive(workspaceId, fileName));
      }

      if (errorEntryListMatch && method === "GET") {
        const workspaceId = decodeURIComponent(errorEntryListMatch[1]);
        return ok(res, { items: store.listErrorEntries(workspaceId) });
      }

      if (errorEntryListMatch && method === "POST") {
        const workspaceId = decodeURIComponent(errorEntryListMatch[1]);
        const payload = await readJson(req);
        return ok(res, store.createErrorEntry(workspaceId, payload), 201);
      }

      if (errorEntryDetailMatch && method === "GET") {
        const workspaceId = decodeURIComponent(errorEntryDetailMatch[1]);
        const entryId = decodeURIComponent(errorEntryDetailMatch[2]);
        return ok(res, store.getErrorEntry(workspaceId, entryId));
      }

      return fail(res, 404, "NOT_FOUND", "route not found", "route_lookup", false, {
        method,
        path: url.pathname,
      });
    } catch (error) {
      const [statusCode, code, message, retryable] = parseAppError(error, "request");
      return fail(
        res,
        statusCode,
        code,
        message,
        url.pathname === "/api/health" ? "health" : "request",
        retryable,
      );
    }
  };
}

export async function startProbeFlashServer(overrides = {}) {
  const { dbPath, host, port, defaultWorkspace, logDir, releaseMetadata } = getConfig(overrides);
  let store = null;
  let storeInitError = null;

  try {
    store = createProbeFlashDatabase(dbPath, { defaultWorkspace });
  } catch (error) {
    storeInitError = error instanceof Error ? error : new Error(String(error));
  }

  const server = createServer(createRequestHandler({ store, storeInitError, releaseMetadata }));

  await new Promise((resolvePromise, rejectPromise) => {
    const handleError = (error) => {
      server.off("listening", handleListening);
      rejectPromise(error);
    };
    const handleListening = () => {
      server.off("error", handleError);
      resolvePromise();
    };
    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port, host);
  });

  const address = server.address();
  const resolvedPort =
    address && typeof address === "object" && "port" in address ? address.port : port;
  const baseUrl = `http://${host}:${resolvedPort}`;

  return {
    baseUrl,
    dbPath,
    logDir,
    close: async () => {
      await new Promise((resolvePromise, rejectPromise) => {
        server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
      });
      store?.close();
    },
  };
}

const directRun = process.argv[1] === fileURLToPath(import.meta.url);

if (directRun) {
  const server = await startProbeFlashServer();
  console.log(`[probeflash-server] listening on ${server.baseUrl}`);
  console.log(`[probeflash-server] sqlite db ${server.dbPath}`);
  if (server.logDir) {
    console.log(`[probeflash-server] log dir ${server.logDir}`);
  }
}
