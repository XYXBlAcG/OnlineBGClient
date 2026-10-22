import { sampleMahjong } from "./sample";
import {
  Strategy,
  type SearchRequest,
  type RootSamples,
  type SampleValue,
} from "../strategy";
import type {
  Action,
  Candidate,
  DecisionCandidate,
  GameState,
  AiResult,
} from "../types";
import { analyzeHand, shanten } from "./hand";
import {
  tileType,
  tileSuit,
  tileCounts,
  type MahjongView,
  type MahjongState,
} from "./types";
function requireState(state: GameState): MahjongState {
  if (state.kind !== "scmj") throw new Error("策略游戏不匹配");
  return state;
}
export function visibleCounts(view: MahjongView, actor: number): number[] {
  return tileCounts([
    ...new Set(
      [
        ...view.hands[actor],
        ...view.melds.flat(2).flatMap((m) => m.tiles),
        ...view.rivers.flat(),
        ...view.hands.flatMap((h, i) =>
          i !== actor && view.wins.some((w) => w.player === i) ? h : [],
        ),
      ].filter((t) => t >= 0),
    ),
  ]);
}
function handValue(hand: number[], open: number, lack: number) {
  return (
    -30 * shanten(hand, open) -
    12 * hand.filter((t) => tileSuit(t) === lack).length
  );
}
export class MahjongStrategy extends Strategy {
  static readonly version = "sichuan-information-1";
  readonly version = MahjongStrategy.version;
  budget(request: SearchRequest) {
    return {
      easy: { samples: 0, depth: 0, shortlist: 0, milliseconds: 150 },
      normal: { samples: 0, depth: 0, shortlist: 0, milliseconds: 600 },
      hard: { samples: 36, depth: 2, shortlist: 4, milliseconds: 1600 },
    }[request.difficulty];
  }
  score(request: SearchRequest, moves: Candidate[]): DecisionCandidate[] {
    const { view } = requireState(request.observation),
      actor = request.actor,
      hand = view.hands[actor],
      open = view.melds[actor].length,
      lack = view.lacks[actor],
      known = visibleCounts(view, actor);
    return moves.map((candidate) => {
      if (candidate.action.type !== "scmj-action")
        throw new Error("动作不匹配");
      const move = candidate.action.move;
      let score = 0;
      const features: DecisionCandidate["features"] = [];
      const add = (name: string, value: number, weight: number) => {
        score += value * weight;
        if (request.audit)
          features.push({ name, value, weight, contribution: value * weight });
      };
      if (move.type === "discard") {
        const after = hand.filter((t) => t !== move.tile),
          distance = shanten(after, open);
        add("完成胡牌结构的向听数", -distance, 30);
        add(
          "仍持有的缺门牌",
          -after.filter((t) => tileSuit(t) === lack).length,
          12,
        );
        if (request.difficulty !== "easy") {
          let outs = 0;
          for (let t = 0; t < 27; t++)
            if (
              Math.floor(t / 9) !== lack &&
              known[t] < 4 &&
              shanten([...after, t * 4], open) < distance
            )
              outs += 4 - known[t];
          add("公开信息下的有效进张", outs, 0.3);
          const type = tileType(move.tile),
            danger =
              ([0, 1, 2, 3]
                .filter(
                  (id) =>
                    id !== actor &&
                    !view.wins.some((w) => w.player === id) &&
                    view.lacks[id] !== tileSuit(move.tile),
                )
                .reduce(
                  (sum, id) => sum + (1 + view.melds[id].length * 0.35),
                  0,
                ) *
                (4 - known[type])) /
              4;
          add("公开信息点炮风险估计", -danger, view.wall.length < 20 ? 3 : 1.2);
        }
      } else if (move.type === "exchange") {
        const after = hand.filter((t) => !move.tiles.includes(t));
        add("保留牌的结构", handValue(after, 0, -1), 1);
        const counts = tileCounts(after);
        add(
          "保留对子和刻子",
          counts.reduce((n, c) => n + (c >= 2 ? 1 : 0) + (c >= 3 ? 1 : 0), 0),
          2,
        );
      } else if (move.type === "lack") {
        const keep = hand.filter((t) => tileSuit(t) !== move.suit);
        add(
          "需清理的缺门张数",
          -hand.filter((t) => tileSuit(t) === move.suit).length,
          5,
        );
        add("保留花色的结构", handValue(keep, open, -1), 0.4);
      } else if (
        move.type === "win" ||
        (move.type === "respond" && move.choice === "win")
      )
        add("合法胡牌收益", 1, 10000);
      else if (move.type === "kong")
        add("杠费与补牌机会", 1, handValue(hand, open, lack) + 3);
      else if (move.type === "respond" && move.choice !== "pass") {
        const pending = view.pending!,
          count = move.choice === "kong" ? 3 : 2,
          copies = hand
            .filter((t) => tileType(t) === tileType(pending.tile))
            .slice(0, count),
          after = hand.filter((t) => !copies.includes(t));
        const best =
          move.choice === "pong"
            ? Math.max(
                ...after.map((t) =>
                  handValue(
                    after.filter((x) => x !== t),
                    open + 1,
                    lack,
                  ),
                ),
              )
            : handValue(after, open + 1, lack);
        add("碰杠前后结构收益", best - handValue(hand, open, lack), 1);
        add("公开手牌的代价", -1, 2);
      }
      if (request.difficulty === "easy")
        add(
          "简单难度的有限取舍",
          this.engine.seed(
            `${request.seed}:${JSON.stringify(candidate.action)}`,
          )() - 0.5,
          5,
        );
      return { ...candidate, features, score };
    });
  }
  sample(observation: GameState, actor: number, seed: string): MahjongState {
    return sampleMahjong(
      requireState(observation),
      actor,
      this.engine.seed(seed),
    );
  }
  simulate(
    request: SearchRequest,
    action: Action,
    indexes: number[],
  ): SampleValue[] {
    if (action.type !== "scmj-action" || action.move.type !== "discard")
      return [];
    const tile = action.move.tile;
    return indexes.map((index) => {
      const { view } = this.sample(
          request.observation,
          request.actor,
          `${request.seed}:sample:${index}`,
        ),
        actor = request.actor,
        after = view.hands[actor].filter((t) => t !== tile),
        baseline = shanten(after, view.melds[actor].length);
      let risk = 0;
      for (let id = 0; id < 4; id++)
        if (id !== actor && !view.wins.some((w) => w.player === id)) {
          const score = analyzeHand(
            [...view.hands[id], tile],
            view.melds[id],
            view.lacks[id],
            view.options,
          );
          if (score) risk += score.value;
        }
      let improvement = 0;
      for (const drawn of view.wall.slice(0, 2)) {
        const drawnHand = [...after, drawn];
        if (
          analyzeHand(
            drawnHand,
            view.melds[actor],
            view.lacks[actor],
            view.options,
          )
        )
          improvement += 10;
        else
          improvement += Math.max(
            0,
            baseline -
              Math.min(
                ...drawnHand.map((discard) =>
                  shanten(
                    drawnHand.filter((t) => t !== discard),
                    view.melds[actor].length,
                  ),
                ),
              ),
          );
      }
      return { index, value: improvement * 3 - risk * 8 };
    });
  }
  complete(
    request: SearchRequest,
    candidates: DecisionCandidate[],
    samples: RootSamples[],
  ): AiResult {
    const result = super.complete(request, candidates, samples);
    if (result.audit)
      result.audit.assumptions = [
        "只读取本人手牌、已公开牌、定缺与剩余张数。",
        "未知手牌与暗杠按可见张数及公开出牌约束抽样，不读取真实牌墙；风险不是绝对安全保证。",
        "向听与进张结合番型、碰杠代价评分；困难采样收益不是胜率。",
      ];
    return result;
  }
}
