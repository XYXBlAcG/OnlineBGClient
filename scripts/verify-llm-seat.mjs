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
    DATA_ROOT: `.tmp/llm-seat-data-${Date.now()}`,
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
  child.on("exit", (code) => reject(new Error(`room server exited: ${code}`)));
});

const ws = new WebSocket(`ws://127.0.0.1:${ready.port}/connect`);
let session;
let snapshot;
let actions = 0;
const aiMoves = new Set();
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

const done = new Promise((resolve, reject) => {
  const timer = setTimeout(
    () =>
      reject(new Error(`timeout actions=${actions} aiMoves=${aiMoves.size}`)),
    15000,
  );
  ws.on("message", (raw) => {
    const response = JSON.parse(raw.toString());
    if (response.type === "error") {
      errors.push(response.message);
      return;
    }
    if (response.type === "session") {
      session = response;
      return;
    }
    if (response.type !== "snapshot" && response.type !== "patch") return;
    apply(response);
    if (!session || !snapshot) return;
    if (
      snapshot.computation?.status === "completed" &&
      snapshot.computation.source === "llm"
    )
      aiMoves.add(snapshot.computation.version);
    if (snapshot.actor < 0) return;
    if (actions >= 5 && aiMoves.size > 0) {
      clearTimeout(timer);
      resolve({
        actions,
        aiMoves: aiMoves.size,
        version: snapshot.version,
        errors,
      });
      return;
    }
    if (!snapshot.candidates?.length) return;
    const action = snapshot.candidates[0];
    const version = snapshot.version;
    actions++;
    ws.send(
      JSON.stringify({
        type: "action",
        token: session.token,
        id: `human-${actions}`,
        version,
        action: action.action,
      }),
    );
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
        ai: [{ difficulty: "normal", name: "青竹", driver: "llm" }],
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
  ws.send(JSON.stringify({ type: "start", token: session.token }));
  const result = await done;
  if (result.errors.length) throw new Error(result.errors.join("; "));
  console.log(JSON.stringify({ ok: true, ...result }));
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      actions,
      aiMoves: aiMoves.size,
      version: snapshot?.version,
      errors,
    }),
  );
  process.exitCode = 1;
} finally {
  ws.close();
  child.kill();
}
