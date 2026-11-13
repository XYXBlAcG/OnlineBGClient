import { cards, heroContent } from "../../domain/expedition/content";
import { relics, relicText } from "../../domain/expedition/world";
import type {
  Companion,
  ExpeditionMove,
} from "../../domain/expedition/adventure-types";

const modeNames = {
  fragile: "易逝",
  limited: "限次",
  eternal: "轮回",
} as const;

export function CompanionRoster({
  companions,
  moves,
  send,
  selectable = false,
}: {
  companions: Companion[];
  moves: ExpeditionMove[];
  send: (move: ExpeditionMove) => void;
  selectable?: boolean;
}) {
  const deploy = moves.find(
    (move) => move.type === "toggle-companion" && move.enabled,
  );
  const standby = moves.find(
    (move) => move.type === "toggle-companion" && !move.enabled,
  );
  if (!companions.length && !selectable) return null;
  return (
    <section className="exp-companions" aria-label="AI 队友">
      <header>
        <strong>AI 队友</strong>
        <small>{companions.filter((item) => item.active).length}/2 在队</small>
      </header>
      <div className="exp-companion-list">
        {companions.map((companion) => (
          <article
            key={companion.id}
            data-active={companion.active}
            data-dead={companion.dead}
          >
            <span>{heroContent[companion.profession].icon}</span>
            <div>
              <strong>{companion.name}</strong>
              <small>
                {heroContent[companion.profession].name} · {modeNames[companion.mode]} ·{" "}
                {companion.hp}/{companion.maxHp} ♥︎
              </small>
              <small>
                {companion.mode === "fragile"
                  ? "阵亡后永久离队"
                  : companion.mode === "limited"
                    ? `还可出战 ${companion.battlesLeft ?? 0} 场；阵亡时全队恢复 6 生命`
                    : "战后即使阵亡也会复起"}
              </small>
            </div>
            <p>
              {companion.deck
                .map((card) => cards[card].name)
                .join(" / ")}
            </p>
            <p title={relicText(companion.relic)}>
              {relics[companion.relic].icon} {relics[companion.relic].name}
            </p>
          </article>
        ))}
        {!companions.length && <p className="muted">尚未招募旅伴</p>}
      </div>
      {(deploy || standby) && (
        <footer>
          <small>本场战斗是否让队友上场？每个战斗轮次会自动使用一张简易牌。</small>
          <div>
            {deploy && (
              <button className="primary" onClick={() => send(deploy)}>
                队友上场
              </button>
            )}
            {standby && (
              <button onClick={() => send(standby)}>本场待命</button>
            )}
          </div>
        </footer>
      )}
    </section>
  );
}
