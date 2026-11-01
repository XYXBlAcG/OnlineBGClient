import { VoteStatus } from "./VoteStatus";
import { ballotPhase } from "../../domain/expedition/ballot";
import { chapters, waystationRecovery } from "../../domain/expedition/chapters";
import { Inventory } from "./Inventory";
import { RestSite, Shop } from "./CardNodes";
import { EnemyIntentStrip } from "./BattleScene";
import { ExpeditionMap } from "./ExpeditionMap";
import { useGameCommands } from "../use-game-commands";
import { useState, useEffect } from "react";
import type { GameSnapshot } from "../OriginalGame";
import { AvatarSurface, type AvatarSurfaceProps } from "../AvatarSurface";
import type { Action } from "../../domain/types";
import { ExpeditionAdventure } from "../../domain/expedition/adventure";
import type {
  ExpeditionGameState,
  ExpeditionMove,
} from "../../domain/expedition/adventure-types";
import { ExpeditionRules } from "../../domain/expedition/rules";
import { heroContent, effectsText } from "../../domain/expedition/content";
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
  waystation: "层间驿站",
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
  const choices = moves.filter(
    (c) =>
      ![
        "card",
        "potion",
        "discard-potion",
        "ping",
        "upgrade",
        "remove",
      ].includes(c.move.type) &&
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
            秘塔远征 · 第 {run.chapter + 1} 大层 · {chapters[run.chapter].name}{" "}
            · {Math.max(1, run.floor + 1)} / {run.map.length} 节点
          </small>
          <strong>
            {phaseNames[run.phase]}
            {run.phase === "battle" ? ` · 第 ${run.combat.round} 回合` : ""}
          </strong>
        </div>
        <span>
          {hero
            ? `${hero.energy} 能量 · ${hero.gold} 金币 · ${run.luck[actor]} 幸运筹码`
            : "观战"}
        </span>
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
      {run.phase === "waystation" && (
        <section className="exp-waystation">
          <h3>下一大层 · {chapters[run.chapter + 1].name}</h3>
          <p>{chapters[run.chapter + 1].rule}</p>
          <div className="exp-station-recovery">
            {run.combat.heroes.map((member, index) => (
              <span key={index}>
                {snapshot.seats[index]?.name ?? member.name} · {member.hp} →{" "}
                {member.hp +
                  Math.ceil(
                    (member.hp > 0 ? member.maxHp - member.hp : member.maxHp) *
                      waystationRecovery,
                  )}{" "}
                ♥
              </span>
            ))}
          </div>
          <p className="muted">每人选择一项进阶；全员完成后一起出发。</p>
        </section>
      )}
      {run.phase === "profession" && (
        <div
          className="exp-professions"
          data-guide-target="expedition.profession"
        >
          {heroContent.map((h, i) => (
            <button
              key={h.name}
              disabled={
                !moves.some(
                  (c) =>
                    c.move.type === "profession" && c.move.profession === i,
                )
              }
              onClick={() => send({ type: "profession", profession: i })}
            >
              <span>{h.icon}</span>
              <h2>{h.name}</h2>
              <p>{h.title}</p>
              <small>{h.maxHp} 生命 · 10 张起始牌</small>
            </button>
          ))}
          <p className="muted">
            {Object.keys(run.professions).length}/{run.combat.heroes.length}{" "}
            人已选 · 可以选择相同职业
          </p>
        </div>
      )}
      {ballotPhase(run) && (
        <VoteStatus
          run={run}
          names={snapshot.seats.map((seat) => seat.name)}
          actor={actor}
          avatars={snapshot.seats.map((seat) => seat.avatar ?? "👤")}
        />
      )}
      {run.lastBallot && !ballotPhase(run) && (
        <details className="exp-vote-result" key={run.lastBallot.sequence}>
          <summary>投票结果 · {run.lastBallot.label}</summary>
          {Object.entries(run.lastBallot.votes).map(([voter, choice]) => (
            <div key={voter}>
              {snapshot.seats[Number(voter)]?.name} ·{" "}
              {run.lastBallot!.options[choice!]}
              {choice === run.lastBallot!.choice ? " · 最终方案" : ""}
            </div>
          ))}
        </details>
      )}
      {(run.phase === "map" ||
        (run.phase === "tie" && run.votePhase === "map")) && (
        <ExpeditionMap
          run={run}
          actor={actor}
          available={moves.flatMap((c) =>
            c.move.type === "vote" || c.move.type === "tie"
              ? [c.move.choice]
              : [],
          )}
          names={snapshot.seats.map((seat) => seat.name)}
          onVote={vote}
        />
      )}
      {run.phase === "battle" && (
        <>
          <EnemyIntentStrip
            state={run.combat}
            names={snapshot.seats.map((seat) => seat.name)}
          />
          <div className="exp-battle" data-guide-target="expedition.scene">
            <BattleScene
              key={`${run.runId}:${run.combat.battleSerial}`}
              markers={run.marks.map((mark) => ({
                target: mark.target,
                label: `${snapshot.seats[mark.actor]?.name}：${mark.kind === "attack" ? "集火" : "保护"}`,
              }))}
              state={run.combat}
              actor={actor}
              names={snapshot.seats.map((seat) => seat.name)}
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
                instance={{ card: id, id: `reward-${i}`, upgradeLevel: 0 }}
                disabled={!moves.some((c) => c.move.type === "reward")}
                onChoose={() => send({ type: "reward", choice: id })}
              />
            ))}
          </div>
        </div>
      )}
      {run.phase === "shop" && hero && (
        <Shop
          hero={hero}
          items={run.shop[actor] ?? []}
          moves={moves.map((c) => c.move)}
          send={send}
        />
      )}
      {run.phase === "event" && (
        <div className="exp-node-content">
          <h2>{storyEvents[run.event!].name}</h2>
          <p>{storyEvents[run.event!].text}</p>
          <div
            className="exp-event-options"
            data-guide-target="expedition.choices"
          >
            {storyEvents[run.event!].choices.map((choice, index) => (
              <button
                key={choice.name}
                aria-pressed={run.votes[actor] === String(index)}
                disabled={
                  !moves.some(
                    (c) =>
                      c.move.type === "vote" && c.move.choice === String(index),
                  )
                }
                onClick={() => vote(String(index))}
              >
                <strong>{choice.name}</strong>
                <span>{eventText(choice.effects)}</span>
              </button>
            ))}
            <button
              disabled={
                !moves.some(
                  (c) => c.move.type === "vote" && c.move.choice === "leave",
                )
              }
              onClick={() => vote("leave")}
            >
              离开，不作改变
            </button>
            {moves.some(
              (c) => c.move.type === "vote" && c.move.choice === "reroll",
            ) && (
              <button
                aria-pressed={run.votes[actor] === "reroll"}
                onClick={() => vote("reroll")}
              >
                全员同意重选奇遇 · 每人 1 幸运筹码
              </button>
            )}
          </div>
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
      {run.phase === "tie" && run.votePhase !== "map" && (
        <h2>
          票数相同，请领队{" "}
          {
            snapshot.seats[Math.max(0, run.floor) % run.combat.heroes.length]
              ?.name
          }{" "}
          决定
        </h2>
      )}
      {["camp", "recovery"].includes(run.phase) && hero && (
        <RestSite
          key={`${run.current}:${run.phase}`}
          hero={hero}
          moves={moves.filter((c) => c.move.type !== "ping").map((c) => c.move)}
          send={send}
          recovery={run.phase === "recovery"}
        />
      )}
      {!(run.phase === "tie" && run.votePhase === "map") &&
        ![
          "battle",
          "profession",
          "map",
          "treasure",
          "camp",
          "recovery",
          "shop",
          "event",
        ].includes(run.phase) && (
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
              >
                {c.label}
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
      <Inventory
        hero={inspect !== null ? run.combat.heroes[inspect] : undefined}
        name={inspect !== null ? (snapshot.seats[inspect]?.name ?? "") : ""}
        onClose={() => setInspect(null)}
      />
    </section>
  );
}
