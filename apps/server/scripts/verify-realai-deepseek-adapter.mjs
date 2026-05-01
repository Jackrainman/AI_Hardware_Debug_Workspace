import {
  generateDeepSeekDraft,
  getDeepSeekStatus,
} from "../src/ai/deepseek-client.mjs";

function fail(reason, detail) {
  console.error(`[REALAI-DEEPSEEK-ADAPTER verify] FAIL: ${reason}`);
  if (detail !== undefined) {
    console.error(JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

const messages = [
  { role: "system", content: "Return JSON only." },
  { role: "user", content: "Generate a closeout draft." },
];

const noKeyStatus = getDeepSeekStatus({});
if (noKeyStatus.configured !== false || noKeyStatus.provider !== "deepseek") {
  fail("no-key status should report deepseek configured=false", noKeyStatus);
}

const noKey = await generateDeepSeekDraft({ task: "polish_closeout", messages }, { env: {} });
if (noKey.ok || noKey.error.code !== "AI_NOT_CONFIGURED" || noKey.statusCode !== 503) {
  fail("no-key draft request should fail without external call", noKey);
}

let capturedAuthorization = "";
let capturedBody = null;
const success = await generateDeepSeekDraft(
  { task: "polish_closeout", messages },
  {
    env: { DEEPSEEK_API_KEY: "test-key", DEEPSEEK_MODEL: "deepseek-chat" },
    fetchImpl: async (_url, init) => {
      capturedAuthorization = init.headers.authorization;
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                task: "polish_closeout",
                draftOnly: true,
                confidence: "medium",
                category: "boot",
                rootCause: "weak pull-up",
                resolution: "replace resistor",
                prevention: "add pull-up check",
                caveats: ["草稿需人工确认"],
              }),
            },
          },
        ],
      }), { status: 200 });
    },
  },
);
if (!success.ok || success.output.rootCause !== "weak pull-up") {
  fail("mock DeepSeek response should parse JSON draft", success);
}
if (capturedAuthorization !== "Bearer test-key") {
  fail("DeepSeek request should send API key only in Authorization header", capturedAuthorization);
}
if (capturedBody.model !== "deepseek-chat" || capturedBody.response_format?.type !== "json_object") {
  fail("DeepSeek request body should include model and json_object response format", capturedBody);
}

const invalidJson = await generateDeepSeekDraft(
  { task: "polish_closeout", messages },
  {
    env: { DEEPSEEK_API_KEY: "test-key" },
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: "not json" } }],
    }), { status: 200 }),
  },
);
if (invalidJson.ok || invalidJson.error.code !== "AI_INVALID_JSON") {
  fail("invalid provider JSON should fail closed", invalidJson);
}

const timeout = await generateDeepSeekDraft(
  { task: "polish_closeout", messages },
  {
    env: { DEEPSEEK_API_KEY: "test-key", DEEPSEEK_TIMEOUT_MS: "1" },
    fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    }),
  },
);
if (timeout.ok || timeout.error.code !== "AI_TIMEOUT") {
  fail("timeout should return AI_TIMEOUT", timeout);
}

console.log("[REALAI-DEEPSEEK-ADAPTER verify] PASS: no-key state fails without external call");
console.log("[REALAI-DEEPSEEK-ADAPTER verify] PASS: mock DeepSeek success parses JSON object draft");
console.log("[REALAI-DEEPSEEK-ADAPTER verify] PASS: invalid JSON and timeout fail closed");
