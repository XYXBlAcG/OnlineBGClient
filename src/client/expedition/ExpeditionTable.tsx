import { ExpeditionMap } from "./ExpeditionMap";
import { useGameCommands } from "../use-game-commands";
import { useState, useEffect } from "react";
import type { GameSnapshot } from "../OriginalGame";
import { AvatarSurface, type AvatarSurfaceProps } from "../AvatarSurface";
import { Panel } from "../ui/Controls";
import type { Action } from "../../domain/types";
import { ExpeditionAdventure } from "../../domain/expedition/adventure";
import type {
  ExpeditionGameState,
  ExpeditionMove,
} from "../../domain/expedition/adventure-types";
import { allCards, ExpeditionRules } from "../../domain/expedition/rules";
import {
  cards,
  heroContent,
  definition,
  cardText,
  effectsText,
} from "../../domain/expedition/content";
import {
  potions,
  relics,
  storyEvents,
  relicText,
  eventText,
} from "../../domain/expedition/world";
import type { Target } from "../../domain/expedition/types";
import { ExpeditionCard } from "./ExpeditionCard";
import { BattleScene } from "./BattleScene";
import "./expedition.css";
import "./table.css";
const rules = new ExpeditionAdventure(),
  combat = new ExpeditionRules();
const phaseNames = {
  profession: "选择职业",
  map: "选择路线",
  battle: "共同战斗",
  reward: "战利品",
  shop: "旅途商店",
  camp: "围炉休整",
  event: "秘塔奇遇",
  recovery: "整理牌组",
  treasure: "选择遗物",
  holder: "分配遗物",
  tie: "领队裁决",
  won: "远征胜利",
  lost: "远征结束",
};
export function ExpeditionTable({
  snapshot,
  act,
  replay,
  avatar,
  pending,
  onAutoplay,
}: {
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  replay: boolean;
  avatar: Omit<AvatarSurfaceProps, "index">;
  pending: boolean;
  onAutoplay?: (enabled: boolean, index?: number) => void;
}) {
  const state = snapshot.state as ExpeditionGameState,
    run = state.view,
    actor = snapshot.actor,
    hero = run.combat.heroes[actor];
  const [selected, setSelected] = useState<string | null>(null),
    [hover, setHover] = useState<Target | null>(null),
    [inspect, setInspect] = useState<number | null>(null),
    [markMode, setMarkMode] = useState(false);
  useEffect(() => {
    setSelected(null);
    setHover(null);
    setMarkMode(false);
  }, [run.phase, run.current, actor]);
  useEffect(() => {
    setSelected((value) =>
      value &&
      !value.startsWith("potion:") &&
      !hero?.hand.some((card) => card.id === value)
        ? null
        : value,
    );
  }, [hero?.hand]);
  useEffect(() => {
    setSelected((value) => (value?.startsWith("potion:") ? null : value));
  }, [hero?.potions.join(":")]);
  const candidates =
    !replay && !pending && !snapshot.seats[actor]?.autoplay
      ? rules.candidates(state, actor)
      : [];
  const moves = candidates.flatMap((c) =>
    c.action.type === "expedition-action"
      ? [{ ...c, move: c.action.move }]
      : [],
  );
  const send = (move: ExpeditionMove) => {
    const candidate = moves.find(
      (c) => JSON.stringify(c.move) === JSON.stringify(move),
    );
    if (candidate) {
      act(candidate.action);
    }
  };
  const cardActions = moves.filter(
    (c) =>
      (c.move.type === "card" && c.move.instance === selected) ||
      (c.move.type === "potion" && `potion:${c.move.index}` === selected),
  );
  const targetActions = cardActions.filter(
    (c) => "target" in c.move && c.move.target,
  );
  const direct = cardActions.find(
    (c) => !("target" in c.move) || !c.move.target,
  );
  const previewAction = hover
    ? targetActions.find(
        (c) =>
          "target" in c.move &&
          c.move.target?.side === hover.side &&
          c.move.target?.index === hover?.index,
      )
    : cardActions[0];
  const preview =
    previewAction?.move.type === "card"
      ? combat.preview(run.combat, {
          type: "play",
          actor,
          instance: previewAction.move.instance,
          ...(previewAction.move.target
            ? { target: previewAction.move.target }
            : {}),
        })
      : undefined;
  const vote = (choice: string) =>
    send({ type: run.phase === "tie" ? "tie" : "vote", choice });
  const shownCards = hero ? allCards(hero) : [];
  const choices = moves.filter(
    (c) =>
      !["card", "potion", "discard-potion", "ping"].includes(c.move.type) &&
      !(run.phase === "shop" && c.move.type === "buy") &&
      !(
        run.phase === "reward" &&
        c.move.type === "reward" &&
        !["heal", "skip"].includes(c.move.choice)
      ),
  );
  const hand = hero?.hand ?? [];
  useGameCommands([
    ...Array.from({ length: 9 }, (_, slot) => ({
      id: `expedition.hand-${slot + 1}`,
      title: `选择第 ${slot + 1} 张手牌`,
      scope: "expedition",
      binding: String(slot + 1),
      enabled: () =>
        run.phase === "battle" &&
        !!hand[slot] &&
        moves.some(
          (c) => c.move.type === "card" && c.move.instance === hand[slot].id,
        ),
      run: () => {
        const card = hand[slot];
        setSelected(card.id);
        const target = moves.find(
          (c) => c.move.type === "card" && c.move.instance === card.id,
        );
        setHover(
          target && "target" in target.move
            ? (target.move.target ?? null)
            : null,
        );
      },
    })),
    ...[-1, 1].map((direction) => ({
      id: `expedition.target-${direction}`,
      title: direction < 0 ? "上一个目标" : "下一个目标",
      scope: "expedition",
      binding: direction < 0 ? "ArrowUp" : "ArrowDown",
      enabled: () => !pending && targetActions.length > 0,
      run: () => {
        const targets = targetActions.flatMap((c) =>
            "target" in c.move && c.move.target ? [c.move.target] : [],
          ),
          index = targets.findIndex(
            (t) => t.side === hover?.side && t.index === hover.index,
          );
        setHover(
          targets[(index + direction + targets.length) % targets.length],
        );
      },
    })),
    {
      id: "expedition.confirm-card",
      title: "确认出牌或使用药水",
      scope: "expedition",
      binding: "Enter",
      enabled: () => !pending && cardActions.length > 0,
      run: () => {
        const action =
          direct ??
          targetActions.find(
            (c) =>
              "target" in c.move &&
              c.move.target?.side === hover?.side &&
              c.move.target?.index === hover?.index,
          );
        if (action) send(action.move);
      },
    },
    {
      id: "expedition.cancel-card",
      title: "取消选牌",
      scope: "expedition",
      binding: "Escape",
      enabled: () => !!selected,
      run: () => {
        setSelected(null);
        setHover(null);
      },
    },
  ]);
  const waiting = run.combat.heroes.filter(
    (_, i) => run.nodeReady[i] || run.votes[i] !== undefined,
  ).length;
  return (
    <section
      className="expedition-table"
      aria-label="秘塔远征牌桌"
      tabIndex={0}
      data-motion-scope="game"
    >
      <header
        className="exp-table-status"
        data-guide-target="expedition.status"
        data-motion-zone="expedition.status"
      >
        <div>
          <small>
            秘塔远征 · 第一章 · {Math.max(1, run.floor + 1)} / 12 层
          </small>
          <strong>
            {phaseNames[run.phase]}
            {run.phase === "battle" ? ` · 第 ${run.combat.round} 回合` : ""}
          </strong>
        </div>
        <span>{hero ? `${hero.energy} 能量 · ${hero.gold} 金币` : "观战"}</span>
        <button onClick={() => setInspect(Math.max(0, actor))}>
          牌组与遗物
        </button>
        {!replay && !snapshot.finished && onAutoplay && (
          <>
            <button
              onClick={() => onAutoplay(!snapshot.seats[actor]?.autoplay)}
            >
              {snapshot.seats[actor]?.autoplay ? "收回控制" : "暂离托管"}
            </button>
            {snapshot.canManage &&
              snapshot.seats.map((s, i) =>
                !s.difficulty && !s.online && !s.autoplay ? (
                  <button key={i} onClick={() => onAutoplay(true, i)}>
                    托管 {s.name}
                  </button>
                ) : null,
              )}
          </>
        )}
      </header>
      {run.phase !== "profession" && run.phase !== "battle" && (
        <div className="exp-party" data-guide-target="expedition.party">
          {run.combat.heroes.map((h, i) => (
            <div key={i}>
              <AvatarSurface {...avatar} index={i} />
              <button onClick={() => setInspect(i)}>
                {h.name} · {h.hp}/{h.maxHp} ♥ · {h.gold} ◈
              </button>
            </div>
          ))}
        </div>
      )}
      {run.phase === "profession" && (
        <div
          className="exp-professions"
          data-guide-target="expedition.profession"
        >
          {heroContent.map((h, i) => (
            <button
              key={h.name}
              disabled={!moves.some((c) => c.move.type === "profession")}
              onClick={() => send({ type: "profession", profession: i })}
            >
              <span>{["⛨", "➶", "⚗"][i]}</span>
              <h2>{h.name}</h2>
              <p>{h.title}</p>
              <small>{h.maxHp} 生命 · 10 张起始牌</small>
              <p>
                {i === 0
                  ? "格挡、力量与反击，承担敌方压力。"
                  : i === 1
                    ? "连击、抽牌与标记，寻找击杀窗口。"
                    : "药剂、持续伤害与恢复，维持团队状态。"}
              </p>
            </button>
          ))}
          <p className="muted">
            {Object.keys(run.professions).length}/{run.combat.heroes.length}{" "}
            人已选 · 可以选择相同职业
          </p>
        </div>
      )}
      {run.phase === "map" && (
        <ExpeditionMap
          run={run}
          available={moves.flatMap((c) =>
            c.move.type === "vote" ? [c.move.choice] : [],
          )}
          names={snapshot.seats.map((seat) => seat.name)}
          onVote={vote}
        />
      )}
      {run.phase === "battle" && (
        <>
          <div className="exp-battle" data-guide-target="expedition.scene">
            <BattleScene
              key={`${run.runId}:${run.combat.battleSerial}`}
              markers={run.marks.map((mark) => ({
                target: mark.target,
                label: `${snapshot.seats[mark.actor]?.name}：${mark.kind === "attack" ? "集火" : "保护"}`,
              }))}
              state={run.combat}
              actor={actor}
              onActor={setInspect}
              onTarget={(target) => {
                if (markMode) {
                  send({
                    type: "ping",
                    target,
                    kind: target.side === "enemy" ? "attack" : "protect",
                  });
                  setMarkMode(false);
                  return;
                }
                const match = targetActions.find(
                  (c) =>
                    "target" in c.move &&
                    c.move.target?.side === target.side &&
                    c.move.target.index === target.index,
                );
                if (match) send(match.move);
              }}
              legalTargets={
                markMode
                  ? moves.flatMap((c) =>
                      c.move.type === "ping" ? [c.move.target] : [],
                    )
                  : targetActions.flatMap((c) =>
                      "target" in c.move && c.move.target
                        ? [c.move.target]
                        : [],
                    )
              }
              previewTarget={hover}
              onPreview={setHover}
              renderAvatar={(i) => (
                <AvatarSurface {...avatar} index={i} showName={false} />
              )}
            />
          </div>
          {preview && (
            <p className="exp-preview" aria-live="polite">
              预计伤害{" "}
              {run.combat.enemies.reduce(
                (sum, e, i) => sum + e.hp - preview.enemies[i].hp,
                0,
              )}{" "}
              · 预计治疗{" "}
              {run.combat.heroes.reduce(
                (sum, h, i) => sum + preview.heroes[i].hp - h.hp,
                0,
              )}{" "}
              · 预计格挡{" "}
              {run.combat.heroes.reduce(
                (sum, h, i) => sum + preview.heroes[i].block - h.block,
                0,
              )}
            </p>
          )}
          <div className="exp-ally-bar">
            {run.combat.heroes.map((h, i) => (
              <div key={i} data-motion-zone={`expedition.deck-${i}`}>
                <AvatarSurface
                  {...avatar}
                  index={i}
                  effectAnchor={false}
                  isTurn={!h.ready && h.hp > 0}
                />
                <button onClick={() => setInspect(i)}>
                  {snapshot.seats[i]?.name} · {h.name} · {h.hand.length} 手牌
                </button>
                <small>
                  {h.ready ? "已结束" : h.hp <= 0 ? "已倒地" : "行动中"}
                </small>
              </div>
            ))}
          </div>
          <div
            className="exp-table-controls"
            data-guide-target="expedition.actions"
          >
            <span>
              {markMode
                ? "点击角色发送团队标记"
                : direct
                  ? "点击确认使用，或按 Enter"
                  : selected
                    ? "点击高亮角色确认目标"
                    : "选择手牌，再选择高亮目标"}
            </span>
            {!replay && moves.some((c) => c.move.type === "ping") && (
              <button
                aria-pressed={markMode}
                onClick={() => {
                  setSelected(null);
                  setMarkMode((value) => !value);
                }}
              >
                标记目标
              </button>
            )}
            {direct && (
              <button
                className="primary"
                disabled={pending}
                onClick={() => send(direct.move)}
              >
                确认使用
              </button>
            )}
            {moves
              .filter((c) => ["ready", "unready"].includes(c.move.type))
              .map((c) => (
                <button key={c.move.type} onClick={() => send(c.move)}>
                  {c.label} · E
                </button>
              ))}
            {hero?.potions.map((id, i) => (
              <button
                key={i}
                title={effectsText(potions[id].effects)}
                disabled={
                  !moves.some(
                    (c) => c.move.type === "potion" && c.move.index === i,
                  )
                }
                aria-pressed={selected === `potion:${i}`}
                onClick={() => setSelected(`potion:${i}`)}
              >
                ⚗ {potions[id].name}
              </button>
            ))}
          </div>
          <div
            className="exp-table-hand"
            data-guide-target="expedition.hand"
            data-motion-zone="expedition.hand"
          >
            {hero?.hand.map((card) => (
              <ExpeditionCard
                key={card.id}
                instance={card}
                selected={selected === card.id}
                disabled={
                  !moves.some(
                    (c) =>
                      c.move.type === "card" && c.move.instance === card.id,
                  )
                }
                onChoose={() => {
                  setSelected(card.id);
                  setHover(null);
                  setMarkMode(false);
                }}
              />
            ))}
          </div>
        </>
      )}
      {run.phase === "reward" && (
        <div
          className="exp-node-content"
          data-guide-target="expedition.rewards"
        >
          <h2>选择自己的战利品</h2>
          <div className="exp-reward-cards">
            {run.offers[actor]?.map((id, i) => (
              <ExpeditionCard
                key={id}
                instance={{ card: id, id: `reward-${i}`, upgraded: false }}
                disabled={!moves.some((c) => c.move.type === "reward")}
                onChoose={() => send({ type: "reward", choice: id })}
              />
            ))}
          </div>
        </div>
      )}
      {run.phase === "shop" && (
        <div className="exp-shop" data-guide-target="expedition.shop">
          {run.shop[actor]?.map((item) => (
            <article key={item.id}>
              {item.kind === "card" ? (
                <ExpeditionCard
                  instance={{ id: item.id, card: item.card, upgraded: false }}
                  disabled={
                    !moves.some(
                      (c) => c.move.type === "buy" && c.move.item === item.id,
                    )
                  }
                  onChoose={() => send({ type: "buy", item: item.id })}
                />
              ) : (
                <>
                  <h3>
                    {item.kind === "relic"
                      ? relics[item.relic].name
                      : potions[item.potion].name}
                  </h3>
                  <p>
                    {item.kind === "relic"
                      ? relicText(item.relic)
                      : effectsText(potions[item.potion].effects)}
                  </p>
                </>
              )}
              <button
                disabled={
                  !moves.some(
                    (c) => c.move.type === "buy" && c.move.item === item.id,
                  )
                }
                onClick={() => send({ type: "buy", item: item.id })}
              >
                {item.sold ? "已购买" : `${item.price} 金币 · 购买`}
              </button>
            </article>
          ))}
        </div>
      )}
      {run.phase === "event" && (
        <div className="exp-node-content">
          <h2>{storyEvents[run.event!].name}</h2>
          <p>{storyEvents[run.event!].text}</p>
          {storyEvents[run.event!].choices.map((choice) => (
            <p key={choice.name}>
              <strong>{choice.name}</strong> · {eventText(choice.effects)}
            </p>
          ))}
          <p className="muted">选择对全队生效；支出由每人分别承担。</p>
        </div>
      )}
      {run.phase === "treasure" && (
        <div className="exp-relic-choices">
          {run.treasure.map((id) => (
            <button
              key={id}
              onClick={() => vote(id)}
              disabled={!moves.some((c) => c.move.type === "vote")}
            >
              <span>{relics[id].icon}</span>
              <h3>{relics[id].name}</h3>
              <p>{relicText(id)}</p>
            </button>
          ))}
        </div>
      )}
      {run.phase === "holder" && (
        <h2>把{relics[run.selectedRelic!].name}交给谁？</h2>
      )}
      {run.phase === "tie" && (
        <h2>
          票数相同，请领队{" "}
          {
            snapshot.seats[Math.max(0, run.floor) % run.combat.heroes.length]
              ?.name
          }{" "}
          决定
        </h2>
      )}
      {["camp", "recovery"].includes(run.phase) && (
        <div className="exp-node-content">
          <h2>
            {run.phase === "camp" ? "休息、升级或移除一张牌" : "选择要整理的牌"}
          </h2>
        </div>
      )}
      {!["battle", "profession", "map", "treasure"].includes(run.phase) && (
        <div
          className="exp-node-actions"
          data-guide-target="expedition.choices"
        >
          {choices.map((c, i) => (
            <button
              key={i}
              aria-pressed={
                "choice" in c.move && run.votes[actor] === c.move.choice
              }
              onClick={() => send(c.move)}
              title={
                c.move.type === "upgrade" || c.move.type === "remove"
                  ? cardText(
                      shownCards.find(
                        (card) =>
                          card.id === (c.move as { instance: string }).instance,
                      )!,
                    )
                  : undefined
              }
            >
              {c.move.type === "vote" &&
              run.phase === "event" &&
              c.move.choice !== "leave"
                ? storyEvents[run.event!].choices[Number(c.move.choice)].name
                : c.move.type === "reward" &&
                    c.move.choice !== "skip" &&
                    c.move.choice !== "heal"
                  ? `获得${cards[c.move.choice as keyof typeof cards].name}`
                  : c.label}
            </button>
          ))}
        </div>
      )}
      {[
        "map",
        "reward",
        "shop",
        "camp",
        "event",
        "treasure",
        "holder",
        "recovery",
      ].includes(run.phase) && (
        <small className="exp-progress">
          {waiting}/{run.combat.heroes.length} 人已确认
          {run.votes[actor] !== undefined ? " · 可以在全员确认前改票" : ""}
        </small>
      )}
      {(run.phase === "won" || run.phase === "lost") && (
        <div className="exp-node-content">
          <h2>{run.phase === "won" ? "秘塔已被征服" : "这一次旅程停在这里"}</h2>
          <p>
            经过 {run.path.length} 层 · 打出 {run.combat.metrics.cards} 张牌 ·
            完成 {run.combat.metrics.battlesWon} 场战斗
          </p>
        </div>
      )}
      <Panel
        open={inspect !== null}
        onOpenChange={(open) => {
          if (!open) setInspect(null);
        }}
        title="远征行装"
      >
        {inspect !== null && run.combat.heroes[inspect] && (
          <>
            <p className="muted">
              队友手牌公开；抽牌堆只显示组成，不显示顺序。
            </p>
            <h3>
              {snapshot.seats[inspect]?.name} ·{" "}
              {run.combat.heroes[inspect].name}
            </h3>
            <div>
              {run.combat.heroes[inspect].relics.map((id) => (
                <p key={id}>
                  <strong>
                    {relics[id].icon} {relics[id].name}
                  </strong>{" "}
                  · {relicText(id)}
                </p>
              ))}
            </div>
            {(["hand", "deck", "discard", "played", "exhaust"] as const).map(
              (pile) => (
                <section key={pile}>
                  <h4>
                    {
                      {
                        hand: "当前手牌",
                        deck: "抽牌堆组成（顺序隐藏）",
                        discard: "弃牌堆",
                        played: "本轮已出",
                        exhaust: "本场消耗",
                      }[pile]
                    }{" "}
                    · {run.combat.heroes[inspect][pile].length}
                  </h4>
                  <div className="exp-inspect-cards">
                    {run.combat.heroes[inspect][pile].map((card) => (
                      <ExpeditionCard key={card.id} instance={card} />
                    ))}
                  </div>
                </section>
              ),
            )}
          </>
        )}
      </Panel>
    </section>
  );
}
