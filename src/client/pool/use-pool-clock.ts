import { useEffect, useState } from "react";

export function usePoolClock(
  turnDeadline: number | undefined,
  serverTime: number | undefined,
  paused: boolean,
): number | null {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!turnDeadline || paused) return;
    const start = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - start), 250);
    return () => clearInterval(timer);
  }, [turnDeadline, serverTime, paused]);
  return turnDeadline && serverTime
    ? Math.max(0, Math.ceil((turnDeadline - serverTime - elapsed) / 1000))
    : null;
}
