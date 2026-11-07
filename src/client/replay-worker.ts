import { Replay } from "../domain/replay";
let replay: Replay | undefined;
let actor = 0;
onmessage = (event) => {
  try {
    if (event.data.record) replay = new Replay(event.data.record);
    if (!replay) throw new Error("请选择对局记录");
    if (typeof event.data.actor === "number") actor = event.data.actor;
    const indexes: number[] = event.data.indexes ?? [event.data.index ?? 0];
    postMessage({
      actor,
      frames: indexes.map((index) => ({
        index,
        state: replay!.engine.project(replay!.frame(index), actor),
      })),
    });
  } catch (error) {
    postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
