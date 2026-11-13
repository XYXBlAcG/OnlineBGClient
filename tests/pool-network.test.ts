import { expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TestService } from "../scripts/service-harness.mjs";
import { Peer } from "./helpers/room-peer";
it("sends the same authoritative nine-ball shot to both connected players", async () => {
  const root = await mkdtemp(join(tmpdir(), "pool-network-")),
    service = new TestService(root),
    peers: Peer[] = [];
  try {
    const url = await service.start();
    peers.push(new Peer(url), new Peer(url));
    const [host, guest] = peers;
    await Promise.all(peers.map((peer) => peer.ready()));
    host.send({
      type: "create",
      name: "甲",
      config: {
        kind: "pool",
        humans: 2,
        ai: [],
        team: false,
        training: false,
        pool: { mode: "nine-ball", shotSeconds: 45, assist: false },
      },
    });
    await host.wait(() => !!host.session);
    guest.send({ type: "join", name: "乙", room: host.session!.room });
    await guest.wait(() => !!guest.session);
    guest.send({ type: "ready", token: guest.session!.token, ready: true });
    await host.wait(() => !!host.snapshot?.seats[1].ready);
    host.send({ type: "start", token: host.session!.token });
    await host.wait(() => !!host.snapshot?.playing);
    host.send({
      type: "action",
      id: "break",
      token: host.session!.token,
      version: host.snapshot!.version,
      action: { type: "pool-shot", aim: 0, power: 0.7, spin: { x: 0, y: 0 } },
    });
    await Promise.all(
      peers.map((peer) =>
        peer.wait(
          () =>
            peer.snapshot?.state?.kind === "pool" &&
            peer.snapshot.state.view.shotNumber === 1,
        ),
      ),
    );
    const state = host.snapshot!.state;
    if (state?.kind !== "pool") throw Error("状态错误");
    expect(state.view.mode).toBe("nine-ball");
    expect(state.view.lastShot?.frames.length).toBeGreaterThan(1);
    expect(guest.snapshot!.state).toEqual(state);
    expect(host.snapshot!.turnDeadline).toBe(guest.snapshot!.turnDeadline);
  } finally {
    peers.forEach((peer) => peer.socket.terminate());
    await service.stop();
    await rm(root, { recursive: true, force: true });
  }
}, 45000);
