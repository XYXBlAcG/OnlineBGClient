import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import type { DecisionCandidate } from "../src/domain/types";
import {
  buildUnoSituation,
  unoCardLabel,
} from "../src/domain/table-mind/perspectives/uno";

const aiTurn = (room: Room, token: string, attempts = 8) => {
  for (let index = 0; index < attempts; index++) {
    const request = room.aiRequest();
    if (request) return request;
    const candidates = room.snapshot(token).candidates;
    const action = candidates[0]?.action;
    if (!action) break;
    room.act(token, `move-${index}`, room.version, action);
  }
  throw new Error("未进入 AI 回合");
};

it("builds an UNO decision situation from the seat projection", () => {
  const room = new Room("uno-perspective", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "normal", name: "青竹" }],
    team: false,
    training: false,
  });
  const token = room.claim("我");
  room.start(token);
  const request = aiTurn(room, token);
  if (request.observation.kind !== "uno") throw new Error("不是 UNO 局面");
  const candidates: DecisionCandidate[] = room.engine
    .candidates(request.observation, request.actor)
    .map((candidate, index) => ({
      ...candidate,
      score: 2 - index,
      features: [],
    }));
  const situation = buildUnoSituation({
    observation: request.observation,
    actor: request.actor,
    candidates,
    players: room.publicContext().players,
    events: room.drainTableEvents(),
    memory: [],
  });

  expect(situation.scene.game).toBe("UNO");
  expect(situation.selfFacts.join("\n")).toContain("我的手牌");
  expect(situation.publicFacts.join("\n")).toContain("玩家手牌数");
  expect(situation.candidates).toHaveLength(Math.min(candidates.length, 8));
  expect(JSON.stringify(situation)).not.toContain("playerCards");

});

it("never includes another seat's hidden hand", () => {
  const view = {
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
    playerCards: [[5], [31, 57]],
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
  };
  const situation = buildUnoSituation({
    observation: { kind: "uno", view } as never,
    actor: 0,
    candidates: [
      { action: { type: "uno-draw" }, label: "摸牌", score: 1, features: [] },
    ],
    players: ["甲", "乙"],
    events: [],
    memory: [],
  });
  const serialized = JSON.stringify(situation);
  expect(serialized).not.toContain(unoCardLabel(31));
  expect(serialized).not.toContain(unoCardLabel(57));
  expect(situation.selfFacts.join()).toContain(unoCardLabel(5));
});
