import { Strategies } from "../domain/strategies";
import { executeSearchTask } from "../domain/strategy";
import type { ComputeInput, ComputeOutput } from "../domain/compute";
const strategies = new Strategies();
onmessage = (event: MessageEvent<ComputeInput>) => {
  const { id, task } = event.data;
  let response: ComputeOutput;
  try {
    response = { id, output: executeSearchTask(strategies.select(task.request.observation.kind), task) };
  } catch (error) {
    response = {
      id,
      error: error instanceof Error ? error.message : "AI 计算失败",
    };
  }
  postMessage(response);
};
