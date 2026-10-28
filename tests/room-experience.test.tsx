import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { ComputeStatus } from "../src/client/ComputeStatus";
import { QuickStart } from "../src/client/QuickStart";
import { preferencesSchema } from "../src/client/preferences";
it("hides compute details by default but identifies the deciding AI", () => {
  const room = new Room("ui", {
    kind: "uno",
    humans: 1,
    ai: [{ name: "流星", difficulty: "normal" }],
    team: false,
    training: false,
  });
  const token = room.claim("我");
  room.start(token);
  const snapshot = room.snapshot(token);
  snapshot.computation = {
    actor: 1,
    status: "computing",
    elapsedMs: 10,
    simulations: 9,
    threads: 8,
  } as NonNullable<typeof snapshot.computation>;
  const html = renderToStaticMarkup(
    <ComputeStatus snapshot={snapshot} control={() => {}} />,
  );
  expect(html).toContain("流星正在决策");
  expect(html).not.toContain("线程");
  expect(html).not.toContain("次/秒");
  expect(
    renderToStaticMarkup(
      <ComputeStatus snapshot={snapshot} details control={() => {}} />,
    ),
  ).toContain("线程");
});
it("independently hides both home helpers without leaving a container", () => {
  expect(preferencesSchema.parse({}).computeDetails).toBe(false);
  const html = renderToStaticMarkup(
    <QuickStart
      desktop
      expanded
      showGuide={false}
      showVoice={false}
      onExpandedChange={() => {}}
      onVoiceSettings={() => {}}
    />,
  );
  expect(html).toBe("");
  expect(
    renderToStaticMarkup(
      <QuickStart
        desktop
        expanded
        showGuide={false}
        showVoice
        onExpandedChange={() => {}}
        onVoiceSettings={() => {}}
      />,
    ),
  ).toContain("连麦设置");
});

it("provides a single shared host end control for every game and hides it outside live play", async () => {
  const { gameKinds, gameCatalogue } = await import("../src/domain/catalogue");
  const { RoomToolbar } = await import("../src/client/RoomToolbar");
  const { CommandRegistry } = await import("../src/client/commands");
  const preferences = preferencesSchema.parse({});
  for (const kind of gameKinds) {
    const room = new Room(`end-${kind}`, {
      kind,
      humans: gameCatalogue[kind].minPlayers,
      ai: [],
      team: false,
      training: false,
    });
    const tokens = Array.from(
      { length: gameCatalogue[kind].minPlayers },
      (_, i) => room.claim(`玩家${i}`),
    );
    tokens.forEach((token) => room.setReady(token, true));
    const props = {
      mobile: false,
      focused: false,
      onFocus: () => {},
      onEnd: () => {},
      preferences,
      onTheme: () => {},
      network: true,
      invite: () => {},
      inviteCopied: false,
      onInvite: () => {},
      send: () => {},
      onError: () => {},
      act: () => {},
      registry: new CommandRegistry(),
      pending: false,
      guideAvailable: false,
      guideShown: false,
      onGuide: () => {},
    };
    const render = (snapshot: ReturnType<Room["snapshot"]>) =>
      renderToStaticMarkup(<RoomToolbar {...props} snapshot={snapshot} />);
    expect(render(room.snapshot(tokens[0]))).not.toContain(
      'data-room-action="end"',
    );
    room.start(tokens[0]);
    const snapshot = room.snapshot(tokens[0]);
    expect(
      render(snapshot).match(/data-room-action="end"/g),
      kind,
    ).toHaveLength(1);
    expect(render({ ...snapshot, canManage: false })).not.toContain(
      'data-room-action="end"',
    );
    expect(render({ ...snapshot, finished: true })).not.toContain(
      'data-room-action="end"',
    );
  }
});
