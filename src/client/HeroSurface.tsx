import { useMemo, useState, type ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { HeroGuides, type HeroGuide } from "../domain/hero-guide";
import { Panel } from "./ui/Controls";

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
  const [open, setOpen] = useState(false);
  const hero = useMemo(() => new HeroGuides().get(id), [id]);
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className="hero-surface"
            tabIndex={0}
            aria-label={`${hero.name}武将牌`}
          >
            {children}
            <button
              className="hero-detail-button"
              aria-label={`查看${hero.name}技能`}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(true);
              }}
            >
              ⓘ
            </button>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="ui-tooltip"
            sideOffset={8}
            collisionPadding={12}
          >
            <HeroDescription hero={hero} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Panel title={`${hero.name} · 技能`} open={open} onOpenChange={setOpen}>
        <HeroDescription hero={hero} />
      </Panel>
    </Tooltip.Provider>
  );
}
