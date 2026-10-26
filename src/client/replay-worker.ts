import { Replay } from "../domain/replay";
let replay: Replay | undefined;
onmessage = (event) => {
  try {
    if (event.data.record) replay = new Replay(event.data.record);
    if (!replay) throw new Error("请选择对局记录");
    postMessage({
      index: event.data.index,
      state: replay.frame(event.data.index),
    });
  } catch (error) {
    postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
