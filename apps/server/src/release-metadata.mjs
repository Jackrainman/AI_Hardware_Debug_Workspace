import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_SRC_DIR = dirname(fileURLToPath(import.meta.url));
const SERVER_APP_DIR = resolve(SERVER_SRC_DIR, "..");
const PACKAGE_JSON_PATH = resolve(SERVER_APP_DIR, "package.json");

function readPackageVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));
    return typeof packageJson.version === "string" && packageJson.version.trim()
      ? packageJson.version.trim()
      : "unknown";
  } catch {
    return "unknown";
  }
}

function cleanValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function firstValue(...values) {
  for (const value of values) {
    const cleaned = cleanValue(value);
    if (cleaned) return cleaned;
  }
  return "unknown";
}

export function getReleaseMetadata(overrides = {}) {
  const version = firstValue(
    overrides.version,
    process.env.PROBEFLASH_RELEASE_VERSION,
    readPackageVersion(),
  );
  const releaseTag = firstValue(
    overrides.releaseTag,
    overrides.tag,
    process.env.PROBEFLASH_RELEASE_TAG,
    version === "unknown" ? undefined : `v${version.replace(/^v/, "")}`,
  );

  return {
    version,
    commit: firstValue(
      overrides.commit,
      process.env.PROBEFLASH_RELEASE_COMMIT,
      process.env.PROBEFLASH_COMMIT,
    ),
    releaseTag,
  };
}
