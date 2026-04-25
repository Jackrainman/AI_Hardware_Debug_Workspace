// apps/desktop/scripts/verify-s3-arch-unified-storage-error-state.mts
// 验证 S3-ARCH-UNIFIED-STORAGE-ERROR-STATE：
//   1. validation_failed / write_failed / server_unreachable 已统一到同一 error model；
//   2. closeout 部分失败会保留 completedWrites；
//   3. App.tsx 只保留一个统一错误 banner，不再把详细错误分散到 issue / record / archive 视图里。

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  closeoutFailureToFeedback,
  createServerUnreachableStorageFeedbackError,
  createValidationStorageFeedbackError,
  describeStorageConnectionState,
  formatStorageFeedbackError,
  storageWriteErrorToFeedback,
} from "../src/storage/storage-feedback.ts";
import { createOnlineConnection, createValidationFailed } from "../src/storage/storage-result.ts";

function fail(reason: string, detail?: unknown): never {
  console.error(`[S3-ARCH-UNIFIED-STORAGE-ERROR-STATE verify] FAIL: ${reason}`);
  if (detail !== undefined) {
    console.error(JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

const validation = createValidationStorageFeedbackError(
  "issue_intake",
  "create_issue",
  "title is required",
);
if (validation.code !== "validation_failed" || validation.retryable !== false) {
  fail("validation_failed should be non-retryable unified error", validation);
}
if (validation.connectionState.state !== "local_ready") {
  fail("local validation failure should keep local_ready connection state", validation);
}

const httpValidation = storageWriteErrorToFeedback(
  "closeout",
  "closeout",
  createValidationFailed(
    "error_entry",
    "error-entry-http-validation",
    [],
    createOnlineConnection("2026-04-23T18:00:00+08:00", "HTTP write blocked by local schema validation"),
  ),
);
if (httpValidation.connectionState.state !== "online") {
  fail("HTTP validation_failed should keep server connection state online", httpValidation);
}
if (describeStorageConnectionState(httpValidation.connectionState).includes("浏览器本地存储")) {
  fail("HTTP validation_failed banner should not claim localStorage demo mode", httpValidation);
}

const unreachable = createServerUnreachableStorageFeedbackError(
  "issue_list",
  "list_issues",
  "tcp connect ECONNREFUSED 192.168.2.2:4100",
  "2026-04-23T18:10:00+08:00",
);
if (unreachable.code !== "server_unreachable" || unreachable.retryable !== true) {
  fail("server_unreachable should be retryable unified error", unreachable);
}
if (unreachable.connectionState.state !== "unreachable") {
  fail("server_unreachable should set connectionState=unreachable", unreachable);
}

const partialCloseout = closeoutFailureToFeedback({
  ok: false,
  step: "save_error_entry",
  reason: "error_entry_save_failed",
  error: {
    kind: "unexpected_write_error",
    code: "unexpected_write_error",
    entity: "error_entry",
    target: "error-entry-partial",
    message: "forced verify failure",
  },
  artifacts: {} as never,
  completedWrites: ["archive_document"],
});
if (partialCloseout.code !== "write_failed") {
  fail("closeout partial failure should normalize to write_failed", partialCloseout);
}
if (partialCloseout.completedWrites?.join(",") !== "archive_document") {
  fail("closeout partial failure should preserve completedWrites", partialCloseout);
}
const formattedPartial = formatStorageFeedbackError(partialCloseout);
if (!formattedPartial.includes("已完成=归档摘要")) {
  fail("formatted closeout partial failure should mention completed writes", formattedPartial);
}

const appSource = readFileSync(resolve(process.cwd(), "src", "App.tsx"), "utf8");
const bannerMatches = appSource.match(/data-testid=\"storage-feedback-banner\"/g) ?? [];
if (bannerMatches.length !== 1) {
  fail("App.tsx should expose exactly one unified storage-feedback-banner", bannerMatches);
}
for (const legacyTestId of [
  "issue-list-read-error",
  "record-list-read-error",
  "archive-read-errors",
]) {
  if (appSource.includes(legacyTestId)) {
    fail(`legacy scattered error outlet should be removed: ${legacyTestId}`);
  }
}

console.log("[S3-ARCH-UNIFIED-STORAGE-ERROR-STATE verify] PASS: validation_failed unified into shared error model");
console.log("[S3-ARCH-UNIFIED-STORAGE-ERROR-STATE verify] PASS: HTTP validation_failed does not show localStorage demo mode");
console.log("[S3-ARCH-UNIFIED-STORAGE-ERROR-STATE verify] PASS: server_unreachable unified into shared connection state");
console.log("[S3-ARCH-UNIFIED-STORAGE-ERROR-STATE verify] PASS: closeout partial failure keeps completedWrites");
console.log("[S3-ARCH-UNIFIED-STORAGE-ERROR-STATE verify] PASS: App.tsx exposes one unified storage-feedback-banner");
