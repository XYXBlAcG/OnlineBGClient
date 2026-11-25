import { it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoomStore } from "../src/server/storage";
import { Room } from "../src/domain/room";

it("persists rooms atomically and reconstructs an actual round after reopening SQLite", () => {
  const directory = mkdtempSync(join(tmpdir(), "onlinebg-"));
  const path = join(directory, "rooms.sqlite");
  try {
    const room = new Room("table", {
      kind: "uno",
      humans: 1,
      ai: [{ difficulty: "easy", name: "" }],
      team: false,
      training: false,
    });
    const token = room.claim("Alice");
    room.start(token);
    room.act(token, "start", room.version, { type: "uno-start" });
    const store = new RoomStore(path);
    store.save(room);
    store.close();
    const restoredStore = new RoomStore(path);
    const restored = restoredStore.load()[0];
    expect(restored.state).toEqual(room.state);
    expect(restored.snapshot(token).paused).toBe(true);
    restoredStore.remove(room.id);
    expect(restoredStore.load()).toEqual([]);
    restoredStore.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it.skipIf(process.platform === "win32")(
  "restricts existing SQLite files without deleting saved rooms",
  async () => {
    const { chmodSync, statSync } = await import("node:fs");
    const directory = mkdtempSync(join(tmpdir(), "onlinebg-private-"));
    const path = join(directory, "rooms.sqlite");
    try {
      const first = new RoomStore(path);
      const room = new Room("private", {
        kind: "uno",
        humans: 1,
        ai: [{ difficulty: "easy" }],
        team: false,
        training: false,
      });
      room.claim("Alice");
      first.save(room);
      first.close();
      chmodSync(path, 0o644);
      const reopened = new RoomStore(path);
      try {
        expect(statSync(path).mode & 0o777).toBe(0o600);
        expect(statSync(`${path}-wal`).mode & 0o777).toBe(0o600);
        expect(statSync(`${path}-shm`).mode & 0o777).toBe(0o600);
        expect(reopened.load()[0].id).toBe(room.id);
      } finally {
        reopened.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

it("loads intact rooms and runs while retaining unreadable rows", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const directory = mkdtempSync(join(tmpdir(), "onlinebg-bad-archive-"));
  const path = join(directory, "rooms.sqlite");
  const store = new RoomStore(path);
  const db = new DatabaseSync(path);
  try {
    const room = new Room("valid", { kind: "expedition", humans: 1, ai: [], team: false, training: false });
    room.start(room.claim("Solo"));
    store.save(room);
    if (room.state?.kind !== "expedition") throw new Error("wrong game");
    const runId = room.state.view.runId;
    store.saveRuns(new Map([[runId, room.export()]]));
    db.prepare("INSERT INTO rooms VALUES (?, ?)").run("broken-room", "{");
    db.prepare("INSERT INTO rooms VALUES (?, ?)").run(
      "broken-shape",
      JSON.stringify({ ...room.export(), id: "broken-shape", records: null }),
    );
    db.prepare("INSERT INTO runs VALUES (?, ?)").run("broken-run", '{"format":1}');
    expect(store.load().map((entry) => entry.id)).toEqual(["valid"]);
    const runs = new Map(store.loadRuns());
    expect([...runs.keys()]).toEqual([runId]);
    runs.clear();
    store.saveRuns(runs);
    expect(db.prepare("SELECT archive FROM rooms WHERE id = ?").get("broken-room")?.archive).toBe("{");
    expect(db.prepare("SELECT id FROM runs").all().map((row) => row.id)).toEqual(["broken-run"]);
  } finally {
    db.close();
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
