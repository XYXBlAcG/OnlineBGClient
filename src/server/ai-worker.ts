import { parentPort } from "node:worker_threads";
import { Strategies } from "../domain/strategies";
import type { Difficulty, GameState } from "../domain/types";

const strategy = new Strategies();
parentPort!.on(
  "message",
  (request: {
    observation: GameState;
    actor: number;
    difficulty: Difficulty;
    seed: string;
  }) => {
    try {
      parentPort!.postMessage({
        decision: strategy.decide(
          request.observation,
          request.actor,
          request.difficulty,
          request.seed,
        ),
      });
    } catch (error) {
      parentPort!.postMessage({
        error: error instanceof Error ? error.message : "AI 决策失败",
      });
    }
  },
);
