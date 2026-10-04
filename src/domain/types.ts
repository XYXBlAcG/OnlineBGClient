export type { GameKind } from "./catalogue";
export type Difficulty = "easy" | "normal" | "hard";
import type { Action } from "./actions";
export type { Action } from "./actions";

export interface UnoView {
  isStart: boolean;
  isEnd: boolean;
  waitFor: number;
  playerCards: number[][];
  playerFinish: number[];
  cardList: number[];
  lastCard: number[];
  topCard: number;
  currentColor: number;
  currentNumber: number;
  stateColor: number;
  currentD: boolean;
  currentPlus: number;
  isLeadCard: number;
  isAllowJumpIn: number;
  isDrawThink: number;
  playerTopCard: number[];
  drawCards: number[];
  playedCards: number[];
  lastOpInfo: {
    playerId: number;
    opType: number;
    isSaidUno: number;
    opCard: number;
    isShuffle: number;
  };
}

export interface SgsEvent {
  eventType: number;
  cardIds?: number[];
  targetPlayerPos?: number;
  playerPos?: number;
  targetPlayerPosList?: number[];
  damagedPlayerPos?: number;
  sourcePlayerPos?: number;
  [key: string]: unknown;
}

export interface SgsView {
  v: number;
  rule: number;
  roles: number[];
  stage: number;
  winners: number[];
  heroCandidates: number[][];
  hero: number[];
  heroSkills: number[][];
  playerBlood: number[];
  playerMaxBlood: number[];
  alivePlayerIds: number[];
  cardPos: number[];
  drawCardPos: { cardId: number; pos: number }[];
  drawCards: number[];
  playedCards: number[];
  playerHandCard: number[][];
  playerEquip: Record<number, [number, number]>[];
  playerJudge: [number, number][][];
  playerConn: number[];
  playerBack: number[];
  whoseTurn: number;
  whichStep: number;
  dcdType: number;
  dcdPlayerId: number;
  dcdWuXiePlayers: number[];
  eventStack: SgsEvent[];
  showCards: {
    cardId: number;
    isBack?: number;
    fromPlayerPos?: number;
    toPlayerPos?: number;
    [key: string]: unknown;
  }[];
  showLine: {
    fromPlayerPos?: number;
    toPlayerIds?: number[];
    fromPlayerPos2?: number;
    toPlayerPos2?: number;
  };
  [key: string]: unknown;
}

export interface FlightView {
  rule: number;
  state: number;
  lastDice: number;
  sixTimes: number;
  winners: number[];
  planePositionList: number[];
  lastAirline: number[];
  lastMove: number[];
  attack: number[];
  lastDicePlayer: number;
}

export interface CheckersView {
  rule: number;
  routeMode: number;
  firstId: number;
  pieceCount: number;
  mode: number;
  round: number;
  waitFor: number;
  pieces: number[];
  playerPieces: number[][];
  winnerId: number[];
  winnerRound: number[];
  lastOp: { playerId: number; route: number[] };
  recordList: { playerId: number; candidateId: number; route: number[] }[];
  finish: boolean;
  pos: number[];
}
export interface DdzView {
  rule: number;
  state: number;
  landlordId: number;
  cardPositionList: number[];
  playedCardList: number[];
  v: number;
  isFinish: boolean;
  winner: number;
  landlordWin: boolean;
  holeCardList: number[];
  playerCardLists: number[][];
  playerRestCardCounts: number[];
  canPlayAnyCards: boolean;
  lastCards: number[];
}
export type GameState =
  | { kind: "ddz"; view: DdzView }
  | { kind: "tq"; view: CheckersView }
  | { kind: "fxq"; view: FlightView }
  | { kind: "uno"; view: UnoView }
  | { kind: "sgs"; view: SgsView };
export interface Candidate {
  action: Action;
  label: string;
}
export interface Seat {
  id?: string;
  name: string;
  difficulty: Difficulty | null;
  token?: string;
  online: boolean;
  ready: boolean;
  automaticName?: boolean;
}
export interface Feature {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}
export interface DecisionCandidate extends Candidate {
  score: number;
  features: Feature[];
  simulation?: { samples: number; mean: number; standardError: number };
}
export interface Decision {
  version: string;
  actor: number;
  difficulty: Difficulty;
  seed: string;
  observation: GameState;
  candidates: DecisionCandidate[];
  chosen: Action;
  assumptions: string[];
  simulations: number;
}
