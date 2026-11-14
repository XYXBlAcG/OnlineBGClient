import { describe, expect, it, vi } from "vitest";
import type { GameState, DecisionCandidate, AiResult } from "../src/domain/types";
import type { TableEvent } from "../src/domain/table-mind/model";
import { defaultCompanionConfig } from "../src/domain/companion";
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
  observation: {
    kind: "uno",
    view: {
      isStart: true,
      waitFor: 0,
      currentColor: 0,
      currentNumber: 0,
      currentD: 1,
      currentPlus: 0,
      isLeadCard: 0,
      isAllowJumpIn: 0,
      isDrawThink: 0,
      topCard: 0,
      lastCard: [0],
      cardList: [],
      drawCards: [],
      playedCards: [0],
      playerCards: [[0], [1]],
      playerTopCard: [],
      playerFinish: [0, 0],
      lastOpInfo: {
        playerId: 0,
        opType: 0,
        isSaidUno: 0,
        opCard: 0,
        isShuffle: 0,
      },
      teamMode: false,
      teams: [],
      teamWinner: null,
    },
  } as unknown as GameState,
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
  id: "room-1",
  hasEnded: false,
  playId: "play-1",
  config: { companion: defaultCompanionConfig },
  companionProfile: () => null,
  drainTableEvents: () => [] as TableEvent[],
  addCompanionMessage: () => undefined,
  publicContext: () => ({
    game: "UNO",
    phase: "playing",
    players: ["甲", "青竹"],
    recentChat: [],
  }),
} as unknown as TableMindRoom;

const runner = (): TableMindRunner => ({
  configured: true,
  configure: vi.fn(),
  complete: vi.fn(async () => "1"),
});

describe("TableMind", () => {
  it("observes room events into its timeline", async () => {
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
    const mind = new TableMind(runner(), { log: vi.fn() });
    await mind.tick({
      ...room,
      drainTableEvents: () => events,
    } as unknown as TableMindRoom);
    expect(mind.timeline).toEqual(events);
    await mind.tick(room);
    expect(mind.timeline).toHaveLength(1);
  });

  it("lets the LLM choose a search candidate for LLM seats", async () => {
    const r = runner();
    const mind = new TableMind(r, { log: vi.fn() });
    const final = await mind.onDecision(room, request, result);
    expect(final.chosen).toEqual(candidates[1]!.action);
    expect(final.audit?.assumptions.at(-1)).toContain("UNO");
  });

  it("falls back to the search result on bad LLM choices", async () => {
    const r = runner();
    r.complete = vi.fn(async () => "not a number");
    const log = vi.fn();
    const mind = new TableMind(r, { log });
    expect(await mind.onDecision(room, request, result)).toEqual(result);
    expect(log).not.toHaveBeenCalled();
  });

  it("includes UNO state, candidates and memory in the decision prompt", async () => {
    const r = runner();
    r.complete = vi.fn(async () => "0");
    const mind = new TableMind(r, { log: vi.fn() });
    await mind.tick({
      ...room,
      drainTableEvents: () => [
        {
          id: "table:1",
          seq: 1,
          version: 1,
          at: 1,
          kind: "chat",
          actor: "a",
          actorName: "甲",
          label: "先出红牌",
          public: true,
        },
      ],
    } as unknown as TableMindRoom);
    await mind.onDecision(room, request, result);
    expect(r.complete).toHaveBeenCalledWith(
      expect.stringContaining("只输出候选编号"),
      expect.stringContaining("我的手牌"),
      24,
      6000,
    );
    expect((r.complete as ReturnType<typeof vi.fn>).mock.calls[0]![1]).toContain(
      "先出红牌",
    );
  });

  it("skips LLM calls for search seats or provider failure", async () => {
    const r = runner();
    const mind = new TableMind(r, { log: vi.fn() });
    const searchRequest = { ...request, driver: "search" as const };
    expect(await mind.onDecision(room, searchRequest, result)).toEqual(result);
    expect(r.complete).not.toHaveBeenCalled();

    const disabled = { ...runner(), configured: false };
    const disabledMind = new TableMind(disabled, { log: vi.fn() });
    expect(await disabledMind.onDecision(room, request, result)).toEqual(
      result,
    );
  });

});
