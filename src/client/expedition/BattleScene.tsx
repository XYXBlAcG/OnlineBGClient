import { PixelFigure } from "./PixelFigure";
import "./world-art.css";
import { expeditionResources } from "../../domain/expedition/resources";
import { encounterModifiers } from "../../domain/expedition/modifiers";
import { enemyTraits } from "../../domain/expedition/enemy-traits";
type Marker = { target: Target; label: string };
import { enemyIntents } from "./presentation";
import type {
  ExpeditionState,
  Target,
  Fighter,
} from "../../domain/expedition/types";
function Impact({ state, target }: { state: ExpeditionState; target: Target }) {
  const events = state.visuals.filter(
    (e) =>
      ["damage", "block", "heal", "status"].includes(e.kind) &&
      e.target.side === target.side &&
      e.target.index === target.index,
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
function MechanicBoard({ state }: { state: ExpeditionState }) {
  const mechanic = state.mechanic,
    definition = state.scenario[state.encounter]?.mechanic;
  if (!mechanic || !definition) return null;
  const trigger = [...state.visuals]
    .reverse()
    .find((event) => ["mechanic", "phase", "break"].includes(event.kind));
  return (
    <div
      className={`exp-mechanic-board ${trigger ? `is-${trigger.kind}` : ""}`}
      data-mechanic={mechanic.id}
      data-guide-target="expedition.mechanic"
      key={`${state.battleSerial}:${state.round}:${state.sequence}:${trigger?.label ?? ""}`}
    >
      <div className="exp-mechanic-heading">
        <strong>{definition.name}</strong>
        <small>{mechanic.phase ? definition.phaseName : "第一阶段"}</small>
        <b>
          {definition.track.label} {mechanic.track}/{mechanic.max}
        </b>
      </div>
      <div className="exp-mechanic-meter" aria-hidden="true">
        <span
          style={{
            width: `${Math.max(0, Math.min(100, (mechanic.track / mechanic.max) * 100))}%`,
          }}
        />
      </div>
      <p>{mechanic.phase ? definition.phaseSummary : definition.summary}</p>
      {trigger?.label && (
        <div className="exp-mechanic-trigger" aria-live="polite">
          {trigger.label}
        </div>
      )}
    </div>
  );
}
function SummonBoard({ state }: { state: ExpeditionState }) {
  const clocks = state.summons ?? [];
  if (!clocks.length) return null;
  return (
    <div className="exp-summon-board" aria-label="召唤队列">
      {clocks.map((clock, index) => {
        const sourceIndex = state.enemies.findIndex(
          (enemy) =>
            enemy.hp > 0 &&
            enemy.role === "boss" &&
            (enemy.key === clock.rule.source ||
              enemy.name === clock.rule.source),
        );
        const active = state.enemies.filter(
          (enemy) => enemy.hp > 0 && enemy.ownerIndex === sourceIndex,
        ).length;
        return (
          <span
            key={`${clock.rule.source}:${index}`}
            data-queued={clock.queued || undefined}
          >
            <b>{clock.rule.template.name}</b>
            <small>
              下一次孵化 {clock.cooldown} · {active} / {clock.rule.max}
              {clock.queued ? " · 队列等待" : ""}
            </small>
          </span>
        );
      })}
    </div>
  );
}
function ModifierBoard({ state }: { state: ExpeditionState }) {
  const modifiers = state.modifiers ?? [];
  if (!modifiers.length) return null;
  return (
    <div className="exp-modifier-board" aria-label="遭遇词条">
      {modifiers.map((id) => (
        <span key={id} title={encounterModifiers[id].description}>
          {encounterModifiers[id].name}
        </span>
      ))}
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
      className={`exp-scene ${state.visuals.some((event) => event.kind === "phase") ? "has-phase-shift" : ""} ${state.visuals.some((event) => event.kind === "break") ? "has-part-break" : ""}`}
      aria-label="战斗场景"
      data-motion-scope="game"
    >
      <MechanicBoard state={state} />
      <SummonBoard state={state} />
      <ModifierBoard state={state} />
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
              {hero.spore > 0 && (
                <span className="is-spore">孢子 {hero.spore}</span>
              )}
              {hero.tether !== null && (
                <span className="is-tether">根须 {hero.tether + 1}</span>
              )}
              {hero.silenced > 0 && (
                <span className="is-silenced">封口 {hero.silenced}</span>
              )}
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
              className={`exp-unit exp-enemy ${enemy.hp === 0 ? "is-defeated" : ""} ${enemy.role === "part" ? "is-part" : ""}`}
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
                {enemy.role === "part" && <small>可拆部件</small>}
                {enemy.role === "boss" && enemy.phase > 0 && (
                  <small>阶段 {enemy.phase + 1}</small>
                )}
              </div>
              <Health fighter={enemy} />
              <SceneMarks markers={markers} target={{ side: "enemy", index }} />
              <Impact state={state} target={{ side: "enemy", index }} />
              <div className="exp-statuses">
                {(enemy.traits ?? []).map((id) => (
                  <span
                    className="is-trait"
                    key={id}
                    title={enemyTraits[id].description}
                  >
                    {enemyTraits[id].name}
                  </span>
                ))}
                {enemy.weak > 0 && <span>虚弱 {enemy.weak}</span>}
                {enemy.vulnerable > 0 && <span>易伤 {enemy.vulnerable}</span>}
                {enemy.poison > 0 && <span>中毒 {enemy.poison}</span>}
                {enemy.strength > 0 && <span>力量 {enemy.strength}</span>}
                {enemy.stolenGold > 0 && (
                  <span className="is-loot">赃金 {enemy.stolenGold}</span>
                )}
                {enemy.stolenRelics.length > 0 && (
                  <span className="is-loot">
                    赃物 {enemy.stolenRelics.length}
                  </span>
                )}
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
            {intent.role === "part" && <small>部件</small>}
            <b>{intent.summary}</b>
            <span>{intent.description}</span>
          </summary>
          <p>{intent.details || intent.description}</p>
        </details>
      ))}
    </div>
  );
}
