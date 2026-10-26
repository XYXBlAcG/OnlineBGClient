import { useEffect, useState } from "react";
import type { GameSnapshot } from "../OriginalGame";
import { AvatarSurface, type AvatarSurfaceProps } from "../AvatarSurface";
import type { Action, Candidate } from "../../domain/types";
import { cardDefinition, type CardId } from "../../domain/dominion/cards";
import { DominionRules } from "../../domain/dominion/rules";
import type { DominionState } from "../../domain/dominion/types";
import { DominionCard } from "./DominionCard";
import { Panel } from "../ui/Controls";
import { DominionLedger } from "./DominionLedger";
import "./dominion.css";
const rules = new DominionRules(() => 0);
const phases = { action: "行动阶段", buy: "购买阶段", finished: "对局结束" };
export function DominionTable({
  snapshot,
  act,
  replay,
  avatar,
  pending,
}: {
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  replay: boolean;
  avatar: Omit<AvatarSurfaceProps, "index">;
  pending: boolean;
}) {
  const state = snapshot.state as DominionState,
    view = state.view,
    actor = snapshot.actor;
  const [tab, setTab] = useState<"kingdom" | "base">("kingdom");
  const [inspecting, setInspecting] = useState(false);
  useEffect(() => {
    setTab("kingdom");
  }, [snapshot.room]);
  const candidates =
    !replay && !pending && !snapshot.finished
      ? rules.candidates(state, actor)
      : [];
  const activate = (candidate?: Candidate) => {
    if (candidate) act(candidate.action);
  };
  const matching = (type: "play" | "buy" | "choose", card: string) =>
    candidates.find(
      (candidate) =>
        candidate.action.type === "dominion-action" &&
        candidate.action.move.type === type &&
        (candidate.action.move.type === "choose"
          ? candidate.action.move.choice === card
          : candidate.action.move.card === card),
    );
  const supply = (Object.keys(view.supply) as CardId[]).filter((card) =>
    tab === "kingdom"
      ? view.kingdom.includes(card)
      : !view.kingdom.includes(card),
  );
  const prompt = view.prompt;
  const handChoice =
    prompt &&
    [
      "cellar",
      "chapel",
      "remodel",
      "mine",
      "moneylender",
      "throne",
      "militia",
      "bureaucrat",
      "poacher",
      "topdeck",
    ].includes(prompt.kind);
  const owned = actor >= 0 ? view.players[actor] : undefined;
  const chooseCards =
    prompt?.actor === actor
      ? [...new Set(prompt.cards.filter((id): id is CardId => id !== "hidden"))]
      : [];
  return (
    <section className="dominion-table" aria-label="领土牌桌">
      <header className="dominion-status" data-guide-target="dominion.status">
        <div>
          <small>DOMINION · 第 {view.round} 轮</small>
          <strong>
            {view.phase === "finished"
              ? `胜者：${view.winners.map((index) => snapshot.seats[index].name).join("、")}`
              : `${snapshot.seats[view.turn]?.name} · ${phases[view.phase]}`}
          </strong>
        </div>
        <div className="dominion-resources">
          <span>
            行动 <b>{view.actions}</b>
          </span>
          <span>
            购买 <b>{view.buys}</b>
          </span>
          <span>
            金币 <b>{view.coins}</b>
          </span>
        </div>
      </header>
      <div className="dominion-players" data-guide-target="dominion.players">
        {snapshot.seats.map((seat, index) => (
          <div key={index} className={index === view.turn ? "is-active" : ""}>
            <AvatarSurface
              {...avatar}
              index={index}
              isTurn={index === (prompt?.actor ?? view.turn)}
              showName={false}
            />
            <div className="dominion-player-info">
              <strong className="dominion-player-name">{seat.name}</strong>
              <small>
                手牌 {view.players[index].hand.length} · 牌库{" "}
                {view.players[index].deck.length}
                {view.scores.length > 0 ? ` · ${view.scores[index]} 分` : ""}
              </small>
            </div>
          </div>
        ))}
      </div>
      <div className="dominion-center">
        <section
          className="dominion-supply"
          data-guide-target="dominion.supply"
          aria-label="公共供应牌堆"
        >
          <nav className="dominion-supply-tabs" aria-label="供应分类">
            <button
              aria-pressed={tab === "kingdom"}
              onClick={() => setTab("kingdom")}
            >
              王国卡 · 10
            </button>
            <button
              aria-pressed={tab === "base"}
              onClick={() => setTab("base")}
            >
              财宝与胜利卡
            </button>
            <span>
              {Object.values(view.supply).filter((count) => count === 0).length}
              /3 堆售罄
            </span>
          </nav>
          <div className="dominion-supply-grid">
            {supply.map((card) => {
              const choice =
                  prompt?.kind === "gain"
                    ? matching("choose", card)
                    : undefined,
                buy = matching("buy", card);
              return (
                <DominionCard
                  key={card}
                  card={card}
                  motionZone={`dominion.supply-${card}`}
                  count={view.supply[card]}
                  disabled={!choice && !buy}
                  onClick={() => activate(choice ?? buy)}
                  label={`${choice ? "获得" : "购买"}${cardDefinition(card).name}`}
                />
              );
            })}
          </div>
        </section>
        <aside className="dominion-ledger">
          <DominionLedger snapshot={snapshot} />
        </aside>
      </div>
      {prompt && (
        <section
          className="dominion-choice"
          data-guide-target="dominion.choice"
          aria-label="卡牌效果选择"
        >
          <strong>
            {snapshot.seats[prompt.actor].name} · {prompt.title}
          </strong>
          {prompt.actor === actor && (
            <>
              {[
                "sentry",
                "library",
                "order",
                "bandit",
                "harbinger",
                "vassal",
              ].includes(prompt.kind) && (
                <div className="dominion-revealed">
                  {chooseCards.map((card) => (
                    <DominionCard
                      key={card}
                      card={card}
                      small
                      onClick={
                        matching("choose", card)
                          ? () => activate(matching("choose", card))
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
              <div className="dominion-choice-actions">
                {candidates.map((candidate, index) => (
                  <button
                    key={index}
                    disabled={pending}
                    onClick={() => activate(candidate)}
                  >
                    {candidate.label.split("：").slice(1).join("：") ||
                      candidate.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {prompt.actor !== actor && <small>等待对方完成选择</small>}
        </section>
      )}
      <footer className="dominion-own" data-guide-target="dominion.hand">
        <div className="dominion-own-heading">
          <strong>
            {replay
              ? `${snapshot.seats[actor]?.name ?? "玩家"}的手牌`
              : "我的手牌"}{" "}
            · {owned?.hand.length ?? 0}
          </strong>
          <div
            className="dominion-actions"
            data-guide-target="dominion.actions"
          >
            <button onClick={() => setInspecting(true)}>牌库与记录</button>
            {!prompt &&
              candidates
                .filter(
                  (candidate) =>
                    candidate.action.type === "dominion-action" &&
                    ["treasures", "buy-phase", "end"].includes(
                      candidate.action.move.type,
                    ),
                )
                .map((candidate, index) => (
                  <button
                    key={index}
                    className={
                      candidate.action.type === "dominion-action" &&
                      candidate.action.move.type === "treasures"
                        ? "primary-button"
                        : ""
                    }
                    onClick={() => activate(candidate)}
                  >
                    {candidate.action.type === "dominion-action" &&
                    candidate.action.move.type === "treasures"
                      ? "打出全部财宝"
                      : candidate.label}
                  </button>
                ))}
          </div>
        </div>
        <div className="dominion-hand">
          {owned?.hand.map(
            (card, index) =>
              card !== "hidden" && (
                <DominionCard
                  key={`${card}-${index}`}
                  card={card}
                  small
                  disabled={
                    !(prompt && handChoice
                      ? matching("choose", card)
                      : matching("play", card))
                  }
                  onClick={() =>
                    activate(
                      prompt && handChoice
                        ? matching("choose", card)
                        : matching("play", card),
                    )
                  }
                  label={`${prompt ? "选择" : "打出"}${cardDefinition(card).name}`}
                />
              ),
          )}
        </div>
        {!replay &&
          !snapshot.finished &&
          actor !== (prompt?.actor ?? view.turn) && (
            <small className="dominion-wait">
              等待 {snapshot.seats[prompt?.actor ?? view.turn]?.name}
            </small>
          )}
      </footer>
      <Panel
        open={inspecting}
        onOpenChange={setInspecting}
        title="领土 · 牌库与记录"
        className="dominion-inspector"
      >
        <DominionLedger snapshot={snapshot} />
      </Panel>
    </section>
  );
}
