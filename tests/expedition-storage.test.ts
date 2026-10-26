import "fake-indexeddb/auto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it, expect } from "vitest";
import { ClientStore } from "../src/client/storage";
import { RoomStore } from "../src/server/storage";
import { Gateway } from "../src/domain/gateway";
it("远征进度独立于普通记录缓存，SQLite 重开和本机重开都保留原进度", async () => {
  const gateway = new Gateway(),
    store = new ClientStore();
  const { session } = gateway.handle({
    type: "create",
    name: "甲",
    config: {
      kind: "expedition",
      humans: 1,
      ai: [],
      team: false,
      training: false,
    },
  });
  gateway.handle({ type: "start", token: session.token }, session);
  const room = gateway.rooms.get(session.room)!;
  gateway.rememberRun(room);
  if (room.state?.kind !== "expedition") throw new Error("game");
  const id = room.state.view.runId;
  const archive = gateway.runs.get(id)!;
  await store.saveRun(id, {
    room: archive,
    tokens: [session.token],
    token: session.token,
  });
  await store.linkRun({
    id,
    token: session.token,
    room: room.id,
    endpoint: null,
    hosted: false,
    updated: Date.now(),
    names: ["甲"],
    floor: 0,
  });
  await store.clearCache({ records: true, images: true, audit: true });
  expect((await new ClientStore().run(id))?.room.checkpoint?.state).toEqual(
    room.state,
  );
  const directory = mkdtempSync(join(tmpdir(), "exp-storage-"));
  try {
    const path = join(directory, "rooms.sqlite"),
      database = new RoomStore(path);
    database.saveRuns(gateway.runs);
    database.close();
    const reopened = new RoomStore(path);
    expect(reopened.loadRuns()[0][1].checkpoint?.state).toEqual(room.state);
    reopened.saveRuns(new Map());
    expect(reopened.loadRuns()).toEqual([]);
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  await store.abandonRun(id);
  expect(await store.run(id)).toBeUndefined();
  expect((await store.runLinks()).some((link) => link.id === id)).toBe(false);
});
