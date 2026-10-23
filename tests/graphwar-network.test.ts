import { expect, it } from "vitest";
import { WebSocket } from "ws";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { TestService } from "../scripts/service-harness.mjs";
import type { Response, Snapshot } from "../src/domain/protocol";
import { SnapshotReplica } from "../src/domain/sync";
import { Replay } from "../src/domain/replay";
const serviceOptions = {
  entry: process.env.GRAPHWAR_SERVICE_ENTRY || "dist-server/main.mjs",
  staticRoot: process.env.GRAPHWAR_SERVICE_ENTRY
    ? resolve(dirname(process.env.GRAPHWAR_SERVICE_ENTRY), "web")
    : "dist",
};
class Peer {
  readonly socket: WebSocket;
  readonly replica = new SnapshotReplica();
  snapshot: Snapshot | null = null;
  interactions: import("../src/domain/social").InteractionEvent[] = [];
  session: { room: string; token: string } | undefined;
  private listeners = new Set<() => void>();
  private error = "";
  constructor(url: string) {
    this.socket = new WebSocket(url.replace("http", "ws") + "/connect");
    this.socket.on("message", (raw) => {
      const response = JSON.parse(raw.toString()) as Response;
      if (response.type === "interaction")
        this.interactions.push(response.event);
      if (response.type === "session") this.session = response;
      if (response.type === "snapshot" || response.type === "patch")
        this.snapshot = this.replica.apply(response);
      if (response.type === "error") this.error = response.message;
      for (const callback of this.listeners) callback();
    });
  }
  send(command: unknown) {
    this.socket.send(JSON.stringify(command));
  }
  ready() {
    return new Promise<void>((resolve, reject) => {
      this.socket.once("open", resolve);
      this.socket.once("error", reject);
    });
  }
  wait(predicate: () => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(check);
        reject(new Error("协议响应超时"));
      }, 5000);
      const check = () => {
        if (this.error || predicate()) {
          clearTimeout(timer);
          this.listeners.delete(check);
          if (this.error) reject(new Error(this.error));
          else resolve();
        }
      };
      this.listeners.add(check);
      check();
    });
  }
}
it("serves Graphwar through the real HTTP/WebSocket service and reconstructs the same authoritative shot", async () => {
  const directory = await mkdtemp(join(tmpdir(), "graphwar-service-")),
    service = new TestService(directory, serviceOptions);
  let a: Peer | undefined, b: Peer | undefined;
  try {
    const url = await service.start();
    const html = await (await fetch(url)).text();
    expect(html).toContain('<div id="root">');
    const script = html.match(/src="([^"]+\.js)"/)?.[1];
    expect(script).toBeTruthy();
    expect((await fetch(new URL(script!, url))).status).toBe(200);
    a = new Peer(url);
    b = new Peer(url);
    await Promise.all([a.ready(), b.ready()]);
    a.send({
      type: "create",
      name: "电脑",
      config: {
        kind: "graphwar",
        humans: 2,
        ai: [],
        team: false,
        training: false,
        graphwar: { map: "open", soldiers: 3 },
      },
    });
    await a.wait(() => !!a!.session);
    b.send({ type: "join", room: a.session!.room, name: "手机" });
    await b.wait(() => !!b!.session);
    b.send({ type: "ready", token: b.session!.token, ready: true });
    await a.wait(() => a!.snapshot?.seats[1].ready === true);
    a.send({ type: "start", token: a.session!.token });
    await Promise.all([
      a.wait(() => !!a!.snapshot?.playing),
      b.wait(() => !!b!.snapshot?.playing),
    ]);
    const units = { game: "graphwar", from: 1, target: 7 };
    a.send({
      type: "interaction",
      token: a.session!.token,
      id: "unit-throw",
      target: 1,
      kind: "egg",
      units,
    });
    await b.wait(() => b!.interactions.length === 1);
    expect(b.interactions[0].units).toEqual(units);
    const version = a.snapshot!.version;
    const command = {
      type: "action",
      token: a.session!.token,
      id: "same-shot",
      version,
      action: { type: "graphwar-fire", soldier: 1, formula: "sin(x)" },
    };
    a.send(command);
    a.send(command);
    await b.wait(() => b!.snapshot!.version === version + 1);
    await a.wait(() => a!.snapshot!.version === version + 1);
    expect(a.snapshot!.state).toEqual(b.snapshot!.state);
    expect(
      await (await fetch(`${url}/room-info?room=${a.session!.room}`)).json(),
    ).toMatchObject({ kind: "graphwar", players: 2 });
    const final = structuredClone(a.snapshot!.state);
    a.send({ type: "end", token: a.session!.token });
    await b.wait(() => !!b!.snapshot?.replay);
    expect(new Replay(b.snapshot!.replay).frames().at(-1)).toEqual(final);
  } finally {
    a?.socket.terminate();
    b?.socket.terminate();
    await service.stop();
    await rm(directory, { recursive: true, force: true });
  }
}, 20000);

it("executes a packaged Graphwar AI turn on the real service worker", async () => {
  const directory = await mkdtemp(join(tmpdir(), "graphwar-ai-service-"));
  const service = new TestService(directory, serviceOptions);
  let peer: Peer | undefined;
  try {
    const url = await service.start();
    peer = new Peer(url);
    await peer.ready();
    peer.send({
      type: "create",
      name: "真人",
      config: {
        kind: "graphwar",
        humans: 1,
        ai: [{ difficulty: "normal", name: "曲线射手" }],
        aiDelayMs: 0,
        team: false,
        training: false,
        performance: { mode: "multi", threads: 2 },
        graphwar: { map: "open", soldiers: 1 },
      },
    });
    await peer.wait(() => !!peer!.session);
    peer.send({ type: "start", token: peer.session!.token });
    await peer.wait(() => !!peer!.snapshot?.playing);
    const version = peer.snapshot!.version;
    peer.send({
      type: "action",
      token: peer.session!.token,
      id: "ai-turn",
      version,
      action: { type: "graphwar-pass" },
    });
    await peer.wait(() => peer!.snapshot!.version >= version + 2);
    expect(peer.snapshot!.state?.kind).toBe("graphwar");
    if (peer.snapshot!.state?.kind === "graphwar")
      expect(peer.snapshot!.state.view.sequence).toBe(2);
    expect(peer.snapshot!.decisions).toEqual([]);
    expect(peer.snapshot!.computation?.scoredCandidates).toBeGreaterThan(0);
  } finally {
    peer?.socket.terminate();
    await service.stop();
    await rm(directory, { recursive: true, force: true });
  }
}, 20000);
