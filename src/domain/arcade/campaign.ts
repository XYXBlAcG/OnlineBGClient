import { z } from "zod";
import seedrandom from "seedrandom";

export const arcadeContinuingKinds = [
  "pool",
  "tq",
  "ccbs",
  "ktd",
  "dominion",
  "graphwar",
  "scmj",
  "golf",
] as const;
export const arcadeGameKinds = [
  "miner",
  "uno",
  "fxq",
  "ddz",
  "sgs",
  "dy",
  ...arcadeContinuingKinds,
] as const;
export type ArcadeKind = (typeof arcadeGameKinds)[number];
export const arcadeSettingsSchema = z.object({
  countdown: z.boolean(),
  actionLimit: z.boolean(),
  preferred: z.enum(arcadeGameKinds).optional(),
});
export type ArcadeSettings = z.infer<typeof arcadeSettingsSchema>;
export const defaultArcadeSettings: ArcadeSettings = {
  countdown: true,
  actionLimit: true,
};

export const arcadeCampCost = 2;
export const arcadeCollectionSize = 3;
export type ArcadeContinuingKind = (typeof arcadeContinuingKinds)[number];
export function isContinuingArcadeGame(
  kind: string,
): kind is ArcadeContinuingKind {
  return arcadeContinuingKinds.some((candidate) => candidate === kind);
}

export const arcadeLibraryEntry = {
  name: "多游戏远征",
  category: "合作",
  minPlayers: 2,
  maxPlayers: 4,
} as const;

export type ArcadeChallenge = {
  id: string;
  kind: ArcadeKind;
  seed: string;
  boss: boolean;
  risky: boolean;
  target: number;
  durationMs: number;
  actionLimit: number;
  contract?: true;
  relief?: true;
};

export const arcadeRewardIds = [
  "supply",
  "shield",
  "scout",
  "overtime",
  "reroute",
] as const;
export type ArcadeReward = (typeof arcadeRewardIds)[number];
export const arcadeStageCount = 5;
export const arcadeMaxLives = 3;

export type ArcadeRun = {
  seed: string;
  settings?: ArcadeSettings;
  medals?: number;
  routeRevision?: number;
  optionsReward?: ArcadeReward;
  phase: "route" | "playing" | "reward" | "finished";
  stage: number;
  lives: number;
  relics: ArcadeReward[];
  options: ArcadeChallenge[];
  votes: Record<number, string>;
  ready: number[];
  current: ArcadeChallenge | null;
  results: {
    challenge: ArcadeChallenge;
    won: boolean;
    detail: string;
    playId: string;
  }[];
};

function validatePlayers(players: number) {
  if (!Number.isSafeInteger(players) || players < 1)
    throw new Error("玩家人数无效");
}

function challengeSeed(seed: string, stage: number, index: number) {
  const random = seedrandom(JSON.stringify([seed, stage, index]));
  return Array.from({ length: 4 }, () =>
    Math.floor(random() * 0x100000000)
      .toString(16)
      .padStart(8, "0"),
  ).join("");
}

function challengeAt(
  seed: string,
  stage: number,
  players: number,
  index: number,
  kind: ArcadeKind,
  extraMs: number,
  revision: number,
): ArcadeChallenge {
  const id = `stage-${stage}-route-${index + 1}-${revision}`;
  const scenarioSeed = challengeSeed(`${seed}:${revision}`, stage, index);
  const boss = stage === arcadeStageCount - 1;
  if (kind === "miner") {
    const target =
      index === 0
        ? 400 + players * 280
        : index === 1
          ? 700 + players * 350
          : 1_000 + players * 420 + (index - 2) * (300 + players * 70);
    return {
      id,
      kind: "miner",
      seed: scenarioSeed,
      boss,
      risky: index > 0,
      target,
      durationMs: 45_000 + extraMs,
      actionLimit: 0,
    };
  }
  const risky = stage === 1 && kind === "uno" ? index === 0 : index > 0;
  if (isContinuingArcadeGame(kind)) {
    const budget = {
      pool: [4, 12, 180],
      tq: [0, 56, 300],
      ccbs: [5, 56, 300],
      ktd: [5, 90, 420],
      dominion: [8, 90, 420],
      graphwar: [0, 48, 240],
      scmj: [1, 100, 420],
      golf: [1, 14, 180],
    }[kind];
    return {
      id,
      kind,
      seed: scenarioSeed,
      boss,
      risky,
      target: budget[0],
      actionLimit: budget[1],
      durationMs: budget[2] * 1000 + extraMs,
    };
  }
  const budgets = {
    uno: risky ? 28 : 34,
    fxq: risky ? 32 : 42,
    ddz: risky ? 14 : 19,
    sgs: risky ? 24 : 30,
    dy: players * 4,
  };
  return {
    id,
    kind,
    seed: scenarioSeed,
    boss,
    risky,
    target: risky ? (kind === "fxq" ? 2 : 1) : kind === "fxq" ? 1 : 2,
    durationMs: 180_000 + extraMs,
    actionLimit: budgets[kind],
  };
}

function routeOptions(run: ArcadeRun, players: number, previous?: ArcadeKind) {
  const { stage, seed, settings, optionsReward: reward } = run;
  const revision = run.routeRevision ?? 0;
  const profiles: ArcadeKind[][] = [
    ["miner", "miner"],
    ["uno", "fxq", "ddz"],
    ["fxq", "ddz", "dy", "uno"],
    ["sgs", "dy", "uno", "ddz", "fxq"],
    ["miner", "miner"],
  ];
  const eligible = (kind: ArcadeKind) =>
    kind !== previous && (kind !== "ddz" || players < 4);
  const kinds = profiles[stage].filter(eligible);
  const middle = stage >= 1 && stage < arcadeStageCount - 1;
  const extra = arcadeContinuingKinds.filter(eligible);
  if (middle) {
    const offset = Math.floor(
      seedrandom(`${seed}:table:${stage}`)() * extra.length,
    );
    const featured = settings?.preferred;
    const bonus =
      featured &&
      eligible(featured) &&
      !kinds.slice(0, 2).includes(featured) &&
      revision === 0
        ? featured
        : stage === 1 && revision === 0
          ? "pool"
          : extra[(offset + revision) % extra.length];
    kinds.splice(
      2,
      0,
      bonus === previous ? extra[(offset + revision) % extra.length] : bonus,
    );
    if (revision > 0) kinds[1] = extra[(offset + revision + 1) % extra.length];
  }
  const count = (middle ? 3 : 2) + Number(reward === "scout");
  const extraMs = reward === "overtime" ? 20_000 : 0;
  const losses = run.results.slice(-2);
  const relief = losses.length === 2 && losses.every(({ won }) => !won);
  return Array.from({ length: count }, (_, index): ArcadeChallenge => ({
    ...challengeAt(
      seed,
      stage,
      players,
      index,
      kinds[index % kinds.length],
      extraMs,
      revision,
    ),
    ...(relief && index === (middle ? 2 : 1)
      ? { relief: true }
      : stage === 2 && index === 2
        ? { contract: true }
        : {}),
  }));
}

export function createArcade(
  seed: string,
  players: number,
  settings: ArcadeSettings = defaultArcadeSettings,
): ArcadeRun {
  validatePlayers(players);
  const run: ArcadeRun = {
    seed,
    settings: structuredClone(settings),
    medals: 0,
    phase: "route",
    stage: 0,
    lives: arcadeMaxLives,
    relics: [],
    options: [],
    votes: {},
    ready: [],
    current: null,
    results: [],
  };
  run.options = routeOptions(run, players);
  return run;
}

export function voteArcade(run: ArcadeRun, actor: number, id: string): void {
  if (run.phase !== "route") throw new Error("当前不在选路阶段");
  if (!Number.isSafeInteger(actor) || actor < 0)
    throw new Error("投票座位无效");
  if (!run.options.some((option) => option.id === id))
    throw new Error("路线不存在");
  run.votes[actor] = id;
}

export function chooseArcade(run: ArcadeRun, players: number): ArcadeChallenge {
  validatePlayers(players);
  if (run.phase !== "route" || run.current) throw new Error("当前不在选路阶段");
  const counts = new Map<string, number>();
  for (const [key, id] of Object.entries(run.votes)) {
    const actor = Number(key);
    if (!Number.isSafeInteger(actor) || actor < 0 || actor >= players)
      throw new Error("投票座位无效");
    if (!run.options.some((option) => option.id === id))
      throw new Error("路线不存在");
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let chosen = run.options[0];
  if (!chosen) throw new Error("没有可选路线");
  let best = -1;
  for (const option of run.options) {
    const count = counts.get(option.id) ?? 0;
    if (count > best) {
      chosen = option;
      best = count;
    }
  }
  run.current = chosen;
  run.phase = "playing";
  return chosen;
}

export function arcadeStreak(results: readonly { won: boolean }[]) {
  let streak = 0;
  for (
    let index = results.length - 1;
    index >= 0 && results[index].won;
    index--
  )
    streak++;
  return streak;
}

export function arcadeCollections(
  results: readonly {
    won: boolean;
    challenge: Pick<ArcadeChallenge, "kind">;
  }[],
): number {
  return new Set(
    results.filter(({ won }) => won).map(({ challenge }) => challenge.kind),
  ).size;
}

export function canHealArcadeCamp(
  run: Pick<ArcadeRun, "phase" | "lives" | "medals">,
) {
  return (
    run.phase === "reward" &&
    run.lives < arcadeMaxLives &&
    (run.medals ?? 0) >= arcadeCampCost
  );
}

export function healArcadeCamp(run: ArcadeRun) {
  if (!canHealArcadeCamp(run)) throw new Error("当前无法兑换补给");
  run.medals = run.medals! - arcadeCampCost;
  run.lives++;
}

export function rerouteArcade(run: ArcadeRun, players: number) {
  const index = run.relics.indexOf("reroute");
  if (run.phase !== "route" || index < 0) throw new Error("当前没有可用的路书");
  run.relics.splice(index, 1);
  run.routeRevision = (run.routeRevision ?? 0) + 1;
  run.options = routeOptions(run, players, run.results.at(-1)?.challenge.kind);
  run.votes = {};
}

export function settleArcade(
  run: ArcadeRun,
  won: boolean,
  detail: string,
  playId: string,
): void {
  if (run.results.some((result) => result.playId === playId)) return;
  if (run.phase !== "playing" || !run.current)
    throw new Error("当前没有进行中的短局");
  const challenge = run.current;
  const discovered = arcadeCollections(run.results);
  run.results.push({ challenge, won, detail, playId });
  if (won) {
    run.medals = (run.medals ?? 0) + (challenge.contract ? 3 : 1);
    if (arcadeStreak(run.results) % 2 === 0)
      run.lives = Math.min(arcadeMaxLives, run.lives + 1);
    const total = arcadeCollections(run.results);
    if (total > discovered && total % arcadeCollectionSize === 0)
      run.relics.push("shield");
  } else if (!challenge.relief) {
    for (let loss = 0; loss < (challenge.contract ? 2 : 1); loss++) {
      const shield = run.relics.indexOf("shield");
      if (shield >= 0) run.relics.splice(shield, 1);
      else run.lives = Math.max(0, run.lives - 1);
    }
  }
  run.phase =
    run.lives === 0 || run.stage >= arcadeStageCount - 1
      ? "finished"
      : "reward";
}

export function advanceArcade(
  run: ArcadeRun,
  players: number,
  reward?: ArcadeReward,
): void {
  validatePlayers(players);
  if (run.phase !== "reward") throw new Error("当前没有待确认的奖励");
  if (run.stage >= arcadeStageCount - 1) throw new Error("远征已经结束");
  if (reward && !arcadeRewards(run).includes(reward))
    throw new Error("奖励不存在");
  if (reward === "supply") run.lives = Math.min(arcadeMaxLives, run.lives + 1);
  else if (reward === "shield" || reward === "reroute") run.relics.push(reward);

  const stage = run.stage + 1;
  run.stage = stage;
  run.routeRevision = 0;
  run.optionsReward = reward;
  run.options = routeOptions(run, players, run.current?.kind);
  run.votes = {};
  run.ready = [];
  run.current = null;
  run.phase = "route";
}

export function arcadeRewards(run: ArcadeRun): ArcadeReward[] {
  const last = run.results.at(-1);
  if (run.phase !== "reward" || !last?.won) return [];
  return arcadeRewardIds.filter(
    (reward) =>
      (reward !== "shield" || last.challenge.risky) &&
      (reward !== "overtime" ||
        (run.settings ?? defaultArcadeSettings).countdown) &&
      (reward !== "reroute" || !run.relics.includes("reroute")),
  );
}
