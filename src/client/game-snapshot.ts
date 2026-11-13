import type { Snapshot } from "../domain/protocol";
import type { GameSnapshot } from "./OriginalGame";

export function toGameSnapshot(snapshot: Snapshot): GameSnapshot {
  return {
    room: snapshot.room,
    kind: snapshot.kind,
    actor: snapshot.actor,
    canManage: snapshot.canManage,
    version: snapshot.version,
    seats: snapshot.seats,
    state: snapshot.state,
    candidates: snapshot.candidates,
    finished: snapshot.finished,
    paused: snapshot.paused,
    turnDeadline: snapshot.turnDeadline,
    serverTime: snapshot.serverTime,
  };
}
