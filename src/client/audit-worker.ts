import { Strategies } from "../domain/strategies";
import type { Decision } from "../domain/types";

const strategy = new Strategies();
self.onmessage = (event: MessageEvent<Decision>) => {
  try {
    const decision = event.data;
    const replay = strategy.decide(
      decision.observation,
      decision.actor,
      decision.difficulty,
      decision.seed,
      decision.version,
    );
    self.postMessage(
      JSON.stringify(replay) === JSON.stringify(decision)
        ? "重放一致：全部候选评分与选择可复现"
        : "重放结果不同",
    );
  } catch (error) {
    self.postMessage(String(error));
  }
};
