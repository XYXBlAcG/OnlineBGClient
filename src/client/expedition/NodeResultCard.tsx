import { nodeNames } from "../../domain/expedition/map";
import { potions, relics } from "../../domain/expedition/world";
import type { ExpeditionNodeResult } from "../../domain/expedition/adventure-types";

export function NodeResultCard({
  result,
  onClose,
}: {
  result: ExpeditionNodeResult;
  onClose: () => void;
}) {
  const compass = result.after.compass - result.before.compass;
  return (
    <div className="exp-node-result-layer">
      <div className="exp-node-result-backdrop" aria-hidden="true" />
      <section
        className="exp-node-result"
        role="dialog"
        aria-modal="true"
        aria-label={`${nodeNames[result.nodeKind]}结算`}
      >
        <header>
          <div>
            <small>节点结算</small>
            <h2>{nodeNames[result.nodeKind]}</h2>
          </div>
          {compass !== 0 && (
            <strong className={compass > 0 ? "is-gain" : "is-loss"}>
              罗盘 {compass > 0 ? "+" : ""}
              {compass}
            </strong>
          )}
        </header>
        <div className="exp-node-result-heroes">
          {result.after.heroes.map((hero) => {
            const before = result.before.heroes[hero.actor];
            const relicsGained = hero.relics.filter(
              (relic) => !before.relics.includes(relic),
            );
            const relicsLost = before.relics.filter(
              (relic) => !hero.relics.includes(relic),
            );
            const potionsGained = hero.potions.length - before.potions.length;
            return (
              <article key={hero.actor}>
                <h3>{hero.name}</h3>
                <div>
                  <span
                    className={hero.hp >= before.hp ? "is-gain" : "is-loss"}
                  >
                    生命 {hero.hp - before.hp >= 0 ? "+" : ""}
                    {hero.hp - before.hp}
                  </span>
                  <span
                    className={
                      hero.gold >= before.gold ? "is-gain" : "is-loss"
                    }
                  >
                    金币 {hero.gold - before.gold >= 0 ? "+" : ""}
                    {hero.gold - before.gold}
                  </span>
                  {hero.cards !== before.cards && (
                    <span
                      className={
                        hero.cards >= before.cards ? "is-gain" : "is-loss"
                      }
                    >
                      牌组 {hero.cards - before.cards >= 0 ? "+" : ""}
                      {hero.cards - before.cards}
                    </span>
                  )}
                  {potionsGained !== 0 && (
                    <span
                      className={potionsGained > 0 ? "is-gain" : "is-loss"}
                    >
                      药水 {potionsGained > 0 ? "+" : ""}
                      {potionsGained}
                    </span>
                  )}
                </div>
                {(relicsGained.length > 0 || relicsLost.length > 0) && (
                  <p>
                    {relicsGained.map((relic) => `获得 ${relics[relic].name}`)}
                    {relicsLost.map((relic) => `失去 ${relics[relic].name}`)}
                  </p>
                )}
                {before.potions.length > hero.potions.length && (
                  <p>
                    消耗{" "}
                    {before.potions
                      .filter((potion) => !hero.potions.includes(potion))
                      .map((potion) => potions[potion].name)
                      .join("、")}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        {(result.before.companions.length > 0 ||
          result.after.companions.length > 0) && (
          <div className="exp-node-result-companions">
            {result.after.companions.map((companion) => {
              const before = result.before.companions.find(
                (candidate) => candidate.id === companion.id,
              );
              return (
                <span key={companion.id}>
                  {companion.name} ·{" "}
                  {companion.status === "active"
                    ? "在队"
                    : companion.status === "dead"
                      ? "阵亡"
                      : "离队"}
                  {before && before.hp !== companion.hp
                    ? ` · 生命 ${companion.hp - before.hp}`
                    : ""}
                </span>
              );
            })}
          </div>
        )}
        <footer>
          <small>资源变化已经保留；核对后再选择下一条路线。</small>
          <button className="primary" onClick={onClose}>
            继续前进
          </button>
        </footer>
      </section>
    </div>
  );
}
