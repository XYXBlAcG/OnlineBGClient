import { useRef, useState } from "react";
import type { PoolShot, PoolView } from "../../domain/pool/types";
import { useLayoutEffectSafe } from "../use-layout-effect";

import { POOL_OPPONENT_LEAD_IN } from "../../domain/pool/types";
export { POOL_OPPONENT_LEAD_IN } from "../../domain/pool/types";

export interface PoolPlayback {
  shot: PoolShot | null;
  shotNumber: number;
  startedAt: number;
  leadIn: number;
}

export function usePoolPlayback(view: PoolView, actor = -1): PoolPlayback {
  const [playback, setPlayback] = useState<PoolPlayback>(() => ({
    shot: view.lastShot,
    shotNumber: view.shotNumber,
    startedAt: 0,
    leadIn: 0,
  }));
  const current = useRef(view.shotNumber);
  useLayoutEffectSafe(() => {
    if (view.shotNumber === current.current) return;
    current.current = view.shotNumber;
    const shot = view.lastShot,
      leadIn = shot && shot.actor !== actor ? POOL_OPPONENT_LEAD_IN : 0;
    setPlayback({
      shot,
      shotNumber: view.shotNumber,
      startedAt: shot?.frames.length ? performance.now() + leadIn : 0,
      leadIn,
    });
  }, [view.shotNumber, view.lastShot, actor]);
  return playback;
}
