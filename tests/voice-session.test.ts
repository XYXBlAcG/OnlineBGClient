import { expect, it } from "vitest";
import {
  VoiceSession,
  type VoiceTransport,
  type VoiceTransportEvents,
} from "../src/client/voice/session";
import {
  voicePreferencesSchema,
  type VoiceGrant,
  type VoiceStatus,
} from "../src/domain/voice";
class Transport implements VoiceTransport {
  sends: boolean[] = [];
  closed = false;
  events?: VoiceTransportEvents;
  async connect(_grant: VoiceGrant, events: VoiceTransportEvents) {
    this.events = events;
  }
  async sending(enabled: boolean) {
    this.sends.push(enabled);
  }
  async output() {}
  volume() {}
  deafen() {}
  async playback() {}
  async devices() {
    return [];
  }
  close() {
    this.closed = true;
  }
}
const room = { endpoint: "https://game.test", room: "room", token: "token" };
const status: VoiceStatus = {
  configured: true,
  canManage: true,
  members: [
    { id: "me", name: "甲", joined: true, muted: false, blocked: false },
  ],
};
function fixture() {
  const transports: Transport[] = [];
  let response = status;
  const session = new VoiceSession(
    async (operation) =>
      operation.type === "join"
        ? {
            url: "wss://voice.test",
            token: "signed",
            identity: "me",
            status: response,
          }
        : response,
    () => {
      const t = new Transport();
      transports.push(t);
      return t;
    },
  );
  return {
    session,
    transports,
    setStatus: (s: VoiceStatus) => {
      response = s;
    },
  };
}
it("joins muted without capturing the microphone and disposes exactly once when leaving", async () => {
  const { session, transports } = fixture();
  await session.configure(room, voicePreferencesSchema.parse({}), true);
  await session.command({ type: "join" });
  expect(session.snapshot().phase).toBe("connected");
  expect(transports[0].sends).not.toContain(true);
  await session.command({ type: "mute" });
  expect(transports[0].sends.at(-1)).toBe(true);
  await session.command({ type: "leave" });
  expect(transports[0].closed).toBe(true);
  expect(session.snapshot().muted).toBe(true);
});
it("stops sending on game network loss and does not allow host-muted audio", async () => {
  const { session, transports, setStatus } = fixture();
  const options = voicePreferencesSchema.parse({});
  await session.configure(room, options, true);
  await session.command({ type: "join" });
  await session.command({ type: "mute" });
  await session.configure(room, options, false);
  expect(transports[0].sends.at(-1)).toBe(false);
  setStatus({ ...status, members: [{ ...status.members[0], muted: true }] });
  await session.configure(room, options, true);
  await session.tick();
  await session.command({ type: "mute" });
  expect(transports[0].sends.at(-1)).toBe(false);
  expect(session.snapshot().hostMuted).toBe(true);
  await session.command({ type: "leave" });
});
it("keeps one transport for the same room and restores microphone state after deafen", async () => {
  const { session, transports } = fixture();
  const options = voicePreferencesSchema.parse({});
  await session.configure(room, options, true);
  await session.command({ type: "join" });
  await session.command({ type: "mute" });
  await session.configure({ ...room }, options, true);
  expect(transports).toHaveLength(1);
  await session.command({ type: "deafen" });
  expect(transports[0].sends.at(-1)).toBe(false);
  await session.command({ type: "deafen" });
  expect(transports[0].sends.at(-1)).toBe(true);
  await session.command({ type: "leave" });
});
it("cancels a pending grant without creating an audio transport", async () => {
  let resolve!: (value: VoiceGrant) => void;
  const pending = new Promise<VoiceGrant>((done) => {
    resolve = done;
  });
  let count = 0;
  const session = new VoiceSession(
    async (operation) => (operation.type === "join" ? pending : status),
    () => {
      ++count;
      return new Transport();
    },
  );
  await session.configure(room, voicePreferencesSchema.parse({}), true);
  const joining = session.command({ type: "join" });
  await session.command({ type: "leave" });
  resolve({ url: "wss://voice.test", token: "grant", identity: "me", status });
  await joining;
  expect(count).toBe(0);
  expect(session.snapshot().phase).toBe("idle");
});
it("requires renewed room authorization before resuming a live microphone", async () => {
  const transports: Transport[] = [];
  let release!: (value: VoiceStatus) => void;
  let delay = false;
  const session = new VoiceSession(
    async (operation) => {
      if (operation.type === "join")
        return {
          url: "wss://voice.test",
          token: "grant",
          identity: "me",
          status,
        };
      if (operation.type === "heartbeat" && delay)
        return new Promise<VoiceStatus>((resolve) => {
          release = resolve;
        });
      return status;
    },
    () => {
      const t = new Transport();
      transports.push(t);
      return t;
    },
  );
  const options = voicePreferencesSchema.parse({});
  await session.configure(room, options, true);
  await session.command({ type: "join" });
  await session.command({ type: "mute" });
  await session.configure(room, options, false);
  delay = true;
  const restoring = session.configure(room, options, true);
  await Promise.resolve();
  expect(transports[0].sends.at(-1)).toBe(false);
  expect(release).toBeTypeOf("function");
  release({ ...status, members: [{ ...status.members[0], muted: true }] });
  await restoring;
  expect(transports[0].sends.at(-1)).toBe(false);
  await session.command({ type: "leave" });
});
