import { Strategies } from "../domain/strategies";
import { parentPort } from "node:worker_threads";
import { executeSearchTask } from "../domain/strategy";
import type { ComputeInput, ComputeOutput } from "../domain/compute";
const strategies = new Strategies();
parentPort!.on("message", ({ id, task }: ComputeInput) => {
  let response: ComputeOutput;
  try {
    response = { id, output: executeSearchTask(strategies.select(task.request.observation.kind), task) };
  } catch (error) {
    response = {
      id,
      error: error instanceof Error ? error.message : "AI 计算失败",
    };
  }
  parentPort!.postMessage(response);
});
