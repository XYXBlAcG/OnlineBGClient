import { Channel, invoke } from "@tauri-apps/api/core";
import type { VoiceGrant } from "../../domain/voice";
import type { VoiceTransport, VoiceTransportEvents } from "./session";

export type NativeVoiceEvent =
  | {
      type: "phase";
      phase: "connected" | "reconnecting" | "error";
      message?: string;
    }
  | {
      type: "members";
      members: { id: string; speaking: boolean; level: number }[];
    }
  | { type: "permission"; muted: boolean }
  | { type: "playback"; blocked: boolean }
  | { type: "deviceLost" }
  | { type: "processingError"; message: string };

export interface NativeVoiceChannel {
  onmessage: ((event: NativeVoiceEvent) => void) | null;
}

export interface NativeVoiceBridge {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  channel(): NativeVoiceChannel;
}

const tauriBridge: NativeVoiceBridge = {
  invoke: (command, args) => invoke(command, args),
  channel: () => new Channel<NativeVoiceEvent>(),
};

export class NativeVoiceTransport implements VoiceTransport {
  private readonly channel: NativeVoiceChannel;
  private events: VoiceTransportEvents | undefined;
  private closed = false;

  constructor(private readonly bridge: NativeVoiceBridge = tauriBridge) {
    this.channel = bridge.channel();
  }

  async connect(
    grant: VoiceGrant,
    events: VoiceTransportEvents,
  ): Promise<void> {
    this.closed = false;
    this.events = events;
    this.channel.onmessage = (event) => this.receive(event);
    await this.bridge.invoke("voice_native_connect", {
      url: grant.url,
      token: grant.token,
      muted: true,
      onEvent: this.channel,
    });
  }

  async sending(
    enabled: boolean,
    _input?: string,
    _effect?: unknown,
  ): Promise<void> {
    if (this.closed) return;
    await this.bridge.invoke("voice_native_set_microphone", { enabled });
  }

  output(): Promise<void> {
    return Promise.resolve();
  }

  volume(participant: string, volume: number): void {
    if (this.closed) return;
    void this.bridge.invoke("voice_native_set_volume", {
      participant,
      volume,
    });
  }

  deafen(enabled: boolean): void {
    if (this.closed) return;
    void this.bridge.invoke("voice_native_set_deafened", { enabled });
  }

  async playback(): Promise<void> {
    if (this.closed) return;
    await this.bridge.invoke("voice_native_playback", {});
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.channel.onmessage = null;
    void this.bridge.invoke("voice_native_disconnect", {});
  }

  private receive(event: NativeVoiceEvent) {
    if (this.closed) return;
    const events = this.events;
    if (!events) return;
    if (event.type === "phase") events.phase(event.phase, event.message);
    else if (event.type === "members") events.members(event.members);
    else if (event.type === "permission") events.permission(event.muted);
    else if (event.type === "playback") events.playback(event.blocked);
    else if (event.type === "deviceLost") events.deviceLost();
    else events.processingError?.(event.message);
  }
}
