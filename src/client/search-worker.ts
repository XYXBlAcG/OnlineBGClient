import { Strategies } from "../domain/strategies";
import { executeSearchTask } from "../domain/strategy";
import { computeDiagnostic } from "../domain/compute-diagnostics";
import type { ComputeInput, ComputeOutput } from "../domain/compute";
const strategies = new Strategies();
onmessage = (event: MessageEvent<{ type: "connect"; port: MessagePort }>) => {
  const port = event.data.port;
  port.onmessage = (event: MessageEvent<ComputeInput>) => {
    const { id, task } = event.data;
    let response: ComputeOutput;
    try {
      response = {
        id,
        output: executeSearchTask(
          strategies.select(task.request.observation.kind),
          task,
        ),
      };
    } catch (error) {
      response = { id, diagnostic: computeDiagnostic("execute", error) };
    }
    port.postMessage(response);
  };
  port.postMessage({ type: "ready" });
  postMessage({ type: "ready" });
};
