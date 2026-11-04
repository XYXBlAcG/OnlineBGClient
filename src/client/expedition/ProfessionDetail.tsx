import {
  cardPools,
  cardText,
  definition,
  heroContent,
  type CardId,
} from "../../domain/expedition/content";

function CardLine({ card }: { card: CardId }) {
  const instance = { id: card, card, upgradeLevel: 0 },
    config = definition(instance);
  return (
    <span data-card={card}>
      <b>{config.name}</b>
      <small>
        {config.cost} 能量
        {config.diceCost ? ` · ${config.diceCost} 骰子` : ""}
        {config.hpCost ? ` · ${config.hpCost} 生命` : ""}
      </small>
      <em>{cardText(instance, false)}</em>
    </span>
  );
}

export function ProfessionDetail({ profession }: { profession: number }) {
  const hero = heroContent[profession] ?? heroContent[0],
    cards = cardPools[profession] ?? [];
  return (
    <section
      className="exp-profession-detail"
      aria-label={`${hero.name}详细信息`}
    >
      <header>
        <span>{hero.icon}</span>
        <div>
          <h3>{hero.name}</h3>
          <strong>{hero.title}</strong>
        </div>
        <b>{hero.maxHp} 生命</b>
      </header>
      <p>{hero.description}</p>
      <small>{hero.resourceHint}</small>
      <div className="exp-profession-summary">
        <section>
          <h4>起始牌组</h4>
          <div>
            {[...new Set(hero.deck)].map((card) => (
              <CardLine key={card} card={card} />
            ))}
          </div>
        </section>
        <section>
          <h4>流派关键词</h4>
          <div>
            {hero.rewards.map((card) => (
              <CardLine key={card} card={card} />
            ))}
          </div>
        </section>
      </div>
      <details>
        <summary>查看全部 {cards.length} 张职业牌</summary>
        <div className="exp-profession-deck">
          {cards.map((card) => (
            <CardLine key={card} card={card} />
          ))}
        </div>
      </details>
    </section>
  );
}
