import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { SnapshotStream, SnapshotReplica } from "../src/domain/sync";
it("sends only changed fields and preserves unchanged game references", () => {
  const room = new Room("sync", {
    kind: "uno",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const first = room.claim("甲"),
    second = room.claim("乙");
  room.setReady(second, true);
  room.start(first);
  const stream = new SnapshotStream(),
    replica = new SnapshotReplica();
  const full = stream.next(room.snapshot(first));
  const before = replica.apply(full)!;
  room.chat(second, "greet", "你好");
  const delta = stream.next(room.snapshot(first));
  expect(delta.type).toBe("patch");
  const next = replica.apply(delta)!;
  expect(next.chat.at(-1)?.text).toBe("你好");
  expect(next.state).toBe(before.state);
  expect(next.candidates).toBe(before.candidates);
  expect(JSON.stringify(delta).length).toBeLessThan(
    JSON.stringify(full).length / 2,
  );
  expect(replica.apply({ ...delta, base: 0 } as typeof delta)).toBeNull();
  const snapshot = room.snapshot(first);
  const restored = replica.apply(stream.next(snapshot, true));
  expect(restored).toEqual(snapshot);
});

it("removes optional fields across JSON wire patches", () => {
  const room = new Room("optional", {
      kind: "uno",
      humans: 1,
      ai: [{ difficulty: "easy", name: "" }],
      team: false,
      training: false,
    }),
    token = room.claim("甲"),
    stream = new SnapshotStream(),
    replica = new SnapshotReplica();
  const first = room.snapshot(token);
  first.resumeRoles = [{ profession: "铁卫", name: "甲" }];
  replica.apply(JSON.parse(JSON.stringify(stream.next(first))));
  const second = room.snapshot(token);
  second.resumeRoles = undefined;
  expect(
    replica.apply(JSON.parse(JSON.stringify(stream.next(second))))?.resumeRoles,
  ).toBeUndefined();
});
