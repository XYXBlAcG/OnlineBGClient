export type RoomSurface = "menu" | "party" | null;
export type RoomSurfaceEvent =
  | { type: "open"; surface: Exclude<RoomSurface, null> }
  | { type: "close" }
  | { type: "sent" };
export function roomSurfaceTransition(
  _current: RoomSurface,
  event: RoomSurfaceEvent,
): RoomSurface {
  return event.type === "open" ? event.surface : null;
}
