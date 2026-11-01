import { expeditionItemArt } from "./item-art";
import { useState } from "react";
import { definition } from "../../domain/expedition/content";
import { relics, relicText } from "../../domain/expedition/world";
import type { Hero } from "../../domain/expedition/types";
import { Panel } from "../ui/Controls";
import { ExpeditionCard } from "./ExpeditionCard";

const piles = {
  hand: "当前手牌",
  deck: "抽牌堆组成",
  discard: "弃牌堆",
  played: "本轮已出",
  exhaust: "本场消耗",
  relics: "遗物",
};
type Pile = keyof typeof piles;
export function InventoryContent({ hero, name }: { hero: Hero; name: string }) {
  const [pile, setPile] = useState<Pile>("hand");
  const [selected, setSelected] = useState<string | null>(null);
  const cards =
    pile === "relics"
      ? []
      : pile === "deck"
        ? [...hero.deck].sort(
            (a, b) =>
              a.card.localeCompare(b.card) ||
              Number(a.upgradeLevel) - Number(b.upgradeLevel),
          )
        : hero[pile];
  const detail = cards.find((card) => card.id === selected);
  return (
    <div className="exp-inventory-content">
      <header>
        <strong>
          {name} · {hero.name}
        </strong>
        <span>
          {hero.hp}/{hero.maxHp} ♥ · {hero.gold} 金币
        </span>
      </header>
      <div role="tablist" aria-label="行装分类" className="exp-inventory-tabs">
        {(Object.keys(piles) as Pile[]).map((key) => (
          <button
            key={key}
            id={`exp-pile-${key}`}
            role="tab"
            aria-selected={pile === key}
            aria-controls="exp-inventory-pile"
            onClick={() => {
              setPile(key);
              setSelected(null);
            }}
          >
            {piles[key]} · {hero[key].length}
          </button>
        ))}
      </div>
      <section
        role="tabpanel"
        id="exp-inventory-pile"
        aria-labelledby={`exp-pile-${pile}`}
        aria-label={piles[pile]}
      >
        {pile === "deck" && <p className="muted">只显示组成，顺序隐藏</p>}
        {pile === "relics" ? (
          <div className="exp-inventory-relics">
            {hero.relics.map((id) => (
              <article key={id}>
                <h3>
                  <img src={expeditionItemArt(relics[id].effects)} alt="" />
                  {relics[id].name}
                </h3>
                <p>{relicText(id)}</p>
              </article>
            ))}
            {!hero.relics.length && <p className="muted">暂无遗物</p>}
          </div>
        ) : (
          <div className="exp-inventory-layout">
            <div className="exp-inspect-cards">
              {cards.map((card) => (
                <ExpeditionCard
                  key={card.id}
                  instance={card}
                  selected={selected === card.id}
                  onChoose={() => setSelected(card.id)}
                />
              ))}
              {!cards.length && <p className="muted">这里暂时没有牌</p>}
            </div>
            {detail && (
              <aside className="exp-inventory-detail">
                <h3>{definition(detail).name}</h3>
                <ExpeditionCard instance={detail} />
              </aside>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export function Inventory({
  hero,
  name,
  onClose,
}: {
  hero?: Hero;
  name: string;
  onClose: () => void;
}) {
  return (
    <Panel
      open={!!hero}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="远征行装"
      className="exp-inventory-panel"
      overlayClassName="exp-inventory-overlay"
    >
      {hero && <InventoryContent key={name} hero={hero} name={name} />}
    </Panel>
  );
}
