import { balance } from "./balance";
export function shotDamage(
  length: number,
  distance: number,
  width: number,
  penetration: number,
): number {
  const stretch = Math.min(
    1,
    (1.5 * distance) / Math.max(length, distance, Number.EPSILON),
  );
  return Math.max(
    0,
    Math.round(
      (balance.baseDamage / (1 + length / width)) *
        stretch *
        balance.penetration ** penetration,
    ),
  );
}
