import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const deployRoot = resolve(serverRoot, "deploy");

const requiredFiles = [
  "README.md",
  "install-layout.md",
  "env.example",
  "probeflash.service.template",
];

function fail(reason, detail) {
  console.error(`[S3-SERVER-DEPLOY-PREP verify] FAIL: ${reason}`);
  if (detail !== undefined) {
    console.error(JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

function readDeployFile(fileName) {
  const filePath = resolve(deployRoot, fileName);
  if (!existsSync(filePath)) {
    fail(`missing deploy file ${fileName}`, { filePath });
  }
  return readFileSync(filePath, "utf8");
}

function assertContains(fileName, content, expected) {
  if (!content.includes(expected)) {
    fail(`${fileName} should contain ${expected}`);
  }
}

function assertNotContains(fileName, content, forbidden) {
  if (content.includes(forbidden)) {
    fail(`${fileName} must not contain ${forbidden}`);
  }
}

const contents = Object.fromEntries(requiredFiles.map((fileName) => [fileName, readDeployFile(fileName)]));
const env = Object.fromEntries(
  contents["env.example"]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const expectedEnv = {
  PROBEFLASH_HOST: "0.0.0.0",
  PROBEFLASH_PORT: "4100",
  PROBEFLASH_DB_PATH: "/opt/probeflash/shared/data/probeflash.sqlite",
  PROBEFLASH_LOG_DIR: "/opt/probeflash/shared/logs",
  PROBEFLASH_WORKSPACE_ID: "workspace-26-r1",
  PROBEFLASH_WORKSPACE_NAME: "26年 R1",
};

for (const [key, expectedValue] of Object.entries(expectedEnv)) {
  if (env[key] !== expectedValue) {
    fail(`env.example should set ${key}`, { expected: expectedValue, actual: env[key] });
  }
}

const service = contents["probeflash.service.template"];
const requiredServiceLines = [
  "Description=ProbeFlash LAN storage server",
  "User={{PROBEFLASH_USER}}",
  "Group={{PROBEFLASH_GROUP}}",
  "WorkingDirectory=/opt/probeflash/current/apps/server",
  "EnvironmentFile=/opt/probeflash/shared/env/probeflash.env",
  "ExecStart=/opt/probeflash/runtime/node/bin/node /opt/probeflash/current/apps/server/src/server.mjs",
  "Restart=on-failure",
  "RestartSec=3",
  "NoNewPrivileges=true",
  "PrivateTmp=true",
  "ProtectSystem=full",
  "ReadWritePaths=/opt/probeflash/shared/data /opt/probeflash/shared/logs /opt/probeflash/shared/env",
];

for (const line of requiredServiceLines) {
  assertContains("probeflash.service.template", service, line);
}

assertNotContains("probeflash.service.template", service, "/usr/bin/node");
assertNotContains("probeflash.service.template", service, "node src/server.mjs");

const allDocs = `${contents["README.md"]}\n${contents["install-layout.md"]}`;
for (const expected of [
  "/opt/probeflash/current",
  "/opt/probeflash/releases/",
  "/opt/probeflash/shared/data",
  "/opt/probeflash/shared/logs",
  "/opt/probeflash/shared/env",
  "/opt/probeflash/runtime/node",
  "/opt/probeflash/runtime/node/bin/node",
  "4100",
  "4173",
  "0.0.0.0",
  "127.0.0.1",
  "192.168.2.2",
  "Node 24",
  "node:sqlite",
  "systemctl stop probeflash.service",
  "systemctl disable probeflash.service",
]) {
  assertContains("deploy docs", allDocs, expected);
}

for (const forbidden of ["PROBEFLASH_PORT=80", "ExecStart=/usr/bin/node"]) {
  assertNotContains("deploy docs", allDocs, forbidden);
}

console.log("[S3-SERVER-DEPLOY-PREP verify] PASS: deploy files exist and are readable");
console.log("[S3-SERVER-DEPLOY-PREP verify] PASS: env.example exposes the expected LAN deployment defaults");
console.log("[S3-SERVER-DEPLOY-PREP verify] PASS: systemd template uses independent runtime, service account placeholders, and writable paths");
console.log("[S3-SERVER-DEPLOY-PREP verify] PASS: docs keep runtime, layout, port, pre-check, and rollback boundaries consistent");
