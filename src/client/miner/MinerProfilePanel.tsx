import { useEffect, useRef, useState } from "react";
import { minerModes } from "../../domain/miner/content";
import type { MinerView } from "../../domain/miner/types";
import {
  loadMinerProfile,
  minerUnlocks,
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
  return (
    <div className="miner-profile-backdrop" role="dialog" aria-label="矿工档案">
      <section className="miner-profile-panel">
        <header>
          <h3>矿工档案</h3>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="miner-profile-stats">
          <span>总局数 {profile.matches}</span>
          <span>胜场 {profile.wins}</span>
          <span>无尽最深 {profile.endlessBest} 关</span>
          <span>无尽最高 {profile.endlessBestScore}</span>
        </div>
        <h4>称号</h4>
        <div className="miner-unlocks">
          {minerUnlocks.map((unlock) => {
            const owned = profile.unlocks.includes(unlock.id);
            return (
              <button
                type="button"
                key={unlock.id}
                disabled={!owned}
                data-owned={owned}
                data-current={profile.title === unlock.name}
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
        <footer>
          <small>
            当前：{actor >= 0 ? `玩家 ${actor + 1}` : "观战"} ·{" "}
            {minerModes[view.mode].name} · 记录保存在本机
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
  return (
    <>
      <button
        type="button"
        className="miner-profile-button"
        onClick={() => {
          setProfile(loadMinerProfile());
          setOpen(true);
        }}
      >
        🏅 {profile.title} · 档案
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
