import { describe, expect, it } from "vitest";
import { Replay } from "../src/domain/replay";
import { generateFayuSentence } from "../src/domain/fayu/generator";
import { fayuBuiltinPool } from "../src/domain/fayu/words";
import { Room } from "../src/domain/room";
import { SnapshotReplica } from "../src/domain/sync";

function createRoom() {
  const room = new Room(
    "fayu-canvas",
    { kind: "drawguess", drawguess: { mode: "fayu" }, humans: 3, ai: [], team: false, training: false },
    "fayu-canvas",
  );
  const tokens = [room.claim("A"), room.claim("B"), room.claim("C")];
  room.seats.forEach((seat) => {
    seat.ready = true;
  });
  room.start(tokens[0]);
  return { room, tokens };
}

describe("fayu canvas sync channel", () => {
  it("keeps canvases out of the state channel and merges them at the client", () => {
    const { room, tokens } = createRoom();
    const snapshot = room.snapshot(tokens[0]);
    if (snapshot.state?.kind !== "drawguess" || snapshot.state.mode !== "fayu") throw new Error("wrong game");
    expect(snapshot.canvas).toBeDefined();
    expect(snapshot.canvas?.canvases).toHaveLength(3);
    expect(snapshot.canvas?.fills).toEqual({});
    expect(snapshot.state.view.canvases.every((canvas) => canvas.length === 0)).toBe(true);
    expect(snapshot.state.view.fills).toEqual({});
    const merged = new SnapshotReplica().apply({
      type: "snapshot",
      snapshot,
      revision: 1,
    });
    if (merged?.state?.kind !== "drawguess" || merged.state.mode !== "fayu") throw new Error("wrong merged game");
    expect(merged.state.view.canvases).toEqual(snapshot.canvas?.canvases);
  });

  it("sends the canvas channel independently from repeated state patches", () => {
    const { room, tokens } = createRoom();
    const first = room.snapshot(tokens[0]);
    const second = room.snapshot(tokens[0]);
    expect(first.canvas).toBeDefined();
    expect(second.canvas).toBeDefined();
    expect(JSON.stringify(second.canvas)).toBe(JSON.stringify(first.canvas));
  });
});

it("gives the unseated host exclusive round control and records rounds independently", () => {
  const room = new Room("fayu-host", { kind: "drawguess", drawguess: { mode: "fayu" }, humans: 2, ai: [], team: false, training: false });
  const host = room.createHost("Host");
  const players = [room.claim("A"), room.claim("B")];
  const spectator = room.watch("Guest");
  for (const seat of room.seats) seat.ready = true;
  room.start(host);
  const view = () => {
    const state = room.state;
    if (state?.kind !== "drawguess" || state.mode !== "fayu") throw new Error("wrong game");
    return state.view;
  };
  const send = (token: string, action: Parameters<Room["act"]>[3]) =>
    room.act(token, String(room.version), room.version, action);
  expect(room.snapshot(host).state?.kind).toBe("drawguess");
  for (const token of players) {
    const { templateId, words } = generateFayuSentence(fayuBuiltinPool, () => 0.37);
    send(token, { type: "draw-prompt", round: 0, templateId, words });
  }
  const privateState = room.snapshot(host).state;
  if (privateState?.kind !== "drawguess" || privateState.mode !== "fayu") throw new Error("wrong projected game");
  expect(privateState.view.prompts).toEqual([null, null]);
  for (const token of players) send(token, { type: "draw-finish", round: 0 });
  const prompt = view().prompts[1]!;
  send(players[0], { type: "draw-cloze", round: 0, drawing: 1, templateId: prompt.templateId, words: prompt.words });
  expect(room.resolveIfDue(Date.now() + 600_000)).toBe(true);
  expect(view().phase).toBe("results");
  const scores = [...view().scores];
  expect(scores[0]).toBeGreaterThan(0);
  const next = { type: "draw-round", round: 0 } as const;
  expect(() => send(players[0], next)).toThrow("房主");
  expect(() => send(spectator, next)).toThrow("房主");
  const playId = room.playId;
  send(host, next);
  expect(room.playId).toBe(playId);
  const archive = room.export();
  expect(archive.records).toHaveLength(1);
  expect(new Replay(archive.records[0]).frame(archive.records[0].events.length)).toMatchObject({
    view: { phase: "results", round: 0, scores },
  });
  expect(new Replay(archive.replay).frame(0)).toMatchObject({
    view: { phase: "prompting", round: 1, scores },
  });
  const restored = Room.restore({ ...archive, checkpoint: undefined });
  expect(restored.state).toEqual(room.state);
  expect(restored.playId).toBe(playId);

  for (let i = 0; i < 3; i++) expect(room.resolveIfDue(Date.now() + 600_000)).toBe(true);
  const end = { type: "draw-end", round: 1 } as const;
  expect(() => send(spectator, end)).toThrow("房主");
  send(host, end);
  expect(room.snapshot(host).finished).toBe(true);
  const last = room.export().replay!;
  expect(new Replay(last).frame(last.events.length)).toEqual(room.state);

});

it("accepts late social events in a legacy long record", () => {
  const { room, tokens } = createRoom();
  room.chat(tokens[0], "late-dice", "/roll 1d6");
  const record = room.export().replay!;
  const events = Array.from({ length: 20_608 }, (_, version) => ({
    type: "resolution" as const, seed: "", version,
  }));
  expect(new Replay({
    ...record,
    events,
    social: [{ ...record.social![0]!, frame: 20_607 }],
  }).record.events).toHaveLength(20_608);
});

it("settles two-player Fayu after both guesses without moving the clock", () => {
  const room = new Room("fayu-pair", { kind: "drawguess", drawguess: { mode: "fayu" }, humans: 2, ai: [], team: false, training: false });
  const members = ["A", "B"].map((name) => room.claim(name));
  room.setReady(members[1]!, true);
  room.start(members[0]!);
  for (let i = 0; i < 2; i++) expect(room.resolveIfDue(Date.now() + 600_000)).toBe(true);
  for (const [actor, token] of members.entries()) {
    const state = room.state;
    if (state?.kind !== "drawguess" || state.mode !== "fayu") throw Error();
    const drawing = 1 - actor;
    const { templateId, words } = state.view.prompts[drawing]!;
    room.act(token, `guess-${actor}`, room.version, { type: "draw-cloze", round: 0, drawing, templateId, words });
  }
  expect(room.state).toMatchObject({ view: { phase: "results" } });
  const record = room.export().replay!;
  expect(new Replay(record).frame(record.events.length)).toEqual(room.state);
});

it("restores only the acting player's drawing after the room is reopened", () => {
  let { room, tokens } = createRoom();
  const { templateId, words } = generateFayuSentence(fayuBuiltinPool, () => 0.37);
  const send = (token: string, action: Parameters<Room["act"]>[3]) =>
    room.act(token, String(room.version), room.version, action);
  for (const token of tokens)
    send(token, { type: "draw-prompt", round: 0, templateId, words });
  for (const [index, token] of tokens.entries())
    send(token, { type: "draw-stroke", round: 0, id: `stroke-${index}`, ink: "ink", part: 0, points: [[25, 25]] });
  room = Room.restore(JSON.parse(JSON.stringify(room.export())));
  tokens.forEach((token, index) => room.claim(String(index), token));
  const first = tokens[0]!;
  const before = room.snapshot(first);
  expect(before.state).not.toHaveProperty("drawingHistory");
  expect(before.state?.view).toHaveProperty("history", { revision: 1, undo: 1, redo: 0 });
  send(first, { type: "draw-history", round: 0, direction: "undo" });
  expect(room.snapshot(first).canvas?.canvases[0]).toEqual([]);
  expect(room.snapshot(tokens[1]!).canvas?.canvases[1]?.map(({ id }) => id)).toEqual(["stroke-1"]);
  send(first, { type: "draw-history", round: 0, direction: "redo" });
  expect(room.snapshot(first).canvas?.canvases[0]?.map(({ id }) => id)).toEqual(["stroke-0"]);
});
