import styles from "./RoundContinuation.module.css";
import type { Snapshot } from "../domain/protocol";
import type { Series } from "../domain/series";
import { roomReadiness } from "./room-readiness";
import { Button } from "./ui/Controls";
export function RoundContinuation({
  snapshot,
  pending,
  series,
  onStart,
  onReady,
}: {
  snapshot: Pick<Snapshot, "seats" | "actor" | "canManage">;
  pending: boolean;
  series?: Series | null;
  onStart: () => void;
  onReady: (ready: boolean) => void;
}) {
  const readiness = roomReadiness(snapshot.seats);
  const seat = snapshot.seats[snapshot.actor];
  return (
    <div className={styles.root}>
      {series && series.rounds > 0 && (
        <span className={styles.series}>
          第 {series.rounds + 1} 局 ·{" "}
          {snapshot.seats
            .map((seat, index) => [seat.name, series.wins[index] ?? 0] as const)
            .filter(([name]) => name)
            .map(([name, wins]) => `${name} ${wins} 胜`)
            .join("、")}
          {series.draws ? ` · 平局 ${series.draws}` : ""}
        </span>
      )}
      <span role="status">{readiness.message}</span>
      {seat && !seat.difficulty && (
        <Button disabled={pending} onClick={() => onReady(!seat.ready)}>
          {seat.ready ? "取消再来一局" : "再来一局"}
        </Button>
      )}
      {snapshot.canManage && (
        <Button
          variant="primary"
          disabled={pending || !readiness.canStart}
          onClick={onStart}
        >
          {pending ? "正在开局…" : "开始下一局"}
        </Button>
      )}
    </div>
  );
}
