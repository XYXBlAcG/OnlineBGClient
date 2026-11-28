import { applyDrawingDocument } from "../drawguess/canvas-document";
import { drawingHistoryStatus, editDrawingHistory } from "../drawguess/canvas-history";
import { nextCanvasOrder } from "../drawguess/canvas-order";
import seedrandom from "seedrandom";
import type { Action, Candidate } from "../types";
import type { DrawStroke } from "../drawguess/types";
import { fayuBuiltinPool } from "./words";
import { fayuTemplateById, fayuTemplates } from "./templates";
import { generateFayuSentence, validateFayuSentence } from "./generator";
import { fayuLimits, type FayuChallenge, type FayuGuess, type FayuSentence, type FayuState } from "./types";

const normalize = (value: string) => value.trim().normalize("NFKC");
const shuffle = <T>(items: readonly T[], random: () => number) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
};

export class FayuRules {
  constructor(private readonly random: () => number) {}

  private empty(players: number, host: number): FayuState {
    return {
      kind: "drawguess",
      mode: "fayu",
      view: {
        phase: "prompting",
        round: 0,
        players,
        host,
        scores: Array<number>(players).fill(0),
        submitted: [],
        prompts: Array<FayuSentence | null>(players).fill(null),
        canvases: Array.from({ length: players }, () => []),
        fills: {},
        layers: undefined,
        finished: [],
        challenges: {},
        guesses: {},
        votes: {},
      },
    };
  }

  create(players: number, _team = false, options?: { hostActor?: number }) {
    return this.empty(players, Math.max(0, Math.min(players - 1, options?.hostActor ?? 0)));
  }

  finished(state: FayuState) {
    return state.view.phase === "finished";
  }

  actors(state: FayuState) {
    return this.finished(state)
      ? []
      : Array.from({ length: state.view.players }, (_, index) => index);
  }

  candidates(_state: FayuState, _actor: number): Candidate[] {
    return [];
  }

  actionWindow(state: FayuState, action: Action): string | undefined {
    const phase = state.view.phase;
    if (phase === "prompting" && action.type === "draw-prompt")
      return `fayu:prompting:${state.view.round}`;
    if (
      phase === "drawing" &&
      [
        "draw-stroke",
        "draw-undo",
        "draw-clear",
        "draw-finish",
        "draw-transform",
        "draw-delete",
        "draw-fill",
        "draw-layer",
        "draw-region",
        "draw-move-selection",
        "draw-restore",
        "draw-history",
      ].includes(action.type)
    )
      return `fayu:drawing:${state.view.round}`;
    if (
      phase === "guessing" &&
      ["draw-cloze", "draw-vote"].includes(action.type)
    )
      return `fayu:guessing:${state.view.round}`;
    return undefined;
  }

  keepsDeadline(state: FayuState, action: Action): boolean {
    if (action.type === "draw-prompt")
      return state.view.submitted.length + 1 < state.view.players;
    if (action.type === "draw-finish")
      return state.view.finished.length + 1 < state.view.players;
    return (
      action.type === "draw-stroke" ||
      action.type === "draw-undo" ||
      action.type === "draw-clear" ||
      action.type === "draw-transform" ||
      action.type === "draw-delete" ||
      action.type === "draw-fill" ||
      action.type === "draw-layer" ||
      action.type === "draw-region" ||
      action.type === "draw-move-selection" ||
      action.type === "draw-restore" ||
      action.type === "draw-history" ||
      action.type === "draw-cloze" ||
      action.type === "draw-vote"
    );
  }

  private startDrawing(state: FayuState, prompts: FayuState["view"]["prompts"]): FayuState {
    return {
      ...state,
      view: {
        ...state.view,
        phase: "drawing",
        prompts,
        submitted: prompts.map((_, index) => index),
        canvases: Array.from({ length: state.view.players }, () => []),
        fills: {},
        layers: undefined,
        finished: [],
      },
    };
  }

  private startGuessing(state: FayuState, seed: string): FayuState {
    return {
      ...state,
      drawingHistory: undefined,
      view: {
        ...state.view,
        phase: "guessing",
        challenges: this.challenges(state.view, seed),
      },
    };
  }

  needsResolution(state: FayuState) {
    return ["prompting", "drawing", "guessing"].includes(state.view.phase);
  }

  resolutionDelay(state: FayuState): number {
    return state.view.phase === "prompting"
      ? fayuLimits.promptMs
      : state.view.phase === "drawing"
        ? fayuLimits.drawingMs
        : state.view.phase === "guessing"
          ? fayuLimits.guessingMs + Math.max(0, state.view.players - 2) * 15_000
          : 0;
  }

  resolve(state: FayuState, seed: string): FayuState {
    const { view } = state;
    const random = seedrandom(`${seed}:${view.phase}:${view.round}`);
    if (view.phase === "prompting") {
      const prompts = view.prompts.map((prompt) =>
        prompt ?? generateFayuSentence(fayuBuiltinPool, random),
      );
      return this.startDrawing(state, prompts);
    }
    if (view.phase === "drawing") {
      return this.startGuessing(state, seed);
    }
    if (view.phase === "guessing") {
      const scores = [...view.scores];
      const counts = new Map<number, number>();
      for (const drawing of Object.values(view.votes))
        counts.set(drawing, (counts.get(drawing) ?? 0) + 1);
      const top = Math.max(0, ...counts.values());
      if (top > 0 && view.players > 2)
        for (const [drawing, count] of counts)
          if (count === top) scores[drawing] += 2;
      return { ...state, view: { ...view, phase: "results", scores } };
    }
    return state;
  }

  private challenges(view: FayuState["view"], seed: string) {
    const random = seedrandom(`${seed}:challenges:${view.round}`);
    const challenges: Record<number, FayuChallenge> = {};
    const allWords = view.prompts.flatMap((prompt) => (prompt ? prompt.words : []));
    const builtin = fayuBuiltinPool.words.map((word) => word.word);
    for (const [drawing, prompt] of view.prompts.entries()) {
      if (!prompt) continue;
      const template = fayuTemplateById.get(prompt.templateId);
      if (!template) continue;
      const decoys = shuffle(
        fayuTemplates.filter((item) => item.id !== prompt.templateId).map((item) => item.id),
        random,
      ).slice(0, 2);
      const actual = prompt.words.map(normalize);
      const extras = shuffle(
        [...new Set([...allWords, ...builtin].map(normalize))].filter(
          (word) => !actual.includes(word),
        ),
        random,
      );
      const wordBank = shuffle([...actual, ...extras.slice(0, 5)], random);
      challenges[drawing] = {
        drawing,
        templateChoices: shuffle([prompt.templateId, ...decoys], random),
        wordBank,
      };
    }
    return challenges;
  }

  apply(state: FayuState, actor: number, action: Action): FayuState {
    const { view } = state;
    if (actor < 0 || actor >= view.players) throw new Error("玩家不存在");
    if ("round" in action && action.round !== view.round)
      throw new Error("这一轮已经更新");
    if (action.type === "draw-prompt") {
      if (view.phase !== "prompting") throw new Error("现在不能出题");
      if (view.submitted.includes(actor)) throw new Error("你已经出过题了");
      const sentence = validateFayuSentence(action.templateId, action.words);
      if (!sentence) throw new Error("句子格式无效");
      const prompts = [...view.prompts];
      prompts[actor] = sentence;
      const submitted = [...view.submitted, actor].sort((a, b) => a - b);
      const next = {
        ...state,
        view: { ...view, prompts, submitted },
      };
      return submitted.length === view.players ? this.startDrawing(next, prompts) : next;
    }
    if (view.phase === "drawing" && !view.finished.includes(actor)) {
      let next = state;
      const edit = editDrawingHistory(state.drawingHistory?.[actor], view.round, action, {
        strokes: view.canvases[actor]!, fills: view.fills[actor] ?? [], layers: view.layers?.[actor],
      }, () => {
        next = this.applyAction(state, actor, action);
        return { strokes: next.view.canvases[actor]!, fills: next.view.fills[actor] ?? [], layers: next.view.layers?.[actor] };
      });
      if (edit) {
        if (action.type === "draw-history") {
          const canvases = [...view.canvases];
          canvases[actor] = edit.drawing.strokes;
          const layers = { ...view.layers };
          if (edit.drawing.layers) layers[actor] = edit.drawing.layers;
          else delete layers[actor];
          next = { ...state, view: { ...view, canvases, fills: { ...view.fills, [actor]: edit.drawing.fills },
            ...(view.layers || edit.drawing.layers ? { layers } : {}) } };
        }
        return { ...next, drawingHistory: { ...state.drawingHistory, [actor]: edit.history } };
      }
    }
    return this.applyAction(state, actor, action);
  }

  private applyAction(state: FayuState, actor: number, action: Action): FayuState {
    const { view } = state;
    if (view.phase === "drawing" && !view.finished.includes(actor)) {
      const drawing = applyDrawingDocument({ strokes: view.canvases[actor]!, fills: view.fills[actor] ?? [], layers: view.layers?.[actor] }, action, fayuLimits.maxFills, () => `fill-${this.random()}`);
      if (drawing) {
        const canvases = [...view.canvases];
        canvases[actor] = drawing.strokes;
        return { ...state, view: { ...view, canvases, fills: { ...view.fills, [actor]: drawing.fills },
          ...(drawing.layers ? { layers: { ...view.layers, [actor]: drawing.layers } } : {}) } };
      }
    }
    if (action.type === "draw-restore") {
      if (view.phase !== "drawing") throw new Error("现在不能恢复");
      if (view.finished.includes(actor)) throw new Error("你已经完成作画");
      if (action.strokes.length > fayuLimits.maxStrokes ||
          action.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0) > fayuLimits.maxPoints ||
          action.fills.length > fayuLimits.maxFills)
        throw new Error("画布已写满");
      const canvases = [...view.canvases];
      canvases[actor] = action.strokes.map((stroke) => ({
        ...stroke,
        nextPart: 0,
      }));
      const fills = { ...view.fills, [actor]: action.fills };
      return { ...state, view: { ...view, canvases, fills } };
    }
    if (action.type === "draw-fill") {
      if (view.phase !== "drawing") throw new Error("现在不能填充");
      if (view.finished.includes(actor)) throw new Error("你已经完成作画");
      if (!action.data.startsWith("data:image/png;base64,"))
        throw new Error("填充图像无效");
      const fills = view.fills[actor] ?? [];
      if (fills.length >= fayuLimits.maxFills) throw new Error("填充次数已用完");
      return {
        ...state,
        view: {
          ...view,
          fills: {
            ...view.fills,
            [actor]: [...fills, { id: `fill-${this.random()}`, layer: action.layer, data: action.data, order: nextCanvasOrder(view.canvases[actor], fills) }],
          },
        },
      };
    }
    if (action.type === "draw-transform") {
      if (view.phase !== "drawing") throw new Error("现在不能移动");
      if (view.finished.includes(actor)) throw new Error("你已经完成作画");
      const canvas = view.canvases[actor];
      const ids = new Set(action.ids);
      if (![...ids].every((id) => canvas.some((stroke) => stroke.id === id)))
        throw new Error("选中的笔画不存在");
      const canvases = [...view.canvases];
      canvases[actor] = canvas.map((stroke) =>
        ids.has(stroke.id)
          ? {
              ...stroke,
              points: stroke.points.map(([x, y]) => [
                Math.min(1000, Math.max(0, x + action.dx)),
                Math.min(625, Math.max(0, y + action.dy)),
              ]),
            }
          : stroke,
      );
      return { ...state, view: { ...view, canvases } };
    }
    if (action.type === "draw-delete") {
      if (view.phase !== "drawing") throw new Error("现在不能删除");
      if (view.finished.includes(actor)) throw new Error("你已经完成作画");
      const ids = new Set(action.ids);
      if (![...ids].every((id) => view.canvases[actor].some((stroke) => stroke.id === id)))
        throw new Error("选中的笔画不存在");
      const canvases = [...view.canvases];
      canvases[actor] = canvases[actor].filter((stroke) => !ids.has(stroke.id));
      return { ...state, view: { ...view, canvases } };
    }
    if (action.type === "draw-finish") {
      if (view.phase !== "drawing") throw new Error("现在不能完成作画");
      if (view.finished.includes(actor)) return state;
      const finished = [...view.finished, actor].sort((a, b) => a - b);
      const next = { ...state, view: { ...view, finished } };
      return finished.length === view.players
        ? this.startGuessing(next, JSON.stringify(view.prompts))
        : next;
    }
    if (action.type === "draw-clear") {
      if (view.phase !== "drawing") throw new Error("现在不能清空");
      if (view.finished.includes(actor)) throw new Error("你已经完成作画");
      const canvases = [...view.canvases];
      canvases[actor] = action.layer === undefined
        ? []
        : canvases[actor].filter((stroke) => (stroke.layer ?? 0) !== action.layer);
      const fills = { ...view.fills };
      fills[actor] =
        action.layer === undefined
          ? []
          : (fills[actor] ?? []).filter((fill) => fill.layer !== action.layer);
      return { ...state, view: { ...view, canvases, fills } };
    }
    if (action.type === "draw-stroke" || action.type === "draw-undo") {
      if (view.phase !== "drawing") throw new Error("现在不能作画");
      if (view.finished.includes(actor)) throw new Error("你已经完成作画");
      const strokes = [...view.canvases[actor]];
      if (action.type === "draw-undo") {
        const last = strokes.at(-1);
        if (!last || last.id !== action.id) throw new Error("没有可撤销的笔画");
        const canvases = [...view.canvases];
        canvases[actor] = strokes.slice(0, -1);
        return { ...state, view: { ...view, canvases } };
      }
      const points = strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
      if (points + action.points.length > fayuLimits.maxPoints) throw new Error("画布已写满");
      const existing = strokes.find((stroke) => stroke.id === action.id);
      if (action.part === 0) {
        if (strokes.length >= fayuLimits.maxStrokes || existing) throw new Error("笔画超出限制");
        const stroke: DrawStroke = {
          id: action.id,
          ink: action.ink,
          nextPart: 1,
          order: nextCanvasOrder(strokes, view.fills[actor] ?? []),
          points: action.points,
          tool: action.tool,
          text: action.text,
          layer: action.layer,
          color: action.color,
          width: action.width,
          opacity: action.opacity,
        };
        const canvases = [...view.canvases];
        canvases[actor] = [...strokes, stroke];
        return { ...state, view: { ...view, canvases } };
      }
      const last = strokes.at(-1);
      if (!last || last.id !== action.id || last.nextPart !== action.part || last.ink !== action.ink)
        throw new Error("笔画顺序已更新");
      const canvases = [...view.canvases];
      canvases[actor] = [
        ...strokes.slice(0, -1),
        { ...last, nextPart: last.nextPart + 1, points: [...last.points, ...action.points] },
      ];
      return { ...state, view: { ...view, canvases } };
    }
    if (action.type === "draw-cloze") {
      if (view.phase !== "guessing") throw new Error("现在不能猜句");
      if (action.drawing === actor) throw new Error("不能猜自己的画");
      const challenge = view.challenges[action.drawing];
      const prompt = view.prompts[action.drawing];
      if (!challenge || !prompt) throw new Error("画作不存在");
      const guesses = view.guesses[actor] ?? {};
      const previous = guesses[action.drawing];
      if (previous?.correct) throw new Error("已经猜中了");
      if ((previous?.attempts ?? 0) >= fayuLimits.maxAttempts) throw new Error("猜句次数已用完");
      if (!challenge.templateChoices.includes(action.templateId)) throw new Error("句式不在候选里");
      if (action.words.some((word) => !challenge.wordBank.includes(normalize(word))))
        throw new Error("词语不在词块里");
      const template = fayuTemplateById.get(prompt.templateId);
      const correct =
        action.templateId === prompt.templateId &&
        !!template &&
        action.words.length === prompt.words.length &&
        action.words.every((word, index) => normalize(word) === normalize(prompt.words[index]!));
      const attempt = (previous?.attempts ?? 0) + 1;
      const nextGuess: FayuGuess = {
        attempts: attempt,
        correct,
        templateId: action.templateId,
        words: action.words.map(normalize),
      };
      const scores = [...view.scores];
      if (correct) {
        scores[actor] += fayuLimits.maxAttempts + 1 - attempt;
        scores[action.drawing] += 1;
      }
      return {
        ...state,
        view: {
          ...view,
          scores,
          guesses: { ...view.guesses, [actor]: { ...guesses, [action.drawing]: nextGuess } },
        },
      };
    }
    if (action.type === "draw-vote") {
      if (view.phase !== "guessing") throw new Error("现在不能投票");
      if (action.drawing === actor) throw new Error("不能投自己的画");
      if (view.votes[actor] !== undefined) throw new Error("你已经投过票");
      if (!view.challenges[action.drawing]) throw new Error("画作不存在");
      const scores = [...view.scores];
      scores[action.drawing] += 1;
      return {
        ...state,
        view: {
          ...view,
          scores,
          votes: { ...view.votes, [actor]: action.drawing },
        },
      };
    }
    if (action.type === "draw-round") {
      if (view.phase !== "results") throw new Error("现在不能开始下一轮");
      if (actor !== view.host) throw new Error("只有房主可以开始下一轮");
      return {
        ...state,
        view: {
          ...view,
          phase: "prompting",
          round: view.round + 1,
          submitted: [],
          prompts: Array<FayuSentence | null>(view.players).fill(null),
          canvases: Array.from({ length: view.players }, () => []),
          fills: {},
          layers: undefined,
          finished: [],
          challenges: {},
          guesses: {},
          votes: {},
        },
      };
    }
    if (action.type === "draw-end") {
      if (view.phase !== "results") throw new Error("现在不能结束");
      if (actor !== view.host) throw new Error("只有房主可以结束");
      return { ...state, view: { ...view, phase: "finished" } };
    }
    throw new Error("操作无效");
  }

  project(state: FayuState, actor: number): FayuState {
    const { drawingHistory, ...visible } = state;
    const { view } = visible;
    if (view.phase === "results" || view.phase === "finished") return visible;
    if (view.phase === "prompting" || view.phase === "drawing") {
      return {
        ...visible,
        view: {
          ...view,
          history: view.phase === "drawing" ? drawingHistoryStatus(drawingHistory?.[actor], view.round) : undefined,
          prompts: view.prompts.map((prompt, index) => (index === actor ? prompt : null)),
          canvases: view.canvases.map((canvas, index) => (index === actor ? canvas : [])),
          ...(view.layers ? { layers: view.layers[actor] ? { [actor]: view.layers[actor] } : {} } : {}),
          fills: Object.fromEntries(
            Object.entries(view.fills).filter(([index]) => Number(index) === actor),
          ) as FayuState["view"]["fills"],
          challenges: {},
          guesses: {},
        },
      };
    }
    return {
      ...visible,
      view: {
        ...view,
        prompts: Array<FayuSentence | null>(view.players).fill(null),
        guesses: { [actor]: view.guesses[actor] ?? {} },
        votes: view.votes[actor] === undefined ? {} : { [actor]: view.votes[actor] },
      },
    };
  }
}
