import type {
  ComputeInput,
  ComputeOutput,
  ComputePort,
} from "../domain/compute";
import {
  ComputeFailure,
  computeDiagnostic,
  type ComputeDiagnostic,
} from "../domain/compute-diagnostics";

export type SearchHostRequest =
  | { type: "search-open"; id: number; port: MessagePort }
  | { type: "search-close"; id: number };
export type SearchHostFailure = {
  type: "search-error";
  id: number;
  diagnostic: ComputeDiagnostic;
};
export type SearchMessage = ComputeOutput | { type: "ready" };

export class RemoteComputePorts {
  private sequence = 0;
  private failures = new Map<number, (diagnostic: ComputeDiagnostic) => void>();
  constructor(
    private host: (
      message: SearchHostRequest,
      transfer?: Transferable[],
    ) => void,
    private channel = () => new MessageChannel(),
  ) {}
  create(): ComputePort {
    const id = ++this.sequence;
    const { port1, port2 } = this.channel();
    let receive: ((output: ComputeOutput) => void) | undefined;
    let report: ((error: Error) => void) | undefined;
    let closed = false;
    const timeout = setTimeout(
      () =>
        this.fail(
          id,
          computeDiagnostic("initialize", "15 秒内未收到线程就绪确认", {
            workerId: id,
          }),
        ),
      15000,
    );
    this.failures.set(id, (diagnostic) => {
      clearTimeout(timeout);
      report?.(new ComputeFailure(diagnostic));
    });
    port1.onmessage = (event: MessageEvent<SearchMessage>) => {
      if ("type" in event.data) clearTimeout(timeout);
      else receive?.(event.data);
    };
    port1.onmessageerror = () =>
      this.fail(
        id,
        computeDiagnostic("transfer", "无法解码计算结果", { workerId: id }),
      );
    try {
      this.host({ type: "search-open", id, port: port2 }, [port2]);
    } catch (error) {
      clearTimeout(timeout);
      this.failures.delete(id);
      port1.close();
      port2.close();
      throw new ComputeFailure(
        computeDiagnostic("transfer", error, { workerId: id }),
      );
    }
    return {
      send: (input: ComputeInput) => {
        try {
          port1.postMessage(input);
        } catch (error) {
          throw new ComputeFailure(
            computeDiagnostic("transfer", error, { workerId: id }),
          );
        }
      },
      receive: (callback) => {
        receive = callback;
      },
      error: (callback) => {
        report = callback;
      },
      close: () => {
        if (closed) return;
        closed = true;
        clearTimeout(timeout);
        this.failures.delete(id);
        port1.close();
        this.host({ type: "search-close", id });
      },
    };
  }
  fail(id: number, diagnostic: ComputeDiagnostic): void {
    this.failures.get(id)?.(diagnostic);
  }
}
