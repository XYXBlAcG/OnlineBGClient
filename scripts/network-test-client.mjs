import { SnapshotReplica } from "../src/domain/sync.ts";
import WebSocket from "ws";
import assert from "node:assert/strict";
export class NetworkTestClient {
  messages = [];
  replica = new SnapshotReplica();
  waiters = new Set();
  constructor(endpoint) {
    const url = new URL("/connect", endpoint);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    this.socket = new WebSocket(url);
    this.socket.on("message", (message) => {
      let value = JSON.parse(message.toString());
      if (value.type === "snapshot" || value.type === "patch") {
        const snapshot = this.replica.apply(value);
        assert.ok(snapshot);
        value = { type: "snapshot", snapshot };
      }
      this.messages.push(value);
      for (const waiter of this.waiters) waiter(value);
    });
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.socket.once("open", resolve);
      this.socket.once("error", reject);
    });
  }
  send(command) {
    this.socket.send(JSON.stringify(command));
  }
  async wait(predicate, after = 0) {
    const latest = this.messages.slice(after).findLast(predicate);
    if (latest) return latest;
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.delete(waiter);
        reject(new Error("Timed out waiting for server response"));
      }, 15000);
      const waiter = (value) => {
        if (predicate(value)) {
          clearTimeout(timer);
          this.waiters.delete(waiter);
          resolve(value);
        }
      };
      this.waiters.add(waiter);
    });
  }
  close() {
    this.socket.close();
  }
}
