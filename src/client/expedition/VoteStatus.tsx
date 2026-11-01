import type { ExpeditionRun } from "../../domain/expedition/adventure-types";
import { ballotOption, ballotPhase } from "../../domain/expedition/ballot";
import { Emoji } from "../Emoji";
export function VoteStatus({
  run,
  names,
  actor,
  avatars = [],
}: {
  run: ExpeditionRun;
  names: string[];
  actor: number;
  avatars?: string[];
}) {
  const phase = ballotPhase(run);
  if (!phase) return null;
  return (
    <section
      className="exp-vote-status"
      aria-label="队伍投票"
      aria-live="polite"
    >
      {run.combat.heroes.map((_, index) => {
        const choice = run.votes[index];
        return (
          <div key={index} data-voter={index} data-voted={choice !== undefined}>
            <span className="exp-voter-avatar">
              <Emoji text={avatars[index] ?? "👤"} />
            </span>
            <strong>
              {names[index] || `玩家 ${index + 1}`}
              <small>
                席位 {index + 1}
                {index === actor ? " · 我的选择" : ""}
              </small>
            </strong>
            <span>
              {choice === undefined
                ? "未投票"
                : ballotOption(run, phase, choice, names).label}
            </span>
          </div>
        );
      })}
    </section>
  );
}
