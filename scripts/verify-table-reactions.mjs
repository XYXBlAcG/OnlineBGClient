import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { WebSocket } from "ws";

await access("dist-server/main.mjs").catch(() => {
  throw new Error("请先运行 npm run server:build");
});

const child = spawn(process.execPath, ["dist-server/main.mjs"], {
  env: {
    ...process.env,
    PORT: "0",
    HOST: "127.0.0.1",
    DATA_ROOT: `.tmp/social-data-${Date.now()}`,
    STATIC_ROOT: "dist",
    COMPANION_LLM_FAKE: "1",
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
let snapshot;
let acted = false;
const errors = [];

const apply = (update) => {
  if (update.type === "snapshot") {
    snapshot = update.snapshot;
    return;
  }
  if (update.type !== "patch" || !snapshot) return;
  snapshot = { ...snapshot, ...update.changes };
  for (const key of update.removed ?? []) delete snapshot[key];
};

const verdict = new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error(`social reaction timeout acted=${acted}`)),
    8000,
  );
  ws.on("message", (raw) => {
    const response = JSON.parse(raw.toString());
    if (response.type === "error") {
      errors.push(response.message);
      return;
    }
    if (response.type === "session") session = response;
    if (response.type !== "snapshot" && response.type !== "patch") return;
    apply(response);
    const reply = snapshot?.chat?.find(
      (message) =>
        message.source === "ai" &&
        message.sender === "companion:table-ai",
    );
    if (!reply) return;
    clearTimeout(timer);
    resolve(reply);
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
  ws.send(JSON.stringify({ type: "start", token: session.token }));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("snapshot did not provide an action")),
      5000,
    );
    const poll = setInterval(() => {
      if (!snapshot?.candidates?.length || acted || !session) return;
      acted = true;
      ws.send(
        JSON.stringify({
          type: "action",
          token: session.token,
          id: "social-action",
          version: snapshot.version,
          action: snapshot.candidates[0].action,
        }),
      );
      clearTimeout(timer);
      clearInterval(poll);
      resolve();
    }, 10);
  });
  const reply = await verdict;
  if (errors.length) throw new Error(errors.join("; "));
  console.log(
    JSON.stringify({ ok: true, reply: reply.text, sender: reply.sender }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      acted,
      errors,
      chat: snapshot?.chat,
    }),
  );
  process.exitCode = 1;
} finally {
  ws.close();
  child.kill();
}
