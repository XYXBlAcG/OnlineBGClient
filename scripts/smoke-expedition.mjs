import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NetworkTestClient } from "./network-test-client.mjs";
const data = await mkdtemp(join(tmpdir(), "expedition-http-")),
  port = process.env.TEST_PORT || "18879",
  endpoint = `http://127.0.0.1:${port}`;
let service,
  output = "",
  clients = [];
async function start() {
  service = spawn(
    process.execPath,
    [process.env.TEST_SERVER_ENTRY || "dist-server/main.mjs"],
    {
      env: { ...process.env, PORT: port, DATA_ROOT: data },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  service.stdout.on("data", (b) => (output += b));
  service.stderr.on("data", (b) => (output += b));
  for (let n = 0; n < 100; n++) {
    try {
      if ((await fetch(`${endpoint}/health`)).ok) return;
    } catch {}
    if (service.exitCode !== null) throw new Error(output);
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("服务未就绪\n" + output);
}
async function stop() {
  clients.forEach((c) => c.close());
  clients = [];
  if (service && service.exitCode === null) {
    const closed = new Promise((resolve) => service.once("exit", resolve));
    service.kill("SIGTERM");
    await closed;
  }
}
async function client() {
  const c = new NetworkTestClient(endpoint);
  await c.open();
  clients.push(c);
  return c;
}
try {
  await start();
  const a = await client(),
    b = await client();
  a.send({
    type: "create",
    name: "甲",
    config: {
      kind: "expedition",
      humans: 2,
      ai: [],
      team: false,
      training: false,
    },
  });
  const sa = await a.wait((m) => m.type === "session");
  b.send({ type: "join", room: sa.room, name: "乙" });
  const sb = await b.wait((m) => m.type === "session");
  b.send({ type: "ready", token: sb.token, ready: true });
  await a.wait((m) => m.type === "snapshot" && m.snapshot.seats[1].ready);
  a.send({ type: "start", token: sa.token });
  const first = (
    await a.wait(
      (m) =>
        m.type === "snapshot" && m.snapshot.state?.view.phase === "profession",
    )
  ).snapshot;
  for (const [c, token, profession] of [
    [a, sa.token, 0],
    [b, sb.token, 2],
  ])
    c.send({
      type: "action",
      token,
      id: `profession-${profession}`,
      version: first.version,
      action: {
        type: "expedition-action",
        move: { type: "profession", profession },
      },
    });
  const map = (
    await a.wait(
      (m) => m.type === "snapshot" && m.snapshot.state?.view.phase === "map",
    )
  ).snapshot;
  a.send({
    type: "action",
    token: sa.token,
    id: "stale",
    version: first.version,
    action: {
      type: "expedition-action",
      move: { type: "vote", choice: "f0-0" },
    },
  });
  await a.wait((m) => m.type === "error" && m.id === "stale");
  for (const [c, token] of [
    [a, sa.token],
    [b, sb.token],
  ])
    c.send({
      type: "action",
      token,
      id: `route-${token}`,
      version: map.version,
      action: {
        type: "expedition-action",
        move: { type: "vote", choice: "f0-0" },
      },
    });
  const battle = (
    await a.wait(
      (m) => m.type === "snapshot" && m.snapshot.state?.view.phase === "battle",
    )
  ).snapshot;
  for (const [c, token] of [
    [a, sa.token],
    [b, sb.token],
  ])
    c.send({
      type: "action",
      token,
      id: `ready-${token}`,
      version: battle.version,
      action: { type: "expedition-action", move: { type: "ready" } },
    });
  const before = (
      await a.wait(
        (m) =>
          m.type === "snapshot" && m.snapshot.state?.view.combat.round === 2,
      )
    ).snapshot.state,
    id = before.view.runId;
  a.send({ type: "close", token: sa.token });
  await a.wait((m) => m.type === "closed");
  await stop();
  await start();
  const resumed = await client();
  resumed.send({ type: "restore-run", run: id, token: sa.token });
  await resumed.wait((m) => m.type === "session");
  await resumed.wait(
    (m) => m.type === "snapshot" && m.snapshot.resumeRoles?.length === 2,
  );
  const guest = await client();
  guest.send({ type: "join", room: sa.room, name: "新手机" });
  const newSession = await guest.wait((m) => m.type === "session");
  assert.notEqual(newSession.token, sb.token);
  guest.send({ type: "ready", token: newSession.token, ready: true });
  await resumed.wait((m) => m.type === "snapshot" && m.snapshot.seats[1].ready);
  resumed.send({ type: "start", token: sa.token });
  const after = (
    await resumed.wait(
      (m) => m.type === "snapshot" && m.snapshot.state?.view.phase === "battle",
    )
  ).snapshot;
  assert.deepEqual(after.state, before);
  assert.equal(after.resumeRoles, undefined);
  resumed.send({ type: "close", token: sa.token });
  await resumed.wait((m) => m.type === "closed");
  const abandon = await client();
  abandon.send({ type: "abandon-run", run: id, token: sa.token });
  await abandon.wait((m) => m.type === "run-abandoned");
  await stop();
  await start();
  const missing = await client();
  missing.send({ type: "restore-run", run: id, token: sa.token });
  await missing.wait(
    (m) => m.type === "error" && m.message.includes("存档不存在"),
  );
  const evidence = {
    passed: true,
    runtime:process.version,
    serverEntry:process.env.TEST_SERVER_ENTRY||"dist-server/main.mjs",
    guiOperated:false,
    checks: [
      "two-client concurrent actions",
      "stale window rejection",
      "SQLite restart",
      "new-device character confirmation",
      "exact state restoration",
      "optional patch field removal",
      "permanent abandonment",
    ],
    generatedAt: new Date().toISOString(),
  };
  await mkdir("artifacts/expedition-chapter", { recursive: true });
  await writeFile(
    "artifacts/expedition-chapter/network.json",
    JSON.stringify(evidence, null, 2),
  );
  process.stdout.write(JSON.stringify(evidence) + "\n");
} finally {
  await stop();
  await rm(data, { recursive: true, force: true });
}
