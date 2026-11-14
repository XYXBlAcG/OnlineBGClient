import { describe, expect, it, vi } from "vitest";
import type { GameState, DecisionCandidate, AiResult } from "../src/domain/types";
import type { TableEvent } from "../src/domain/table-mind/model";
import {
  TableMind,
  type TableAiRequest,
  type TableMindRoom,
  type TableMindRunner,
} from "../src/server/table-mind/runtime";

const candidates: DecisionCandidate[] = [
  {
    action: { type: "uno-draw" },
    label: "摸牌",
    score: 1,
    features: [],
  },
  {
    action: { type: "uno-play", card: 7, color: 0, jump: false, saidUno: true },
    label: "出 🔴红 5️⃣",
    score: 3,
    features: [],
  },
];

const request = {
  observation: { kind: "uno" } as GameState,
  actor: 0,
  difficulty: "normal",
  driver: "llm",
  seed: "seed",
  version: 1,
  audit: true,
  tradeEnabled: false,
} satisfies TableAiRequest;

const result: AiResult = {
  actor: 0,
  chosen: candidates[0]!.action,
  difficulty: "normal",
  simulations: 0,
  audit: {
    version: "test",
    actor: 0,
    difficulty: "normal",
    seed: "seed",
    observation: request.observation,
    candidates,
    chosen: candidates[0]!.action,
    assumptions: [],
    simulations: 0,
  },
};

const room = {
  drainTableEvents: () => [] as TableEvent[],
} as unknown as TableMindRoom;

const runner = (): TableMindRunner => ({
  configured: true,
  configure: vi.fn(),
  maybeReply: vi.fn(async () => {}),
  complete: vi.fn(async () => "1"),
});

describe("TableMind", () => {
  it("observes room events into its timeline", () => {
    const events: TableEvent[] = [
      {
        id: "table:1",
        seq: 1,
        version: 1,
        at: 1,
        kind: "chat",
        label: "hi",
        public: true,
      },
    ];
    const mind = new TableMind(runner(), vi.fn());
    mind.observe({
      drainTableEvents: () => events,
    } as unknown as TableMindRoom);
    expect(mind.timeline).toEqual(events);
    mind.observe(room);
    expect(mind.timeline).toHaveLength(1);
  });

  it("lets the LLM choose a search candidate for LLM seats", async () => {
    const r = runner();
    const mind = new TableMind(r, vi.fn());
    const final = await mind.onDecision(room, request, result);
    expect(final.chosen).toEqual(candidates[1]!.action);
    expect(final.audit?.assumptions.at(-1)).toContain("LLM");
  });

  it("falls back to the search result on bad LLM choices", async () => {
    const r = runner();
    r.complete = vi.fn(async () => "not a number");
    const log = vi.fn();
    const mind = new TableMind(r, log);
    expect(await mind.onDecision(room, request, result)).toEqual(result);
    expect(log).not.toHaveBeenCalled();
  });

  it("skips LLM calls for search seats or provider failure", async () => {
    const r = runner();
    const mind = new TableMind(r, vi.fn());
    const searchRequest = { ...request, driver: "search" as const };
    expect(await mind.onDecision(room, searchRequest, result)).toEqual(result);
    expect(r.complete).not.toHaveBeenCalled();

    const disabled = { ...runner(), configured: false };
    const disabledMind = new TableMind(disabled, vi.fn());
    expect(await disabledMind.onDecision(room, request, result)).toEqual(
      result,
    );
  });

  it("delegates chat to the runner", async () => {
    const r = runner();
    const mind = new TableMind(r, vi.fn());
    const message = {
      id: "m",
      sequence: 1,
      sender: "a",
      name: "甲",
      time: 1,
      type: "text" as const,
      text: "hi",
    };
    await mind.onChat(room, message);
    expect(r.maybeReply).toHaveBeenCalledWith(room, message);
  });
});
