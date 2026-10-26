import { cardDefinition, type CardId } from "../../domain/dominion/cards";
import { DetailSurface } from "../DetailSurface";
export function DominionCard({
  card,
  count,
  onClick,
  disabled,
  label,
  small = false,
  motionZone,
}: {
  card: CardId;
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
  small?: boolean;
  motionZone?: string;
}) {
  const info = cardDefinition(card);
  const type = {
    action: "行动",
    treasure: "财宝",
    victory: "胜利",
    curse: "诅咒",
  }[info.type];
  return (
    <DetailSurface
      title={info.name}
      label={`${info.name}，价格 ${info.cost}，${info.text}`}
      description={
        <>
          <strong>
            {info.name} · {info.cost} 金币
          </strong>
          <p>
            {type}
            {info.attack ? " · 攻击" : ""}
            {info.reaction ? " · 反应" : ""}
          </p>
          <p>{info.text}</p>
        </>
      }
    >
      {(detail) => (
        <article
          className={`dominion-card ${small ? "is-small" : ""}`}
          data-card-type={info.type}
          data-card-id={card}
          data-motion-zone={motionZone}
        >
          <button
            type="button"
            data-control="custom"
            className="dominion-card-main"
            disabled={disabled || !onClick}
            onClick={onClick}
            aria-label={label ?? info.name}
          >
            <span className="dominion-card-heading">
              <b>{info.name}</b>
              <span className="dominion-price">{info.cost}</span>
            </span>
            <span className="dominion-card-symbol" aria-hidden="true">
              {info.symbol}
            </span>
            {!small && <span className="dominion-card-text">{info.text}</span>}
            <span className="dominion-card-footer">
              {type}
              {info.attack ? " · 攻击" : ""}
              {info.reaction ? " · 反应" : ""}
              {count !== undefined && (
                <strong aria-label={`剩余 ${count} 张`}>×{count}</strong>
              )}
            </span>
          </button>
          {detail}
        </article>
      )}
    </DetailSurface>
  );
}
