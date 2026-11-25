import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { WebSocket } from "ws";
import { tsImport } from "tsx/esm/api";

const { aimAt } = await tsImport(
  "../src/domain/miner/geometry.ts",
  import.meta.url,
);

await access("dist-server/main.mjs").catch(() => {
  throw new Error("请先运行 npm run server:build");
});

const withAi = process.env.MINER_AI === "1";
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
  const timer = setTimeout(
    () => reject(new Error("room server not ready")),
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
    this.socket.on("message", (raw) =>
      this.receive(JSON.parse(raw.toString())),
    );
  }
  receive(response) {
    if (response.type === "session") this.session = response;
    else if (response.type === "error") this.errors.push(response.message);
    else if (response.type === "snapshot") this.snapshot = response.snapshot;
    else if (response.type === "patch" && this.snapshot)
      this.snapshot = { ...this.snapshot, ...response.changes };
  }
  send(command) {
    this.socket.send(JSON.stringify(command));
  }
  maybeAct() {
    const snapshot = this.snapshot;
    if (!snapshot || snapshot.actor < 0 || snapshot.finished) return;
    const state = snapshot.state;
    if (state?.kind !== "miner") return;
    const view = state.view;
    const actor = snapshot.actor;
    let move = null;
    if (view.phase === "character") {
      const candidate = snapshot.candidates?.find((item) => {
        const action = item.action;
        return (
          action.type === "miner-action" && action.move.type === "character"
        );
      });
      move = candidate?.action.move ?? null;
    } else if (view.phase === "map") {
      const candidate = snapshot.candidates?.find((item) => {
        const action = item.action;
        if (action.type !== "miner-action" || action.move.type !== "vote")
          return false;
        const node = view.map
          .flat()
          .find((item) => item.id === action.move.nodeId);
        return (
          node &&
          [
            "battle",
            "elite",
            "boss",
            "treasure",
            "hunt",
            "rift",
            "secret",
          ].includes(node.kind)
        );
      });
      move = candidate?.action.move ?? null;
    } else if (view.phase === "live") {
      const player = view.players[actor];
      if (player.hook.phase === "swing") {
        const object = [...view.node.objects]
          .filter((item) => !item.removed && item.hookedBy === null)
          .sort((a, b) => b.value - a.value)[0];
        if (object) {
          move = { type: "drop", angle: aimAt(object, player.hook.pivotX) };
        }
      }
    } else if (["shop", "intermission", "camp", "event"].includes(view.phase)) {
      const candidate = snapshot.candidates?.find((item) => {
        const action = item.action;
        return (
          action.type === "miner-action" &&
          (action.move.type === "ready" || action.move.type === "event")
        );
      });
      move = candidate?.action.move ?? null;
    }
    if (!move) return;
    const key = `${snapshot.version}:${actor}:${JSON.stringify(move)}`;
    if (this.sent.has(key)) return;
    this.sent.add(key);
    this.send({
      type: "action",
      token: this.session.token,
      id: `${this.name}-${snapshot.version}-${this.sent.size}`,
      version: snapshot.version,
      action: { type: "miner-action", move },
    });
  }
}

const host = new Client("host");
const guest = new Client("guest");
try {
  await Promise.all([host.ready, guest.ready]);
  host.send({
    type: "create",
    name: "甲",
    config: {
      kind: "miner",
      humans: 2,
      ai: withAi ? [{ difficulty: "normal", name: "" }] : [],
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
  host.send({ type: "start", token: host.session.token });

  const deadline = Date.now() + 40_000;
  let causedTicks = 0,
    succeeded = false;
  while (Date.now() < deadline) {
    host.maybeAct();
    guest.maybeAct();
    const view =
      host.snapshot?.state?.kind === "miner" ? host.snapshot.state.view : null;
    if (view && view.phase === "live" && view.tick > 0) causedTicks = view.tick;
    if (
      view &&
      view.teamScore > 0 &&
      causedTicks > 10 &&
      (withAi ? view.players.slice(2).some((player) => player.score > 0) : true)
    ) {
      const errors = [...host.errors, ...guest.errors].filter(
        (error) => !error.includes("对局已更新"),
      );
      if (errors.length) throw new Error(errors.join("; "));
      console.log(
        JSON.stringify({
          ok: true,
          mode: withAi ? "ai" : "two-human",
          phase: view.phase,
          score: view.teamScore,
          playerScores: view.players.map((player) => player.score),
          tick: view.tick,
          causedTicks,
          objectsLeft: view.node?.objects.filter((item) => !item.removed)
            .length,
        }),
      );
      succeeded = true;
      process.exitCode = 0;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!succeeded) throw new Error("miner live loop did not score");
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      errors: [...host.errors, ...guest.errors].filter(
        (error) => !error.includes("对局已更新"),
      ),
      state: host.snapshot?.state,
    }),
  );
  process.exitCode = 1;
} finally {
  host.socket.close();
  guest.socket.close();
  child.kill();
}
