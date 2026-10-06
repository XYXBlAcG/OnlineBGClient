import { build } from "esbuild";
import { beforeAll, expect, it } from "vitest";
import { MessageChannel, Worker } from "node:worker_threads";
import { RemoteComputePorts } from "../src/client/compute-ports";
import { ComputePool, SearchCoordinator } from "../src/domain/compute";
import { GameEngine } from "../src/domain/engine";
import {
  ComputeFailure,
  computeDiagnostic,
} from "../src/domain/compute-diagnostics";

beforeAll(async () => {
  await build({
    entryPoints: ["src/domain/strategy.ts", "src/domain/strategies.ts"],
    outdir: ".tmp/compute-test",
    bundle: true,
    platform: "node",
    format: "esm",
    outExtension: { ".js": ".mjs" },
  });
});

it("runs flat real search workers through transferred channels and releases them", async () => {
  const workers = new Map<number, Worker>();
  const remote = new RemoteComputePorts(
    (message) => {
      if (message.type === "search-open") {
        const worker = new Worker(
          `
        const { parentPort } = require('node:worker_threads');
        parentPort.on('message', async ({port, entry}) => {
          const {executeSearchTask} = await import(entry);
          const {Strategies} = await import(${JSON.stringify(new URL("../.tmp/compute-test/strategies.mjs", import.meta.url).href)});
          const strategies = new Strategies();
          port.on('message', ({id,task}) => port.postMessage({id,output:executeSearchTask(strategies.select(task.request.observation.kind),task)}));
          port.postMessage({type:'ready'});
        });
      `,
          { eval: true },
        );
        workers.set(message.id, worker);
        worker.postMessage(
          {
            port: message.port,
            entry: new URL("../.tmp/compute-test/strategy.mjs", import.meta.url)
              .href,
          },
          [message.port as never],
        );
      } else {
        void workers.get(message.id)?.terminate();
        workers.delete(message.id);
      }
    },
    () => new MessageChannel() as unknown as globalThis.MessageChannel,
  );
  const pool = new ComputePool(() => remote.create(), 2);
  const engine = new GameEngine();
  const state = engine.create("tq", 6, "flat-worker");
  const actor = engine.actors(state)[0];
  try {
    const result = await new SearchCoordinator(pool).decide(
      {
        observation: engine.project(state, actor),
        actor,
        difficulty: "easy",
        seed: "flat",
        audit: false,
      },
      2,
    );
    expect(
      engine.candidates(state, actor).map((candidate) => candidate.action),
    ).toContainEqual(result.chosen);
    expect(workers.size).toBe(2);
    pool.reset();
    expect(workers.size).toBe(0);
    const resumed = await new SearchCoordinator(pool).decide(
      {
        observation: engine.project(state, actor),
        actor,
        difficulty: "easy",
        seed: "flat",
        audit: false,
      },
      1,
    );
    expect(resumed.chosen).toEqual(result.chosen);
  } finally {
    pool.close();
  }
}, 30000);

it("reports an anonymous worker load failure with a phase", async () => {
  const remote = new RemoteComputePorts(
    (message) => {
      if (message.type === "search-open") {
        queueMicrotask(() =>
          remote.fail(
            message.id,
            computeDiagnostic("load", new Error("error"), {
              workerId: message.id,
              script: "search-worker.js",
            }),
          ),
        );
      }
    },
    () => new MessageChannel() as unknown as globalThis.MessageChannel,
  );
  const port = remote.create();
  const failure = await new Promise<Error>((resolve) => port.error(resolve));
  expect(failure).toBeInstanceOf(ComputeFailure);
  expect(failure.message).toContain("计算线程脚本加载失败");
  expect((failure as ComputeFailure).diagnostic.workerId).toBe(1);
  expect((failure as ComputeFailure).diagnostic.detail).not.toBe("error");
  port.close();
});
