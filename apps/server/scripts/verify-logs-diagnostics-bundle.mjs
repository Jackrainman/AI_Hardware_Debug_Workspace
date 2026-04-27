import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { createDiagnosticsBundle } from "./diagnostics-bundle.mjs";
import { startProbeFlashServer } from "../src/server.mjs";

const SERVER_APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = resolve(SERVER_APP_DIR, "scripts", "diagnostics-bundle.mjs");
const TIMESTAMP = "2026-04-27T16:00:00+08:00";

function fail(reason, detail) {
  console.error(`[LOGS-DIAGNOSTICS-BUNDLE verify] FAIL: ${reason}`);
  if (detail !== undefined) {
    console.error(JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

function assert(condition, reason, detail) {
  if (!condition) {
    fail(reason, detail);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function runCli(args) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, args, { encoding: "utf8" });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => {
      resolvePromise({ status, stdout, stderr });
    });
  });
}

const runtimeRoot = resolve(SERVER_APP_DIR, ".runtime");
mkdirSync(runtimeRoot, { recursive: true });
const runtimeWorkdir = mkdtempSync(join(runtimeRoot, "diagnostics-verify-"));
const dbPath = join(runtimeWorkdir, "probeflash.sqlite");
const logDir = join(runtimeWorkdir, "logs");
const outputRoot = join(runtimeWorkdir, "out");
const server = await startProbeFlashServer({
  host: "127.0.0.1",
  port: 0,
  dbPath,
  logDir,
  releaseMetadata: {
    version: "0.2.0-verify",
    commit: "diagnostics-verify",
    releaseTag: "v0.2.0-verify",
  },
});

try {
  writeFileSync(
    join(logDir, "probeflash.log"),
    [
      "server started",
      "Authorization: Bearer should-not-leak-token",
      "api_key=should-not-leak-api-key",
      "normal status line",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(logDir, "probeflash.err.log"),
    "password=should-not-leak-password\nrecoverable warning\n",
    "utf8",
  );
  writeFileSync(join(logDir, "probeflash.env"), "SECRET=do-not-read\n", "utf8");

  const result = await createDiagnosticsBundle({
    outputRoot,
    baseUrl: server.baseUrl,
    logDir,
    timestamp: TIMESTAMP,
    maxLogBytes: 2048,
  });

  assert(existsSync(result.diagnosticsPath), "diagnostics.json should exist", result);
  assert(existsSync(result.summaryPath), "summary.md should exist", result);
  assert(result.healthOk === true && result.versionOk === true, "health and version endpoints should be captured", result);
  assert(
    result.logFiles.includes("probeflash.log") && result.logFiles.includes("probeflash.err.log"),
    "diagnostics should include log tail files",
    result,
  );
  assert(!result.logFiles.includes("probeflash.env"), "diagnostics should not read env-like files from log dir", result);

  const diagnostics = readJson(result.diagnosticsPath);
  const diagnosticsText = JSON.stringify(diagnostics);
  assert(diagnostics.health.payload?.ok === true, "diagnostics should include /api/health payload", diagnostics.health);
  assert(diagnostics.version.payload?.ok === true, "diagnostics should include /api/version payload", diagnostics.version);
  assert(diagnostics.logs.files.length === 2, "diagnostics should include only .log files", diagnostics.logs);
  for (const leaked of ["should-not-leak-token", "should-not-leak-api-key", "should-not-leak-password", "do-not-read"]) {
    assert(!diagnosticsText.includes(leaked), "diagnostics should redact or skip sensitive values", { leaked });
  }
  assert(diagnosticsText.includes("<redacted>"), "diagnostics should show redaction marker", diagnostics.logs);

  const cliOut = join(runtimeWorkdir, "cli-out");
  const cli = await runCli([
    SCRIPT_PATH,
    "--base-url",
    server.baseUrl,
    "--log-dir",
    logDir,
    "--out",
    cliOut,
    "--timestamp",
    "2026-04-27T16:01:00+08:00",
  ]);
  assert(cli.status === 0, "diagnostics CLI should exit 0", {
    status: cli.status,
    stdout: cli.stdout,
    stderr: cli.stderr,
  });
  const cliResult = JSON.parse(cli.stdout);
  assert(existsSync(cliResult.diagnosticsPath) && cliResult.healthOk === true, "CLI should write a readable diagnostics bundle", cliResult);

  let unsafeLogDirRejected = false;
  try {
    await createDiagnosticsBundle({ outputRoot, logDir: tmpdir(), timestamp: "2026-04-27T16:02:00+08:00" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(message.includes("outside allowed ProbeFlash log roots"), "unsafe log dir should be rejected", message);
    unsafeLogDirRejected = true;
  }
  assert(unsafeLogDirRejected, "unsafe log dir should fail");

  console.log("[LOGS-DIAGNOSTICS-BUNDLE verify] PASS: unsafe log dir is rejected");
  console.log("[LOGS-DIAGNOSTICS-BUNDLE verify] PASS: health/version and local release metadata are captured");
  console.log("[LOGS-DIAGNOSTICS-BUNDLE verify] PASS: log tails are included with secrets redacted");
  console.log("[LOGS-DIAGNOSTICS-BUNDLE verify] PASS: one CLI command produces a reviewable local bundle");
} finally {
  await server.close();
  rmSync(runtimeWorkdir, { recursive: true, force: true });
}
