import type { RelicId, PotionId } from "./world";
import type {
  CardId,
  CardInstance,
  Intent,
  EncounterDefinition,
} from "./content";
export interface Fighter {
  hp: number;
  maxHp: number;
  block: number;
  strength: number;
  vulnerable: number;
  poison: number;
  weak: number;
  dexterity: number;
  thorns: number;
  regen: number;
}
export interface Hero extends Fighter {
  profession: number;
  gold: number;
  relics: RelicId[];
  potions: PotionId[];
  relicUses: Partial<Record<RelicId, number>>;
  name: string;
  energy: number;
  hand: CardInstance[];
  deck: CardInstance[];
  discard: CardInstance[];
  played: CardInstance[];
  exhaust: CardInstance[];
  ready: boolean;
  shuffles: number;
}
export interface Enemy extends Fighter {
  name: string;
  icon: string;
  intent: Intent;
}
export type Target = { side: "hero" | "enemy"; index: number };
export type Reward =
  | { kind: "card"; card: CardId }
  | { kind: "heal" }
  | { kind: "upgrade" }
  | { kind: "skip" };
export type ExpeditionAction =
  | { type: "play"; actor: number; instance: string; target?: Target }
  | { type: "ready" | "unready"; actor: number }
  | { type: "reward"; actor: number; reward: Reward }
  | { type: "continue" };
export interface TurnRecord {
  encounter: number;
  round: number;
  damage: number;
  blocked: number;
  healthLost: number;
  cards: number;
}
export interface VisualEvent {
  kind: "damage" | "block" | "heal" | "status";
  target: Target;
  amount: number;
  source?: number;
  origin?: Target;
}
export interface ExpeditionState {
  seed: string;
  encounter: number;
  round: number;
  phase: "setup" | "combat" | "reward" | "won" | "lost";
  scenario: EncounterDefinition[];
  battleSerial: number;
  heroes: Hero[];
  enemies: Enemy[];
  nextId: number;
  sequence: number;
  log: { id: number; text: string }[];
  visuals: VisualEvent[];
  rewardOffers: CardId[][];
  rewards: Partial<Record<number, Reward>>;
  metrics: {
    damage: number;
    healthLost: number;
    blocked: number;
    healed: number;
    cards: number;
    rounds: number;
    battlesWon: number;
    byCard: Partial<Record<CardId, number>>;
  };
  turns: TurnRecord[];
  turnStart: {
    damage: number;
    blocked: number;
    healthLost: number;
    cards: number;
  };
}
export interface Preview {
  heroes: { hp: number; block: number; energy: number }[];
  enemies: { hp: number; block: number }[];
  events: VisualEvent[];
}
