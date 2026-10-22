import "fake-indexeddb/auto";
import { beforeEach, expect, it, vi } from "vitest";
import { ClientStore, subscribeRecords } from "../src/client/storage";
import { Room } from "../src/domain/room";
import type { ReplayRecord } from "../src/domain/replay";
const replay = (room: string): ReplayRecord => ({
  format: 1,
  room,
  config: new Room(room, {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
  }).config,
  rulesVersion: "1",
  names: ["我", "AI"],
  seed: room,
  startedAt: 1,
  events: [],
});
beforeEach(async () => {
  const store = new ClientStore();
  await store.clearCache({ images: false, audit: false, records: true });
  await store.setRecordSaving(true);
});
it("stores completed history once and keeps the saving choice across instances", async () => {
  const store = new ClientStore(),
    record = replay("once");
  await store.archiveRecords([record, record]);
  expect(await store.records()).toEqual([record]);
  await store.setRecordSaving(false);
  await store.archiveRecords([replay("off")]);
  expect(await new ClientStore().recordSaving()).toBe(false);
  await store.setRecordSaving(true);
  await store.archiveRecords([replay("off"), replay("new")]);
  expect((await store.records()).map((r) => r.room).sort()).toEqual([
    "new",
    "once",
  ]);
});
it("clears local history atomically and does not restore it from stale snapshots or a second window", async () => {
  const a = new ClientStore(),
    b = new ClientStore(),
    old = replay("old");
  await a.archiveRecords([old]);
  const usage = await a.cacheUsage();
  expect(usage.records).toBeGreaterThan(0);
  expect(usage.recordCount).toBe(1);
  await b.clearCache({ images: false, audit: false, records: true });
  await new ClientStore().archiveRecords([old]);
  expect(await b.records()).toEqual([]);
  await a.archiveRecords([replay("after")]);
  expect((await b.records()).map((r) => r.room)).toEqual(["after"]);
});
it("allows explicit imports with automatic saving off and keeps recovery separate from history", async () => {
  const store = new ClientStore();
  await store.setRecordSaving(false);
  await store.saveRecord(replay("import"));
  expect((await store.records()).map((r) => r.room)).toEqual(["import"]);
  const room = new Room("recover", {
      kind: "uno",
      humans: 1,
      ai: [{ difficulty: "easy", name: "" }],
      team: false,
      training: false,
    }),
    token = room.claim("我");
  room.start(token);
  const archive = room.export();
  archive.records = [replay("past")];
  await store.saveLocal({ room: archive, tokens: [token], token });
  expect(archive.records).toHaveLength(1);
  const saved = (await store.local())!;
  expect(saved.room.records).toEqual([]);
  expect(Room.restore(saved.room).state).toEqual(room.state);
  await store.clearCache({ images: false, audit: false, records: true });
  expect((await store.local())?.room.replay).toEqual(archive.replay);
});

it("notifies history consumers after committed writes and unsubscribes cleanly", async () => {
  const store = new ClientStore(),
    updated = vi.fn(),
    stop = subscribeRecords(updated);
  await store.archiveRecords([replay("notice")]);
  expect(updated).toHaveBeenCalledTimes(1);
  await store.archiveRecords([replay("notice")]);
  expect(updated).toHaveBeenCalledTimes(1);
  stop();
  await store.setRecordSaving(false);
  expect(updated).toHaveBeenCalledTimes(1);
});
