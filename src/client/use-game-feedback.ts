import { useEffect, useRef } from "react";
import type { Snapshot } from "../domain/protocol";
import type { Preferences } from "./preferences";
import { cuePlayer } from "./sound";
export function useGameFeedback(
  snapshot: Snapshot | null,
  preferences: Preferences,
): void {
  const previous = useRef<{
    room: string;
    version: number;
    turn: boolean;
    finished: boolean;
    phase: string;
  } | null>(null);
  const ownTurn =
    !!snapshot?.playing && snapshot.candidates.length > 0 && !snapshot.paused;
  const phase =
    snapshot?.state && "phase" in snapshot.state.view
      ? String(snapshot.state.view.phase)
      : "";
  useEffect(() => {
    cuePlayer.setVolume(preferences.soundVolume);
  }, [preferences.soundVolume]);
  useEffect(() => {
    if (
      !preferences.messageSound &&
      !preferences.turnSound &&
      !preferences.interactionSound
    )
      return;
    const unlock = () => {
      void cuePlayer.unlock().catch(() => {});
    };
    document.addEventListener("pointerdown", unlock, { passive: true });
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [
    preferences.messageSound,
    preferences.turnSound,
    preferences.interactionSound,
  ]);
  useEffect(() => {
    if (!snapshot) {
      previous.current = null;
      return;
    }
    const before = previous.current;
    previous.current = {
      room: snapshot.room,
      version: snapshot.version,
      turn: ownTurn,
      finished: snapshot.finished,
      phase,
    };
    if (!before || before.room !== snapshot.room || !preferences.turnSound)
      return;
    if (snapshot.finished && !before.finished) cuePlayer.play("finish");
    else if (ownTurn && !before.turn) cuePlayer.play("turn");
    else if (phase && phase !== before.phase) cuePlayer.play("phase");
  }, [
    snapshot?.room,
    snapshot?.version,
    snapshot?.paused,
    snapshot?.finished,
    ownTurn,
    phase,
    preferences.turnSound,
  ]);
}
