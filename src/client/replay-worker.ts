import { ReplayTimeline } from "../domain/replay-timeline";
import { Replay } from "../domain/replay";
let replay: Replay | undefined;
let actor = 0;
let generation = 0;
onmessage = (event) => {
  try {
    if (event.data.record) {
      replay = new Replay(event.data.record);
      const scan = new ReplayTimeline(replay),
        current = ++generation;
      let published = -1;
      const index = () => {
        if (current !== generation) return;
        try {
          const complete = scan.step();
          if (complete || published !== scan.markers.length) {
            published = scan.markers.length;
            postMessage({ timeline: scan.markers, complete });
          }
          if (!complete) setTimeout(index, 0);
        } catch (error) {
          postMessage({
            timeline: scan.markers,
            complete: true,
            timelineError: `时间轴索引失败：${String(error)}`,
          });
        }
      };
      if (replay.record.config.kind === "expedition") setTimeout(index, 0);
    }
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
