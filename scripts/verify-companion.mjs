import { access } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { WebSocket } from "ws";

await access("dist-server/main.mjs").catch(() => {
  throw new Error("请先运行 npm run server:build");
});

const real = process.argv.includes("--real");
const local = process.argv.includes("--local");
const format = process.env.COMPANION_LLM_FORMAT || "openai";
const numberEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};
if (real) {
  const required = [
    "COMPANION_LLM_BASE_URL",
    "COMPANION_LLM_MODEL",
    ...(format === "ollama" ? [] : ["COMPANION_LLM_API_KEY"]),
  ];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    console.error(`真实模型验收缺少环境变量：${missing.join("、")}`);
    process.exit(1);
  }
}

let llmServer;
let llmPort;
if (local) {
  llmServer = createServer((request, response) => {
    request.resume();
    request.on("end", () => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          choices: [{ message: { content: "本地假模型回复" } }],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 1,
            total_tokens: 2,
          },
        }),
      );
    });
  });
  await new Promise((resolve) =>
    llmServer.listen(0, "127.0.0.1", resolve),
  );
  llmPort = llmServer.address().port;
}

const child = spawn(process.execPath, ["dist-server/main.mjs"], {
  env: {
    ...process.env,
    PORT: "0",
    HOST: "127.0.0.1",
    DATA_ROOT: `.tmp/companion-data-${Date.now()}`,
    STATIC_ROOT: "dist",
    COMPANION_LLM_FAKE: real || local ? "" : "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stderr.on("data", (chunk) => process.stderr.write(chunk));

const ready = await new Promise((resolve, reject) => {
  let buffer = "";
  const timer = setTimeout(
    () => reject(new Error(`room server not ready: ${buffer}`)),
    10000,
  );
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const line = buffer
      .split("\n")
      .find((item) => item.startsWith("ROOM_READY "));
    if (!line) return;
    clearTimeout(timer);
    resolve(JSON.parse(line.slice("ROOM_READY ".length)));
  });
  child.on("exit", (code) =>
    reject(new Error(`room server exited early: ${code}`)),
  );
});

const ws = new WebSocket(`ws://127.0.0.1:${ready.port}/connect`);
let session;
let companionStatus;
let resolveAiTest;
let rejectAiTest;
const aiTest = new Promise((resolve, reject) => {
  resolveAiTest = resolve;
  rejectAiTest = reject;
});
const aiTestTimer = setTimeout(
  () => rejectAiTest(new Error("AI 连接测试超时")),
  60000,
);
aiTestTimer.unref?.();
const chatMessages = [];

const verdict = new Promise((resolve, reject) => {
  const timer = setTimeout(
    () =>
      reject(
        new Error(
          real
            ? "真实模型未在 30 秒内回复"
            : "companion did not reply within 5s",
        ),
      ),
    real ? 30000 : 5000,
  );
  ws.on("message", (raw) => {
    const response = JSON.parse(raw.toString());
    if (response.type === "ai-test") {
      clearTimeout(aiTestTimer);
      resolveAiTest(response);
      return;
    }
    if (response.type === "error") {
      reject(new Error(response.message));
      return;
    }
    if (response.type === "session") session = response;
    if (response.type === "snapshot")
      companionStatus = response.snapshot.companion;
    if (response.type === "patch" && response.changes?.companion)
      companionStatus = response.changes.companion;
    const chat =
      response.type === "snapshot"
        ? response.snapshot.chat
        : response.type === "patch"
          ? response.changes?.chat
          : undefined;
    if (!chat) return;
    chatMessages.push(...chat);
    const reply = chat.find(
      (message) =>
        message.source === "ai" &&
        message.sender === "companion:table-ai",
    );
    if (reply) {
      clearTimeout(timer);
      resolve(reply);
    }
  });
});

try {
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  ws.send(
    JSON.stringify({
      type: "create",
      name: "甲",
      config: {
        kind: "uno",
        humans: 1,
        ai: [{ difficulty: "easy", name: "" }],
        team: false,
        training: false,
      },
    }),
  );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("no session")), 3000);
    const poll = setInterval(() => {
      if (!session) return;
      clearTimeout(timer);
      clearInterval(poll);
      resolve();
    }, 10);
  });
  if (real || local) {
    const provider = local
      ? {
          format: "openai",
          baseUrl: `http://127.0.0.1:${llmPort}/v1`,
          model: "local-test",
          temperature: 0.8,
          contextWindow: 8192,
          maxOutputTokens: 160,
          timeoutMs: 5000,
        }
      : {
          format,
          baseUrl: process.env.COMPANION_LLM_BASE_URL,
          model: process.env.COMPANION_LLM_MODEL,
          temperature: 0.8,
          contextWindow: numberEnv("COMPANION_LLM_CONTEXT_WINDOW", 8192),
          maxOutputTokens: numberEnv("COMPANION_LLM_MAX_OUTPUT_TOKENS", 160),
          timeoutMs: numberEnv("COMPANION_LLM_TIMEOUT_MS", 20000),
        };
    const apiKey = local
      ? "local-key"
      : (process.env.COMPANION_LLM_API_KEY ?? "");
    ws.send(
      JSON.stringify({
        type: "ai-config",
        token: session.token,
        provider,
        apiKey,
      }),
    );
    ws.send(
      JSON.stringify({
        type: "ai-test",
        token: session.token,
        requestId: "smoke-test",
        provider,
        apiKey,
      }),
    );
    const tested = await aiTest;
    if (!tested.ok) throw new Error(tested.message);
  }
  ws.send(
    JSON.stringify({
      type: "companion",
      token: session.token,
      config: {
        profile: {
          id: "table-ai",
          persona: "你是这张牌桌上的 AI 玩家，简短聊天。",
          source: { kind: "local" },
        },
        policy: {
          enabled: true,
          mode: "chatty",
          cooldownMs: 0,
          maxPerMinute: 10,
          maxPerPlay: 100,
        },
      },
    }),
  );
  ws.send(
    JSON.stringify({
      type: "chat",
      token: session.token,
      id: "m1",
      text: "大家好",
    }),
  );
  const reply = await verdict;
  if (companionStatus?.configured !== true)
    throw new Error("snapshot did not report configured AI");
  if (companionStatus?.enabled !== true)
    throw new Error("snapshot did not report enabled AI");
  if (companionStatus?.name !== "青竹")
    throw new Error("snapshot did not report the AI seat name");
  console.log(
    JSON.stringify({
      ok: true,
      reply: reply.text,
      source: reply.source,
      sender: reply.sender,
      chat: chatMessages.length,
      mode: real ? "real" : local ? "local" : "fake",
      configured: companionStatus.configured,
      name: companionStatus.name,
      connectionTest: local || real ? "ok" : undefined,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      session,
      chatMessages,
    }),
  );
  process.exitCode = 1;
} finally {
  ws.close();
  child.kill();
  llmServer?.close();
}
