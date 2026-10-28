import type { VoiceEffect } from "../../domain/voice-effects";
import { canSelectOutput } from "./audio-output";
import { voiceError } from "./errors";
import { MicrophoneProbe } from "./probe";
import {
  initialVoice,
  voicePreferencesSchema,
  type VoiceGrant,
  type VoiceIntent,
  type VoiceOperation,
  type VoicePreferences,
  type VoiceRoom,
  type VoiceStatus,
  type VoiceView,
} from "../../domain/voice";
export interface VoiceTransportEvents {
  members: (
    members: { id: string; speaking: boolean; level: number }[],
  ) => void;
  phase: (
    phase: "connected" | "reconnecting" | "error",
    message?: string,
  ) => void;
  playback: (blocked: boolean) => void;
  permission: (muted: boolean) => void;
  deviceLost: () => void;
  processingError?: (message: string) => void;
}
export interface VoiceTransport {
  connect(grant: VoiceGrant, events: VoiceTransportEvents): Promise<void>;
  sending(enabled: boolean, input: string, effect?: VoiceEffect): Promise<void>;
  output(id: string): Promise<void>;
  volume(id: string, value: number): void;
  deafen(enabled: boolean): void;
  playback(): Promise<void>;
  close(): void;
}
export class VoiceSession {
  private readonly probe = new MicrophoneProbe();
  private view: VoiceView = { ...initialVoice };
  private listeners = new Set<() => void>();
  private room: VoiceRoom | null = null;
  private options: VoicePreferences = voicePreferencesSchema.parse({});
  private transport: VoiceTransport | null = null;
  private epoch = 0;
  private online = false;
  private verified = false;
  private pressed = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private heartbeatPending = false;
  private sendQueue = Promise.resolve();
  private readonly volumes = new Map<string, number>();
  constructor(
    private readonly request: (
      operation: VoiceOperation,
      room: VoiceRoom,
    ) => Promise<VoiceStatus | VoiceGrant>,
    private readonly create: () => VoiceTransport | Promise<VoiceTransport>,
  ) {}
  snapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<VoiceView>) {
    this.view = { ...this.view, ...patch };
    for (const listener of this.listeners) listener();
  }
  private status(status: VoiceStatus) {
    const muted =
      status.members.find((m) => m.id === this.view.identity)?.muted ?? false;
    this.update({
      configured: status.configured,
      canManage: status.canManage,
      hostMuted: muted,
      ...(muted ? { muted: true } : {}),
      members: status.members.map((m) => ({
        ...m,
        speaking:
          this.view.members.find((p) => p.id === m.id)?.speaking ?? false,
        level: 0,
        volume: this.volumes.get(m.id) ?? 1,
      })),
    });
  }
  async configure(
    room: VoiceRoom | null,
    options: VoicePreferences,
    online: boolean,
  ) {
    const changed =
      room?.room !== this.room?.room ||
      room?.token !== this.room?.token ||
      room?.endpoint !== this.room?.endpoint;
    const resumed = online && !this.online;
    const oldOptions = this.options;
    this.options = options;
    this.online = online;
    if (!online) this.verified = false;
    if (changed) {
      const leaving = this.leave();
      const epoch = this.epoch;
      this.room = room;
      this.update({ ...initialVoice, phase: room ? "idle" : "unavailable" });
      await leaving;
      if (epoch !== this.epoch) return;
    }
    this.update({ effect: options.effect });
    if (oldOptions.input !== options.input && this.view.testing) {
      this.probe.stop();
      this.update({ testing: false, inputLevel: 0 });
    }
    if (
      this.view.testing &&
      JSON.stringify(oldOptions.effect) !== JSON.stringify(options.effect)
    )
      await this.probe.effect(options.effect);
    if (this.view.testing && oldOptions.output !== options.output)
      await this.probe
        .output(options.output)
        .catch(() =>
          this.update({ error: "无法切换试听输出，请选择系统默认输出。" }),
        );
    if (!room) return;
    if ((changed || !this.view.configured) && online) {
      const epoch = this.epoch;
      try {
        const status = await this.request({ type: "status" }, room);
        if (epoch === this.epoch && !("token" in status)) this.status(status);
      } catch (error) {
        if (epoch === this.epoch) this.update({ error: voiceError(error) });
      }
    }
    if (resumed && this.transport) {
      this.verified = false;
      const epoch = this.epoch;
      try {
        const status = await this.request({ type: "heartbeat" }, room);
        if (epoch !== this.epoch) return;
        if (!("token" in status)) this.status(status);
        this.verified = true;
      } catch (error) {
        if (epoch === this.epoch) {
          await this.leave();
          this.update({ phase: "error", error: voiceError(error) });
        }
        return;
      }
    }
    if (this.transport && oldOptions.input !== options.input)
      this.update({
        muted: true,
        error: "输入设备已更改，请确认后重新开启麦克风",
      });
    if (this.transport && oldOptions.output !== options.output)
      await this.transport
        .output(options.output)
        .catch(() =>
          this.update({
            error: "无法切换到所选扬声器，请选择系统默认输出；通话保持连接。",
          }),
        );
    this.applyVolumes();
    if (!online) this.pressed = false;
    await this.sending();
  }
  private applyVolumes() {
    for (const member of this.view.members)
      this.transport?.volume(
        member.id,
        (this.volumes.get(member.id) ?? 1) * this.options.volume,
      );
  }
  private sending() {
    const transport = this.transport,
      epoch = this.epoch;
    const enabled =
      this.view.phase === "connected" &&
      this.online &&
      this.verified &&
      !this.view.muted &&
      !this.view.deafened &&
      !this.view.hostMuted &&
      (this.options.mode === "open" || this.pressed);
    this.sendQueue = this.sendQueue
      .catch(() => {})
      .then(async () => {
        if (transport && transport === this.transport && epoch === this.epoch)
          await transport.sending(
            enabled,
            this.options.input,
            this.options.effect,
          );
      });
    return this.sendQueue;
  }
  async tick() {
    if (
      this.heartbeatPending ||
      !this.room ||
      !this.transport ||
      !this.online ||
      !["connected", "reconnecting"].includes(this.view.phase)
    )
      return;
    this.heartbeatPending = true;
    const epoch = this.epoch;
    try {
      const response = await this.request({ type: "heartbeat" }, this.room);
      if (epoch !== this.epoch) return;
      if (!("token" in response)) this.status(response);
      await this.sending();
    } catch (error) {
      if (epoch === this.epoch) {
        await this.leave();
        this.update({ phase: "error", error: voiceError(error) });
      }
    } finally {
      this.heartbeatPending = false;
    }
  }
  private async join() {
    if (!this.room || !this.online) throw new Error("请先连接一个联机房间");
    if (["connecting", "connected", "reconnecting"].includes(this.view.phase))
      return;
    this.probe.stop();
    this.update({ testing: false, inputLevel: 0 });
    const epoch = ++this.epoch,
      room = this.room;
    this.update({
      phase: "connecting",
      error: "",
      muted: true,
      deafened: false,
    });
    try {
      const grant = await this.request({ type: "join" }, room);
      if (!("token" in grant)) throw new Error("房主返回的语音授权格式无效");
      if (epoch !== this.epoch) return;
      const transport = await this.create();
      if (epoch !== this.epoch) {
        transport.close();
        return;
      }
      this.transport = transport;
      this.verified = true;
      this.update({ identity: grant.identity });
      this.status(grant.status);
      await transport.connect(grant, {
        members: (members) => {
          if (epoch === this.epoch)
            this.update({
              members: this.view.members.map((m) => ({
                ...m,
                ...members.find((p) => p.id === m.id),
              })),
            });
        },
        phase: (phase, message) => {
          if (epoch !== this.epoch) return;
          if (phase === "error") {
            void this.leave().then(() =>
              this.update({
                phase: "error",
                error: message || "语音连接已断开，请重新加入",
              }),
            );
          } else {
            this.update({ phase });
            void this.sending().catch((error) => this.fail(error));
          }
        },
        playback: (blocked) => {
          if (epoch === this.epoch) this.update({ playbackBlocked: blocked });
        },
        processingError: (message) => {
          if (epoch === this.epoch) this.fail(new Error(message));
        },
        deviceLost: () => {
          if (epoch === this.epoch)
            this.fail(new Error("麦克风已断开，请选择设备后重新开麦"));
        },
        permission: (muted) => {
          if (epoch === this.epoch && muted) {
            this.update({ hostMuted: true, muted: true });
            void this.sending().catch((error) => this.fail(error));
          }
        },
      });
      if (epoch !== this.epoch) {
        transport.close();
        return;
      }
      await transport
        .output(this.options.output)
        .catch(() =>
          this.update({
            error: "无法切换到所选扬声器，请选择系统默认输出；通话保持连接。",
          }),
        );
      if (epoch !== this.epoch) {
        transport.close();
        return;
      }
      this.applyVolumes();
      this.update({ phase: "connected" });
      this.timer = setInterval(() => {
        void this.tick();
      }, 4000);
    } catch (error) {
      if (epoch === this.epoch) {
        await this.leave();
        this.update({ phase: "error", error: voiceError(error) });
      }
    }
  }
  async leave() {
    const previous = this.room,
      wasJoined = !!this.transport || this.view.phase === "connecting";
    ++this.epoch;
    this.verified = false;
    this.probe.stop();
    this.update({ testing: false, inputLevel: 0 });
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const transport = this.transport;
    this.transport = null;
    transport?.close();
    this.pressed = false;
    this.update({
      phase: previous ? "idle" : "unavailable",
      muted: true,
      deafened: false,
      members: [],
      hostMuted: false,
      identity: "",
      playbackBlocked: false,
    });
    if (previous && wasJoined)
      await this.request({ type: "leave" }, previous).catch(() => {});
  }
  fail(error: unknown) {
    this.update({
      muted: true,
      error: voiceError(error),
    });
    void this.sending().catch(() => {});
  }
  async command(intent: VoiceIntent) {
    try {
      if (intent.type === "test") {
        if (intent.enabled) {
          if (this.transport) throw new Error("请先退出语音，再单独测试麦克风");
          const started = await this.probe.start(
            this.options.input,
            intent.loopback,
            (level) => this.update({ inputLevel: level }),
            this.options.effect,
            this.options.output,
            (error) =>
              this.update({
                testing: false,
                inputLevel: 0,
                error: voiceError(error),
              }),
          );
          if (started) this.update({ testing: true, error: "" });
        } else {
          this.probe.stop();
          this.update({ testing: false, inputLevel: 0 });
        }
      }
      if (intent.type === "join") await this.join();
      if (intent.type === "leave") await this.leave();
      if (intent.type === "mute") {
        this.update({
          muted: this.view.hostMuted ? true : !this.view.muted,
          error: "",
        });
        await this.sending();
      }
      if (intent.type === "deafen") {
        this.update({ deafened: !this.view.deafened });
        this.transport?.deafen(this.view.deafened);
        await this.sending();
      }
      if (intent.type === "push") {
        this.pressed = intent.pressed;
        await this.sending();
      }
      if (intent.type === "volume") {
        this.volumes.set(intent.target, intent.volume);
        this.update({
          members: this.view.members.map((m) =>
            m.id === intent.target ? { ...m, volume: intent.volume } : m,
          ),
        });
        this.applyVolumes();
      }
      if (intent.type === "playback") await this.transport?.playback();
      if (intent.type === "moderate" && this.room) {
        const status = await this.request(intent, this.room);
        if (!("token" in status)) this.status(status);
        await this.sending();
      }
      if (intent.type === "devices") {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (
          this.transport &&
          this.options.input !== "default" &&
          !devices.some(
            (device) =>
              device.kind === "audioinput" &&
              device.deviceId === this.options.input,
          )
        )
          this.fail(new Error("所选麦克风已断开，请选择设备后重新开麦"));
        this.update({
          devices: devices
            .filter((d) => d.kind === "audioinput" || d.kind === "audiooutput")
            .map((d) => ({
              id: d.deviceId || "default",
              name: d.label || "系统音频设备（授权后显示名称）",
              kind: d.kind as "audioinput" | "audiooutput",
            })),
          outputSupported: canSelectOutput(),
        });
      }
    } catch (error) {
      this.fail(error);
    }
  }
}
