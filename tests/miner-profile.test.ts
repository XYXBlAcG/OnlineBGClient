import { beforeEach, expect, it, vi } from "vitest";
import type { MinerView } from "../src/domain/miner/types";
import {
  loadMinerProfile,
  recordMinerResult,
} from "../src/client/miner/profile";

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

function view(mode: "friendly" | "endless", score: number): MinerView {
  return {
    mode,
    teams: [0],
    teamScore: score,
    levelTarget: 100,
    levelsPlayed: mode === "endless" ? 7 : 6,
    players: [{ seat: 0, character: "miner", score }],
    result: {
      won: true,
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

it("tracks matches, wins and titles", () => {
  recordMinerResult(view("friendly", 1000), 0);
  let profile = loadMinerProfile();
  expect(profile.matches).toBe(1);
  expect(profile.wins).toBe(1);
  expect(profile.unlocks).toContain("rookie");
  for (let index = 0; index < 4; index++)
    recordMinerResult(view("friendly", 1000), 0);
  profile = loadMinerProfile();
  expect(profile.matches).toBe(5);
  expect(profile.unlocks).toContain("veteran");
  expect(profile.title).toBe("老矿工");
});

it("tracks endless best and unlocks", () => {
  const profile = recordMinerResult(view("endless", 900), 0);
  expect(profile.endlessBest).toBe(7);
  expect(profile.unlocks).toContain("deep");
});
