import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { configSchema } from "../src/domain/protocol";
it("persists a host-owned queue and applies only after seat review", () => {
  const config = configSchema.parse({
    kind: "uno",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const room = new Room("queue", config),
    host = room.claim("甲"),
    guest = room.claim("乙");
  room.setQueue(host, 0, [{ id: "next", config }]);
  expect(() => room.setQueue(guest, 1, [])).toThrow();
  expect(() => room.setQueue(host, 0, [])).toThrow();
  expect(Room.restore(room.export()).export().partyQueue?.entries).toHaveLength(
    1,
  );
  const snapshot = room.snapshot(host);
  expect(() =>
    room.applyQueued(host, "next", 1, {
      config,
      retain: [snapshot.seats[0].id],
      members: [],
      endCurrent: false,
    }),
  ).toThrow();
  expect(room.snapshot(host).partyQueue?.entries).toHaveLength(1);
  room.applyQueued(host, "next", 1, {
    config,
    retain: snapshot.seats.map((s) => s.id),
    members: snapshot.seats.map((s) => s.id),
    endCurrent: false,
  });
  expect(room.snapshot(host).partyQueue?.entries).toHaveLength(0);
  expect(room.snapshot(host).seats.map((s) => s.name)).toEqual(["甲", "乙"]);
});

it("keeps non-retained guests connected as spectators", () => {
  const room = new Room("watchqueue", {
    kind: "uno",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const host = room.claim("甲"),
    guest = room.claim("乙");
  const config = configSchema.parse({
    kind: "expedition",
    humans: 1,
    ai: [],
    team: false,
    training: false,
  });
  room.setQueue(host, 0, [{ id: "exp", config }]);
  const snapshot = room.snapshot(host);
  room.applyQueued(host, "exp", 1, {
    config,
    retain: [snapshot.seats[0].id],
    members: snapshot.seats.map((seat) => seat.id),
    endCurrent: false,
  });
  expect(room.snapshot(guest).actor).toBeLessThan(-1);
  expect(
    room.snapshot(guest).spectators?.some((member) => member.name === "乙"),
  ).toBe(true);
});
it("validates queue commands through the same gateway used by remote clients", async () => {
  const { Gateway } = await import("../src/domain/gateway");
  const gateway = new Gateway();
  const config = {
    kind: "uno",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  };
  const { session } = gateway.handle({ type: "create", name: "甲", config });
  const guest = gateway.handle({
    type: "join",
    room: session.room,
    name: "乙",
  }).session;
  gateway.handle(
    {
      type: "queue-set",
      token: session.token,
      revision: 0,
      entries: [{ id: "uno-next", config }],
    },
    session,
  );
  const room = gateway.rooms.get(session.room)!;
  expect(room.snapshot(guest.token).partyQueue?.entries[0].id).toBe("uno-next");
  room.setReady(session.token, true);
  room.setReady(guest.token, true);
  room.start(session.token);
  const view = room.snapshot(session.token);
  const setup = {
    config,
    retain: view.seats.map((seat) => seat.id),
    members: view.seats.map((seat) => seat.id),
    endCurrent: true,
  };
  expect(() =>
    gateway.handle(
      {
        type: "queue-apply",
        id: "uno-next",
        token: session.token,
        revision: 1,
        setup,
      },
      session,
    ),
  ).toThrow("请先完成");
  expect(room.snapshot(session.token).partyQueue?.entries).toHaveLength(1);
  room.end(session.token);
  gateway.handle(
    {
      type: "queue-apply",
      id: "uno-next",
      token: session.token,
      revision: 1,
      setup,
    },
    session,
  );
  expect(room.snapshot(guest.token).partyQueue?.entries).toHaveLength(0);
  expect(room.snapshot(guest.token).actor).toBe(1);
});
