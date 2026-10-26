import { expect, it } from "vitest";
import { TokenVerifier } from "livekit-server-sdk";
import { Gateway } from "../src/domain/gateway";
import { VoiceAuthority, type VoiceMedia } from "../src/server/voice";
const config = {
  url: "wss://voice.example.test",
  apiKey: "test-key",
  secret: "voice-test-secret-at-least-32-characters",
};
class Media implements VoiceMedia {
  removed: string[] = [];
  permissions: [string, boolean][] = [];
  async create() {}
  async remove(_room: string, id: string) {
    this.removed.push(id);
  }
  async allow(_room: string, id: string, allowed: boolean) {
    this.permissions.push([id, allowed]);
  }
  async close() {}
}
function fixture() {
  const gateway = new Gateway();
  const host = gateway.handle({
    type: "create",
    name: "房主",
    hostOnly: true,
    config: { kind: "uno", humans: 8, ai: [], team: false, training: false },
  }).session;
  const guests = Array.from(
    { length: 8 },
    (_, i) =>
      gateway.handle({ type: "join", room: host.room, name: `玩家${i}` })
        .session,
  );
  const media = new Media();
  let now = 1000;
  const voice = new VoiceAuthority(gateway, config, media, () => now);
  return {
    gateway,
    host,
    guests,
    media,
    voice,
    advance: () => {
      now += 16000;
    },
  };
}
it("issues a real signed room-scoped audio-only grant and rejects unknown identities", async () => {
  const { voice, host } = fixture();
  await expect(voice.join(host.room, "invalid")).rejects.toThrow("身份");
  const joined = await voice.join(host.room, host.token);
  const decoded = await new TokenVerifier(config.apiKey, config.secret).verify(
    joined.token,
  );
  expect(decoded.video?.roomJoin).toBe(true);
  expect(decoded.video?.canPublishSources).toEqual(["microphone"]);
  expect(decoded.video?.canPublishData).toBe(false);
  expect(joined.status.members[0].name).toBe("房主");
  expect(joined.status).not.toHaveProperty("secret");
});
it("serializes admissions at eight and keeps stable identities through seat changes", async () => {
  const { voice, host, guests, gateway } = fixture();
  const results = await Promise.allSettled(
    [host, ...guests].map((s) => voice.join(s.room, s.token)),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(8);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  const first = await voice.join(host.room, host.token);
  const members = gateway.rooms
    .get(host.room)!
    .seats.filter((seat) => seat.token)
    .map((seat) => seat.id!);
  gateway.handle(
    {
      type: "game",
      token: host.token,
      setup: {
        config: {
          kind: "sgs",
          humans: 8,
          ai: [],
          team: false,
          training: false,
        },
        members,
        retain: members,
        endCurrent: false,
      },
    },
    host,
  );
  const switched = await voice.join(host.room, host.token);
  expect(switched.identity).toBe(first.identity);
  expect(switched.status.members).toHaveLength(8);
});
it("only lets the host moderate and preserves mute on rejoin without remotely enabling a microphone", async () => {
  const { voice, host, guests, media } = fixture();
  const guest = guests[1];
  const joined = await voice.join(guest.room, guest.token);
  const id = joined.identity;
  await expect(
    voice.moderate(guest.room, guest.token, id, "mute"),
  ).rejects.toThrow("房主");
  await voice.moderate(host.room, host.token, id, "mute");
  const again = await voice.join(guest.room, guest.token);
  expect(again.status.members.find((m) => m.id === id)?.muted).toBe(true);
  const decoded = await new TokenVerifier(config.apiKey, config.secret).verify(
    again.token,
  );
  expect(decoded.video?.canPublish).toBe(false);
  expect(media.permissions).toContainEqual([id, false]);
  await voice.moderate(host.room, host.token, id, "remove");
  await expect(voice.join(guest.room, guest.token)).rejects.toThrow("禁止加入");
});
it("reconciles departed members and expired leases with actual media removal", async () => {
  const { voice, host, guests, gateway, media, advance } = fixture();
  const joined = await voice.join(guests[1].room, guests[1].token);
  gateway.rooms.get(host.room)!.leave(guests[1].token);
  await voice.reconcile(host.room);
  expect(media.removed).toContain(joined.identity);
  const next = await voice.join(guests[2].room, guests[2].token);
  advance();
  await voice.reconcile(host.room);
  expect(media.removed).toContain(next.identity);
  expect(voice.status(host.room, host.token).members).toHaveLength(0);
});

it("keeps unconfigured voice unavailable without disabling the game room", async () => {
  const { gateway, host } = fixture();
  const voice = new VoiceAuthority(gateway, null, null);
  expect(voice.status(host.room, host.token).configured).toBe(false);
  await expect(voice.join(host.room, host.token)).rejects.toThrow("尚未配置");
  expect(gateway.rooms.get(host.room)!.snapshot(host.token).room).toBe(
    host.room,
  );
});
