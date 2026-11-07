import { useEffect, useRef, useState } from "react";
import type { GameSnapshot } from "../OriginalGame";
import type { Action, FlightView, FlightWeather } from "../../domain/types";
import { flightMovePreviews, flightWeatherEffect } from "../../domain/flight";
import "./flight.css";

const symbols: Record<FlightWeather, string> = {
  tailwind: "→",
  headwind: "←",
  crosswind: "↘",
  storm: "⚡",
};

export function FlightSpecialPanel({
  view,
  snapshot,
  act,
  replay,
  playersCollapsed,
  onTogglePlayers,
}: {
  view: FlightView;
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  replay: boolean;
  playersCollapsed: boolean;
  onTogglePlayers: () => void;
}) {
  const special = view.special;
  const actor = snapshot.actor;
  const candidates = snapshot.candidates ?? [];
  const previews =
    actor >= 0 ? flightMovePreviews(view, actor, candidates) : [];
  const weather = special ? flightWeatherEffect(special.weather) : null;
  const previousWeather = useRef<FlightWeather | undefined>(special?.weather);
  const [change, setChange] = useState<{
    from: FlightWeather;
    to: FlightWeather;
  } | null>(null);
  useEffect(() => {
    if (!special) return;
    const before = previousWeather.current;
    previousWeather.current = special.weather;
    if (!before || before === special.weather) return;
    setChange({ from: before, to: special.weather });
    const timer = setTimeout(() => setChange(null), 2200);
    return () => clearTimeout(timer);
  }, [special?.weather, special?.round]);
  const abilityButtons =
    !replay && special
      ? candidates
          .filter(
            (candidate) =>
              candidate.action.type === "fxq-special" &&
              candidate.action.ability,
          )
          .map((candidate) =>
            candidate.action.type === "fxq-special" ? (
              <button
                key={`${candidate.action.type}-${candidate.action.ability}`}
                data-guide-target={
                  candidate.action.ability === "boost"
                    ? "fxq.boost-button"
                    : "fxq.shield-button"
                }
                data-guide-id={candidate.action.ability}
                onClick={() => act(candidate.action)}
              >
                {candidate.label}
              </button>
            ) : null,
          )
      : [];
  return (
    <section
      className={`flight-status-panel ${special ? "is-storm" : "is-classic"}`}
      aria-label="飞行棋状态"
    >
      <div className="flight-mode-badge" data-guide-target="fxq.mode">
        <strong>{special ? "风暴航线" : "普通航线"}</strong>
        <span>{special ? `第 ${special.round} 轮` : "无天气修正"}</span>
      </div>
      <button
        type="button"
        className="flight-player-toggle"
        aria-expanded={!playersCollapsed}
        onClick={onTogglePlayers}
      >
        {playersCollapsed ? "展开玩家区" : "收起玩家区"}
      </button>
      {special && weather && (
        <>
          <div
            className={`flight-weather-card weather-${special.weather}`}
            data-guide-target="fxq.weather"
            key={`${special.weather}:${special.round}`}
          >
            <span className="flight-weather-symbol" aria-hidden="true">
              {symbols[special.weather]}
            </span>
            <div>
              <strong>{weather.label}</strong>
              <small>{weather.detail}</small>
            </div>
            <b>{weather.move > 0 ? `+${weather.move}` : weather.move}</b>
            <span className="sr-only" role="status">
              第 {special.round} 轮天气：{weather.label}，{weather.detail}
            </span>
          </div>
          {change && (
            <div className="flight-weather-change" role="status">
              风向变化：{flightWeatherEffect(change.from).label} →{" "}
              {flightWeatherEffect(change.to).label}
            </div>
          )}
          <div className="flight-special-stats">
            <span data-guide-target="fxq.energy">
              能量{" "}
              <b>
                {special.energy[actor] ?? 0}/{special.maxEnergy}
              </b>
            </span>
            <span data-guide-target="fxq.shield">
              护盾 <b>{special.shield[actor] ?? 0}</b>
            </span>
            <span data-guide-target="fxq.boost">
              加速 <b>{special.boost[actor] ?? 0}</b>
            </span>
            <span>
              补给 <b>{special.checkpointHits[actor] ?? 0}</b>
            </span>
          </div>
          {abilityButtons.length > 0 && (
            <div className="flight-ability-row">{abilityButtons}</div>
          )}
        </>
      )}
      <div className="flight-forecast" data-guide-target="fxq.forecast">
        <strong>本回合</strong>
        {previews.length ? (
          previews.map((preview) => {
            const effect = preview.weather
              ? flightWeatherEffect(preview.weather)
              : null;
            return (
              <div className="flight-forecast-row" key={preview.plane}>
                <span>
                  {(preview.plane % 4) + 1} 号：基础 {preview.base}
                </span>
                {preview.weatherMove !== 0 && effect && (
                  <span
                    className={`flight-delta ${preview.weatherMove < 0 ? "is-down" : "is-up"}`}
                  >
                    {effect.label} {preview.weatherMove > 0 ? "+" : ""}
                    {preview.weatherMove}
                  </span>
                )}
                {preview.shielded && (
                  <span className="flight-delta is-up">护盾抵消</span>
                )}
                {preview.boost > 0 && (
                  <span className="flight-delta is-up">
                    加速 +{preview.boost}
                  </span>
                )}
                <strong>
                  ={" "}
                  {Math.max(
                    0,
                    preview.base + preview.weatherMove + preview.boost,
                  )}{" "}
                  格
                </strong>
                <span>落点 {preview.to}</span>
                {preview.jumped && <span>跳飞</span>}
                {preview.bounced && <span>反弹</span>}
                {preview.energyGain > 0 && (
                  <span className="flight-delta is-up">
                    能量 +{preview.energyGain}
                    {preview.checkpoint ? " · 补给" : ""}
                  </span>
                )}
                {preview.returned && <span className="is-down">返航</span>}
                {preview.finish && <span className="is-up">进入终点</span>}
              </div>
            );
          })
        ) : (
          <span>
            {snapshot.finished
              ? "本局已结束。"
              : view.lastDice
                ? "没有可移动的飞机，等待下一位。"
                : "先掷骰子，再查看预计落点。"}
          </span>
        )}
      </div>
      {special?.lastAbility && (
        <div
          className="flight-feedback"
          role="status"
          data-guide-target="fxq.result"
        >
          {special.lastAbility.ability === "boost"
            ? "加速已生效：本次移动额外 +2 格。"
            : "护盾已就绪：抵消一次逆风、侧风或风暴。"}
        </div>
      )}
      {special?.lastEffect && (
        <div
          className="flight-feedback"
          role="status"
          data-guide-target="fxq.result"
        >
          {snapshot.seats[special.lastEffect.actor]?.name ?? "玩家"} ·{" "}
          {(special.lastEffect.plane % 4) + 1} 号：基础{" "}
          {special.lastEffect.base}
          {special.lastEffect.weatherMove !== 0 &&
            ` · ${flightWeatherEffect(special.lastEffect.weather).label} ${special.lastEffect.weatherMove > 0 ? "+" : ""}${special.lastEffect.weatherMove}`}
          {special.lastEffect.shielded && " · 护盾抵消"}
          {special.lastEffect.boost > 0 &&
            ` · 加速 +${special.lastEffect.boost}`}
          {` · 实际 ${Math.max(0, special.lastEffect.base + special.lastEffect.weatherMove + special.lastEffect.boost)} 格`}
          {special.lastEffect.from > 0 &&
            special.lastEffect.to - special.lastEffect.from >
              special.lastEffect.base +
                special.lastEffect.weatherMove +
                special.lastEffect.boost &&
            " · 跳飞"}
          {special.lastEffect.from > 0 &&
            special.lastEffect.to > 0 &&
            special.lastEffect.to - special.lastEffect.from !==
              special.lastEffect.base +
                special.lastEffect.weatherMove +
                special.lastEffect.boost &&
            special.lastEffect.to - special.lastEffect.from <=
              special.lastEffect.base +
                special.lastEffect.weatherMove +
                special.lastEffect.boost &&
            " · 反弹"}
          {` · 落点 ${special.lastEffect.to}`}
          {special.lastEffect.checkpoint && " · 补给 +1"}
          {special.lastEffect.energyGain > 0 &&
            ` · 能量 +${special.lastEffect.energyGain}`}
        </div>
      )}
    </section>
  );
}
