import type { Snapshot } from "../domain/protocol";
import type { ChallengeBoard as ChallengeBoardState } from "../domain/challenges";

export function ChallengeBoard({
  board,
  snapshot,
}: {
  board: ChallengeBoardState;
  snapshot: Snapshot;
}) {
  return (
    <section className="challenge-board" aria-label="局内契约挑战">
      <header>
        <strong>局内契约</strong>
        <small>
          {board.cards.filter((card) => card.claimedBy !== null).length}/
          {board.cards.length} 已完成
        </small>
      </header>
      <div className="challenge-cards">
        {board.cards.map((card) => {
          const progress = Object.entries(card.progress).filter(
            ([, value]) => value > 0,
          );
          const owner =
            card.claimedBy === null
              ? null
              : snapshot.seats[card.claimedBy]?.name;
          return (
            <article
              key={card.id}
              data-claimed={card.claimedBy !== null || undefined}
            >
              <div>
                <strong>{card.title}</strong>
                <p>{card.description}</p>
              </div>
              <small>
                {owner
                  ? `${owner} 已领取`
                  : progress.length
                    ? progress
                        .map(
                          ([actor, value]) =>
                            `${snapshot.seats[Number(actor)]?.name ?? `席位 ${Number(actor) + 1}`} ${value}/${card.target}`,
                        )
                        .join(" · ")
                    : "等待挑战"}
              </small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
