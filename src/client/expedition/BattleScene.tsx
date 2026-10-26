type Marker = { target: Target; label: string };
import { attackPlan } from "../../domain/expedition/rules";
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
  const body =
    kind === "guardian"
      ? "#749caa"
      : kind === "ranger"
        ? "#6aaf99"
        : kind === "beast"
          ? "#b28b81"
          : kind === "crystal"
            ? "#a8a0d5"
            : "#9c9291";
  return (
    <svg
      viewBox="0 0 180 180"
      role="presentation"
      className={`exp-figure exp-figure-${kind}`}
    >
      <ellipse cx="90" cy="164" rx="56" ry="9" fill="#000" opacity=".2" />
      {kind === "crystal" ? (
        <>
          <path d="M90 22 125 77 109 140 73 140 54 79Z" fill={body} />
          <path d="m90 22 1 117-37-60Z" fill="#fff" opacity=".35" />
          <path d="m90 22 35 55-34 62Z" fill="#352a55" opacity=".4" />
          <path
            d="m22 100 18-25 13 47-15 23Zm112-22 20 20-6 42-17-12Z"
            fill={body}
          />
          <circle cx="91" cy="95" r="11" fill="#dfd5ff" />
        </>
      ) : kind === "beast" ? (
        <>
          <path
            d="m30 129 20-62 38 16 40-23 26 67-24 27-36-10-37 10Z"
            fill={body}
          />
          <path d="m50 67 4-38 32 53 42-22 13-35 9 73" fill={body} />
          <path d="m57 105 16-5-3 12Zm54-5 17 5-15 7Z" fill="#ffe3a3" />
          <path d="m77 126 17 11 17-11-8 21H85Z" fill="#322c3d" />
          <path
            d="m30 129-16 28 27-10m111-20 17 26-23-6"
            stroke="#dad0be"
            strokeWidth="7"
            fill="none"
          />
        </>
      ) : (
        <>
          <path d="M57 84 43 149 90 161l47-12-16-65-30-16Z" fill={body} />
          <path d="m91 77-3 84 49-12-16-65Z" fill="#20313c" opacity=".35" />
          <path d="m65 82-24 24 4 41 20-7m53-58 24 24-5 41-19-7" fill={body} />
          <path d="m64 77 7-43 20-14 21 14 8 43-28 15Z" fill={body} />
          <path d="m73 57 18-5 19 5-4 15-15 6-15-6Z" fill="#263744" />
          <path d="M81 63h7m8 0h7" stroke="#f8e1a1" strokeWidth="3" />
          {kind === "guardian" ? (
            <>
              <path
                d="m22 92 40-9 6 45-23 26-25-27Z"
                fill="#c9b583"
                stroke="#f2e0ae"
                strokeWidth="3"
              />
              <path
                d="m44 95 2 43m-15-27 28 1"
                stroke="#796c52"
                strokeWidth="4"
              />
            </>
          ) : kind === "ranger" ? (
            <>
              <path
                d="M143 58q38 48-3 92m5-89 0 83"
                fill="none"
                stroke="#ddc3a1"
                strokeWidth="5"
              />
              <path d="m90 22-25 26 1 24 25-18 28 17-6-34Z" fill="#416f64" />
            </>
          ) : (
            <>
              <path d="m22 102 13-66 16 62m91 5 9-66 14 62" fill="#c5b79a" />
              <path
                d="M65 32 54 15 75 23m35 9 17-17-5 33"
                stroke="#ccc0a4"
                strokeWidth="8"
              />
            </>
          )}
        </>
      )}
    </svg>
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
}: {
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
  const legal = (side: "hero" | "enemy", index: number) =>
    legalTargets.some((t) => t.side === side && t.index === index);
  return (
    <section
      className="exp-scene"
      aria-label="战斗场景"
      data-motion-scope="game"
    >
      <svg
        className="exp-scenery"
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="exp-glow">
            <stop stopColor="#7b8fa4" stopOpacity=".26" />
            <stop offset="1" stopColor="#7b8fa4" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="760" cy="160" rx="480" ry="260" fill="url(#exp-glow)" />
        <path d="M0 0h1200v400H0Z" fill="none" />
        <path
          d="M20 0h160l-18 258 65 142H0V235L45 94Zm1040 0h160v400h-218l72-132-30-167Z"
          fill="currentColor"
          opacity=".10"
        />
        <path
          d="M246 0h28v260h-28m690-260h28v280h-28"
          fill="currentColor"
          opacity=".07"
        />
        <path
          d="M0 330q400-65 1200 0M90 400l190-100m810 100-180-100m-420 90 30-82m220 83-30-83"
          stroke="currentColor"
          opacity=".08"
          fill="none"
        />
        <circle
          cx="770"
          cy="70"
          r="90"
          stroke="currentColor"
          opacity=".07"
          fill="none"
        />
      </svg>
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
              <Figure
                kind={["guardian", "ranger", "alchemist"][hero.profession]}
              />
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
              {hero.hp === 0 && <span>倒地</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="exp-enemies">
        {state.enemies.map((enemy, index) => {
          const intent = enemy.intent,
            plan = attackPlan(state, enemy);
          const targets =
            intent.target === "all"
              ? "全队"
              : plan.length
                ? state.heroes[plan[0].actor].name
                : "铁卫";
          const attack = plan[0]?.amount ?? intent.amount;
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
                <b>
                  {intent.kind === "attack"
                    ? `⚔ ${attack}${(intent.hits ?? 1) > 1 ? ` × ${intent.hits}` : ""}`
                    : intent.kind === "block"
                      ? `◈ ${intent.amount}`
                      : `↑ ${intent.amount}`}
                </b>
                <span>
                  {enemy.hp === 0
                    ? "已击败"
                    : intent.kind === "attack"
                      ? `攻击${targets}`
                      : intent.kind === "block"
                        ? "准备格挡"
                        : "准备增强力量"}
                </span>
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
                <Figure kind={enemy.icon} />
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
