import {
  definition,
  cardText,
  type CardInstance,
} from "../../domain/expedition/content";
import { DetailSurface } from "../DetailSurface";
const targets = {
  enemy: "敌方单体",
  ally: "己方单体",
  self: "自身",
  "all-enemies": "敌方全体",
};
export function ExpeditionCard({
  instance,
  selected,
  disabled,
  onChoose,
}: {
  instance: CardInstance;
  selected?: boolean;
  disabled?: boolean;
  onChoose?: () => void;
}) {
  const card = definition(instance);
  return (
    <DetailSurface
      title={card.name}
      label={`${card.name}，${card.cost} 能量，${cardText(instance)}`}
      description={
        <>
          <strong>
            {card.name} · {card.cost} 能量
          </strong>
          <p>{targets[card.target]}</p>
          <p>{cardText(instance)}</p>
          {instance.card === "protect" && (
            <p>可选择任意存活队友。未使用的格挡在下轮开始时清空。</p>
          )}
        </>
      }
    >
      {(detail) => (
        <article
          className={`exp-card ${selected ? "is-selected" : ""}`}
          data-card-type={
            card.effects.some((e) => e.kind === "damage") ? "attack" : "skill"
          }
          data-guide-target="expedition.card"
          data-guide-id={instance.id}
          data-motion-key={`expedition-card-${instance.id}`}
          data-card-instance={instance.id}
        >
          <button
            data-control="custom"
            className="exp-card-main"
            aria-label={`选择${card.name}`}
            aria-pressed={selected ?? false}
            disabled={disabled}
            onClick={onChoose}
          >
            <span className="exp-card-top">
              <b className="exp-cost">{card.cost}</b>
              <strong>{card.name}</strong>
            </span>
            <span className="exp-card-art" aria-hidden="true">
              {card.icon}
            </span>
            <span className="exp-card-text">{cardText(instance)}</span>
            <span className="exp-card-bottom">
              {targets[card.target]}
              <i>{card.exhaust ? "消耗" : ""}</i>
            </span>
          </button>
          {detail}
        </article>
      )}
    </DetailSurface>
  );
}
