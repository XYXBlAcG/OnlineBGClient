import { ComputeFailure, type ComputeDiagnostic } from "./compute-diagnostics";
import type { ComputeProgress } from "./performance";
import { Strategies } from "./strategies";
import {
  type SearchRequest,
  type SearchTask,
  type SearchOutput,
  type RootSamples,
} from "./strategy";
import type { AiResult, DecisionCandidate } from "./types";
export interface ComputeInput {
  id: number;
  task: SearchTask;
}
export interface ComputeOutput {
  id: number;
  output?: SearchOutput;
  error?: string;
  diagnostic?: ComputeDiagnostic;
}
export interface ComputePort {
  send: (input: ComputeInput) => void;
  receive: (callback: (output: ComputeOutput) => void) => void;
  error: (callback: (error: Error) => void) => void;
  close: () => void;
}
interface Job {
  id: number;
  task: SearchTask;
  resolve: (output: SearchOutput) => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
  abort: (failure?: Error) => void;
}
interface Slot {
  port: ComputePort;
  job?: Job;
}
export class ComputePool {
  private queue: Job[] = [];
  private slots: Slot[] = [];
  private sequence = 0;
  private stopped = false;
  private groups = new Map<
    AbortSignal,
    { jobs: Set<Job>; abort: () => void }
  >();
  constructor(
    private factory: () => ComputePort,
    readonly limit: number,
  ) {}
  run(task: SearchTask, signal?: AbortSignal): Promise<SearchOutput> {
    if (this.stopped || signal?.aborted)
      return Promise.reject(new Error("计算已取消"));
    return new Promise((resolve, reject) => {
      const job: Job = {
        id: ++this.sequence,
        task,
        resolve,
        reject,
        signal,
        abort: (failure) => {
          const index = this.queue.indexOf(job);
          if (index >= 0) this.queue.splice(index, 1);
          const slot = this.slots.find((slot) => slot.job === job);
          if (slot) {
            this.slots.splice(this.slots.indexOf(slot), 1);
            slot.port.close();
          }
          this.detach(job);
          reject(failure || new Error("计算已取消"));
          if (!signal?.aborted) this.drain();
        },
      };
      if (signal) {
        let group = this.groups.get(signal);
        if (!group) {
          group = {
            jobs: new Set(),
            abort: () => {
              for (const job of [...this.groups.get(signal)!.jobs]) job.abort();
              this.drain();
            },
          };
          this.groups.set(signal, group);
          signal.addEventListener("abort", group.abort, { once: true });
        }
        group.jobs.add(job);
      }
      this.queue.push(job);
      this.drain();
    });
  }
  close(): void {
    this.stopped = true;
    this.reset();
  }
  reset(): void {
    for (const job of [
      ...this.queue,
      ...this.slots.flatMap((slot) => (slot.job ? [slot.job] : [])),
    ]) {
      this.detach(job);
      job.reject(new Error("计算已取消"));
    }
    this.queue = [];
    this.slots.forEach((slot) => slot.port.close());
    this.slots = [];
  }
  private detach(job: Job): void {
    if (!job.signal) return;
    const group = this.groups.get(job.signal);
    if (!group) return;
    group.jobs.delete(job);
    if (!group.jobs.size) {
      job.signal.removeEventListener("abort", group.abort);
      this.groups.delete(job.signal);
    }
  }
  private drain(): void {
    if (this.stopped) return;
    while (this.queue.length) {
      let slot = this.slots.find((slot) => !slot.job);
      if (!slot) {
        if (this.slots.length >= this.limit) return;
        try {
          slot = { port: this.factory() };
        } catch (error) {
          const job = this.queue.shift()!;
          this.detach(job);
          job.reject(error instanceof Error ? error : new Error(String(error)));
          continue;
        }
        this.slots.push(slot);
        const current = slot;
        current.port.receive((response) => {
          const job = current.job;
          if (!job || response.id !== job.id) return;
          current.job = undefined;
          this.detach(job);
          if (response.diagnostic)
            job.reject(new ComputeFailure(response.diagnostic));
          else if (response.error) job.reject(new Error(response.error));
          else if (response.output) job.resolve(response.output);
          else job.reject(new Error("计算结果缺失"));
          this.drain();
        });
        current.port.error((error) => {
          const index = this.slots.indexOf(current);
          if (index < 0) return;
          this.slots.splice(index, 1);
          current.port.close();
          if (current.job) {
            this.detach(current.job);
            current.job.reject(error);
          }
          this.drain();
        });
      }
      const job = this.queue.shift()!;
      slot.job = job;
      try {
        slot.port.send({ id: job.id, task: job.task });
      } catch (error) {
        job.abort(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}
export class SearchCoordinator {
  private strategies = new Strategies();
  constructor(private pool: ComputePool) {}
  async decide(
    request: SearchRequest,
    threads: number,
    signal?: AbortSignal,
    onProgress?: (progress: ComputeProgress) => void,
  ): Promise<AiResult> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener("abort", abort, { once: true });
    try {
      const started = performance.now();
      const strategy = this.strategies.select(request.observation.kind);
      const width = Math.max(1, Math.min(this.pool.limit, threads));
      let completedSamples = 0,
        scoredCandidates = 0,
        reported = -Infinity;
      const report = (status: ComputeProgress["status"]) => {
        const now = performance.now();
        if (status === "computing" && now - reported < 200) return;
        reported = now;
        onProgress?.({
          elapsedMs: now - started,
          simulations: completedSamples,
          scoredCandidates,
          threads: width,
          status,
        });
      };
      report("computing");
      const moves = strategy.candidates(request);
      const tasks: SearchTask[] = [];
      const size = Math.max(1, Math.ceil(moves.length / (width * 2)));
      for (let i = 0; i < moves.length; i += size)
        tasks.push({ type: "score", request, moves: moves.slice(i, i + size) });
      const candidates: DecisionCandidate[] = [];
      for (let i = 0; i < tasks.length; i += width) {
        const outputs = await Promise.all(
          tasks
            .slice(i, i + width)
            .map((task) => this.pool.run(task, controller.signal)),
        );
        for (const output of outputs)
          if (output.type === "score") candidates.push(...output.candidates);
        scoredCandidates = candidates.length;
        report("computing");
      }
      const roots = strategy.roots(request, candidates),
        count = strategy.budget(request).samples;
      const simulations: SearchTask[] = [];
      const batch =
        request.observation.kind === "ktd" ||
        request.observation.kind === "ccbs"
          ? 1
          : Math.max(1, Math.ceil(count / Math.max(1, width)));
      for (let i = 0; i < count; i += batch)
        for (const candidate of roots)
          simulations.push({
            type: "simulate",
            request,
            action: candidate.action,
            indexes: Array.from(
              { length: Math.min(batch, count - i) },
              (_, j) => i + j,
            ),
          });
      const samples: RootSamples[] = [];
      const budget = strategy.budget(request);
      const deadline =
        "milliseconds" in budget
          ? started + (budget.milliseconds as number)
          : Infinity;
      for (let i = 0; i < simulations.length; i += width) {
        if (performance.now() >= deadline) break;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const expired = Symbol();
        const work = Promise.all(
          simulations
            .slice(i, i + width)
            .map((task) => this.pool.run(task, controller.signal)),
        );
        let outputs: SearchOutput[] | typeof expired;
        try {
          outputs = Number.isFinite(deadline)
            ? await Promise.race([
                work,
                new Promise<typeof expired>((resolve) => {
                  timer = setTimeout(
                    () => resolve(expired),
                    Math.max(0, deadline - performance.now()),
                  );
                }),
              ])
            : await work;
        } finally {
          if (timer) clearTimeout(timer);
        }
        if (outputs === expired) {
          controller.abort();
          if (signal?.aborted) throw new Error("计算已取消");
          const result = strategy.complete(request, candidates, samples);
          report("completed");
          return result;
        }
        for (const output of outputs)
          if (output.type === "simulate") {
            samples.push({ action: output.action, values: output.values });
            completedSamples += output.values.length;
          }
        report("computing");
      }
      if (controller.signal.aborted) throw new Error("计算已取消");
      const result = strategy.complete(request, candidates, samples);
      report("completed");
      return result;
    } catch (error) {
      controller.abort();
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
    }
  }
}
