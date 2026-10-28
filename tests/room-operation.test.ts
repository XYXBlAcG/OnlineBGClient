import { expect, it } from "vitest";
import { RoomOperation } from "../src/client/room-operation";
it("settles only authoritative success, failure or explicit cancellation and rejects duplicate submissions", () => {
  const operation = new RoomOperation();
  expect(operation.begin("start", "one")).toBe(true);
  expect(operation.begin("start", "one")).toBe(false);
  operation.accept({ type: "error", id: "unrelated-chat" });
  expect(operation.snapshot()).not.toBeNull();
  operation.accept({
    type: "snapshot",
    snapshot: { room: "two", playing: true },
  });
  expect(operation.snapshot()?.kind).toBe("start");
  operation.accept({
    type: "snapshot",
    snapshot: { room: "one", playing: false },
  });
  expect(operation.snapshot()).not.toBeNull();
  operation.accept({
    type: "snapshot",
    snapshot: { room: "one", playing: true },
  });
  expect(operation.snapshot()).toBeNull();
  operation.begin("create");
  operation.accept({ type: "session" });
  expect(operation.snapshot()).not.toBeNull();
  operation.accept({ type: "error" });
  expect(operation.snapshot()).toBeNull();
  operation.begin("create");
  operation.cancel();
  expect(operation.snapshot()).toBeNull();
});
