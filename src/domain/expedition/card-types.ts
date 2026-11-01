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
    | "blessing";
  amount: number;
  target?: "self" | "selected" | "party";
  scale?: "block" | "poison" | "played" | "marked" | "heat" | "turret";
};
export interface CardDefinition {
  name: string;
  cost: number;
  target: "enemy" | "ally" | "self" | "all-enemies";
  icon: string;
  effects: readonly Effect[];
  exhaust?: boolean;
}
