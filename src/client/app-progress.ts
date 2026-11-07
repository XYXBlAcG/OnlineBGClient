import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  evaluateAppAchievements,
  recordAppCompletion,
  recordAppLaunch,
  recordAppPlaySession,
  recordAppPlayTime,
  type AchievementUnlock,
  type AppStats,
} from "../domain/achievements";
import type { Snapshot } from "../domain/protocol";
import type { GameKind } from "../domain/catalogue";
import type { ClientStore } from "./storage";

let launchRecorded = false;
export interface CompletedGame {
  playId: string;
  kind: GameKind;
  win: boolean;
}
function localHuman(snapshot: Snapshot | null): snapshot is Snapshot {
  if (!snapshot || snapshot.actor < 0 || !snapshot.playing || snapshot.finished)
    return false;
  const seat = snapshot.seats[snapshot.actor];
  return (
    !!seat &&
    seat.difficulty === null &&
    !seat.autoplay &&
    !snapshot.config.training
  );
}
export function useAppProgress({
  store,
  snapshot,
  network,
  onUnlocked,
  onError,
}: {
  store: ClientStore;
  snapshot: Snapshot | null;
  network: boolean;
  onUnlocked: (unlocks: AchievementUnlock[]) => void;
  onError?: (error: unknown) => void;
}) {
  const callbacks = useRef({ onUnlocked, onError });
  callbacks.current = { onUnlocked, onError };
  const report = useCallback((error: unknown) => {
    callbacks.current.onError?.(error);
  }, []);
  const unlock = useCallback(
    async (stats: AppStats) => {
      const now = Date.now();
      const unlocks = evaluateAppAchievements(stats).map((achievementId) => ({
        profileId: stats.profileId,
        achievementId,
        firstAt: now,
        lastAt: now,
        count: 1,
        evidence: {
          room: "app",
          startedAt: now,
          rulesVersion: "app-1",
          actor: -1,
          seatName: "本机",
          replayFingerprint: `app:${achievementId}`,
          summary: "本机统计",
        },
      }));
      if (!unlocks.length) return;
      const created = await store.unlockAchievements(unlocks);
      if (created.length) callbacks.current.onUnlocked(created);
    },
    [store],
  );
  useEffect(() => {
    if (launchRecorded) return;
    launchRecorded = true;
    void store.updateAppStats(recordAppLaunch).then(unlock).catch(report);
  }, [store, unlock, report]);
  useEffect(() => {
    if (!localHuman(snapshot) || !snapshot.playId) return;
    const multiplayer =
      network &&
      snapshot.seats.filter((seat) => seat.difficulty === null).length >= 2;
    void store
      .updateAppStats((stats) =>
        recordAppPlaySession(stats, snapshot.playId!, multiplayer),
      )
      .then(unlock)
      .catch(report);
  }, [
    snapshot?.playId,
    snapshot?.kind,
    snapshot?.actor,
    snapshot?.playing,
    snapshot?.finished,
    snapshot?.config.training,
    network,
    store,
    unlock,
    report,
  ]);
  useEffect(() => {
    if (!localHuman(snapshot) || snapshot.paused) return;
    let last = Date.now();
    const flush = () => {
      const now = Date.now();
      const seconds = Math.floor((now - last) / 1000);
      if (seconds < 1) return;
      last += seconds * 1000;
      void store
        .updateAppStats((stats) => recordAppPlayTime(stats, seconds))
        .then(unlock)
        .catch(report);
    };
    const timer = setInterval(flush, 30000);
    const visibility = () => {
      if (document.visibilityState === "hidden") flush();
      else last = Date.now();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      flush();
    };
  }, [
    snapshot?.playId,
    snapshot?.actor,
    snapshot?.playing,
    snapshot?.finished,
    snapshot?.paused,
    snapshot?.config.training,
    store,
    unlock,
    report,
  ]);
  const recordCompletion = useCallback(
    async (games: CompletedGame[]) => {
      if (!games.length) return;
      const stats = await store.updateAppStats((current) =>
        games.reduce(
          (next, game) =>
            recordAppCompletion(next, game.playId, game.kind, game.win),
          current,
        ),
      );
      await unlock(stats);
    },
    [store, unlock],
  );
  return useMemo(() => ({ recordCompletion }), [recordCompletion]);
}
