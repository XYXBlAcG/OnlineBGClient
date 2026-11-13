import type { CardDefinition } from "./card-types";

export const statusCards = {
  sealed_echo: {
    name: "封缄残响",
    cost: 0,
    target: "self",
    icon: "×︎",
    effects: [],
    unplayable: true,
    temporary: true,
  },
  black_debt: {
    name: "黑色欠据",
    cost: 0,
    target: "self",
    icon: "§︎",
    effects: [],
    unplayable: true,
    curse: true,
  },
} as const satisfies Record<string, CardDefinition>;
