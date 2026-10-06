import { useMemo, type ReactNode } from "react";
import { HeroGuides, type HeroGuide } from "../domain/hero-guide";
import { DetailSurface } from "./DetailSurface";

export function HeroDescription({ hero }: { hero: HeroGuide }) {
  return (
    <div className="hero-description">
      <h3>
        {hero.name}{" "}
        <small>
          {hero.faction} · 体力 {hero.health}
        </small>
      </h3>
      {!hero.skills.length && <p>没有武将技能。</p>}
      {hero.skills.map((skill) => (
        <section key={skill.name}>
          <strong>{skill.name}</strong>
          <small>{skill.trigger}</small>
          <p>{skill.effect}</p>
          <p className="muted">例如：{skill.example}</p>
        </section>
      ))}
    </div>
  );
}
export function HeroSurface({
  id,
  children,
}: {
  id: number;
  children: ReactNode;
}) {
  const hero = useMemo(() => new HeroGuides().get(id), [id]);
  return (
    <DetailSurface
      label={`${hero.name}武将牌`}
      title={`${hero.name} · 技能`}
      buttonLabel={`查看${hero.name}技能`}
      buttonClassName="hero-detail-button"
      description={<HeroDescription hero={hero} />}
    >
      {(button) => (
        <div className="hero-surface" data-guide-target="sgs.hero" data-guide-id={id}>
          {children}
          {button}
        </div>
      )}
    </DetailSurface>
  );
}
