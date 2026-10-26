import { it, expect } from "vitest";
import { Gateway } from "../src/domain/gateway";
it("关闭房间后远征存档独立保留，凭原房主身份恢复且不重新生成路线", () => {
  const gateway = new Gateway();
  const created = gateway.handle({
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
  const session = created.session;
  gateway.handle({ type: "start", token: session.token }, session);
  const room = gateway.rooms.get(session.room)!;
  gateway.handle(
    {
      type: "action",
      token: session.token,
      id: "class",
      version: room.version,
      action: {
        type: "expedition-action",
        move: { type: "profession", profession: 2 },
      },
    },
    session,
  );
  const before = structuredClone(room.state!);
  if (before.kind !== "expedition") throw new Error("game");
  gateway.handle({ type: "close", token: session.token }, session);
  expect(gateway.runs.has(before.view.runId)).toBe(true);
  expect(() =>
    gateway.handle({
      type: "restore-run",
      run: before.view.runId,
      token: "wrong",
    }),
  ).toThrow();
  const restored = gateway.handle({
    type: "restore-run",
    run: before.view.runId,
    token: session.token,
  });
  const resumed = gateway.rooms.get(restored.session.room)!;
  expect(resumed.state).toBeNull();
  resumed.start(restored.session.token);
  expect(resumed.state).toEqual(before);
});
it("恢复公网远征先回到席位确认，新设备加入后才继续原角色进度", () => {
  const gateway = new Gateway(),
    created = gateway.handle({
      type: "create",
      name: "甲",
      config: {
        kind: "expedition",
        humans: 2,
        ai: [],
        team: false,
        training: false,
      },
    }),
    a = created.session;
  const b = gateway.handle({ type: "join", room: a.room, name: "乙" }).session;
  gateway.handle({ type: "ready", token: b.token, ready: true }, b);
  gateway.handle({ type: "start", token: a.token }, a);
  const room = gateway.rooms.get(a.room)!;
  gateway.handle(
    {
      type: "action",
      token: a.token,
      id: "a",
      version: room.version,
      action: {
        type: "expedition-action",
        move: { type: "profession", profession: 0 },
      },
    },
    a,
  );
  gateway.handle(
    {
      type: "action",
      token: b.token,
      id: "b",
      version: room.version,
      action: {
        type: "expedition-action",
        move: { type: "profession", profession: 2 },
      },
    },
    b,
  );
  const before = structuredClone(room.state!);
  if (before.kind !== "expedition") throw new Error("game");
  gateway.handle({ type: "close", token: a.token }, a);
  const restored = gateway.handle({
      type: "restore-run",
      run: before.view.runId,
      token: a.token,
    }).session,
    waiting = gateway.rooms.get(restored.room)!;
  expect(waiting.state).toBeNull();
  expect(waiting.snapshot(a.token).resumeRoles?.[1].profession).toBe("炼术师");
  const guest = gateway.handle({
    type: "join",
    room: restored.room,
    name: "新设备",
  }).session;
  expect(guest.token).not.toBe(b.token);
  gateway.handle({
    type: "restore-run",
    run: before.view.runId,
    token: a.token,
  });
  expect(gateway.rooms.get(a.room)?.seats[1].token).toBe(guest.token);
  gateway.handle({ type: "ready", token: guest.token, ready: true }, guest);
  gateway.handle({ type: "start", token: a.token }, restored);
  expect(waiting.state).toEqual(before);
});
it("恢复存档不会修改存档原对象", () => {
  const gateway = new Gateway(),
    { session } = gateway.handle({
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
  gateway.handle({ type: "close", token: session.token }, session);
  const archive = gateway.runs.get(id)!,
    before = structuredClone(archive);
  const result = gateway.handle({
    type: "restore-run",
    run: id,
    token: session.token,
  });
  gateway.rooms.get(result.session.room)!.start(session.token);
  expect(archive).toEqual(before);
});
it("在等待接管时放弃远征，重开会创建新冒险", () => {
  const gateway = new Gateway(),
    { session } = gateway.handle({
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
  if (room.state?.kind !== "expedition") throw new Error("game");
  const id = room.state.view.runId;
  gateway.handle({ type: "close", token: session.token }, session);
  const { session: restored } = gateway.handle({
    type: "restore-run",
    run: id,
    token: session.token,
  });
  gateway.handle({ type: "abandon-run", run: id, token: session.token });
  gateway.handle({ type: "start", token: session.token }, restored);
  const next = gateway.rooms.get(restored.room)!;
  expect(next.state?.kind === "expedition" && next.state.view.runId).not.toBe(
    id,
  );
});
