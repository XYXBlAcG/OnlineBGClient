import { Replay } from "./replay";
import { chapterAt } from "./expedition/chapters";
import { nodeNames } from "./expedition/map";
export interface ReplayMarker {
  frame: number;
  label: string;
  kind: "chapter" | "node" | "battle" | "choice";
}
export class ReplayTimeline {
  private index = 0;
  private chapter = -1;
  private node = "";
  private phase = "";
  readonly markers: ReplayMarker[] = [];
  constructor(private replay: Replay) {}
  step(limit = 24): boolean {
    const end = Math.min(
      this.replay.record.events.length + 1,
      this.index + limit,
    );
    for (; this.index < end; this.index++) {
      const state = this.replay.frame(this.index);
      if (state.kind !== "expedition") continue;
      const run = state.view;
      if (this.chapter !== run.chapter) {
        this.chapter = run.chapter;
        this.markers.push({
          frame: this.index,
          kind: "chapter",
          label: `第 ${run.chapter + 1} 大层 · ${chapterAt(run.chapter).name}`,
        });
      }
      const node = `${run.chapter}:${run.current}`;
      if (run.current && node !== this.node) {
        this.node = node;
        const mapNode = run.map.flat().find((n) => n.id === run.current);
        this.markers.push({
          frame: this.index,
          kind: "node",
          label: `第 ${run.chapter + 1} 大层，第 ${run.floor + 1} 站 · ${mapNode ? nodeNames[mapNode.kind] : "节点"}`,
        });
      }
      if (
        run.phase !== this.phase &&
        ["battle", "reward", "won", "lost"].includes(run.phase)
      )
        this.markers.push({
          frame: this.index,
          kind: "battle",
          label: (
            {
              battle: "战斗开始",
              reward: "战斗奖励",
              won: "远征通关",
              lost: "远征结束",
            } as Record<string, string>
          )[run.phase],
        });
      this.phase = run.phase;
      const event = this.replay.record.events[this.index - 1];
      if (
        event?.type === "action" &&
        event.action.type === "expedition-action" &&
        ["upgrade", "remove"].includes(event.action.move.type)
      )
        this.markers.push({
          frame: this.index,
          kind: "choice",
          label: `${this.replay.record.names[event.actor]} · ${event.action.move.type === "upgrade" ? "升级卡牌" : "移除卡牌"}`,
        });
    }
    return this.index > this.replay.record.events.length;
  }
}
export interface ReplayBookmark {
  frame: number;
  label: string;
}
