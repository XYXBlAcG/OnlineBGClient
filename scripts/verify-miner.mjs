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
    DATA_ROOT: `.tmp/miner-data-${Date.now()}`,
    STATIC_ROOT: "dist",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stderr.on("data", (chunk) => process.stderr.write(chunk));

const ready = await new Promise((resolve, reject) => {
  let buffer = "";
  const timer = setTimeout(() => reject(new Error("room server not ready")), 10000);
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const line = buffer.split("\n").find((item) => item.startsWith("ROOM_READY "));
    if (!line) return;
    clearTimeout(timer);
    resolve(JSON.parse(line.slice("ROOM_READY ".length)));
  });
  child.on("exit", (code) => reject(new Error(`room server exited: ${code}`)));
});

class Client {
  constructor(name) {
    this.name = name;
    this.session = null;
    this.snapshot = null;
    this.errors = [];
    this.sent = new Set();
    this.socket = new WebSocket(`ws://127.0.0.1:${ready.port}/connect`);
    this.ready = new Promise((resolve, reject) => {
      this.socket.once("open", resolve);
      this.socket.once("error", reject);
    });
    this.socket.on("message", (raw) => this.receive(JSON.parse(raw.toString())));
  }
  apply(update) {
    if (update.type === "snapshot") {
      this.snapshot = update.snapshot;
      return;
    }
    if (update.type !== "patch" || !this.snapshot) return;
    this.snapshot = { ...this.snapshot, ...update.changes };
    for (const key of update.removed ?? []) delete this.snapshot[key];
  }
  receive(response) {
    if (response.type === "session") {
      this.session = response;
      return;
    }
    if (response.type === "error") {
      this.errors.push(response.message);
      return;
    }
    if (response.type === "snapshot" || response.type === "patch") this.apply(response);
  }
  send(command) {
    this.socket.send(JSON.stringify(command));
  }
  maybeAct() {
    const snapshot = this.snapshot;
    if (!snapshot || snapshot.actor < 0 || snapshot.finished) return;
    if (!snapshot.candidates?.length) return;
    const candidates = snapshot.candidates;
    const state = snapshot.state;
    const score = (candidate) => {
      const action = candidate.action;
      if (action.type !== "miner-action") return -1;
      const move = action.move;
      if (move.type === "vote") return 10;
      if (move.type === "rest") return 60;
      if (move.type === "event") return 50;
      if (move.type === "use-item") return 40;
      if (move.type === "mine" && state?.kind === "miner") {
        const deposit = state.view.node?.deposits.find(
          (item) => item.id === move.depositId,
        );
        return (
          100 +
          (deposit?.owner === snapshot.actor ? 80 : 0) +
          (deposit?.progress ?? 0) +
          (deposit?.gem?.value ?? 0)
        );
      }
      return 0;
    };
    const action = [...candidates].sort((a, b) => score(b) - score(a))[0];
    const key = `${snapshot.version}:${snapshot.actor}:${JSON.stringify(action.action)}`;
    if (this.sent.has(key)) return;
    this.sent.add(key);
    this.send({
      type: "action",
      token: this.session.token,
      id: `${this.name}-${snapshot.version}`,
      version: snapshot.version,
      action: action.action,
    });
  }
}

const withAi = process.env.MINER_AI === "1";
const host = new Client("host");
const guest = withAi ? null : new Client("guest");
try {
  await Promise.all([host.ready, ...(guest ? [guest.ready] : [])]);
  host.send({
    type: "create",
    name: "甲",
    config: {
      kind: "miner",
      humans: withAi ? 1 : 2,
      ai: withAi ? [{ difficulty: "normal", name: "" }] : [],
      aiDelayMs: withAi ? 100 : 1500,
      team: false,
      training: false,
    },
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("no host session")), 3000);
    const poll = setInterval(() => {
      if (!host.session) return;
      clearTimeout(timer);
      clearInterval(poll);
      resolve();
    }, 10);
  });
  if (guest) {
    guest.send({ type: "join", room: host.session.room, name: "乙" });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no guest session")), 3000);
      const poll = setInterval(() => {
        if (!guest.session) return;
        clearTimeout(timer);
        clearInterval(poll);
        resolve();
      }, 10);
    });
    guest.send({ type: "ready", token: guest.session.token, ready: true });
  }
  host.send({ type: "start", token: host.session.token });

  const deadline = Date.now() + 60000;
  let actions = 0;
  while (Date.now() < deadline) {
    host.maybeAct();
    guest?.maybeAct();
    const state = host.snapshot?.state;
    if (host.snapshot?.finished) {
      if (host.errors.length || guest?.errors.length)
        throw new Error([...host.errors, ...(guest?.errors ?? [])].join("; "));
      console.log(
        JSON.stringify({
          ok: true,
          actions,
          phase: state?.kind === "miner" ? state.view.phase : "finished",
          delivered: state?.kind === "miner" ? state.view.teamDelivered : null,
          quota: state?.kind === "miner" ? state.view.teamQuota : null,
        }),
      );
      process.exitCode = 0;
      break;
    }
    actions = Math.max(actions, host.sent.size + (guest?.sent.size ?? 0));
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!host.snapshot?.finished) throw new Error("miner game did not finish");
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      host: host.errors,
      guest: guest?.errors ?? [],
      snapshot: host.snapshot,
    }),
  );
  process.exitCode = 1;
} finally {
  host.socket.close();
  guest?.socket.close();
  child.kill();
}
