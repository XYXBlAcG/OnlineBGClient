import type { Hero } from "./types";

export const cardServices = {
  minimumDeckSize: 5,
  removalPrice: 35,
  restFraction: 0.35,
};

export function campRecovery(hero: Pick<Hero, "maxHp">) {
  return Math.ceil(hero.maxHp * cardServices.restFraction);
}
