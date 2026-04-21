// apps/desktop/scripts/verify-handoff-json.mts
// NIGHT-01-VERIFY-HANDOFF-JSON：把 AGENTS §16 验证矩阵里"handoff.json 可被 JSON.parse"
// 工具化成一条可复用命令，顺带做最小结构校验，避免每次夜跑用 `node -e` 手跑。
//
// 只做最小校验，不声明完整 schema：
//   - 文件存在且 JSON.parse 成功
//   - 顶层为对象
//   - 必须存在且为 string：current_mode / current_stage / current_stage_name /
//     current_stage_goal / current_atomic_task / timestamp
//   - 必须存在且为数组：frontier_tasks / completed_atomic_tasks / risks / notes
//   - frontier_tasks 内每一项必须有字符串 id（因为选 current_atomic_task 时会引用）
//   - 不检查语义（例如 current_mode 枚举值、frontier 上限 3 个等），那是 planning
//     的职责，不是 JSON 结构校验的职责。
//
// 运行方式：
//   cd apps/desktop && node --experimental-strip-types scripts/verify-handoff-json.mts
//   或：cd apps/desktop && npm run verify:handoff

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const HANDOFF_PATH = resolve(process.cwd(), "..", "..", ".agent-state", "handoff.json");

function fail(reason: string, detail?: unknown): never {
  console.error(`[verify-handoff-json] FAIL: ${reason}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

let raw: string;
try {
  raw = readFileSync(HANDOFF_PATH, "utf8");
} catch (err) {
  fail(
    `cannot read ${HANDOFF_PATH}. Run this script from apps/desktop/ or fix the path.`,
    err instanceof Error ? err.message : err,
  );
}

let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  fail(
    `handoff.json is not valid JSON`,
    err instanceof Error ? err.message : err,
  );
}

if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
  fail(`expected top-level object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`);
}

const obj = parsed as Record<string, unknown>;

const REQUIRED_STRINGS = [
  "current_mode",
  "current_stage",
  "current_stage_name",
  "current_stage_goal",
  "current_atomic_task",
  "timestamp",
] as const;

for (const key of REQUIRED_STRINGS) {
  const v = obj[key];
  if (typeof v !== "string" || v.length === 0) {
    fail(`required string field "${key}" missing or empty`, { got: v });
  }
}

const REQUIRED_ARRAYS = [
  "frontier_tasks",
  "completed_atomic_tasks",
  "risks",
  "notes",
] as const;

for (const key of REQUIRED_ARRAYS) {
  const v = obj[key];
  if (!Array.isArray(v)) {
    fail(`required array field "${key}" missing or not an array`, { got: typeof v });
  }
}

const frontier = obj["frontier_tasks"] as unknown[];
frontier.forEach((item, i) => {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    fail(`frontier_tasks[${i}] is not an object`, item);
  }
  const id = (item as Record<string, unknown>)["id"];
  if (typeof id !== "string" || id.length === 0) {
    fail(`frontier_tasks[${i}].id missing or empty`, item);
  }
});

const completed = obj["completed_atomic_tasks"] as unknown[];
completed.forEach((item, i) => {
  if (typeof item !== "string" || item.length === 0) {
    fail(`completed_atomic_tasks[${i}] is not a non-empty string`, { got: item });
  }
});

console.log(`[verify-handoff-json] PASS: ${HANDOFF_PATH} is valid JSON`);
console.log(
  `[verify-handoff-json] PASS: mode=${obj["current_mode"] as string}, ` +
    `stage=${obj["current_stage"] as string}, ` +
    `task=${obj["current_atomic_task"] as string}`,
);
console.log(
  `[verify-handoff-json] PASS: frontier_tasks=${frontier.length}, ` +
    `completed_atomic_tasks=${completed.length}`,
);
