import { traceShot } from "../../domain/graphwar/trajectory";
import type { GraphwarView, Shot } from "../../domain/graphwar/types";
export interface PreviewInput {
  id: number;
  view: GraphwarView;
  actor: number;
  formula: string;
}
export type PreviewOutput =
  { id: number; shot: Shot } | { id: number; error: string };
onmessage = ({ data }: MessageEvent<PreviewInput>) => {
  let output: PreviewOutput;
  try {
    output = {
      id: data.id,
      shot: traceShot(data.view, data.actor, data.formula),
    };
  } catch (error) {
    output = {
      id: data.id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  postMessage(output);
};
