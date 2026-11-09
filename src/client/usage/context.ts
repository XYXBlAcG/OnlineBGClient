import { recordClientLog } from "../diagnostics";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { capabilities } from "../platform";
import type { Snapshot } from "../../domain/protocol";
export type UsageContext = { game: string; session: string };
export function useUsageContext(
  snapshot: Snapshot | null,
  connected: boolean,
  watching = false,
  override: UsageContext | null = null,
) {
  const game =
    override?.game ??
    (snapshot?.playing &&
    !snapshot.finished &&
    !snapshot.paused &&
    snapshot.actor >= 0 &&
    !snapshot.seats[snapshot.actor]?.difficulty &&
    connected &&
    !watching
      ? snapshot.kind
      : null);
  const session = override?.session ?? snapshot?.playId;
  useEffect(() => {
    if (!capabilities.desktop) return;
    void invoke("usage_context", {
      context: game && session ? { game, session } : null,
    }).catch((error) => recordClientLog("usage", String(error)));
    return () => {
      void invoke("usage_context", { context: null }).catch((error) =>
        recordClientLog("usage", String(error)),
      );
    };
  }, [game, session]);
}
