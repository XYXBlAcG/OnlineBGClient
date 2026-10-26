import { Worker } from "node:worker_threads";
import { expect, it } from "vitest";
import {
  ComputePool,
  SearchCoordinator,
  type ComputePort,
} from "../src/domain/compute";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
function port(): ComputePort {
  const worker = new Worker(
    new URL("../dist-server/ai-worker.mjs", import.meta.url),
  );
  return {
    send: (input) => worker.postMessage(input),
    receive: (callback) => worker.on("message", callback),
    error: (callback) => worker.on("error", callback),
    close: () => {
      void worker.terminate();
    },
  };
}
it("三档策略通过真实 Worker，单线程与多线程选择一致并且审核关闭不产生策略数据", async () => {
  const rules = new ExpeditionAdventure(),
    pool = new ComputePool(port, 4),
    compute = new SearchCoordinator(pool);
  try {
    let state = rules.create(2);
    for (let actor = 0; actor < 2; actor++)
      state = rules.apply(state, actor, {
        type: "expedition-action",
        move: { type: "profession", profession: actor },
      });
    for (let actor = 0; actor < 2; actor++)
      state = rules.apply(state, actor, {
        type: "expedition-action",
        move: { type: "vote", choice: "f0-0" },
      });
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const request = {
        observation: rules.project(state, 0),
        actor: 0,
        difficulty,
        seed: "exp-workers",
        audit: false,
      };
      const one = await compute.decide(request, 1),
        four = await compute.decide(request, 4);
      expect(four.chosen).toEqual(one.chosen);
      expect(four.audit).toBeUndefined();
      expect(one.simulations).toBe(four.simulations);
      expect(() => rules.apply(state, 0, four.chosen)).not.toThrow();
    }
  } finally {
    pool.close();
  }
}, 15000);
