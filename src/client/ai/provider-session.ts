import type { Connection } from "../connection";
import type { Response } from "../../domain/protocol";
import {
  aiProviderNeedsKey,
  type AiProviderSettings,
} from "../../domain/companion";
import { aiProviderScope } from "../../domain/ai-provider";
import {
  clearAiApiKey,
  loadAiApiKey,
  loadAiProvider,
  migrateAiCredentials,
  saveAiApiKey,
  saveAiProvider,
  type AiConfig,
} from "../ai-config";

export interface AiHostContext {
  connection: Connection | null;
  session: { room: string; token: string } | null;
  canManage: boolean;
  trusted: boolean;
}
interface CredentialPort {
  migrate(): Promise<void>;
  load(provider: AiProviderSettings): Promise<string>;
  save(key: string, provider: AiProviderSettings): Promise<void>;
  clear(provider: AiProviderSettings): Promise<void>;
  provider(): AiProviderSettings | null;
  saveProvider(provider: AiProviderSettings): void;
}
interface Pending {
  resolve(message: string): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}
const credentials: CredentialPort = {
  migrate: migrateAiCredentials,
  load: loadAiApiKey,
  save: saveAiApiKey,
  clear: clearAiApiKey,
  provider: loadAiProvider,
  saveProvider: saveAiProvider,
};

export class AiProviderSession {
  private pending = new Map<string, Pending>();
  private synced = "";
  constructor(
    private context: () => AiHostContext,
    private keys: CredentialPort = credentials,
  ) {}

  async save(config: AiConfig): Promise<string> {
    const host = this.context();
    await this.keys.migrate();
    if (config.apiKey.trim())
      await this.keys.save(config.apiKey, config.provider);
    this.keys.saveProvider(config.provider);
    if (!host.trusted || !host.canManage || !host.connection || !host.session)
      return "已保存在本机，创建本机联机房间时生效。";
    if (!this.current(host)) return "配置已保存在本机；房间连接已更改。";
    const key = config.apiKey.trim() || (await this.keys.load(config.provider));
    if (!this.current(host))
      throw new Error("房间连接已更改，配置已保存在本机");
    return this.request(host, "ai-config", config.provider, key);
  }

  async test(config: AiConfig): Promise<string> {
    const host = this.requireHost();
    const key = config.apiKey.trim() || (await this.keys.load(config.provider));
    if (!this.current(host)) throw new Error("房间连接已更改");
    if (aiProviderNeedsKey(config.provider.format) && !key)
      throw new Error("请填写 API Key");
    return this.request(host, "ai-test", config.provider, key);
  }

  async clear(provider: AiProviderSettings): Promise<string> {
    const host = this.context();
    await this.keys.migrate();
    await this.keys.clear(provider);
    if (this.current(host) && host.connection && host.session)
      return this.request(host, "ai-clear", provider, "");
    return "已清除该接口的本机密钥。";
  }

  async sync(): Promise<void> {
    const host = this.context();
    if (!host.trusted || !host.canManage || !host.connection || !host.session)
      return;
    const provider = this.keys.provider();
    if (!provider?.model) return;
    const identity = `${host.session.room}:${host.session.token}:${aiProviderScope(provider)}`;
    if (this.synced === identity) return;
    this.synced = identity;
    try {
      await this.keys.migrate();
      if (!this.current(host)) return;
      const key = await this.keys.load(provider);
      if (!this.current(host)) return;
      if (aiProviderNeedsKey(provider.format) && !key) return;
      await this.request(host, "ai-config", provider, key);
    } catch (error) {
      this.synced = "";
      if (this.current(host)) throw error;
    }
  }

  receive(response: Response): boolean {
    if (
      response.type === "error" &&
      response.id &&
      this.pending.has(response.id)
    ) {
      const pending = this.pending.get(response.id)!;
      this.pending.delete(response.id);
      clearTimeout(pending.timer);
      pending.reject(new Error(response.message));
      return true;
    }
    if (response.type !== "ai-test" && response.type !== "ai-status")
      return false;
    const pending = this.pending.get(response.requestId);
    if (pending) {
      this.pending.delete(response.requestId);
      clearTimeout(pending.timer);
      if (response.ok) pending.resolve(response.message);
      else pending.reject(new Error(response.message));
    }
    return true;
  }

  reset(): void {
    this.synced = "";
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error("房间连接已断开"));
    }
    this.pending.clear();
  }

  private current(host: AiHostContext): boolean {
    const current = this.context();
    return (
      current.trusted &&
      current.canManage &&
      current.connection === host.connection &&
      current.session?.room === host.session?.room &&
      current.session?.token === host.session?.token
    );
  }

  private requireHost(): AiHostContext {
    const host = this.context();
    if (!host.connection || !host.session || !host.canManage || !host.trusted)
      throw new Error(
        "请先创建本机联机房间；本地对局使用搜索 AI，远程房间不接收本机密钥",
      );
    return host;
  }

  private request(
    host: AiHostContext,
    type: "ai-config" | "ai-test" | "ai-clear",
    provider: AiProviderSettings,
    apiKey: string,
  ): Promise<string> {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("AI 服务响应超时"));
      }, provider.timeoutMs + 5000);
      this.pending.set(requestId, { resolve, reject, timer });
      try {
        if (type === "ai-clear")
          host.connection!.send({
            type,
            token: host.session!.token,
            requestId,
          });
        else
          host.connection!.send({
            type,
            id: requestId,
            token: host.session!.token,
            requestId,
            provider,
            apiKey,
          });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(error);
      }
    });
  }
}
