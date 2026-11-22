import { beforeEach, expect, it, vi } from "vitest";
import type { MinerView } from "../src/domain/miner/types";
import {
  loadMinerProfile,
  rankFor,
  recordMinerResult,
} from "../src/client/miner/profile";

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

function view(mode: "ranked" | "endless", score: number): MinerView {
  return {
    mode,
    teams: [0],
    teamScore: score,
    levelTarget: 100,
    levelsPlayed: mode === "endless" ? 7 : 6,
    players: [
      {
        seat: 0,
        character: "miner",
        score,
      },
    ],
    result: {
      won: false,
      mode,
      quota: 0,
      score,
      ranking: [{ seat: 0, score, caught: 0 }],
      ...(mode === "endless" ? { lives: 0 } : {}),
    },
  } as unknown as MinerView;
}

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", localStorageMock);
});

it("tracks ranked placement, RP, leaderboard and tier", () => {
  for (let index = 0; index < 3; index++)
    recordMinerResult(view("ranked", 1000 + index), 0);
  let profile = loadMinerProfile();
  expect(profile.placement).toBe(3);
  expect(profile.rp).toBe(0);
  recordMinerResult(view("ranked", 1500), 0);
  profile = loadMinerProfile();
  expect(profile.rp).toBe(32);
  expect(profile.leaderboard.ranked[0]?.score).toBe(1500);
  expect(rankFor(profile.rp).name).toBe("青铜");
});

it("tracks endless best and unlocks", () => {
  const profile = recordMinerResult(view("endless", 900), 0);
  expect(profile.endlessBest).toBe(7);
  expect(profile.unlocks).toContain("deep");
  expect(profile.matches).toBe(1);
});
