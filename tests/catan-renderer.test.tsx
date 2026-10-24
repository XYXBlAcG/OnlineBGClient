import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { Room } from "../src/domain/room";
import { OriginalGame } from "../src/client/OriginalGame";

it.each([2, 3, 8])(
  "renders legal initial construction for all %i human seats",
  (players) => {
    vi.stubGlobal("window", {
      addEventListener() {},
      removeEventListener() {},
    });
    vi.stubGlobal("document", {
      createElement: () => ({ setAttribute() {}, clientWidth: 16 }),
      body: { appendChild() {}, removeChild() {} },
    });
    const room = new Room("catan-render", {
      kind: "ktd",
      humans: players,
      ai: [],
      team: false,
      training: false,
    });
    const tokens = Array.from({ length: players }, (_, index) =>
      room.claim(`玩家${index + 1}`),
    );
    for (const token of tokens.slice(1)) room.setReady(token, true);
    room.start(tokens[0]);
    const renderers: ReactTestRenderer[] = [];
    const render = (index: number) => (
      <OriginalGame
        snapshot={room.snapshot(tokens[index])}
        end={() => {}}
        act={(action) =>
          room.act(tokens[index], `build-${room.version}`, room.version, action)
        }
      />
    );
    try {
      act(() => {
        for (let index = 0; index < players; index++)
          renderers.push(create(render(index)));
      });
      for (const actor of [
        ...tokens.keys(),
        ...[...tokens.keys()].reverse(),
      ].flatMap((actor) => [actor, actor])) {
        const targets = renderers[actor].root.findAll(
          (node) =>
            node.type === "circle" &&
            node.props["data-guide-target"] === "ktd.build",
        );
        expect(
          targets.length,
          `actor ${actor}, version ${room.version}`,
        ).toBeGreaterThan(0);
        const version = room.version;
        act(() => {
          targets[0].props.onClick();
        });
        expect(room.version).toBe(version + 1);
        act(() => {
          renderers.forEach((renderer, index) =>
            renderer.update(render(index)),
          );
        });
      }
      expect(
        room
          .snapshot(tokens[0])
          .candidates.some(
            (candidate) =>
              candidate.action.type === "ktd-action" &&
              candidate.action.move.kind === "roll",
          ),
      ).toBe(true);
    } finally {
      act(() => renderers.forEach((renderer) => renderer.unmount()));
      vi.unstubAllGlobals();
    }
  },
);
