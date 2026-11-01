import { PixelFigure } from "./PixelFigure";
import "./world-art.css";
import { expeditionResources } from "../../domain/expedition/resources";
type Marker = { target: Target; label: string };
import { enemyIntents } from "./presentation";
import type {
  ExpeditionState,
  Target,
  Fighter,
} from "../../domain/expedition/types";
function Impact({ state, target }: { state: ExpeditionState; target: Target }) {
  const events = state.visuals.filter(
    (e) => e.target.side === target.side && e.target.index === target.index,
  );
  return (
    <div className="exp-unit-fx" key={state.sequence} aria-hidden="true">
      {events.map((event, index) => (
        <div
          key={index}
          className={`exp-float exp-float-${event.kind}`}
          style={{ animationDelay: `${index * 45}ms` }}
        >
          {event.kind === "damage" ? "−" : event.kind === "heal" ? "+" : "◈"}
          {event.amount}
        </div>
      ))}
    </div>
  );
}
function Figure({ kind }: { kind: string }) {
  return (
    <div data-motion-figure="" role="presentation" className={`exp-figure`}>
      <PixelFigure kind={kind} />
    </div>
  );
}

function Health({ fighter }: { fighter: Fighter }) {
  return (
    <div className="exp-health">
      <div>
        <span style={{ width: `${(fighter.hp / fighter.maxHp) * 100}%` }} />
      </div>
      <b>
        {fighter.hp}
        <small> / {fighter.maxHp}</small>
      </b>
      {fighter.block > 0 && <em>◈ {fighter.block}</em>}
    </div>
  );
}
export function BattleScene({
  state,
  actor,
  onActor,
  onTarget,
  legalTargets,
  previewTarget,
  onPreview,
  renderAvatar,
  markers = [],
  names = [],
}: {
  names?: string[];
  markers?: Marker[];
  renderAvatar?: (index: number) => React.ReactNode;
  state: ExpeditionState;
  actor: number;
  onActor: (actor: number) => void;
  onTarget: (target: Target) => void;
  legalTargets: Target[];
  previewTarget: Target | null;
  onPreview: (target: Target | null) => void;
}) {
  const intents = enemyIntents(state, names);
  const legal = (side: "hero" | "enemy", index: number) =>
    legalTargets.some((t) => t.side === side && t.index === index);
  return (
    <section
      className="exp-scene"
      aria-label="战斗场景"
      data-motion-scope="game"
    >
      <div className="exp-heroes">
        {state.heroes.map((hero, index) => (
          <div
            data-exp-target={`hero-${index}`}
            data-motion-zone={`expedition.hero-${index}`}
            className={`exp-unit exp-hero ${actor === index ? "is-controlled" : ""} ${hero.hp === 0 ? "is-downed" : ""}`}
            key={index}
          >
            <div className="exp-unit-name">
              <strong>{hero.name}</strong>
              <small>
                {hero.ready ? "已结束行动" : `${hero.energy} / 3 能量`}
              </small>
            </div>
            <button
              data-control="custom"
              className={`exp-target ${legal("hero", index) ? "is-legal" : ""}`}
              aria-label={`目标 ${hero.name}`}
              onMouseEnter={() => onPreview({ side: "hero", index })}
              onMouseLeave={() => onPreview(null)}
              onClick={() =>
                legal("hero", index)
                  ? onTarget({ side: "hero", index })
                  : onActor(index)
              }
            >
              <Figure kind={`hero:${hero.profession}`} />
            </button>
            {renderAvatar && (
              <div className="exp-scene-avatar">{renderAvatar(index)}</div>
            )}
            <Health fighter={hero} />
            <SceneMarks markers={markers} target={{ side: "hero", index }} />
            <Impact state={state} target={{ side: "hero", index }} />
            <div className="exp-statuses">
              {hero.strength > 0 && <span>力量 {hero.strength}</span>}
              {hero.dexterity > 0 && <span>灵巧 {hero.dexterity}</span>}
              {hero.weak > 0 && <span>虚弱 {hero.weak}</span>}
              {hero.thorns > 0 && <span>反伤 {hero.thorns}</span>}
              {hero.regen > 0 && <span>再生 {hero.regen}</span>}
              {hero.poison > 0 && <span>中毒 {hero.poison}</span>}
              {Object.entries(expeditionResources).map(([key, resource]) => {
                const amount = hero[key as keyof typeof expeditionResources];
                return (
                  amount > 0 && (
                    <span key={key} title={resource.hint}>
                      {resource.name} {amount}
                    </span>
                  )
                );
              })}
              {hero.hp === 0 && <span>倒地</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="exp-enemies">
        {state.enemies.map((enemy, index) => {
          const intent = intents[index];
          return (
            <div
              data-exp-target={`enemy-${index}`}
              data-motion-zone={`expedition.enemy-${index}`}
              className={`exp-unit exp-enemy ${enemy.hp === 0 ? "is-defeated" : ""}`}
              key={index}
            >
              <div
                data-guide-target="expedition.intent"
                className={`exp-intent ${intent.kind}`}
              >
                <b>{intent.summary}</b>
                <span>{intent.description}</span>
              </div>
              <button
                data-control="custom"
                disabled={enemy.hp === 0}
                className={`exp-target ${legal("enemy", index) ? "is-legal" : ""}`}
                aria-label={`目标 ${enemy.name}`}
                onMouseEnter={() => onPreview({ side: "enemy", index })}
                onMouseLeave={() => onPreview(null)}
                onClick={() => onTarget({ side: "enemy", index })}
              >
                <Figure kind={`enemy:${enemy.name}:${enemy.icon}`} />
              </button>
              <div className="exp-unit-name">
                <strong>{enemy.name}</strong>
              </div>
              <Health fighter={enemy} />
              <SceneMarks markers={markers} target={{ side: "enemy", index }} />
              <Impact state={state} target={{ side: "enemy", index }} />
              <div className="exp-statuses">
                {enemy.weak > 0 && <span>虚弱 {enemy.weak}</span>}
                {enemy.vulnerable > 0 && <span>易伤 {enemy.vulnerable}</span>}
                {enemy.poison > 0 && <span>中毒 {enemy.poison}</span>}
                {enemy.strength > 0 && <span>力量 {enemy.strength}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {previewTarget && legal(previewTarget.side, previewTarget.index) && (
        <div className="exp-target-hint">点击目标确认</div>
      )}
    </section>
  );
}

function SceneMarks({
  markers,
  target,
}: {
  markers: Marker[];
  target: Target;
}) {
  return (
    <div className="exp-scene-marks">
      {markers
        .filter(
          (mark) =>
            mark.target.side === target.side &&
            mark.target.index === target.index,
        )
        .map((mark) => (
          <small key={mark.label}>⚑ {mark.label}</small>
        ))}
    </div>
  );
}

export function EnemyIntentStrip({
  state,
  names,
}: {
  state: ExpeditionState;
  names: string[];
}) {
  return (
    <div className="exp-intent-strip" aria-label="敌方下一步行动">
      {enemyIntents(state, names).map((intent) => (
        <details key={intent.index}>
          <summary>
            <strong>{intent.name}</strong>
            <b>{intent.summary}</b>
            <span>{intent.description}</span>
          </summary>
          <p>{intent.details || intent.description}</p>
        </details>
      ))}
    </div>
  );
}
