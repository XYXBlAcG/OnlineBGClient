import { featuredWorkshopPacks } from "../src/domain/workshop/featured";
import { expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TestService } from "../scripts/service-harness.mjs";
import { Peer } from "./helpers/room-peer";
it("真实双端同步付费特效和余额，重复请求不重复投掷或扣币", async () => {
  const root = await mkdtemp(join(tmpdir(), "bg-party-network-"));
  const service = new TestService(root);
  let a: Peer | undefined, b: Peer | undefined;
  try {
    const url = await service.start();
    a = new Peer(url);
    b = new Peer(url);
    await Promise.all([a.ready(), b.ready()]);
    a.send({
      type: "create",
      name: "甲",
      config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
    });
    await a.wait(() => !!a!.session);
    b.send({ type: "join", room: a.session!.room, name: "乙" });
    await b.wait(() => !!b!.session);
    b.send({ type: "ready", token: b.session!.token, ready: true });
    await a.wait(() => a!.snapshot?.seats[1].ready === true);
    a.send({ type: "start", token: a.session!.token });
    await b.wait(() => !!b!.snapshot?.playing);
    a.send({
      type: "party",
      token: a.session!.token,
      id: "enable",
      action: { type: "enabled", enabled: true },
    });
    await Promise.all([
      a.wait(() => !!a!.snapshot?.party.enabled),
      b.wait(() => !!b!.snapshot?.party.enabled),
    ]);
    const version = a.snapshot!.version;
    const own = a.snapshot!.seats[0].id;
    const command = {
      type: "party",
      token: a.session!.token,
      id: "throw",
      action: { type: "buy", item: "giantSlipper", target: 1 },
    };
    a.send(command);
    await Promise.all([
      a.wait(() => a!.snapshot?.party.events.length === 1),
      b.wait(() => b!.snapshot?.party.events.length === 1),
    ]);
    await b.wait(() => b!.snapshot?.party.balances[own]?.coins === 15);
    a.send(command);
    a.send({ type: "snapshot", token: a.session!.token });
    await a.wait(() => a!.snapshot?.party.balances[own]?.coins === 15);
    expect(a.snapshot!.version).toBe(version);
    expect(b.snapshot!.version).toBe(version);
    expect(a.snapshot!.party.events[0]).toEqual(b.snapshot!.party.events[0]);
    expect(a.snapshot!.party.events[0].item).toBe("giantSlipper");
    expect(b.snapshot!.party.events).toHaveLength(1);
    expect(b.interactions).toHaveLength(0);
  } finally {
    a?.socket.terminate();
    b?.socket.terminate();
    await service.stop();
    await rm(root, { recursive: true, force: true });
  }
}, 45000);
it("真实服务的独立观众可在开局后加入、聊天、下注，收到同一盘口与派对事件", async () => {
  const root = await mkdtemp(join(tmpdir(), "bg-party-observers-")),
    service = new TestService(root),
    peers: Peer[] = [];
  try {
    const url = await service.start();
    for (let i = 0; i < 4; i++) peers.push(new Peer(url));
    await Promise.all(peers.map((p) => p.ready()));
    const [a, b, x, y] = peers;
    a.send({
      type: "create",
      name: "甲",
      config: {
        kind: "uno",
        humans: 2,
        ai: [],
        team: false,
        training: false,
        plugins: [featuredWorkshopPacks[0]],
        party: { enabled: true },
      },
    });
    await a.wait(() => !!a.session);
    b.send({ type: "join", room: a.session!.room, name: "乙" });
    await b.wait(() => !!b.session);
    b.send({ type: "ready", token: b.session!.token, ready: true });
    await a.wait(() => !!a.snapshot?.seats[1].ready);
    a.send({ type: "start", token: a.session!.token });
    await a.wait(() => !!a.snapshot?.playing);
    for (const [i, p] of [x, y].entries()) {
      p.send({
        type: "join",
        spectator: true,
        room: a.session!.room,
        name: `观众${i}`,
      });
      await p.wait(() => !!p.session && !!p.snapshot?.playing);
    }
    await x.wait(() => x.snapshot?.spectators?.length === 2);
    expect(x.snapshot!.canManage).toBe(false);
    expect(x.snapshot!.state?.kind).toBe("uno");
    if (x.snapshot!.state?.kind !== "uno") throw Error();
    expect(x.snapshot!.state.view.playerCards.flat().every((c) => c < 0)).toBe(
      true,
    );
    const market = x.snapshot!.party.markets[0];
    x.send({
      type: "party",
      token: x.session!.token,
      id: "bet",
      action: {
        type: "bet",
        market: market.id,
        option: market.options[0],
        amount: 5,
      },
    });
    await y.wait(
      () => Object.keys(y.snapshot?.party.markets[0].stakes ?? {}).length === 1,
    );
    x.send({
      type: "chat",
      token: x.session!.token,
      id: "watch-chat",
      text: "观战竞猜中",
    });
    await a.wait(() => a.snapshot?.chat.at(-1)?.text === "观战竞猜中");
    a.send({
      type: "party",
      token: a.session!.token,
      id: "storm",
      action: {
        type: "buy",
        item: "cometEgg",
        target: "table",
        round: a.snapshot!.party.round,
      },
    });
    await Promise.all(
      peers.map((p) => p.wait(() => p.snapshot?.party.events.length === 1)),
    );
    expect(peers.map((p) => p.snapshot!.party.events[0])).toEqual(
      Array(4).fill(a.snapshot!.party.events[0]),
    );
    y.send({
      type: "party",
      token: y.session!.token,
      id: "plugin-cat",
      action: {
        type: "buy-plugin",
        pack: featuredWorkshopPacks[0].id,
        effect: "meteor-cats",
        target: "table",
        round: y.snapshot!.party.round,
      },
    });
    await Promise.all(
      peers.map((p) => p.wait(() => p.snapshot?.party.events.length === 2)),
    );
    expect(a.snapshot!.party.events[1].visual?.emoji).toBe("🐈");
    expect(b.snapshot!.party.plugins).toEqual([featuredWorkshopPacks[0]]);
    x.send({ type: "leave", token: x.session!.token });
    await y.wait(() => y.snapshot?.spectators?.length === 1);
  } finally {
    peers.forEach((p) => p.socket.terminate());
    await service.stop();
    await rm(root, { recursive: true, force: true });
  }
}, 45000);
