import { RoguelikeHud } from "../ui/RoguelikeHud";
import {
  arcadeMaxLives,
  arcadeStageCount,
  arcadeStreak,
  arcadeCampCost,
  arcadeCollections,
  arcadeCollectionSize,
  defaultArcadeSettings,
  canHealArcadeCamp,
} from "../../domain/arcade/campaign";
import { useEffect, useState } from "react";
import { gameCatalogue } from "../../domain/catalogue";
import type {
  ArcadeAction,
  ArcadeSnapshot,
  Snapshot,
} from "../../domain/protocol";
import { GameCover } from "../lobby/GameCover";
import { Button } from "../ui/Controls";
import "./arcade.css";

type Challenge = ArcadeSnapshot["options"][number];

function challengeGoal(challenge: Challenge): string {
  switch (challenge.kind) {
    case "miner":
      return `采集 ${challenge.target} 分`;
    case "fxq":
      return "同一真人抵达 2 架飞机";
    case "ddz":
      return "农民合力出完手牌";
    case "sgs":
      return "合力击退吕布";
    case "dy":
      return `真人平均毒分不超过 ${challenge.target}`;
    case "uno":
      return "任意真人出完手牌";
    case "pool":
      return `全桌合计落袋 ${challenge.target} 个目标球`;
    case "golf":
      return `真人进洞 ${challenge.target} 球`;
    case "ccbs":
      return `任一真人取得 ${challenge.target} 威望`;
    case "dominion":
    case "ktd":
      return `任一真人取得 ${challenge.target} 胜利分`;
    case "scmj":
      return "任一真人胡牌";
    case "tq":
    case "graphwar":
      return "任一真人获胜";
  }
}

function deadlineGoal(challenge: Challenge): string {
  switch (challenge.kind) {
    case "fxq":
      return `到时至少抵达 ${challenge.target} 架`;
    case "ddz":
      return `到时真人农民剩 ${challenge.target} 张以内`;
    case "sgs":
      return `到时吕布剩 ${challenge.target} 体力以内`;
    case "uno":
      return `到时真人剩 ${challenge.target} 张以内`;
    default:
      return "";
  }
}

export function ArcadeProgress({
  arcade,
  serverTime,
  paused,
  onRetreat,
}: {
  arcade: ArcadeSnapshot;
  serverTime: number;
  paused: boolean;
  onRetreat?: () => void;
}) {
  const [timed, setTimed] = useState(() =>
    Math.ceil(arcade.remainingMs / 1000),
  );
  const showTime =
    (arcade.settings ?? defaultArcadeSettings).countdown &&
    (arcade.phase === "route" ||
      arcade.phase === "reward" ||
      (arcade.phase === "playing" && arcade.current?.kind !== "miner"));
  useEffect(() => {
    if (!showTime || !arcade.deadline || paused) return;
    const starts = performance.now(),
      remaining = arcade.deadline - serverTime;
    const update = () =>
      setTimed(
        Math.max(
          0,
          Math.ceil((remaining - (performance.now() - starts)) / 1000),
        ),
      );
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [arcade.deadline, paused, serverTime, showTime]);
  const current = arcade.phase === "playing" ? arcade.current : null;
  const objective = current ? challengeGoal(current) : "";
  const streak = arcadeStreak(arcade.results);
  const shields = arcade.relics.filter((relic) => relic === "shield").length;
  return (
    <RoguelikeHud
      className="arcade-progress"
      metrics={[
        { name: "关卡", value: arcade.stage + 1, limit: arcadeStageCount },
        ...(objective ? [{ name: "目标", value: objective }] : []),
        {
          name: "团队生命",
          value: arcade.lives,
          limit: arcadeMaxLives,
          tone: "health",
        },
        { name: "印记", value: arcade.medals ?? 0 },
        ...(streak >= 2 ? [{ name: "连胜", value: streak }] : []),
        ...(shields
          ? [{ name: "护符", value: shields, tone: "energy" as const }]
          : []),
        ...(showTime
          ? [
              {
                name: "剩余秒数",
                value: paused ? Math.ceil(arcade.remainingMs / 1000) : timed,
              },
            ]
          : []),
        ...(arcade.actionsLeft !== undefined
          ? [{ name: "剩余行动", value: arcade.actionsLeft }]
          : []),
      ]}
    >
      {onRetreat && <Button onClick={onRetreat}>提前撤离</Button>}
    </RoguelikeHud>
  );
}

const rewardNames = {
  scout: "探路 · 多一条路线",
  supply: "补给 · 恢复 1 格生命",
  shield: "护符 · 抵消一次扣血",
  overtime: "怀表 · 下一关增加 20 秒",
  reroute: "路书 · 重抽一次路线",
};

export function ArcadeTable({
  snapshot,
  act,
  onReplay,
  onStart,
}: {
  snapshot: Snapshot & { arcade: ArcadeSnapshot };
  act: (action: ArcadeAction) => void;
  onReplay?: (playId: string) => void;
  onStart: () => void;
}) {
  const { arcade, actor, paused, seats } = snapshot;
  const canManage = snapshot.canManage && (!snapshot.host || actor === -1);
  const limits = arcade.settings ?? defaultArcadeSettings;
  const [reward, setReward] = useState<keyof typeof rewardNames>();
  useEffect(() => setReward(undefined), [arcade.stage]);
  const last = arcade.results.at(-1);
  const ready = arcade.ready.includes(actor);
  const canReroute =
    canManage && arcade.relics.includes("reroute") && arcade.phase === "route";
  const canHeal = canManage && canHealArcadeCamp(arcade);
  const collected = arcadeCollections(arcade.results);
  const rewardChoices = arcade.rewards;
  const resultLabel =
    last?.challenge.boss && last.won
      ? "远征通关"
      : arcade.lives === 0 || last?.challenge.boss
        ? "远征失败"
        : "远征已结束";
  return (
    <section className="arcade-table">
      <header className="arcade-table-header">
        <h2>
          {arcade.phase === "route"
            ? "选择路线"
            : arcade.phase === "reward"
              ? "关卡结算"
              : resultLabel}
        </h2>
      </header>
      {canReroute && (
        <Button
          disabled={paused}
          onClick={() =>
            act({ type: "reroute", run: arcade.id, stage: arcade.stage })
          }
        >
          使用路书重抽
        </Button>
      )}
      {arcade.phase === "route" && (
        <div className="arcade-route">
          {arcade.options.map((choice) => {
            const budget = [
              limits.countdown ? `${choice.durationMs / 1000} 秒` : "",
              limits.actionLimit && choice.actionLimit > 0
                ? `${choice.actionLimit} 次行动`
                : "",
            ]
              .filter(Boolean)
              .join("或 ");
            const deadline = budget ? deadlineGoal(choice) : "";
            const votes = seats.filter(
              (_, index) => arcade.votes[index] === choice.id,
            );
            return (
              <button
                key={choice.id}
                className="arcade-route-choice"
                aria-pressed={arcade.votes[actor] === choice.id}
                disabled={paused || actor < 0}
                onClick={() =>
                  act({
                    type: "vote",
                    run: arcade.id,
                    stage: arcade.stage,
                    option: choice.id,
                  })
                }
              >
                <GameCover kind={choice.kind} />
                <span className="arcade-route-copy">
                  <strong>
                    {choice.boss ? "首领 · " : ""}
                    {gameCatalogue[choice.kind].name}
                  </strong>
                  <span>{challengeGoal(choice)}</span>
                  {budget && (
                    <small>
                      {budget}
                      {deadline ? ` · ${deadline}` : ""}
                    </small>
                  )}
                  {choice.contract && (
                    <small>契约 · 达标得 3 印记，失败扣 2 格生命</small>
                  )}
                  {choice.relief && <small>援护 · 失败免扣生命</small>}
                  {choice.risky && !choice.boss && (
                    <small>额外奖励：护符</small>
                  )}
                  {votes.length > 0 && (
                    <small>
                      {votes.map(({ name }) => name).join("、")} 已投票
                    </small>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {arcade.phase === "reward" && last && (
        <div className="arcade-reward">
          <strong>
            {last.won ? "达标" : "未达标"} · {last.detail}
          </strong>
          <span>
            图鉴 {collected} 款 · 每集齐 {arcadeCollectionSize} 款获 1 护符
          </span>
          {canHeal && (
            <Button
              disabled={paused}
              onClick={() =>
                act({ type: "camp-heal", run: arcade.id, stage: arcade.stage })
              }
            >
              用 {arcadeCampCost} 印记换 1 格生命
            </Button>
          )}
          {canManage && rewardChoices.length > 0 && (
            <div className="arcade-actions">
              {rewardChoices.map((id) => (
                <Button
                  key={id}
                  aria-pressed={(reward ?? arcade.reward) === id}
                  variant={
                    (reward ?? arcade.reward) === id ? "primary" : "secondary"
                  }
                  disabled={paused || ready || arcade.rewardConfirmed}
                  onClick={() => setReward(id)}
                >
                  {rewardNames[id]}
                </Button>
              ))}
            </div>
          )}
          <div className="arcade-actions">
            {actor >= 0 && (
              <Button
                variant="primary"
                disabled={paused || ready}
                onClick={() =>
                  act({
                    type: "ready",
                    run: arcade.id,
                    stage: arcade.stage,
                    ...(canManage && reward ? { reward } : {}),
                  })
                }
              >
                {ready ? "已准备" : "准备下一关"}
              </Button>
            )}
            {actor < 0 && canManage && rewardChoices.length > 0 && !arcade.rewardConfirmed && (
              <Button
                variant="primary"
                disabled={paused}
                onClick={() =>
                  act({
                    type: "ready",
                    run: arcade.id,
                    stage: arcade.stage,
                    ...(reward ? { reward } : {}),
                  })
                }
              >
                {reward ? "确认遗物" : "跳过遗物"}
              </Button>
            )}
          </div>
        </div>
      )}
      {arcade.results.length > 0 && (
        <ol className="arcade-results" aria-label="远征战报">
          {arcade.results.map((result) => (
            <li key={result.playId}>
              <strong>{gameCatalogue[result.challenge.kind].name}</strong>
              <span>
                {result.won ? "达标" : "未达标"} · {result.detail}
              </span>
              {onReplay && (
                <Button onClick={() => onReplay(result.playId)}>
                  查看回放
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
      {arcade.phase === "finished" && canManage && (
        <Button variant="primary" onClick={onStart}>
          再来一章
        </Button>
      )}
    </section>
  );
}
