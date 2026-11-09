import { describe, expect, it, vi } from "vitest";
import {
  NativeVoiceTransport,
  type NativeVoiceBridge,
  type NativeVoiceEvent,
} from "../src/client/voice/native-transport";
import type { VoiceGrant, VoiceStatus } from "../src/domain/voice";

function bridge() {
  const channel = {
    onmessage: null as ((event: NativeVoiceEvent) => void) | null,
  };
  const invoke = vi.fn(async (command: string) => {
    if (command === "voice_native_connect") return undefined;
    return undefined;
  });
  return {
    channel: channel as {
      onmessage: ((event: NativeVoiceEvent) => void) | null;
    },
    invoke,
    bridge: {
      channel: () => channel,
      invoke,
    } as NativeVoiceBridge,
  };
}

const status: VoiceStatus = { configured: true, canManage: false, members: [] };
const grant: VoiceGrant = {
  url: "wss://voice.example",
  token: "token",
  identity: "me",
  status,
};

function events() {
  return {
    members: vi.fn(),
    phase: vi.fn(),
    playback: vi.fn(),
    permission: vi.fn(),
    deviceLost: vi.fn(),
    processingError: vi.fn(),
  };
}

describe("NativeVoiceTransport", () => {
  it("passes the native channel and forwards room events", async () => {
    const fake = bridge();
    const transport = new NativeVoiceTransport(fake.bridge);
    const listeners = events();

    await transport.connect(grant, listeners);
    expect(fake.invoke).toHaveBeenCalledWith("voice_native_connect", {
      url: grant.url,
      token: grant.token,
      muted: true,
      onEvent: fake.channel,
    });

    fake.channel.onmessage?.({ type: "phase", phase: "connected" });
    expect(listeners.phase).toHaveBeenCalledWith("connected", undefined);

    fake.channel.onmessage?.({
      type: "members",
      members: [{ id: "me", speaking: true, level: 0.4 }],
    });
    expect(listeners.members).toHaveBeenCalledWith([
      { id: "me", speaking: true, level: 0.4 },
    ]);

    fake.channel.onmessage?.({ type: "permission", muted: true });
    expect(listeners.permission).toHaveBeenCalledWith(true);

    fake.channel.onmessage?.({ type: "playback", blocked: true });
    expect(listeners.playback).toHaveBeenCalledWith(true);

    fake.channel.onmessage?.({ type: "deviceLost" });
    expect(listeners.deviceLost).toHaveBeenCalled();

    fake.channel.onmessage?.({ type: "processingError", message: "no mic" });
    expect(listeners.processingError).toHaveBeenCalledWith("no mic");
  });

  it("drives microphone, deafen, volume, playback and disconnect through native commands", async () => {
    const fake = bridge();
    const transport = new NativeVoiceTransport(fake.bridge);

    await transport.sending(true, "default");
    expect(fake.invoke).toHaveBeenCalledWith("voice_native_set_microphone", {
      enabled: true,
    });

    transport.volume("friend", 0.5);
    expect(fake.invoke).toHaveBeenCalledWith("voice_native_set_volume", {
      participant: "friend",
      volume: 0.5,
    });

    transport.deafen(true);
    expect(fake.invoke).toHaveBeenCalledWith("voice_native_set_deafened", {
      enabled: true,
    });

    await transport.playback();
    expect(fake.invoke).toHaveBeenCalledWith("voice_native_playback", {});

    transport.close();
    expect(fake.invoke).toHaveBeenCalledWith("voice_native_disconnect", {});
  });

  it("stops forwarding native events after close", async () => {
    const fake = bridge();
    const transport = new NativeVoiceTransport(fake.bridge);
    const listeners = events();
    await transport.connect(grant, listeners);
    transport.close();
    expect(fake.channel.onmessage).toBeNull();
    expect(listeners.phase).not.toHaveBeenCalled();
  });
});
