import type { MinerView } from "../../domain/miner/types";

export const minerRanks = [
  { name: "青铜", min: 0 },
  { name: "白银", min: 300 },
  { name: "黄金", min: 700 },
  { name: "铂金", min: 1200 },
  { name: "钻石", min: 1800 },
  { name: "大师", min: 2600 },
  { name: "宗师", min: 3600 },
] as const;

export interface MinerLeaderboardEntry {
  score: number;
  character: string;
  at: number;
}

export interface MinerProfile {
  rp: number;
  placement: number;
  matches: number;
  wins: number;
  rankedMatches: number;
  endlessBest: number;
  endlessBestScore: number;
  leaderboard: Record<string, MinerLeaderboardEntry[]>;
  unlocks: string[];
  title: string;
  look: string;
}

const key = "onlinebg.miner-profile-v1";

export const minerUnlocks = [
  { id: "rookie", name: "新矿工", condition: "完成第一局" },
  { id: "veteran", name: "老矿工", condition: "完成 5 局" },
  { id: "golden", name: "黄金矿工", condition: "排位达到黄金" },
  { id: "deep", name: "深井行者", condition: "无尽达到 6 关" },
  { id: "party", name: "派对矿工", condition: "完成混乱派对" },
  { id: "master", name: "矿脉大师", condition: "排位达到大师" },
] as const;

export const minerLooks = [
  { id: "default", name: "矿灯黄" },
  { id: "emerald", name: "翡翠绿" },
  { id: "sapphire", name: "蓝晶" },
  { id: "ruby", name: "红宝石" },
] as const;

const defaults: MinerProfile = {
  rp: 0,
  placement: 0,
  matches: 0,
  wins: 0,
  rankedMatches: 0,
  endlessBest: 0,
  endlessBestScore: 0,
  leaderboard: {},
  unlocks: ["rookie"],
  title: "新矿工",
  look: "default",
};

export function loadMinerProfile(): MinerProfile {
  if (typeof localStorage === "undefined") return { ...defaults };
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}");
    return {
      ...defaults,
      ...value,
      leaderboard: value.leaderboard ?? {},
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

export function rankFor(rp: number) {
  return [...minerRanks].reverse().find((rank) => rp >= rank.min) ?? minerRanks[0];
}

function recordLeaderboard(
  profile: MinerProfile,
  mode: string,
  score: number,
  character: string,
): void {
  const entries = profile.leaderboard[mode] ?? [];
  entries.push({ score, character, at: Date.now() });
  entries.sort((a, b) => b.score - a.score);
  profile.leaderboard[mode] = entries.slice(0, 8);
}

export function recordMinerResult(
  view: MinerView,
  actor: number,
): MinerProfile {
  const profile = loadMinerProfile();
  const player = view.players[actor];
  if (!player || !view.result) return profile;
  const placement =
    view.result.ranking.findIndex((entry) => entry.seat === actor) + 1;
  profile.matches++;
  const teamWin =
    view.result.winningTeam !== undefined &&
    view.teams[actor] === view.result.winningTeam;
  if (view.result.won || teamWin) profile.wins++;
  if (view.mode === "ranked") {
    profile.rankedMatches++;
    if (profile.placement < 3) profile.placement++;
    else {
      const delta =
        placement === 1 ? 32 : placement === 2 ? 18 : placement <= 4 ? 6 : -14;
      profile.rp = Math.max(0, profile.rp + delta);
    }
  }
  if (view.mode === "endless") {
    profile.endlessBest = Math.max(profile.endlessBest, view.levelsPlayed);
    profile.endlessBestScore = Math.max(profile.endlessBestScore, player.score);
  }
  recordLeaderboard(
    profile,
    view.mode,
    player.score,
    player.character,
  );
  const rank = rankFor(profile.rp);
  const unlocked = new Set(profile.unlocks);
  if (profile.matches >= 1) unlocked.add("rookie");
  if (profile.matches >= 5) unlocked.add("veteran");
  if (rank.name === "黄金") unlocked.add("golden");
  if (rank.name === "大师") unlocked.add("master");
  if (view.mode === "endless" && view.levelsPlayed >= 6) unlocked.add("deep");
  if (view.mode === "party") unlocked.add("party");
  profile.unlocks = [...unlocked];
  if (profile.title === "新矿工" && profile.matches >= 5)
    profile.title = "老矿工";
  saveMinerProfile(profile);
  return profile;
}
