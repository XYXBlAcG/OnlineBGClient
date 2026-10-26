import { randomUUID } from "node:crypto";
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
  ServerError,
} from "livekit-server-sdk";
import type { Gateway } from "../domain/gateway";
import { voiceLimit, type VoiceStatus, type VoiceGrant } from "../domain/voice";
export interface VoiceConfig {
  url: string;
  apiKey: string;
  secret: string;
}
export interface VoiceMedia {
  create(room: string): Promise<void>;
  remove(room: string, id: string): Promise<void>;
  allow(room: string, id: string, allowed: boolean): Promise<void>;
  close(room: string): Promise<void>;
}
export class LiveKitMedia implements VoiceMedia {
  private async removeIfPresent(operation: Promise<void>) {
    try {
      await operation;
    } catch (error) {
      if (!(error instanceof ServerError && error.code === "not_found"))
        throw error;
    }
  }
  private readonly client: RoomServiceClient;
  constructor(config: VoiceConfig) {
    this.client = new RoomServiceClient(
      config.url.replace(/^ws/, "http"),
      config.apiKey,
      config.secret,
      { requestTimeout: 5 },
    );
  }
  async create(room: string) {
    await this.client.createRoom({
      name: room,
      maxParticipants: voiceLimit,
      emptyTimeout: 60,
      departureTimeout: 10,
    });
  }
  async remove(room: string, id: string) {
    await this.removeIfPresent(this.client.removeParticipant(room, id));
  }
  async allow(room: string, id: string, allowed: boolean) {
    await this.client.updateParticipant(room, id, {
      permission: {
        canPublish: allowed,
        canSubscribe: true,
        canPublishData: false,
        canPublishSources: [TrackSource.MICROPHONE],
      },
    });
  }
  async close(room: string) {
    await this.removeIfPresent(this.client.deleteRoom(room));
  }
}
interface Channel {
  name: string;
  leases: Map<string, number>;
  policy: Map<string, { muted: boolean; blocked: boolean }>;
  created: boolean;
}
export class VoiceAuthority {
  private readonly channels = new Map<string, Channel>();
  private readonly pending = new Map<string, Promise<unknown>>();
  constructor(
    private readonly gateway: Gateway,
    private readonly config: VoiceConfig | null,
    private readonly media: VoiceMedia | null,
    private readonly now = Date.now,
  ) {}
  private serial<T>(room: string, operation: () => Promise<T>): Promise<T> {
    const prior = this.pending.get(room) ?? Promise.resolve();
    const next = prior.catch(() => {}).then(operation);
    this.pending.set(room, next);
    void next
      .finally(() => {
        if (this.pending.get(room) === next) this.pending.delete(room);
      })
      .catch(() => {});
    return next;
  }
  private member(roomId: string, token: string) {
    const room = this.gateway.rooms.get(roomId);
    if (!room) throw new Error("房间不存在");
    const actor = room.identity(token);
    const member = actor < 0 ? room.host! : room.seats[actor];
    if (!member.online) throw new Error("房间连接已断开，请重新加入");
    return { room, member, id: member.id! };
  }
  status(roomId: string, token: string): VoiceStatus {
    const { room } = this.member(roomId, token),
      channel = this.channels.get(roomId);
    const humans = [
      ...(room.host ? [room.host] : []),
      ...room.seats.filter((s) => !!s.token),
    ];
    return {
      configured: !!this.config,
      canManage: room.canManage(token),
      members: humans
        .filter((m) => channel?.leases.has(m.id!) || channel?.policy.has(m.id!))
        .map((m) => ({
          id: m.id!,
          name: m.name,
          muted: channel?.policy.get(m.id!)?.muted ?? false,
          blocked: channel?.policy.get(m.id!)?.blocked ?? false,
          joined: channel?.leases.has(m.id!) ?? false,
        })),
    };
  }
  join(roomId: string, token: string): Promise<VoiceGrant> {
    return this.serial(roomId, async () => {
      const { id, member } = this.member(roomId, token);
      if (!this.config || !this.media)
        throw new Error(
          "房主尚未配置语音服务，请在房主客户端设置中配置后重启服务",
        );
      let channel = this.channels.get(roomId);
      if (!channel) {
        channel = {
          name: `onlinebg-${randomUUID()}`,
          leases: new Map(),
          policy: new Map(),
          created: false,
        };
        this.channels.set(roomId, channel);
      }
      const policy = channel.policy.get(id);
      if (policy?.blocked) throw new Error("房主已禁止加入语音");
      if (!channel.leases.has(id) && channel.leases.size >= voiceLimit)
        throw new Error("语音频道已满，最多 8 人");
      if (!channel.created || channel.leases.size === 0) {
        await this.media.create(channel.name);
        channel.created = true;
      }
      this.member(roomId, token);
      const access = new AccessToken(this.config.apiKey, this.config.secret, {
        identity: id,
        name: member.name,
        ttl: 30,
      });
      access.addGrant({
        roomJoin: true,
        room: channel.name,
        canPublish: !policy?.muted,
        canSubscribe: true,
        canPublishData: false,
        canPublishSources: [TrackSource.MICROPHONE],
        canUpdateOwnMetadata: false,
      });
      const jwt = await access.toJwt();
      channel.leases.set(id, this.now());
      return {
        url: this.config.url,
        token: jwt,
        identity: id,
        status: this.status(roomId, token),
      };
    });
  }
  heartbeat(roomId: string, token: string): VoiceStatus {
    const { id } = this.member(roomId, token),
      channel = this.channels.get(roomId);
    if (!channel?.leases.has(id) || channel.policy.get(id)?.blocked)
      throw new Error("语音会话已结束，请重新加入");
    channel.leases.set(id, this.now());
    return this.status(roomId, token);
  }
  leave(roomId: string, token: string) {
    return this.serial(roomId, async () => {
      const { id } = this.member(roomId, token);
      await this.remove(roomId, id);
      return this.status(roomId, token);
    });
  }
  moderate(
    roomId: string,
    token: string,
    id: string,
    operation: "mute" | "allow" | "remove" | "admit",
  ) {
    return this.serial(roomId, async () => {
      const { room } = this.member(roomId, token),
        channel = this.channels.get(roomId);
      if (!room.canManage(token)) throw new Error("只有房主可以管理语音");
      if (!channel) throw new Error("语音频道尚未创建");
      if (!this.status(roomId, token).members.some((m) => m.id === id))
        throw new Error("语音成员已离开");
      const policy = channel.policy.get(id) ?? { muted: false, blocked: false };
      if (operation === "mute" || operation === "allow") {
        const muted = operation === "mute";
        if (channel.leases.has(id))
          await this.media!.allow(channel.name, id, !muted);
        channel.policy.set(id, { ...policy, muted });
      } else {
        channel.policy.set(id, { ...policy, blocked: operation === "remove" });
        if (operation === "remove") await this.remove(roomId, id);
      }
      return this.status(roomId, token);
    });
  }
  private async remove(roomId: string, id: string) {
    const channel = this.channels.get(roomId);
    if (!channel?.leases.has(id)) return;
    await this.media!.remove(channel.name, id);
    channel.leases.delete(id);
  }
  reconcile(roomId: string) {
    return this.serial(roomId, async () => {
      const channel = this.channels.get(roomId);
      if (!channel) return;
      const room = this.gateway.rooms.get(roomId);
      if (!room) {
        if (channel.created) await this.media!.close(channel.name);
        this.channels.delete(roomId);
        return;
      }
      const online = new Set([
        ...(room.host?.online ? [room.host.id] : []),
        ...room.seats.filter((s) => s.token && s.online).map((s) => s.id!),
      ]);
      for (const [id, time] of channel.leases)
        if (
          !online.has(id) ||
          this.now() - time > 12000 ||
          channel.policy.get(id)?.blocked
        )
          await this.remove(roomId, id);
      const identities = new Set([
        ...(room.host ? [room.host.id] : []),
        ...room.seats.filter((s) => s.token).map((s) => s.id!),
      ]);
      for (const id of channel.policy.keys())
        if (!identities.has(id)) channel.policy.delete(id);
    });
  }
  async reconcileAll() {
    await Promise.all(
      [...this.channels.keys()].map((id) => this.reconcile(id)),
    );
  }
}
