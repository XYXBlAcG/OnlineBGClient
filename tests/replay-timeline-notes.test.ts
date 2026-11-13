import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { Replay } from "../src/domain/replay";
import { ReplayTimeline } from "../src/domain/replay-timeline";
import { ClientStore } from "../src/client/storage";
import { Room } from "../src/domain/room";
it("indexes chapters without AI and persists and removes bounded bookmarks", async () => {
  const room = new Room("notes", {
    kind: "expedition",
    humans: 1,
    ai: [],
    team: false,
    training: false,
  });
  const token = room.claim("玩家");
  room.setReady(token, true);
  room.start(token);
  room.end(token);
  const record = room.snapshot(token).replay!;
  const scan = new ReplayTimeline(new Replay(record));
  while (!scan.step(2)) {}
  expect(scan.markers[0].kind).toBe("chapter");
  const store = new ClientStore();
  await store.saveRecord(record);
  await store.saveBookmarks(record, [{ frame: 0, label: "开局" }]);
  expect(await store.bookmarks(record)).toHaveLength(1);
  await expect(
    store.saveBookmarks(record, [{ frame: -1, label: "错误" }]),
  ).rejects.toThrow();
  await store.deleteRecord(record);
  expect(await store.bookmarks(record)).toHaveLength(0);
});
it("keeps discovered progression when replay cache is cleared and merges imports", async () => {
  const store = new ClientStore();
  const { ExpeditionAdventure } =
    await import("../src/domain/expedition/adventure");
  const run = new ExpeditionAdventure().create(1).view;
  run.phase = "map";
  await store.observeRun(run, 0);
  await store.observeRun(run, 0);
  const saved = await store.journal();
  expect(saved.runs[run.runId].professions).toHaveLength(1);
  await store.importJournal({
    ...saved,
    runs: { [run.runId]: { ...saved.runs[run.runId], won: true } },
  });
  await store.importJournal(saved);
  await store.clearCache({ images: true, audit: true, records: true });
  expect((await store.journal()).runs[run.runId].won).toBe(true);
});
