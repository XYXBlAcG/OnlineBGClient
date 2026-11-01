import { invoke, isTauri, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
export interface EmojiStatus {
  revision: number;
  supported: boolean;
  installed: boolean;
  enabled: boolean;
  phase: string;
  progress: number;
  error?: string | null;
  assetVersion?: string | null;
}
export class EmojiRegistry {
  private listeners = new Set<() => void>();
  private packListeners = new Set<() => void>();
  private packRevision = 0;
  private codes = new Set<string>();
  private base = "";
  private suffix = "";
  private value: EmojiStatus = {
    revision: 0,
    supported: false,
    installed: false,
    enabled: false,
    phase: "",
    progress: 0,
  };
  private revision = 0;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  snapshot = () => this.value;
  packSnapshot = () => this.packRevision;
  subscribePack = (listener: () => void) => {
    this.packListeners.add(listener);
    return () => this.packListeners.delete(listener);
  };
  configure(base: string, codes: string[], suffix = ""): void {
    const next = new Set(codes.filter((code) => /^[0-9a-f-]+$/u.test(code)));
    if (
      this.base === base &&
      this.suffix === suffix &&
      next.size === this.codes.size &&
      [...next].every((code) => this.codes.has(code))
    )
      return;
    this.base = base;
    this.suffix = suffix;
    this.codes = next;
    this.packRevision++;
    this.packListeners.forEach((listener) => listener());
  }
  unavailable(url: string): void {
    const code = url
      .split("/")
      .at(-1)
      ?.split("?")[0]
      .replace(/\.png$/u, "");
    if (code && this.codes.delete(code)) {
      this.packRevision++;
      this.packListeners.forEach((listener) => listener());
    }
  }
  url(code: string): string | undefined {
    return this.codes.has(code)
      ? `${this.base}${code}.png${this.suffix}`
      : undefined;
  }
  async accept(status: EmojiStatus): Promise<void> {
    if (status.revision < this.value.revision) return;
    const revision = ++this.revision;
    this.value = status;
    this.listeners.forEach((listener) => listener());
    if (!status.supported || !status.enabled || !status.installed) {
      this.configure("", []);
      return;
    }
    if (status.phase === "downloading") return;
    try {
      const url = convertFileSrc("index.json", "emoji");
      const response = await fetch(url);
      if (!response.ok) throw Error("表情资源不可用");
      const index = (await response.json()) as { codes: unknown };
      if (
        !Array.isArray(index.codes) ||
        !index.codes.every((code) => typeof code === "string")
      )
        throw Error("表情清单无效");
      if (revision === this.revision)
        this.configure(
          url.slice(0, -"index.json".length),
          index.codes,
          status.assetVersion
            ? `?v=${encodeURIComponent(status.assetVersion)}`
            : "",
        );
    } catch (error) {
      if (revision === this.revision) {
        this.configure("", []);
        this.value = { ...status, error: String(error) };
        this.listeners.forEach((listener) => listener());
      }
    }
  }
}
export const emojiRegistry = new EmojiRegistry();
export function startEmojiClient(): () => void {
  if (!isTauri()) return () => {};
  let active = true;
  const subscription = listen<EmojiStatus>("emoji-state", (event) => {
    if (active) void emojiRegistry.accept(event.payload);
  });
  void subscription
    .then(async (stop) => {
      if (!active) {
        stop();
        return;
      }
      const state = await invoke<EmojiStatus>("emoji_status");
      if (active) await emojiRegistry.accept(state);
    })
    .catch(console.error);
  return () => {
    active = false;
    void subscription.then((stop) => stop()).catch(console.error);
  };
}
