import { cloneElement, type ReactElement, type ReactNode } from "react";
import { CardGuides, type CardGuide } from "../domain/card-guide";
import { DetailSurface } from "./DetailSurface";
const guides = new CardGuides();

export function CardDescription({ card }: { card: CardGuide }) {
  return (
    <div className="card-description">
      <h3>{card.name}</h3>
      <dl>
        {[
          ["使用时机", card.timing],
          ["目标", card.target],
          ["具体作用", card.effect],
          ["如何响应", card.response],
          ["举例", card.example],
        ].map(([label, text]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
      <p className="muted">
        武将技能、装备与当前阶段可能改变效果或合法目标，以牌桌提示为准。
      </p>
    </div>
  );
}
export function CardSurface({
  id,
  children,
}: {
  id: number;
  children: ReactElement<{ children: ReactElement<{ children: ReactNode }> }>;
}) {
  const card = guides.get(id);
  if (!card) return children;
  return (
    <DetailSurface
      label={`${card.name}锦囊牌`}
      title={`${card.name} · 作用`}
      description={<CardDescription card={card} />}
    >
      {(button) =>
        cloneElement(children, {
          "data-card-guide": card.name,
          children: cloneElement(children.props.children, {
            children: (
              <>
                {children.props.children.props.children}
                {button}
              </>
            ),
          }),
        } as Record<string, unknown>)
      }
    </DetailSurface>
  );
}
