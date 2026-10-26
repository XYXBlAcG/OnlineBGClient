import { useEffect, useMemo, useState } from "react";
import { ExpeditionRules } from "../../domain/expedition/rules";
import {
  encounters,
  definition,
  cardText,
  type CardInstance,
} from "../../domain/expedition/content";
import { chooseAction, rankActions } from "../../domain/expedition/strategy";
import type { ExpeditionAction, Target } from "../../domain/expedition/types";
import { ExpeditionCard } from "./ExpeditionCard";
import { BattleScene } from "./BattleScene";
import { BalancePanel } from "./BalancePanel";
import { Select, Switch, Panel } from "../ui/Controls";
import { applyTheme } from "../themes";
import { MotionProvider } from "../motion";
import { defaultPreferences } from "../preferences";
import "./expedition.css";
const rules = new ExpeditionRules();
const sameTarget = (a: Target, b: Target) =>
  a.side === b.side && a.index === b.index;
export function ExpeditionDemo() {
  const [seed, setSeed] = useState("expedition-v1-042"),
    [state, setState] = useState(() => rules.create("expedition-v1-042")),
    [actor, setActor] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [hover, setHover] = useState<Target | null>(null),
    [automatic, setAutomatic] = useState(false),
    [balanceOpen, setBalanceOpen] = useState(false),
    [logOpen, setLogOpen] = useState(false),
    [theme, setTheme] = useState("dark"),
    [motion, setMotion] = useState(true),
    [enhanced, setEnhanced] = useState(true),
    [reason, setReason] = useState("选择一张牌，再点击高亮目标。");
  const hero = state.heroes[actor];
  useEffect(() => applyTheme(theme), [theme]);
  const candidates = useMemo(
    () => rules.candidates(state, actor),
    [state, actor],
  );
  const card = hero.hand.find((c) => c.id === selected);
  const cardActions = candidates.filter(
    (a): a is Extract<ExpeditionAction, { type: "play" }> =>
      a.type === "play" && a.instance === selected,
  );
  const targets = cardActions.flatMap((a) => (a.target ? [a.target] : []));
  const previewAction = hover
    ? cardActions.find((a) => a.target && sameTarget(a.target, hover))
    : cardActions[0];
  const preview = previewAction ? rules.preview(state, previewAction) : null;
  const act = (action: ExpeditionAction, explanation?: string) => {
    const next = rules.apply(state, action);
    setState(next);
    setSelected(null);
    setHover(null);
    if (explanation) setReason(explanation);
    else
      setReason(
        next.phase === "reward"
          ? "战斗胜利：为每名角色选择一项奖励。"
          : next.phase === "won"
            ? "三场遭遇全部完成。"
            : next.phase === "lost"
              ? "队伍全部倒地。可用相同种子重新开始。"
              : "已确认行动。继续出牌，或结束当前角色的行动。",
      );
  };
  const reset = () => {
    const initial = rules.create(seed.trim() || "expedition-v1-042");
    setState(initial);
    setSelected(null);
    setAutomatic(false);
    setActor(0);
    setReason("每轮 3 能量，抽 5 张牌。敌方意图已经显示。");
  };
  useEffect(() => {
    if (!automatic) return;
    if (state.phase === "won" || state.phase === "lost") {
      setAutomatic(false);
      return;
    }
    const timeout = setTimeout(
      () => {
        if (
          state.phase === "reward" &&
          state.heroes.every((_, i) => state.rewards[i])
        ) {
          act({ type: "continue" });
          return;
        }
        const nextActor = state.heroes.findIndex((h, i) =>
          state.phase === "reward" ? !state.rewards[i] : h.hp > 0 && !h.ready,
        );
        const ranked = rankActions(state, nextActor, "balanced")[0];
        if (ranked) {
          setActor(nextActor);
          act(ranked.action, ranked.reason);
        } else setAutomatic(false);
      },
      enhanced ? 650 : 350,
    );
    return () => clearTimeout(timeout);
  }, [automatic, state, enhanced]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(
          "input,textarea,select,[role=dialog],[role=listbox],[contenteditable=true]",
        )
      )
        return;
      if (automatic || balanceOpen || logOpen || state.phase !== "combat")
        return;
      const digit = Number(event.key);
      if (digit >= 1 && digit <= hero.hand.length) {
        event.preventDefault();
        setSelected(hero.hand[digit - 1].id);
      }
      if (event.key.toLowerCase() === "e") {
        const action = candidates.find(
          (a) => a.type === "ready" || a.type === "unready",
        );
        if (action) {
          event.preventDefault();
          act(action);
        }
      }
      if (event.key === "Escape") setSelected(null);
      if (
        event.key === "Enter" &&
        cardActions.length === 1 &&
        !cardActions[0].target
      ) {
        event.preventDefault();
        act(cardActions[0]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, hero, automatic, balanceOpen, logOpen, cardActions, candidates]);
  const choose = (instance: CardInstance) => {
    if (automatic) return;
    const options = candidates.filter(
      (a): a is Extract<ExpeditionAction, { type: "play" }> =>
        a.type === "play" && a.instance === instance.id,
    );
    if (selected === instance.id && options.length === 1 && !options[0].target)
      act(options[0]);
    else {
      setSelected(instance.id);
      setReason(
        `${definition(instance).name}：${cardText(instance)}${definition(instance).target === "self" || definition(instance).target === "all-enemies" ? "再次点击此牌或按使用按钮确认。" : "点击高亮目标确认。"}`,
      );
    }
  };
  const turn = state.turns.at(-1);
  const ready = candidates.find(
    (a) => a.type === "ready" || a.type === "unready",
  );
  const onTarget = (target: Target) => {
    const action = cardActions.find(
      (a) => a.target && sameTarget(a.target, target),
    );
    if (action) act(action);
  };
  const forecast = preview
    ? state.enemies.reduce((sum, e, i) => sum + e.hp - preview.enemies[i].hp, 0)
    : 0;
  return (
    <MotionProvider
      preferences={{
        ...defaultPreferences,
        theme,
        motion,
        enhancedGameMotion: enhanced,
      }}
    >
      <main className="app-shell expedition-demo">
        <header className="exp-toolbar">
          <div className="exp-brand">
            <span>✧</span>
            <div>
              <strong>秘塔远征</strong>
              <small>本地双角色 · 三场连续战斗</small>
            </div>
          </div>
          <div className="exp-toolbar-actions">
            <Select aria-label="外观" value={theme} onValueChange={setTheme}>
              <option value="dark">深色</option>
              <option value="light">浅色</option>
            </Select>
            <button onClick={() => setBalanceOpen(true)}>数值与实测</button>
            <button onClick={() => setLogOpen(true)}>战斗记录</button>
          </div>
        </header>
        <section className="exp-runbar">
          <div className="exp-location">
            <small>裂隙遗迹 / {state.encounter + 1} · 3</small>
            <h1>{encounters[state.encounter].name}</h1>
          </div>
          <div className="exp-route" aria-label="冒险进度">
            {encounters.map((e, i) => (
              <span
                key={e.name}
                className={
                  i < state.encounter
                    ? "complete"
                    : i === state.encounter
                      ? "current"
                      : ""
                }
              >
                <b>{i < state.encounter ? "✓" : i + 1}</b>
                <small>{e.name}</small>
              </span>
            ))}
          </div>
          <div className="exp-round">
            <strong>
              {state.phase === "combat"
                ? `第 ${state.round} 回合`
                : state.phase === "reward"
                  ? "战后奖励"
                  : state.phase === "won"
                    ? "冒险通关"
                    : "冒险结束"}
            </strong>
            <small>队伍结束行动后，敌人行动</small>
          </div>
        </section>
        <div className="exp-battle-area">
          <BattleScene
            state={state}
            actor={actor}
            onActor={(index) => {
              setActor(index);
              setSelected(null);
            }}
            onTarget={onTarget}
            legalTargets={targets}
            previewTarget={hover}
            onPreview={setHover}
          />
          {(state.phase === "won" || state.phase === "lost") && (
            <div className="exp-result">
              <span>{state.phase === "won" ? "✧" : "◇"}</span>
              <h2>{state.phase === "won" ? "守门者已倒下" : "远征暂告终结"}</h2>
              <p>
                {state.metrics.battlesWon} / 3 场胜利 · {state.metrics.rounds}{" "}
                回合 · 实际承伤 {state.metrics.healthLost}
              </p>
              <button className="primary-button" onClick={reset}>
                同种子再来一局
              </button>
            </div>
          )}
          {state.phase === "reward" && (
            <section className="exp-rewards" aria-label="战后奖励">
              <h2>留下改变下一战的选择</h2>
              <p>每人一项。升级打击 6 → 9，不增加牌库；治疗恢复 8 生命。</p>
              <div className="exp-reward-heroes">
                {state.heroes.map((h, index) => (
                  <div key={index}>
                    <strong>
                      {h.name} · {h.hp}/{h.maxHp} 生命
                    </strong>
                    {state.rewards[index] ? (
                      <p>✓ 已选择奖励</p>
                    ) : (
                      <div className="exp-reward-options">
                        {rules.candidates(state, index).map(
                          (action, i) =>
                            action.type === "reward" && (
                              <button
                                key={i}
                                onClick={() => act(action)}
                                disabled={automatic}
                              >
                                {action.reward.kind === "card"
                                  ? definition({
                                      id: "reward",
                                      card: action.reward.card,
                                      upgraded: false,
                                    }).name
                                  : action.reward.kind === "upgrade"
                                    ? "升级一张打击"
                                    : action.reward.kind === "heal"
                                      ? "恢复 8 生命"
                                      : "跳过"}
                                {action.reward.kind === "card" && (
                                  <small>
                                    {cardText({
                                      id: "reward",
                                      card: action.reward.card,
                                      upgraded: false,
                                    })}
                                  </small>
                                )}
                              </button>
                            ),
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="primary-button"
                disabled={
                  !state.heroes.every((_, i) => state.rewards[i]) || automatic
                }
                onClick={() => act({ type: "continue" })}
              >
                进入下一场战斗
              </button>
            </section>
          )}
        </div>
        <section className="exp-live-stats" aria-label="实际战斗统计">
          <div>
            <small>累计伤害</small>
            <b>{state.metrics.damage}</b>
          </div>
          <div>
            <small>实际吸收</small>
            <b>{state.metrics.blocked}</b>
          </div>
          <div>
            <small>累计承伤</small>
            <b>{state.metrics.healthLost}</b>
          </div>
          <div>
            <small>已出牌</small>
            <b>{state.metrics.cards}</b>
          </div>
          <p>
            {card
              ? `选中 ${definition(card).name} · 预览实际伤害 ${forecast}`
              : turn
                ? `上一回合：伤害 ${turn.damage} · 吸收 ${turn.blocked} · 承伤 ${turn.healthLost}`
                : "击杀、格挡与治疗都按规则实际结算。"}
          </p>
        </section>
        <section className="exp-hand-zone" aria-label="手牌与行动">
          <div className="exp-hand-heading">
            <div className="exp-hero-tabs">
              {state.heroes.map((h, i) => (
                <button
                  key={i}
                  aria-pressed={actor === i}
                  onClick={() => {
                    setActor(i);
                    setSelected(null);
                  }}
                >
                  {h.name}
                  <span>{h.energy}ϟ</span>
                </button>
              ))}
            </div>
            <div className="exp-hand-meta">
              <span>
                牌库 {hero.deck.length} · 弃牌 {hero.discard.length} · 消耗{" "}
                {hero.exhaust.length}
              </span>
              <button
                disabled={
                  automatic ||
                  state.phase !== "combat" ||
                  !chooseAction(state, actor, "balanced")
                }
                onClick={() => {
                  const ranked = rankActions(state, actor, "balanced")[0];
                  if (ranked) act(ranked.action, ranked.reason);
                }}
              >
                AI 执行一步
              </button>
              <button
                className="primary-button"
                onClick={() => ready && act(ready)}
                disabled={!ready || automatic}
              >
                {hero.ready ? "取消结束" : "结束行动"}
                <kbd>E</kbd>
              </button>
            </div>
          </div>
          <div className="exp-hand">
            {hero.hand.map((instance, index) => (
              <div key={instance.id} className="exp-hand-card">
                <ExpeditionCard
                  instance={instance}
                  selected={selected === instance.id}
                  disabled={
                    automatic ||
                    !candidates.some(
                      (a) => a.type === "play" && a.instance === instance.id,
                    )
                  }
                  onChoose={() => choose(instance)}
                />
                <kbd>{index + 1}</kbd>
              </div>
            ))}
          </div>
          <div className="exp-selection" role="status">
            <span>{reason}</span>
            {selected && cardActions.length === 1 && !cardActions[0].target && (
              <button
                className="primary-button"
                disabled={automatic}
                onClick={() => act(cardActions[0])}
              >
                使用{card && definition(card).name}
              </button>
            )}
          </div>
        </section>
        <footer className="exp-controls">
          <label>
            种子
            <input
              aria-label="战斗种子"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              maxLength={64}
            />
          </label>
          <button onClick={reset}>重新开始</button>
          <button
            aria-pressed={automatic}
            onClick={() => setAutomatic((v) => !v)}
            disabled={state.phase === "won" || state.phase === "lost"}
          >
            {automatic ? "暂停演示" : "自动试玩"}
          </button>
          <div className="exp-motion">
            <Switch
              checked={motion}
              onCheckedChange={setMotion}
              label="界面动画"
            />
            <Switch
              checked={enhanced}
              onCheckedChange={setEnhanced}
              label="增强游戏动画"
            />
          </div>
        </footer>
        <BalancePanel open={balanceOpen} onOpenChange={setBalanceOpen} />
        <Panel
          open={logOpen}
          onOpenChange={setLogOpen}
          title="逐回合战斗记录"
          className="exp-log-panel"
        >
          <div className="exp-turn-table">
            <table>
              <thead>
                <tr>
                  <th>战斗 / 回合</th>
                  <th>伤害</th>
                  <th>吸收</th>
                  <th>承伤</th>
                  <th>出牌</th>
                </tr>
              </thead>
              <tbody>
                {state.turns.map((t, i) => (
                  <tr key={i}>
                    <td>
                      {t.encounter + 1} / {t.round}
                    </td>
                    <td>{t.damage}</td>
                    <td>{t.blocked}</td>
                    <td>{t.healthLost}</td>
                    <td>{t.cards}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ol className="exp-event-log">
            {state.log
              .slice()
              .reverse()
              .map((entry) => (
                <li key={entry.id}>
                  <small>#{entry.id}</small>
                  {entry.text}
                </li>
              ))}
          </ol>
        </Panel>
      </main>
    </MotionProvider>
  );
}
