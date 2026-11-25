import type {
  MinerHook,
  MinerMineNode,
  MinerObject,
  MinerView,
  MinerMove,
  MinerPlayerView,
} from "./types";

export const MINE_DEPTH = 0.86;
export const PIVOT_Y = 0.1 * MINE_DEPTH;
const MAX_LENGTH = 1.12;
export const MAX_SWING = 80;
export const SWING_SPEED = 58;
export const MINER_STEP_MS = 120;

export function hookPoint(angle: number, length: number, pivotX: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: pivotX + Math.sin(radians) * length,
    y: PIVOT_Y + Math.cos(radians) * length,
  };
}

export function hookReach(hook: Pick<MinerHook, "angle" | "pivotX">): number {
  const direction = hookPoint(hook.angle, 1, 0);
  const side =
    direction.x === 0
      ? Infinity
      : ((direction.x < 0 ? 0 : 1) - hook.pivotX) / direction.x;
  return Math.min(
    MAX_LENGTH,
    side,
    (MINE_DEPTH - PIVOT_Y) / (direction.y - PIVOT_Y),
  );
}

export function aimAt(point: Pick<MinerObject, "x" | "y">, pivotX: number) {
  return Math.max(
    -MAX_SWING,
    Math.min(
      MAX_SWING,
      (Math.atan2(point.x - pivotX, point.y * MINE_DEPTH - PIVOT_Y) * 180) /
        Math.PI,
    ),
  );
}

export function quickHook(view: MinerView, player: MinerPlayerView) {
  return (
    (player.character === "miner" && player.specialTicks > 0) ||
    view.perks.includes("quickHook")
  );
}

export function hookTravelFactor(
  hook: Pick<MinerHook, "angle" | "pivotX" | "length">,
  node: MinerMineNode,
) {
  return node.waterLevel > 0 &&
    hookPoint(hook.angle, hook.length, hook.pivotX).y >=
      node.waterLevel * MINE_DEPTH
    ? 0.72
    : 1;
}

export function firstHookContact(
  hook: Pick<MinerHook, "angle" | "pivotX">,
  previous: number,
  next: number,
  node: MinerMineNode,
): { object: MinerObject; distance: number } | undefined {
  const direction = hookPoint(hook.angle, 1, 0);
  const dx = direction.x,
    dy = direction.y - PIVOT_Y;
  let nearest: { object: MinerObject; distance: number } | undefined;
  for (const object of node.objects) {
    if (object.removed || object.hookedBy !== null) continue;

    const ox = object.x - hook.pivotX;
    const oy = object.y * MINE_DEPTH - PIVOT_Y;
    const t = ox * dx + oy * dy;
    const perpendicular = ox * dy - oy * dx;
    const chord = object.radius ** 2 - perpendicular ** 2;
    if (chord < 0) continue;
    const half = Math.sqrt(chord);
    const distance = Math.max(previous, t - half);
    if (t + half < previous || distance > next) continue;
    if (!nearest || distance < nearest.distance) nearest = { object, distance };
  }
  return nearest;
}

export function shopDrop(
  view: MinerView,
  actor: number,
  angle: number,
): Extract<MinerMove, { type: "drop" }> {
  const hook = { angle, pivotX: view.players[actor].hook.pivotX };
  const hit = firstHookContact(hook, 0, hookReach(hook), view.node!);
  return { type: "drop", angle, offer: hit?.object.id ?? null };
}

export const isMinerShop = (phase: MinerView["phase"]) =>
  phase === "shop" || phase === "intermission";
