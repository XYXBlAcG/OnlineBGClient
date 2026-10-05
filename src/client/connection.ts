import { SnapshotReplica } from "../domain/sync";
import { gameCatalogue } from "../domain/catalogue";
import {
  protocolVersion,
  type Command,
  type Response,
} from "../domain/protocol";

export interface Connection {
  send(command: Command): void;
  close(): void;
}

export class LocalConnection implements Connection {
  private worker = new Worker(new URL("./local-worker.ts", import.meta.url), {
    type: "module",
  });

  constructor(receive: (response: Response) => void) {
    this.worker.onmessage = (event) => receive(event.data);
    this.worker.onerror = (event) =>
      receive({ type: "error", message: event.message });
  }

  send(command: Command): void {
    this.worker.postMessage(command);
  }
  close(): void {
    this.worker.terminate();
  }
}

export class NetworkConnection implements Connection {
  private socket: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private pending = new Map<string, Command>();
  private attempts = 0;
  private session?: { room: string; token: string };
  private replica = new SnapshotReplica();
  private action?: {
    id: string;
    started: number;
    acknowledged: boolean;
    latencyMs?: number;
  };

  constructor(
    readonly endpoint: string,
    private initial: Extract<Command, { type: "create" | "join" }>,
    private receive: (response: Response) => void,
    private status: (status: string) => void,
  ) {
    const url = new URL(endpoint);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("服务地址需使用 http 或 https");
    if (initial.type === "join") {
      const saved = localStorage.getItem(`room:${url.origin}:${initial.room}`);
      if (saved) this.initial = { ...initial, token: saved };
    }
    document.addEventListener("visibilitychange", this.resume);
    window.addEventListener("online", this.resume);
    this.connect();
  }

  send(command: Command): void {
    if (command.type === "action") {
      if (this.action) return;
      this.action = {
        id: command.id,
        started: performance.now(),
        acknowledged: false,
      };
      this.receive({ type: "activity", pending: true });
    }
    if (command.type === "action" || command.type === "chat")
      this.pending.set(command.id, command);
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify(command));
    else if (command.type !== "action" && command.type !== "chat")
      this.receive({ type: "error", message: "连接尚未恢复，请稍后操作" });
  }

  close(): void {
    this.stopped = true;
    document.removeEventListener("visibilitychange", this.resume);
    window.removeEventListener("online", this.resume);
    clearTimeout(this.timer);
    this.socket?.close();
  }

  private resume = (): void => {
    if (this.stopped || document.hidden) return;
    if (this.socket?.readyState === WebSocket.OPEN && this.session) {
      this.status("正在恢复");
      this.send({ type: "snapshot", token: this.session.token });
    } else if (this.socket?.readyState !== WebSocket.CONNECTING) {
      clearTimeout(this.timer);
      this.connect();
    }
  };
  private connect(): void {
    this.status(this.attempts ? "重连中" : "连接中");
    const url = new URL("/connect", this.endpoint);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    this.replica = new SnapshotReplica();
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.onopen = () => {
      if (this.stopped || socket !== this.socket) return;
      const command = this.session
        ? { type: "join", ...this.session, name: this.initial.name }
        : this.initial;
      this.socket!.send(JSON.stringify(command));
    };
    socket.onmessage = (event) => {
      if (this.stopped || socket !== this.socket) return;
      let response: Response = JSON.parse(event.data);
      if (response.type === "snapshot" || response.type === "patch") {
        const snapshot = this.replica.apply(response);
        if (!snapshot) {
          if (this.session)
            this.send({ type: "snapshot", token: this.session.token });
          return;
        }
        response = { type: "snapshot", snapshot };
      }
      if (
        response.type === "snapshot" &&
        (response.snapshot.apiVersion !== protocolVersion ||
          response.snapshot.rulesVersion !==
            gameCatalogue[response.snapshot.kind]?.version)
      ) {
        this.close();
        this.status("版本不兼容");
        this.receive({
          type: "error",
          message:
            "房间规则或协议版本不兼容，请更新房主客户端并重启房间服务，参与者刷新页面",
        });
        return;
      }
      if (response.type === "snapshot") this.status("已连接");
      if (response.type === "session") {
        this.session = { room: response.room, token: response.token };
        localStorage.setItem(
          `room:${new URL(this.endpoint).origin}:${response.room}`,
          response.token,
        );
        this.attempts = 0;
        this.status("已连接");
        for (const command of this.pending.values())
          this.socket!.send(JSON.stringify(command));
      }
      if (response.type === "closed" || response.type === "left") {
        if (this.session)
          localStorage.removeItem(
            `room:${new URL(this.endpoint).origin}:${this.session.room}`,
          );
        this.close();
      }
      if (response.type === "ack") {
        this.pending.delete(response.id);
        if (response.id === this.action?.id) {
          this.action.acknowledged = true;
          this.action.latencyMs = Math.round(
            performance.now() - this.action.started,
          );
        }
      }
      if (response.type === "error") {
        if (response.id) this.pending.delete(response.id);
        else this.pending.clear();
        if (this.action && (!response.id || response.id === this.action.id)) {
          this.action = undefined;
          this.receive({ type: "activity", pending: false });
        }
      }
      this.receive(response);
      if (response.type === "snapshot" && this.action?.acknowledged) {
        const latencyMs = this.action.latencyMs;
        this.action = undefined;
        this.receive({ type: "activity", pending: false, latencyMs });
      }
    };
    socket.onclose = (event) => {
      if (this.stopped || socket !== this.socket) return;
      if (event.code === 4001) {
        this.close();
        this.status("身份已在其他窗口恢复");
        return;
      }
      this.status("连接中断，正在恢复");
      this.timer = setTimeout(
        () => this.connect(),
        Math.min(10000, 1000 * 2 ** this.attempts++),
      );
    };
  }
}
