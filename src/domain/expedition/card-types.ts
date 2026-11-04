export type Effect = {
  kind:
    | "damage"
    | "block"
    | "draw"
    | "poison"
    | "vulnerable"
    | "energy"
    | "heal"
    | "strength"
    | "weak"
    | "dexterity"
    | "thorns"
    | "regen"
    | "cleanse"
    | "heat"
    | "cool"
    | "device"
    | "focus"
    | "echo"
    | "blessing"
    | "dice";
  amount: number;
  target?: "self" | "selected" | "party";
  hits?: number;
  scale?: "block" | "poison" | "played" | "marked" | "heat" | "turret" | "dice";
};
export interface CardDefinition {
  name: string;
  cost: number;
  diceCost?: number;
  hpCost?: number;
  target: "enemy" | "ally" | "self" | "all-enemies";
  icon: string;
  effects: readonly Effect[];
  exhaust?: boolean;
  unplayable?: boolean;
  temporary?: boolean;
  curse?: boolean;
}
