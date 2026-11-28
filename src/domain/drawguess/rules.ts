import { applyDrawingDocument } from "./canvas-document";
import { drawingHistoryStatus, editDrawingHistory } from "./canvas-history";
import { nextCanvasOrder } from "./canvas-order";
import type { Action } from "../actions";
import {
  drawFillLimit,
  drawHeight,
  drawPointLimit,
  drawRevealMs,
  drawRoundMs,
  drawStrokeLimit,
  drawWidth,
  type DrawState,
  type DrawView,
} from "./types";
import {
  drawguessBuiltinWords,
  drawWordBank,
  uniqueDrawWords,
  type DrawWord,
} from "./words";



function normalize(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[\s\p{P}]/gu, "")
    .toLowerCase();
}

export class DrawRules {
  constructor(private readonly random: () => number) {}

  private round(
    index: number,
    word: number,
    scores: number[],
    bank: DrawWord[],
  ): DrawView {
    const entry = bank[word] ?? drawguessBuiltinWords[0]!;
    const prompt = entry.word;
    const category = entry.category;
    return {
      phase: "drawing",
      artist: index,
      players: scores.length,
      round: index,
      strokes: [],
      fills: [],
      pointsUsed: 0,
      scores,
      solved: [],
      guesses: {},
      hint: `${category} · ${prompt.length} 个字`,
      prompt,
    };
  }

  create(
    players: number,
    _team = false,
    options?: {
      drawguess?: {
        words?: DrawWord[];
        pool?: DrawWord[];
        drawingSeconds?: number;
        wordSource?: "all" | "custom";
      };
    },
  ): DrawState {
    const customOnly = options?.drawguess?.wordSource === "custom";
    const bank = customOnly
      ? uniqueDrawWords(options?.drawguess?.pool ?? options?.drawguess?.words ?? [])
      : options?.drawguess?.pool
        ? uniqueDrawWords(options.drawguess.pool)
        : drawWordBank(options?.drawguess?.words);
    if (bank.length < players)
      throw new Error(
        customOnly
          ? "自定义词库不足，至少需要与玩家人数相同的词"
          : "可用题词少于玩家人数",
      );
    const drawingMs = Math.min(
      300_000,
      Math.max(15_000, Math.round((options?.drawguess?.drawingSeconds ?? 75) * 1000)),
    );
    const choices = bank.map((_, index) => index);
    const words = Array.from(
      { length: players },
      () => choices.splice(Math.floor(this.random() * choices.length), 1)[0]!,
    );
    return {
      kind: "drawguess",
      mode: "classic",
      words,
      bank,
      drawingMs,
      view: this.round(0, words[0]!, Array<number>(players).fill(0), bank),
    };
  }

  finished({ view }: DrawState) {
    return view.phase === "finished";
  }

  actors({ view }: DrawState) {
    if (view.phase === "finished") return [];
    if (view.phase === "reveal") return [view.artist];
    return view.scores.flatMap((_, actor) =>
      view.solved.includes(actor) ? [] : [actor],
    );
  }

  candidates({ view }: DrawState, actor: number) {
    return actor === view.artist && view.phase === "reveal"
      ? [
          {
            action: { type: "draw-next" as const, round: view.round },
            label: "继续",
          },
        ]
      : [];
  }

  project({ view, drawingHistory }: DrawState, actor: number): DrawState {
    const { prompt, ...visible } = view;
    return {
      kind: "drawguess",
      mode: "classic",
      view: {
        ...visible,
        history: actor === view.artist && view.phase === "drawing" ? drawingHistoryStatus(drawingHistory, view.round) : undefined,
        ...(view.phase !== "drawing" || actor === view.artist
          ? { prompt }
          : {}),
        guesses: view.guesses[actor] ? { [actor]: view.guesses[actor] } : {},
      },
    };
  }

  apply(state: DrawState, actor: number, action: Action): DrawState {
    const { view } = state;
    if (
      !("round" in action) ||
      action.round !== view.round ||
      !this.actors(state).includes(actor)
    )
      throw new Error("这一轮已经更新");
    if (action.type === "draw-next" && actor === view.artist)
      return this.resolve(state);
    if (view.phase !== "drawing") throw new Error("已经揭晓答案");

    if (action.type === "draw-guess" && actor !== view.artist) {
      const attempts = (view.guesses[actor]?.attempts ?? 0) + 1;
      if (attempts > 30) throw new Error("本轮猜词次数已用完");
      const entry =
        state.bank?.[state.words![view.round]!] ?? drawguessBuiltinWords[0]!;
      const correct = [entry.word, ...entry.aliases].some(
        (value) => normalize(value) === normalize(action.text),
      );
      const guesses = { ...view.guesses, [actor]: { attempts, correct } };
      if (!correct) return { ...state, view: { ...view, guesses } };
      const solved = [...view.solved, actor];
      const scores = [...view.scores];
      scores[actor] += solved.length === 1 ? 3 : 2;
      scores[view.artist]++;
      return {
        ...state,
        drawingHistory: solved.length === view.players - 1 ? undefined : state.drawingHistory,
        view: {
          ...view,
          guesses,
          scores,
          solved,
          phase: solved.length === view.players - 1 ? "reveal" : "drawing",
        },
      };
    }

    if (actor !== view.artist) throw new Error("只有画手可以操作画布");
    let next = state;
    const edit = editDrawingHistory(state.drawingHistory, view.round, action, {
      strokes: view.strokes, fills: view.fills ?? [], layers: view.layers,
    }, () => {
      next = this.applyDrawing(state, action);
      return { strokes: next.view.strokes, fills: next.view.fills ?? [], layers: next.view.layers };
    });
    if (!edit) throw new Error("画布操作无效");
    if (action.type === "draw-history") {
      next = { ...state, view: {
        ...view, ...edit.drawing,
        pointsUsed: edit.drawing.strokes.reduce((total, stroke) => total + stroke.points.length, 0),
      } };
    }
    return { ...next, drawingHistory: edit.history };
  }

  private applyDrawing(state: DrawState, action: Action): DrawState {
    const { view } = state;
    const drawing = applyDrawingDocument({ strokes: view.strokes, fills: view.fills ?? [], layers: view.layers }, action, drawFillLimit, () => `fill-${this.random()}`);
    if (drawing) return { ...state, view: {
      ...view, ...drawing, pointsUsed: drawing.strokes.reduce((sum, { points }) => sum + points.length, 0),
    } };
    if (action.type === "draw-restore") {
      if (view.phase !== "drawing") throw new Error("现在不能恢复");
      const pointsUsed = action.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
      if (pointsUsed > drawPointLimit) throw new Error("本轮画布已写满");
      return {
        ...state,
        view: {
          ...view,
          pointsUsed,
          strokes: action.strokes.map((stroke) => ({ ...stroke, nextPart: 0 })),
          fills: action.fills,
        },
      };
    }
    if (action.type === "draw-fill") {
      if (view.phase !== "drawing") throw new Error("现在不能填充");
      if (!action.data.startsWith("data:image/png;base64,"))
        throw new Error("填充图像无效");
      if ((view.fills?.length ?? 0) >= drawFillLimit) throw new Error("填充次数已用完");
      const fills = [...(view.fills ?? []), { id: `fill-${this.random()}`, layer: action.layer, data: action.data, order: nextCanvasOrder(view.strokes, view.fills ?? []) }];
      const next = { ...view, fills };
      return { ...state, view: next };
    }
    if (action.type === "draw-clear") {
      if (view.phase !== "drawing") throw new Error("现在不能清空");
      const strokes = action.layer === undefined ? [] : view.strokes.filter((stroke) => (stroke.layer ?? 0) !== action.layer);
      const fills = action.layer === undefined ? [] : (view.fills ?? []).filter((fill) => fill.layer !== action.layer);
      return {
        ...state,
        view: { ...view, strokes, fills, pointsUsed: strokes.reduce((sum, stroke) => sum + stroke.points.length, 0) },
      };
    }
    if (action.type === "draw-transform") {
      if (view.phase !== "drawing") throw new Error("现在不能移动");
      const ids = new Set(action.ids);
      return {
        ...state,
        view: {
          ...view,
          strokes: view.strokes.map((stroke) =>
            ids.has(stroke.id)
              ? {
                  ...stroke,
                  points: stroke.points.map(([x, y]) => [
                    Math.min(drawWidth, Math.max(0, x + action.dx)),
                    Math.min(drawHeight, Math.max(0, y + action.dy)),
                  ]),
                }
              : stroke,
          ),
        },
      };
    }
    if (action.type === "draw-delete") {
      if (view.phase !== "drawing") throw new Error("现在不能删除");
      const ids = new Set(action.ids);
      const strokes = view.strokes.filter((stroke) => !ids.has(stroke.id));
      return { ...state, view: { ...view, strokes, pointsUsed: strokes.reduce((sum, stroke) => sum + stroke.points.length, 0) } };
    }
    const last = view.strokes.at(-1);
    if (action.type === "draw-undo" && last?.id === action.id)
      return {
        ...state,
        view: { ...view, strokes: view.strokes.slice(0, -1), pointsUsed: view.pointsUsed - last.points.length },
      };
    if (action.type !== "draw-stroke") throw new Error("画布操作无效");
    const pointsUsed = view.strokes.reduce((sum, stroke) => sum + stroke.points.length, action.points.length);
    if (pointsUsed > drawPointLimit) throw new Error("本轮画布已写满");
    if (action.part === 0) {
      if (
        view.strokes.length >= drawStrokeLimit ||
        view.strokes.some(({ id }) => id === action.id)
      )
        throw new Error("画笔数量超出限制或笔画已存在");
      return {
        ...state,
        view: {
          ...view,
          pointsUsed,
          strokes: [
            ...view.strokes,
            {
              id: action.id,
              ink: action.ink,
              nextPart: 1,
              order: nextCanvasOrder(view.strokes, view.fills ?? []),
              points: action.points,
              tool: action.tool,
              text: action.text,
              color: action.color,
              width: action.width,
              opacity: action.opacity,
              layer: action.layer,
            },
          ],
        },
      };
    }
    if (
      !last ||
      last.id !== action.id ||
      last.nextPart !== action.part ||
      last.ink !== action.ink
    )
      throw new Error("笔画顺序已更新");
    return {
      ...state,
      view: {
        ...view,
        pointsUsed,
        strokes: [
          ...view.strokes.slice(0, -1),
          {
            ...last,
            nextPart: last.nextPart + 1,
            points: [...last.points, ...action.points],
          },
        ],
      },
    };
  }

  needsResolution(state: DrawState) {
    return !this.finished(state);
  }

  resolutionDelay(state: DrawState) {
    return state.view.phase === "drawing"
      ? state.drawingMs ?? drawRoundMs
      : drawRevealMs;
  }

  resolve(state: DrawState): DrawState {
    const { view } = state;
    if (view.phase === "drawing")
      return { ...state, drawingHistory: undefined, view: { ...view, phase: "reveal" } };
    if (view.phase === "finished") throw new Error("画局已结束");
    const round = view.round + 1;
    return {
      ...state,
      view:
        round === view.players
          ? { ...view, phase: "finished" }
          : this.round(
              round,
              state.words![round]!,
              view.scores,
              state.bank ?? drawguessBuiltinWords,
            ),
    };
  }

  acceptsLateActions({ view }: DrawState) {
    return view.phase === "drawing";
  }

  actionWindow({ view }: DrawState, action: Action) {
    return view.phase === "drawing" &&
      [
        "draw-stroke",
        "draw-guess",
        "draw-fill",
        "draw-layer",
        "draw-region",
        "draw-move-selection",
        "draw-clear",
        "draw-transform",
        "draw-delete",
        "draw-restore",
        "draw-history",
        "draw-undo",
      ].includes(action.type)
      ? `drawing:${view.round}`
      : undefined;
  }
}
