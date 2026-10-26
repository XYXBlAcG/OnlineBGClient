import { expect, it } from "vitest";
import { gameQuickActions } from "../src/client/game-quick-actions";
import { CommandRegistry } from "../src/client/commands";
import { Room } from "../src/domain/room";
it("dispatches Dominion's phase shortcuts only through currently legal room actions", () => {
  const room = new Room("quick-dom", {
    kind: "dominion",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const owner = room.claim("甲"),
    guest = room.claim("乙");
  room.setReady(guest, true);
  room.start(owner);
  const registry = new CommandRegistry();
  for (const quick of gameQuickActions.dominion!)
    registry.register({
      id: quick.id,
      title: quick.title,
      binding: quick.binding,
      scope: "dominion",
      enabled: () =>
        room
          .snapshot(owner)
          .candidates.some((candidate) => quick.matches(candidate.action)),
      run: () => {
        const candidate = room
          .snapshot(owner)
          .candidates.find((candidate) => quick.matches(candidate.action))!;
        room.act(
          owner,
          `quick-${room.version}`,
          room.version,
          candidate.action,
        );
      },
    });
  const input = {
    key: "t",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    editing: false,
  };
  expect(registry.dispatch({ ...input, editing: true }, "dominion")).toBe(
    false,
  );
  expect(registry.dispatch(input, "dominion")).toBe(true);
  expect(room.state?.kind === "dominion" && room.state.view.phase).toBe("buy");
  expect(registry.dispatch({ ...input, key: "e" }, "dominion")).toBe(true);
  expect(registry.dispatch(input, "dominion")).toBe(false);
});
