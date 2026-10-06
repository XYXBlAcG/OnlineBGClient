import searchWorkerUrl from "./search-worker?worker&url";
import {
  computeDiagnostic,
  type ComputeStage,
} from "../domain/compute-diagnostics";
import type { SearchHostFailure, SearchHostRequest } from "./compute-ports";

export class WindowComputeHost {
  private workers = new Map<number, Worker>();
  constructor(private report: (failure: SearchHostFailure) => void) {}
  handle(message: SearchHostRequest): void {
    const { id } = message;
    if (message.type === "search-close") {
      this.workers.get(id)?.terminate();
      this.workers.delete(id);
      return;
    }
    const script = new URL(searchWorkerUrl, import.meta.url);
    let stage: ComputeStage = "load";
    try {
      const worker = new Worker(script, { type: "module" });
      this.workers.set(id, worker);
      let ready = false;
      worker.onmessage = () => {
        ready = true;
      };
      worker.onerror = (event) => {
        event.preventDefault();
        this.report({
          type: "search-error",
          id,
          diagnostic: computeDiagnostic(
            ready ? "execute" : event.error ? "initialize" : "load",
            event.error || new Error(event.message),
            { workerId: id, script: script.pathname },
          ),
        });
      };
      worker.onmessageerror = () =>
        this.report({
          type: "search-error",
          id,
          diagnostic: computeDiagnostic(
            "transfer",
            "计算线程握手消息无法解码",
            { workerId: id, script: script.pathname },
          ),
        });
      stage = "transfer";
      worker.postMessage({ type: "connect", port: message.port }, [
        message.port,
      ]);
    } catch (error) {
      this.workers.get(id)?.terminate();
      this.workers.delete(id);
      message.port.close();
      this.report({
        type: "search-error",
        id,
        diagnostic: computeDiagnostic(stage, error, {
          workerId: id,
          script: script.pathname,
        }),
      });
    }
  }
  close(): void {
    for (const worker of this.workers.values()) worker.terminate();
    this.workers.clear();
  }
}
