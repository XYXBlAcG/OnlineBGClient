import { canvasRegion } from "../../domain/drawguess/canvas-region";
import type { DrawPoint } from "../../domain/drawguess/types";

const worker = self as unknown as DedicatedWorkerGlobalScope;
worker.onmessage = ({ data }: MessageEvent<{ rgba: Uint8ClampedArray; width: number; height: number; start: DrawPoint }>) => {
  worker.postMessage(canvasRegion(data.rgba, data.width, data.height, data.start));
};
