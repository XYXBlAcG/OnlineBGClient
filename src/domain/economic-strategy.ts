import { Strategy, type SearchRequest, type SampleValue } from "./strategy";
import type {
  Action,
  Candidate,
  DecisionCandidate,
  Feature,
  GameState,
} from "./types";
export abstract class EconomicStrategy extends Strategy {
  abstract readonly version: string;
  abstract values(state: GameState, actor: number): [string, number, number][];
  abstract sample(
    observation: GameState,
    actor: number,
    seed: string,
  ): GameState;
  budget(request: SearchRequest) {
    return {
      easy: { samples: 0, depth: 0, shortlist: 0, milliseconds: 150 },
      normal: { samples: 4, depth: 4, shortlist: 3, milliseconds: 600 },
      hard: { samples: 12, depth: 8, shortlist: 5, milliseconds: 2000 },
    }[request.difficulty];
  }
  protected position(state: GameState, actor: number): number {
    return this.values(state, actor).reduce(
      (sum, [, value, weight]) => sum + value * weight,
      0,
    );
  }
  protected evaluate(
    observation: GameState,
    actor: number,
    candidate: Candidate,
    seed: string,
    audit = true,
  ): DecisionCandidate {
    const state = this.sample(observation, actor, `${seed}:belief`);
    const next = this.engine.apply(state, actor, candidate.action, seed);
    const before = this.values(state, actor),
      after = this.values(next, actor),
      features: Feature[] = [];
    let score = 0;
    for (let i = 0; i < after.length; i++) {
      const [name, value, weight] = after[i],
        delta = value - (before[i]?.[1] || 0);
      score += delta * weight;
      if (audit)
        features.push({
          name,
          value: delta,
          weight,
          contribution: delta * weight,
        });
    }
    if (
      candidate.action.type === "ccbs-action" &&
      candidate.action.move.kind === "pass"
    )
      score -= 100;
    if (
      candidate.action.type === "ktd-action" &&
      candidate.action.move.kind === "trade"
    )
      score -= 0.5;
    return { ...candidate, score, features };
  }
  simulate(
    request: SearchRequest,
    action: Action,
    indexes: number[],
  ): SampleValue[] {
    return indexes.map((index) => {
      const tree = new Map<string, { visits: number; total: number }>();
      let total = 0;
      const iterations = request.difficulty === "hard" ? 6 : 3;
      for (let iteration = 0; iteration < iterations; iteration++) {
        let state = this.sample(
          request.observation,
          request.actor,
          `${request.seed}:sample:${index}:${iteration}`,
        );
        const before = this.position(state, request.actor);
        state = this.engine.apply(
          state,
          request.actor,
          action,
          `${request.seed}:root:${index}:${iteration}`,
        );
        let path = "",
          visited: string[] = [];
        for (
          let depth = 0;
          depth < this.budget(request).depth && !this.engine.finished(state);
          depth++
        ) {
          const actor = this.engine.actors(state)[0];
          if (actor === undefined) break;
          const observation = this.engine.project(state, actor),
            nextRequest = { ...request, observation, actor, audit: false };
          const candidates = this.score(
            nextRequest,
            this.candidates(nextRequest),
          )
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
          if (!candidates.length) throw new Error("搜索阶段缺少合法动作");
          const parentVisits = Math.max(1, tree.get(path)?.visits || 0);
          let selected = candidates[0],
            best = -Infinity;
          for (const candidate of candidates) {
            const key = path + JSON.stringify(candidate.action),
              node = tree.get(key);
            const exploitation = node ? node.total / node.visits : 0;
            const value = node
              ? (actor === request.actor ? exploitation : -exploitation) +
                Math.sqrt((2 * Math.log(parentVisits + 1)) / node.visits) +
                candidate.score / 100
              : 1e6 + candidate.score;
            if (value > best) {
              best = value;
              selected = candidate;
            }
          }
          path += JSON.stringify(selected.action);
          visited.push(path);
          state = this.engine.apply(
            state,
            actor,
            selected.action,
            `${request.seed}:move:${index}:${iteration}:${depth}`,
          );
        }
        const value = this.position(state, request.actor) - before;
        total += value;
        for (const key of ["", ...visited]) {
          const node = tree.get(key) || { visits: 0, total: 0 };
          node.visits++;
          node.total += value;
          tree.set(key, node);
        }
      }
      return { index, value: total / iterations };
    });
  }
}
