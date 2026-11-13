import type { GameSnapshot } from "../OriginalGame";
import type { UnoView } from "../../domain/types";

export function UnoTeamPanel({
  view,
  snapshot,
}: {
  view: UnoView;
  snapshot: GameSnapshot;
}) {
  if (!view.teamMode) return null;
  return (
    <section className="uno-team-panel" aria-label="UNO 队伍状态">
      {[0, 1].map((team) => (
        <div
          key={team}
          className={team === 0 ? "red" : "blue"}
          data-guide-target="uno.team"
          data-guide-id={team}
        >
          <strong>{team === 0 ? "红队" : "蓝队"}</strong>
          <span>
            {snapshot.seats
              .filter((_, index) => view.teams?.[index] === team)
              .map((seat) => {
                const actor = snapshot.seats.findIndex(
                  (item) => item.id === seat.id,
                );
                return `${seat.name} ${view.playerFinish[actor] ? "已出完" : `${view.playerCards[actor]?.length ?? 0} 张`}`;
              })
              .join(" · ")}
          </span>
        </div>
      ))}
    </section>
  );
}
