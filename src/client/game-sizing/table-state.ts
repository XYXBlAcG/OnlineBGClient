export function tableInteractive(
  snapshot: { paused?: boolean; finished?: boolean; actor: number },
  replay: boolean,
): boolean {
  return (
    !replay && !snapshot.paused && !snapshot.finished && snapshot.actor >= 0
  );
}
