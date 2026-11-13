import { expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TestService } from "../scripts/service-harness.mjs";
import { Peer } from "./helpers/room-peer";

it("syncs queued games and preserves a removed seat as a connected spectator", async () => {
  const root = await mkdtemp(join(tmpdir(), "bg-queue-"));
  const service = new TestService(root);
  const peers: Peer[] = [];
  try {
    const url = await service.start();
    peers.push(new Peer(url), new Peer(url));
    const [host, guest] = peers;
    await Promise.all(peers.map((peer) => peer.ready()));
    host.send({
      type: "create",
      name: "甲",
      config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
    });
    await host.wait(() => !!host.session);
    guest.send({ type: "join", room: host.session!.room, name: "乙" });
    await guest.wait(() => !!guest.snapshot);
    const config = {
      kind: "expedition",
      humans: 1,
      ai: [],
      team: false,
      training: false,
    };
    host.send({
      type: "queue-set",
      token: host.session!.token,
      revision: 0,
      entries: [{ id: "next", config }],
    });
    await guest.wait(() => guest.snapshot?.partyQueue?.revision === 1);
    const snapshot = guest.snapshot!;
    host.send({
      type: "queue-apply",
      token: host.session!.token,
      revision: 1,
      id: "next",
      setup: {
        config,
        retain: [snapshot.seats[0].id],
        members: snapshot.seats.map((seat) => seat.id),
        endCurrent: false,
      },
    });
    await guest.wait(() => guest.snapshot?.kind === "expedition");
    expect(guest.snapshot!.actor).toBeLessThan(-1);
    expect(guest.snapshot!.partyQueue?.entries).toHaveLength(0);
    expect(guest.session!.room).toBe(host.session!.room);
    guest.send({
      type: "chat",
      token: guest.session!.token,
      id: "still-here",
      text: "还在房间",
    });
    await host.wait(
      () =>
        !!host.snapshot?.chat.some((message) => message.text === "还在房间"),
    );
  } finally {
    peers.forEach((peer) => peer.socket.terminate());
    await service.stop();
    await rm(root, { recursive: true, force: true });
  }
}, 45000);
