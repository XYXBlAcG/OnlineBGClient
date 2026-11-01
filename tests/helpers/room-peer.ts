import { WebSocket } from "ws";
import type { Response, Snapshot } from "../../src/domain/protocol";
import { SnapshotReplica } from "../../src/domain/sync";
export class Peer {
  readonly socket: WebSocket;
  readonly replica = new SnapshotReplica();
  snapshot: Snapshot | null = null;
  interactions: import("../../src/domain/social").InteractionEvent[] = [];
  session: { room: string; token: string } | undefined;
  private listeners = new Set<() => void>();
  private error = "";
  constructor(url: string) {
    this.socket = new WebSocket(url.replace("http", "ws") + "/connect");
    this.socket.on("message", (raw) => {
      const response = JSON.parse(raw.toString()) as Response;
      if (response.type === "interaction")
        this.interactions.push(response.event);
      if (response.type === "session") this.session = response;
      if (response.type === "snapshot" || response.type === "patch")
        this.snapshot = this.replica.apply(response);
      if (response.type === "error") this.error = response.message;
      for (const callback of this.listeners) callback();
    });
  }
  send(command: unknown) {
    this.socket.send(JSON.stringify(command));
  }
  ready() {
    return new Promise<void>((resolve, reject) => {
      this.socket.once("open", resolve);
      this.socket.once("error", reject);
    });
  }
  wait(predicate: () => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(check);
        reject(new Error("协议响应超时"));
      }, 5000);
      const check = () => {
        if (this.error || predicate()) {
          clearTimeout(timer);
          this.listeners.delete(check);
          if (this.error) reject(new Error(this.error));
          else resolve();
        }
      };
      this.listeners.add(check);
      check();
    });
  }
}
