import { useEffect, useState } from "react";
import type { ExpeditionRun } from "../../domain/expedition/adventure-types";
import { chapterAt } from "../../domain/expedition/chapters";
import { expeditionDifficulties } from "../../domain/expedition/adventure-types";
import { heroContent } from "../../domain/expedition/content";
import { relics } from "../../domain/expedition/world";
import {
  endlessLayers,
  endlessRelicCount,
  endlessScore,
} from "../../domain/expedition/endless";
import { endlessTier } from "../../domain/expedition/chapters";
import "./table.css";

function chapterName(run: ExpeditionRun) {
  return chapterAt(run.chapter).name;
}

const bestScoreKey = "onlinebg.expedition-endless-best";

export function ExpeditionVictory({ run }: { run: ExpeditionRun }) {
  const won = run.phase === "won";
  const endless = !!run.endless;
  const score = endless ? endlessScore(run) : 0;
  const [bestScore, setBestScore] = useState<number | null>(null);
  useEffect(() => {
    if (!endless || typeof localStorage === "undefined") return;
    const stored = Number(localStorage.getItem(bestScoreKey) ?? 0);
    if (score > stored) {
      localStorage.setItem(bestScoreKey, String(score));
      setBestScore(score);
    } else setBestScore(stored);
  }, [endless, run.runId, score]);
  const metrics = run.combat.metrics;
  const relicCount = endless
    ? endlessRelicCount(run)
    : run.combat.heroes.reduce((sum, hero) => sum + hero.relics.length, 0);
  const professions = run.combat.heroes
    .map((hero) => heroContent[hero.profession]?.name ?? "")
    .filter(Boolean)
    .join(" · ");
  return (
    <section
      className="exp-victory"
      data-outcome={won ? "won" : "lost"}
      aria-label={won ? "秘塔已被征服" : "远征结束"}
    >
      <div className="exp-victory-rays" aria-hidden="true" />
      <div className="exp-victory-crown" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none">
          <path
            d="M10 46 6 20l15 9L32 12l11 17 15-9-4 26Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M12 52h40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="33" r="3.6" fill="currentColor" />
        </svg>
      </div>
      <p className="exp-victory-kicker">
        {endless
          ? `无尽挑战 · 第 ${endlessTier(run.chapter) + 1} 轮`
          : won
            ? "最终章 · 塔心崩落"
            : `止步 ${endlessLayers(run)} 层`}
      </p>
      <h2>
        {endless ? "远征止步" : won ? "秘塔已被征服" : "这一次旅程停在这里"}
      </h2>
      <p className="exp-victory-subtitle">
        {chapterName(run)} ·{" "}
        {expeditionDifficulties[run.difficulty].label}难度 · N{run.ascension} 阶
      </p>
      {endless && (
        <div className="exp-victory-score" data-best={bestScore === score}>
          <span>本次得分</span>
          <strong>{score}</strong>
          {bestScore !== null && (
            <small>
              {bestScore === score ? "新纪录！" : `最佳 ${bestScore}`}
            </small>
          )}
        </div>
      )}
      <dl className="exp-victory-stats">
        <div>
          <dt>{endless ? "累计层数" : "深入层数"}</dt>
          <dd>{endless ? endlessLayers(run) : run.path.length}</dd>
        </div>
        <div>
          <dt>战斗胜场</dt>
          <dd>{metrics.battlesWon}</dd>
        </div>
        <div>
          <dt>打出卡牌</dt>
          <dd>{metrics.cards}</dd>
        </div>
        <div>
          <dt>遗物收藏</dt>
          <dd>
            {relicCount}/{Object.keys(relics).length}
          </dd>
        </div>
      </dl>
      {professions && (
        <p className="exp-victory-party">远征队伍：{professions}</p>
      )}
      {won && (
        <p className="exp-victory-line">
          秘塔的钟声停歇，回响散入长夜——这一程，你们走到了最后。
        </p>
      )}
      {endless && (
        <p className="exp-victory-line">
          无尽回廊仍在向更深处延伸——下一次，试着走得更远。
        </p>
      )}
    </section>
  );
}
