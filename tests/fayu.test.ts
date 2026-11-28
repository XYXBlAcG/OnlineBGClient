import { describe, expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { gameCatalogue } from "../src/domain/catalogue";
import { Room } from "../src/domain/room";
import { fayuTemplates, fayuTemplateById } from "../src/domain/fayu/templates";
import { generateFayuSentence, validateFayuSentence } from "../src/domain/fayu/generator";
import { fayuBuiltinPool } from "../src/domain/fayu/words";
import type { FayuState } from "../src/domain/fayu/types";
import type { GameState } from "../src/domain/types";

function fayu(state: GameState): FayuState {
  if (state.kind !== "drawguess" || state.mode !== "fayu") throw new Error("not fayu");
  return state;
}

function create(engine: GameEngine) {
  return fayu(engine.create("drawguess", 3, "fayu:test", false, { drawguess: { mode: "fayu" } }));
}

function submitPrompts(engine: GameEngine, state: FayuState) {
  let next = state;
  for (let actor = 0; actor < 3; actor++) {
    const sentence = generateFayuSentence(fayuBuiltinPool, () => 0.37 + actor * 0.11);
    next = fayu(
      engine.apply(
        next,
        actor,
        {
          type: "draw-prompt",
          round: state.view.round,
          templateId: sentence.templateId,
          words: sentence.words,
        },
        `prompt:${actor}`,
      ),
    );
  }
  return next;
}

describe("fayu templates and generator", () => {
  it("has 20 grammar templates with matching slot contracts", () => {
    expect(fayuTemplates.length).toBeGreaterThanOrEqual(20);
    for (const template of fayuTemplates) {
      expect(fayuTemplateById.get(template.id)).toBe(template);
      const words = template.slots.map((slot) => {
        const pos = slot.kind === "verb" || slot.kind === "verb2" ? "verb" : slot.kind === "proper" ? "proper" : slot.kind === "place" ? "place" : slot.kind === "adv" ? "adv" : slot.kind === "adj" ? "adj" : "noun";
        return fayuBuiltinPool.words.filter((word) => word.pos === pos)[0]!.word;
      });
      const sentence = generateFayuSentence(fayuBuiltinPool, () => 0.5);
      expect(sentence.text).not.toContain("{");
      expect(validateFayuSentence(sentence.templateId, sentence.words)).not.toBeNull();
      expect(words).toHaveLength(template.slots.length);
    }
  });

  it("separates proper nouns from common nouns", () => {
    expect(fayuTemplates.length).toBeGreaterThanOrEqual(20);
    expect(
      fayuBuiltinPool.words.some(
        (word) => word.pos === "proper" && word.word === "鬼灭之刃",
      ),
    ).toBe(true);
    expect(
      fayuBuiltinPool.words.some(
        (word) => word.pos === "noun" && word.word === "鬼灭之刃",
      ),
    ).toBe(false);
    expect(fayuBuiltinPool.words.length).toBeGreaterThan(500);
  });

  it("generates reproducible, drawable sentences", () => {
    const first = generateFayuSentence(fayuBuiltinPool, () => 0.31);
    const second = generateFayuSentence(fayuBuiltinPool, () => 0.31);
    expect(second).toEqual(first);
    expect(first.text.length).toBeLessThanOrEqual(60);
    expect(first.words.every((word) => first.text.includes(word))).toBe(true);
  });
});

describe("fayu rules", () => {
  it("runs prompting, simultaneous drawing, guessing and endless rounds", () => {
    const engine = new GameEngine();
    let state = submitPrompts(engine, create(engine));
    expect(state.view.submitted).toEqual([0, 1, 2]);
    expect(state.view.prompts.every(Boolean)).toBe(true);

    expect(state.view.phase).toBe("drawing");
    for (let actor = 0; actor < 3; actor++)
      state = fayu(
        engine.apply(
          state,
          actor,
          {
            type: "draw-stroke",
            round: 0,
            id: `stroke-${actor}`,
            part: 0,
            ink: "ink",
            points: [[10, 10]],
            tool: "brush",
            color: "#2f2a24",
            width: 6,
            opacity: 1,
          },
          `stroke:${actor}`,
        ),
      );
    for (let actor = 0; actor < 3; actor++)
      state = fayu(engine.apply(state, actor, { type: "draw-finish", round: 0 }, `finish:${actor}`));
    expect(state.view.phase).toBe("guessing");
    expect(state.view.challenges[0]!.wordBank.length).toBeGreaterThan(3);

    const target = state.view.prompts[1]!;
    const challenge = state.view.challenges[1]!;
    expect(challenge.templateChoices).toContain(target.templateId);
    state = fayu(
      engine.apply(
        state,
        0,
        {
          type: "draw-cloze",
          round: 0,
          drawing: 1,
          templateId: target.templateId,
          words: target.words,
        },
        "guess:0",
      ),
    );
    expect(state.view.scores[0]).toBe(3);
    expect(state.view.scores[1]).toBe(1);

    state = fayu(
      engine.apply(
        state,
        2,
        {
          type: "draw-cloze",
          round: 0,
          drawing: 1,
          templateId: challenge.templateChoices.find((id) => id !== target.templateId)!,
          words: challenge.wordBank.slice(0, fayuTemplateById.get(target.templateId)!.slots.length),
        },
        "guess:2",
      ),
    );
    expect(state.view.scores[2]).toBe(0);
    state = fayu(
      engine.apply(
        state,
        2,
        {
          type: "draw-cloze",
          round: 0,
          drawing: 1,
          templateId: target.templateId,
          words: target.words,
        },
        "guess:2b",
      ),
    );
    expect(state.view.scores[2]).toBe(2);

    state = fayu(engine.apply(state, 0, { type: "draw-vote", round: 0, drawing: 1 }, "vote:0"));
    state = fayu(engine.apply(state, 2, { type: "draw-vote", round: 0, drawing: 1 }, "vote:2"));
    state = fayu(engine.resolve(state, "fayu:r3"));
    expect(state.view.phase).toBe("results");
    expect(state.view.scores[1]).toBe(6);
    state = fayu(engine.apply(state, 0, { type: "draw-round", round: 0 }, "next"));
    expect(state.view.phase).toBe("prompting");
    expect(state.view.round).toBe(1);
    expect(state.view.scores[0]).toBe(3);

    const submitting = submitPrompts(engine, state);
    expect(submitting.view.phase).toBe("drawing");
    let nextRound = submitting;
    for (let index = 0; index < 3; index++)
      nextRound = fayu(engine.apply(nextRound, index, { type: "draw-finish", round: 1 }, `finish2:${index}`));
    expect(nextRound.view.phase).toBe("guessing");
    nextRound = fayu(engine.resolve(nextRound, "fayu:r6"));
    expect(nextRound.view.phase).toBe("results");
    const ended = fayu(
      engine.apply(nextRound, 0, { type: "draw-end", round: 1 }, "end"),
    );
    expect(ended.view.phase).toBe("finished");
    expect(engine.finished(ended)).toBe(true);
  });

  it("accepts simultaneous room actions from the same snapshot version", () => {
    const room = new Room("fayu-room", {
      kind: "drawguess",
      drawguess: { mode: "fayu" },
      humans: 2,
      ai: [],
      team: false,
      training: false,
    });
    const tokens = [room.claim("A"), room.claim("B")];
    room.seats.forEach((seat) => { seat.ready = true; });
    room.start(tokens[0]);
    const version = room.snapshot(tokens[0]).version;
    const prompts = [
      { templateId: "t1", words: ["巨大", "长颈鹿", "森林", "慢慢", "跳舞"] },
      { templateId: "t2", words: ["企鹅", "透明", "闹钟", "悄悄", "吃"] },
    ];
    prompts.forEach((prompt, index) =>
      room.act(tokens[index], `prompt-${index}`, version, {
        type: "draw-prompt",
        round: 0,
        ...prompt,
      }),
    );
    expect(room.state?.kind === "drawguess" && room.state.mode === "fayu" && room.state.view.phase).toBe("drawing");
    const drawingVersion = room.snapshot(tokens[0]).version;
    room.act(tokens[0], "draw-a", drawingVersion, {
      type: "draw-stroke",
      round: 0,
      id: "a",
      part: 0,
      ink: "ink",
      points: [[10, 10]],
    });
    room.act(tokens[1], "draw-b", drawingVersion, {
      type: "draw-stroke",
      round: 0,
      id: "b",
      part: 0,
      ink: "ink",
      points: [[20, 20]],
    });
    expect(room.state?.kind === "drawguess" && room.state.mode === "fayu" && room.state.view.phase).toBe("drawing");
  });

  it("hides other prompts and canvases while playing", () => {
    const engine = new GameEngine();
    let state = submitPrompts(engine, create(engine));
    const view = fayu(engine.project(state, 0)).view;
    expect(view.prompts[0]).not.toBeNull();
    expect(view.prompts[1]).toBeNull();
    expect(view.canvases[1]).toEqual([]);
    for (let index = 0; index < 3; index++)
      state = fayu(engine.apply(state, index, { type: "draw-finish", round: 0 }, `finish-p:${index}`));
    const guessing = state;
    const guessingView = fayu(engine.project(guessing, 1)).view;
    expect(guessingView.prompts.every((prompt) => prompt === null)).toBe(true);
    expect(guessingView.challenges[0]).toBeDefined();
  });
});

it("keeps layer edits private during simultaneous drawing and preserves legacy fills through undo", () => {
  const engine = new GameEngine();
  let state = submitPrompts(engine, create(engine));
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aetsAAAAASUVORK5CYII=";
  state = fayu(engine.apply(state, 0, { type: "draw-fill", round: 0, layer: 1, data: png }, "legacy-fill"));
  state = fayu(engine.apply(state, 0, { type: "draw-layer", round: 0, move: { type: "remove", layer: 1 } }, "remove-layer"));
  expect(state.view.fills[0]).toEqual([]);
  state = fayu(engine.apply(state, 0, { type: "draw-history", round: 0, direction: "undo" }, "undo-remove"));
  state = fayu(engine.apply(state, 0, { type: "draw-layer", round: 0, move: { type: "rename", layer: 1, name: "线稿" } }, "rename-layer"));
  const artist = fayu(engine.project(state, 0));
  const opponent = fayu(engine.project(state, 1));
  expect(artist.view.layers?.[0]).toContainEqual({ id: 1, name: "线稿" });
  expect(artist.view.fills[0]).toEqual([expect.objectContaining({ data: png })]);
  expect(opponent.view.layers?.[0]).toBeUndefined();
  expect(opponent.view.fills[0]).toBeUndefined();
});
