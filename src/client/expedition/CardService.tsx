import { useState } from "react";
import type { ExpeditionMove } from "../../domain/expedition/adventure-types";
import { definition, maxUpgradeLevel } from "../../domain/expedition/content";
import { allCards } from "../../domain/expedition/rules";
import type { Hero } from "../../domain/expedition/types";
import { ExpeditionCard } from "./ExpeditionCard";
import { cardComparison } from "./presentation";

export function CardService({
  mode,
  hero,
  moves,
  onChoose,
  price = 0,
}: {
  mode: "upgrade" | "remove";
  hero: Hero;
  moves: ExpeditionMove[];
  onChoose: (move: ExpeditionMove) => void;
  price?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const cards = allCards(hero);
  const legal = moves.filter((move) => move.type === mode);
  const card = cards.find((value) => value.id === selected);
  const move = legal.find(
    (value) => "instance" in value && value.instance === selected,
  );
  const comparison = card && cardComparison(card);
  return (
    <section
      className="exp-card-service"
      aria-label={mode === "upgrade" ? "升级卡牌" : "移除卡牌"}
    >
      <header>
        <h3>{mode === "upgrade" ? "选择要升级的牌" : "选择要移除的牌"}</h3>
        <span>
          {price > 0 ? `${price} 金币 · ` : ""}牌组 {cards.length} 张
        </span>
      </header>
      <div className="exp-service-layout">
        <div className="exp-service-cards">
          {cards.map((instance) => (
            <ExpeditionCard
              key={instance.id}
              instance={instance}
              selected={selected === instance.id}
              unavailable={
                !legal.some(
                  (value) =>
                    "instance" in value && value.instance === instance.id,
                )
              }
              onChoose={() => setSelected(instance.id)}
            />
          ))}
        </div>
        <aside className="exp-service-preview" aria-live="polite">
          {card && comparison ? (
            <>
              <h3>{definition(card).name}</h3>
              {mode === "upgrade" ? (
                <div className="exp-upgrade-comparison">
                  <section>
                    <small>当前 · 强化 {card.upgradeLevel}</small>
                    <ExpeditionCard instance={card} />
                  </section>
                  <section>
                    <small>
                      {comparison.available
                        ? `强化 ${comparison.upgraded.upgradeLevel} 后`
                        : "已达强化上限"}
                    </small>
                    <ExpeditionCard instance={comparison.upgraded} />
                  </section>
                  <p>
                    {comparison.costBefore !== comparison.costAfter
                      ? `能量 ${comparison.costBefore} → ${comparison.costAfter} · `
                      : ""}
                    {comparison.available
                      ? `${comparison.before} → ${comparison.after}`
                      : comparison.before}
                  </p>
                </div>
              ) : (
                <>
                  <ExpeditionCard instance={card} />
                  <p>
                    同名牌{" "}
                    {cards.filter((value) => value.card === card.card).length}{" "}
                    张 · 移除后 {cards.length - 1} 张
                  </p>
                </>
              )}
              {!move && (
                <p className="muted">
                  {mode === "upgrade" && !comparison.available
                    ? card.upgradeLevel >= maxUpgradeLevel
                      ? `已达到强化 ${maxUpgradeLevel}`
                      : "此牌的可强化效果已达上限"
                    : `当前不能${mode === "upgrade" ? "升级此牌" : "移除此牌"}`}
                </p>
              )}
              <button
                className="primary"
                disabled={!move}
                onClick={() => {
                  if (move) onChoose(move);
                }}
              >
                {mode === "upgrade" ? "确认升级" : "确认移除"}
                {price > 0 ? ` · ${price} 金币` : ""}
              </button>
            </>
          ) : (
            <p className="muted">
              选择一张牌，查看
              {mode === "upgrade" ? "升级前后的效果" : "效果与移除后的牌组数量"}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
