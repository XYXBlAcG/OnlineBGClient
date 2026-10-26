import type { GameSnapshot } from "../OriginalGame";
import { cardDefinition, type CardId } from "../../domain/dominion/cards";
export function DominionLedger({ snapshot }: { snapshot: GameSnapshot }) {
  if (snapshot.state?.kind !== "dominion") return null;
  const view = snapshot.state.view;
  const owned = view.players[snapshot.actor];
  return (
    <div className="dominion-ledger-content">
      <details>
        <summary>本回合出牌 · {view.inPlay.length}</summary>
        <div className="dominion-played">
          {view.inPlay.map((card, index) => (
            <span key={index}>{cardDefinition(card).name}</span>
          ))}
        </div>
      </details>
      <details>
        <summary>牌库组成与废牌</summary>
        <div className="dominion-inventory">
          {owned?.inventory &&
            (Object.entries(owned.inventory) as [CardId, number][])
              .sort(
                ([a], [b]) => cardDefinition(b).cost - cardDefinition(a).cost,
              )
              .map(([card, count]) => (
                <span key={card}>
                  {cardDefinition(card).name}
                  <b>×{count}</b>
                </span>
              ))}
          <small>废牌区 · {view.trash.length} 张</small>
          {view.trash.length > 0 && (
            <p>{view.trash.map((id) => cardDefinition(id).name).join("、")}</p>
          )}
        </div>
      </details>
      <details open>
        <summary>牌桌动态</summary>
        <ol className="dominion-log" aria-live="polite">
          {view.log
            .slice(-10)
            .reverse()
            .map((entry) => (
              <li key={entry.sequence}>
                <b>{snapshot.seats[entry.actor]?.name}</b> {entry.text}
              </li>
            ))}
        </ol>
      </details>
    </div>
  );
}
