import { useEffect, useRef, useState } from "react";
import { minerModes } from "../../domain/miner/content";
import type { MinerView } from "../../domain/miner/types";
import {
  loadMinerProfile,
  minerLooks,
  minerRanks,
  minerUnlocks,
  rankFor,
  recordMinerResult,
  saveMinerProfile,
  type MinerProfile,
} from "./profile";

function ProfilePanel({
  view,
  actor,
  profile,
  onChange,
  onClose,
}: {
  view: MinerView;
  actor: number;
  profile: MinerProfile;
  onChange: (profile: MinerProfile) => void;
  onClose: () => void;
}) {
  const rank = rankFor(profile.rp);
  const placement = profile.placement < 3;
  const rankIndex = minerRanks.findIndex((item) => item.name === rank.name);
  const leaderboard = Object.entries(profile.leaderboard).flatMap(
    ([mode, entries]) => entries.map((entry) => ({ mode, ...entry })),
  );
  leaderboard.sort((a, b) => b.score - a.score);
  return (
    <div className="miner-profile-backdrop" role="dialog" aria-label="矿工档案">
      <section className="miner-profile-panel">
        <header>
          <h3>矿工档案</h3>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="miner-rank-card">
          <span className="miner-rank-medal">🏅</span>
          <div>
            <strong>
              {rank.name}
              {placement ? " · 定级中" : ""}
            </strong>
            <small>
              {profile.rp} RP · {profile.rankedMatches} 场排位 ·{" "}
              {placement ? `${profile.placement}/3` : `${profile.wins} 胜`}
            </small>
          </div>
          <div className="miner-rank-track">
            {minerRanks.map((item, index) => (
              <span
                key={item.name}
                data-current={item.name === rank.name}
                data-done={index <= rankIndex}
              />
            ))}
          </div>
        </div>
        <div className="miner-profile-stats">
          <span>总局数 {profile.matches}</span>
          <span>无尽最深 {profile.endlessBest} 关</span>
          <span>无尽最高 {profile.endlessBestScore}</span>
        </div>
        <h4>排行榜</h4>
        <div className="miner-leaderboard">
          {leaderboard.length ? (
            leaderboard.slice(0, 8).map((entry, index) => (
              <span key={`${entry.mode}-${entry.at}-${index}`}>
                <em>#{index + 1}</em>
                <small>
                  {minerModes[entry.mode as keyof typeof minerModes]?.name ??
                    entry.mode}
                </small>
                <strong>{entry.score}</strong>
              </span>
            ))
          ) : (
            <p>完成一局后记录本地最佳。</p>
          )}
        </div>
        <h4>外观与称号</h4>
        <div className="miner-unlocks">
          {minerUnlocks.map((unlock) => {
            const owned = profile.unlocks.includes(unlock.id);
            return (
              <button
                type="button"
                key={unlock.id}
                disabled={!owned}
                data-owned={owned}
                onClick={() => {
                  const next = { ...profile, title: unlock.name };
                  saveMinerProfile(next);
                  onChange(next);
                }}
              >
                <strong>{unlock.name}</strong>
                <small>{owned ? "点击装备称号" : unlock.condition}</small>
              </button>
            );
          })}
        </div>
        <div className="miner-looks">
          {minerLooks.map((look) => (
            <button
              type="button"
              key={look.id}
              data-current={profile.look === look.id}
              onClick={() => {
                const next = { ...profile, look: look.id };
                saveMinerProfile(next);
                onChange(next);
              }}
            >
              {look.name}
            </button>
          ))}
        </div>
        <footer>
          <small>
            当前：{actor >= 0 ? `玩家 ${actor + 1}` : "观战"} ·{" "}
            {view.mode} · 记录保存在本机
          </small>
        </footer>
      </section>
    </div>
  );
}

export function MinerProfileLayer({
  view,
  actor,
}: {
  view: MinerView;
  actor: number;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<MinerProfile>(() =>
    loadMinerProfile(),
  );
  const recorded = useRef("");
  useEffect(() => {
    if (view.phase !== "won" && view.phase !== "lost") return;
    const key = `${view.mode}:${view.levelsPlayed}:${view.teamScore}:${view.result?.score}`;
    if (recorded.current === key) return;
    recorded.current = key;
    setProfile(recordMinerResult(view, actor));
  }, [view, actor]);
  const rank = rankFor(profile.rp);
  return (
    <>
      <button
        type="button"
        className="miner-profile-button"
        data-look={profile.look}
        onClick={() => {
          setProfile(loadMinerProfile());
          setOpen(true);
        }}
      >
        🏅 {rank.name} · {profile.title}
      </button>
      {open && (
        <ProfilePanel
          view={view}
          actor={actor}
          profile={profile}
          onChange={setProfile}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
