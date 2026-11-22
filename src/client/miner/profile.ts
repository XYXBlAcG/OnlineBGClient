import type { MinerView } from "../../domain/miner/types";

export interface MinerProfile {
  matches: number;
  wins: number;
  endlessBest: number;
  endlessBestScore: number;
  unlocks: string[];
  title: string;
}

const key = "onlinebg.miner-profile-v2";

export const minerUnlocks = [
  { id: "rookie", name: "新矿工", condition: "完成第一局" },
  { id: "veteran", name: "老矿工", condition: "完成 5 局" },
  { id: "golden", name: "黄金矿工", condition: "累计获得 10000 分" },
  { id: "deep", name: "深井行者", condition: "无尽达到 6 关" },
  { id: "party", name: "派对矿工", condition: "完成混乱派对" },
  { id: "boss", name: "首领克星", condition: "完成 Boss Rush" },
] as const;

const defaults: MinerProfile = {
  matches: 0,
  wins: 0,
  endlessBest: 0,
  endlessBestScore: 0,
  unlocks: ["rookie"],
  title: "新矿工",
};

export function loadMinerProfile(): MinerProfile {
  if (typeof localStorage === "undefined") return { ...defaults };
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}");
    return {
      ...defaults,
      ...value,
      unlocks: Array.isArray(value.unlocks) ? value.unlocks : ["rookie"],
    };
  } catch {
    return { ...defaults };
  }
}

export function saveMinerProfile(profile: MinerProfile): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(profile));
  } catch {}
}

export function recordMinerResult(
  view: MinerView,
  actor: number,
): MinerProfile {
  const profile = loadMinerProfile();
  const player = view.players[actor];
  if (!player || !view.result) return profile;
  profile.matches++;
  const teamWin =
    view.result.winningTeam !== undefined &&
    view.teams[actor] === view.result.winningTeam;
  if (view.result.won || teamWin) profile.wins++;
  if (view.mode === "endless") {
    profile.endlessBest = Math.max(profile.endlessBest, view.levelsPlayed);
    profile.endlessBestScore = Math.max(profile.endlessBestScore, player.score);
  }
  const unlocked = new Set(profile.unlocks);
  if (profile.matches >= 1) unlocked.add("rookie");
  if (profile.matches >= 5) unlocked.add("veteran");
  if (
    view.players.reduce((sum, item) => sum + item.score, 0) >= 10_000
  )
    unlocked.add("golden");
  if (view.mode === "endless" && view.levelsPlayed >= 6) unlocked.add("deep");
  if (view.mode === "party") unlocked.add("party");
  if (view.mode === "bossRush") unlocked.add("boss");
  profile.unlocks = [...unlocked];
  if (profile.title === "新矿工")
    profile.title =
      [...minerUnlocks]
        .reverse()
        .find((unlock) => profile.unlocks.includes(unlock.id))?.name ??
      "新矿工";
  saveMinerProfile(profile);
  return profile;
}
