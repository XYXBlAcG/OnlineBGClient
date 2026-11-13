import { gameCatalogue, type GameKind } from "../../domain/catalogue";
import type { RoomConfig } from "../../domain/protocol";

const presetKey = "onlinebg.room-preset";
const difficulties = new Set(["easy", "normal", "hard"]);
const maxAiDelayMs = 5000;
export type RoomPreset = Pick<
  RoomConfig,
  "kind" | "humans" | "ai" | "team" | "aiDelayMs"
>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function readRoomPreset(
  storage: Pick<Storage, "getItem"> = localStorage,
): RoomPreset | null {
  try {
    const raw = storage.getItem(presetKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<RoomPreset>;
    const kind = candidate.kind;
    if (!kind || !(kind in gameCatalogue)) return null;
    const definition = gameCatalogue[kind as GameKind];
    const humans = Number.isFinite(candidate.humans)
      ? clamp(candidate.humans as number, 0, definition.maxPlayers)
      : 1;
    const ai = Array.isArray(candidate.ai)
      ? candidate.ai
          .filter(
            (entry): entry is RoomConfig["ai"][number] =>
              Boolean(entry) &&
              typeof entry === "object" &&
              difficulties.has(entry.difficulty),
          )
          .slice(0, definition.maxPlayers)
          .map((entry) => ({
            difficulty: entry.difficulty,
            name: String(entry.name ?? "")
              .trim()
              .slice(0, 24),
          }))
      : [];
    const aiDelayMs = Number.isFinite(candidate.aiDelayMs)
      ? clamp(candidate.aiDelayMs as number, 0, maxAiDelayMs)
      : 1500;
    return {
      kind: kind as GameKind,
      humans,
      ai,
      team: Boolean(candidate.team),
      aiDelayMs,
    };
  } catch {
    return null;
  }
}

export function saveRoomPreset(
  preset: RoomPreset,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  try {
    storage.setItem(presetKey, JSON.stringify(preset));
  } catch {}
}
