import type { PracticeWorkerResponse } from "../src/client/practice-worker";
import { build } from "esbuild";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
it("executes a legal teaching move in a real worker without strategy audit", async () => {
  await build({
    entryPoints: ["src/client/practice-worker.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: ".tmp/practice-worker-test.cjs",
  });
  const engine = new GameEngine(),
    state = engine.create("scmj", 4, "worker-lesson");
  const actor = engine.actors(state)[0];
  const worker = new Worker(
    `const {parentPort,workerData}=require('node:worker_threads');global.onmessage=null;global.postMessage=data=>parentPort.postMessage(data);require(workerData);parentPort.on('message',data=>global.onmessage({data}));`,
    {
      eval: true,
      workerData: fileURLToPath(
        new URL("../.tmp/practice-worker-test.cjs", import.meta.url),
      ),
    },
  );
  try {
    const result = await new Promise<PracticeWorkerResponse>(
      (resolve, reject) => {
        worker.once("message", resolve);
        worker.once("error", reject);
        worker.postMessage({
          version: 5,
          request: {
            observation: engine.project(state, actor),
            actor,
            difficulty: "easy",
            seed: "lesson",
            audit: false,
          },
        });
      },
    );
    if ("error" in result) throw new Error(result.error);
    expect(result.version).toBe(5);
    expect(result.result.audit).toBeUndefined();
    expect(() =>
      engine.apply(state, actor, result.result.chosen, "teaching"),
    ).not.toThrow();
  } finally {
    await worker.terminate();
  }
});
