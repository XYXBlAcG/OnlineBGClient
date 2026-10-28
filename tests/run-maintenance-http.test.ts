import { expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Room } from "../src/domain/room";
import { Gateway } from "../src/domain/gateway";
import { RoomStore } from "../src/server/storage";
import { TestService } from "../scripts/service-harness.mjs";
it("abandons a persisted hosted run through loopback without creating or replacing another room", async () => {
  const directory = await mkdtemp(join(tmpdir(), "run-maintenance-"));
  const gateway = new Gateway();
  const room = new Room("saved", {
    kind: "expedition",
    humans: 1,
    ai: [],
    team: false,
    training: false,
  });
  const token = room.claim("房主");
  room.start(token);
  gateway.rememberRun(room);
  const other = new Room("other", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "normal", name: "AI" }],
    team: false,
    training: false,
  });
  const host = other.claim("另一局");
  other.start(host);
  const store = new RoomStore(join(directory, "rooms.sqlite"));
  store.save(room);
  store.save(other);
  store.saveRuns(gateway.runs);
  store.close();
  const run = [...gateway.runs.keys()][0],
    service = new TestService(directory, {
      entry: process.env.TEST_SERVER_ENTRY || "dist-server/main.mjs",
    });
  try {
    const endpoint = await service.start();
    const before = await (
      await fetch(`${endpoint}/room-info?room=other`)
    ).json();
    const denied = await fetch(`${endpoint}/runs/abandon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "abandon-run", run, token: "wrong" }),
    });
    expect(denied.ok).toBe(false);
    const result = await fetch(`${endpoint}/runs/abandon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "abandon-run", run, token }),
    });
    expect(await result.json()).toEqual({ type: "run-abandoned", run });
    expect(
      await (await fetch(`${endpoint}/room-info?room=other`)).json(),
    ).toEqual(before);
    await service.stop();
    const reopened = new RoomStore(join(directory, "rooms.sqlite"));
    expect(reopened.loadRuns()).toEqual([]);
    expect(
      reopened
        .load()
        .map((room) => room.id)
        .sort(),
    ).toEqual(["other", "saved"]);
    reopened.close();
  } finally {
    await service.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
