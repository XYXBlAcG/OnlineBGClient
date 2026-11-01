import type { Effect } from "../../domain/expedition/content";
export function expeditionItemArt(effects: readonly Effect[]) {
  const file = effects.some((e) => e.kind === "damage")
    ? "weapon_regular_sword"
    : effects.some((e) => ["heal", "regen"].includes(e.kind))
      ? "flask_red"
      : effects.some((e) => e.kind === "block")
        ? "wall_banner_blue"
        : effects.some((e) => ["poison", "weak"].includes(e.kind))
          ? "flask_green"
          : effects.some((e) => e.kind === "energy")
            ? "flask_yellow"
            : "weapon_green_magic_staff";
  return `/art/expedition/${file}.png`;
}
