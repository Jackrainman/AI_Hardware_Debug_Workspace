import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getReleaseMetadata } from "../src/release-metadata.mjs";

const SERVER_APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_RUNTIME_DIR = resolve(SERVER_APP_DIR, ".runtime");
const DEFAULT_OUTPUT_ROOT = resolve(SERVER_RUNTIME_DIR, "diagnostics");
const DEFAULT_LOG_DIR = resolve(SERVER_RUNTIME_DIR, "logs");
const DEPLOY_LOG_DIR = "/home/hurricane/probeflash/shared/logs";
const DEFAULT_MAX_LOG_BYTES = 8192;
const SAFE_LOG_EXTENSIONS = new Set([".log", ".txt"]);
const SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization|cookie|set-cookie)/i;

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") {
      options.outputRoot = argv[++index];
    } else if (arg === "--base-url") {
      options.baseUrl = argv[++index];
    } else if (arg === "--log-dir") {
      options.logDir = argv[++index];
    } else if (arg === "--timestamp") {
      options.timestamp = argv[++index];
    } else if (arg === "--max-log-bytes") {
      options.maxLogBytes = Number(argv[++index]);
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log("Usage: npm run diagnostics:bundle -- --base-url http://127.0.0.1:4100 --out <dir>");
  console.log("Options:");
  console.log("  --log-dir <dir>        Defaults to PROBEFLASH_LOG_DIR or apps/server/.runtime/logs");
  console.log("  --max-log-bytes <n>    Tail bytes per log file, default 8192");
}

function safeTimestamp(timestamp = new Date().toISOString()) {
  return timestamp.replace(/[^0-9A-Za-z]+/g, "-").replace(/^-+|-+$/g, "");
}

function isPathInside(parentDir, candidatePath) {
  const relativePath = relative(parentDir, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function assertAllowedLogDir(logDir) {
  const resolvedLogDir = resolve(logDir);
  const allowedRoots = [SERVER_RUNTIME_DIR, DEPLOY_LOG_DIR].map((root) => resolve(root));
  if (!allowedRoots.some((root) => isPathInside(root, resolvedLogDir))) {
    throw new Error(`refusing to read log dir outside allowed ProbeFlash log roots: ${resolvedLogDir}`);
  }
  return resolvedLogDir;
}

function redactText(value) {
  return String(value)
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s"']+/gi, "$1<redacted>")
    .replace(/((?:api[_-]?key|token|secret|password)\s*[:=]\s*)["']?[^\s"']+/gi, "$1<redacted>")
    .replace(/([?&](?:api[_-]?key|token|secret|password)=)[^&\s]+/gi, "$1<redacted>");
}

function redactObject(value) {
  if (Array.isArray(value)) {
    return value.map(redactObject);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? "<redacted>" : redactObject(item),
      ]),
    );
  }
  if (typeof value === "string") {
    return redactText(value);
  }
  return value;
}

function readTail(filePath, maxBytes) {
  const stat = statSync(filePath);
  const bytesToRead = Math.min(stat.size, maxBytes);
  const buffer = Buffer.alloc(bytesToRead);
  const fd = openSync(filePath, "r");
  try {
    readSync(fd, buffer, 0, bytesToRead, Math.max(0, stat.size - bytesToRead));
  } finally {
    closeSync(fd);
  }
  return buffer.toString("utf8");
}

function collectLogTails(logDir, maxBytes) {
  const resolvedLogDir = assertAllowedLogDir(logDir);
  if (!existsSync(resolvedLogDir)) {
    return {
      logDir: resolvedLogDir,
      status: "missing",
      files: [],
    };
  }
  const dirStat = statSync(resolvedLogDir);
  if (!dirStat.isDirectory()) {
    throw new Error(`log dir must be a directory: ${resolvedLogDir}`);
  }

  const files = [];
  for (const entry of readdirSync(resolvedLogDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const extension = entry.name.includes(".") ? entry.name.slice(entry.name.lastIndexOf(".")) : "";
    if (!SAFE_LOG_EXTENSIONS.has(extension)) continue;
    const filePath = resolve(resolvedLogDir, entry.name);
    if (!isPathInside(resolvedLogDir, filePath)) continue;
    const stat = statSync(filePath);
    files.push({
      fileName: entry.name,
      sizeBytes: stat.size,
      tailBytes: Math.min(stat.size, maxBytes),
      tail: redactText(readTail(filePath, maxBytes)),
    });
  }
  files.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return {
    logDir: resolvedLogDir,
    status: "collected",
    files,
  };
}

async function fetchJson(baseUrl, path) {
  if (!baseUrl) {
    return {
      ok: false,
      skipped: true,
      reason: "baseUrl not provided",
    };
  }
  const url = new URL(path, baseUrl).toString();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: redactText(text) };
    }
    return {
      ok: response.ok,
      status: response.status,
      url,
      payload: redactObject(payload),
    };
  } catch (error) {
    return {
      ok: false,
      url,
      error: redactText(error instanceof Error ? error.message : String(error)),
    };
  }
}

function collectEnvSummary() {
  const keys = [
    "NODE_ENV",
    "PROBEFLASH_HOST",
    "PROBEFLASH_PORT",
    "PROBEFLASH_STATIC_DIR",
    "PROBEFLASH_DB_PATH",
    "PROBEFLASH_LOG_DIR",
    "PROBEFLASH_WORKSPACE_ID",
    "PROBEFLASH_WORKSPACE_NAME",
    "PROBEFLASH_RELEASE_VERSION",
    "PROBEFLASH_RELEASE_TAG",
    "PROBEFLASH_RELEASE_COMMIT",
  ];
  return Object.fromEntries(
    keys
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, SENSITIVE_KEY_PATTERN.test(key) ? "<redacted>" : redactText(process.env[key])]),
  );
}

function renderSummary(report) {
  const healthStatus = report.health.ok ? "ok" : "unavailable";
  const versionStatus = report.version.ok ? "ok" : "unavailable";
  const logCount = report.logs.files.length;
  return [
    "# ProbeFlash diagnostics bundle",
    "",
    `- Created at: ${report.createdAt}`,
    `- Health: ${healthStatus}`,
    `- Version endpoint: ${versionStatus}`,
    `- Log files included: ${logCount}`,
    `- Secrets redacted: ${report.redaction.enabled ? "yes" : "no"}`,
    "",
    "This bundle is local-only. Review it before sharing; it is not uploaded by ProbeFlash.",
    "",
  ].join("\n");
}

export async function createDiagnosticsBundle(options = {}) {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const stamp = safeTimestamp(timestamp);
  const outputRoot = resolve(options.outputRoot ?? process.env.PROBEFLASH_DIAGNOSTICS_DIR ?? DEFAULT_OUTPUT_ROOT);
  const bundleDir = resolve(outputRoot, `probeflash-diagnostics-${stamp}`);
  const maxLogBytes = Number.isFinite(options.maxLogBytes) && options.maxLogBytes > 0
    ? Math.floor(options.maxLogBytes)
    : DEFAULT_MAX_LOG_BYTES;
  const logDir = options.logDir ?? process.env.PROBEFLASH_LOG_DIR ?? DEFAULT_LOG_DIR;

  mkdirSync(bundleDir, { recursive: true });
  const report = {
    createdAt: timestamp,
    release: redactObject(getReleaseMetadata()),
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    env: collectEnvSummary(),
    health: await fetchJson(options.baseUrl, "/api/health"),
    version: await fetchJson(options.baseUrl, "/api/version"),
    logs: collectLogTails(logDir, maxLogBytes),
    redaction: {
      enabled: true,
      patterns: ["authorization bearer", "api key", "token", "secret", "password"],
    },
  };

  const diagnosticsPath = join(bundleDir, "diagnostics.json");
  const summaryPath = join(bundleDir, "summary.md");
  writeFileSync(diagnosticsPath, `${JSON.stringify(redactObject(report), null, 2)}\n`, "utf8");
  writeFileSync(summaryPath, renderSummary(report), "utf8");

  return {
    bundleDir,
    diagnosticsPath,
    summaryPath,
    fileName: basename(bundleDir),
    healthOk: report.health.ok,
    versionOk: report.version.ok,
    logFiles: report.logs.files.map((file) => file.fileName),
  };
}

const directRun = process.argv[1] === fileURLToPath(import.meta.url);

if (directRun) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const result = await createDiagnosticsBundle(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`[probeflash-diagnostics-bundle] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
