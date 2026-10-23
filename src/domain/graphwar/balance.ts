export const balance = {
  version: "3",
  maxPlayers: 12,
  maxSoldiers: 6,
  hp: 100,
  soldierRadius: 0.6,
  baseDamage: 50,
  blastDamage: 20,
  penetration: 0.55,
  maxPenetrations: 3,
  guard: 0.6,
  moveDistance: 3,
  maxSteps: 4096,
  step: 0.14,
  maxSegment: 0.18,
  actionsPerSoldier: 10,
  minActions: 160,
  maxActions: 800,
} as const;
export const battlefields = {
  standard: { name: "标准 · 80×48", width: 80, height: 48, obstacles: 44 },
  large: { name: "大型 · 120×72", width: 120, height: 72, obstacles: 80 },
} as const;
export const difficultyProfile = {
  easy: {
    name: "粗瞄准",
    aimError: 2.4,
    targets: 2,
    slopes: [0],
    candidates: 10,
    response: false,
  },
  normal: {
    name: "有限绕行",
    aimError: 1.1,
    targets: 4,
    slopes: [0, 0.008, -0.008, 0.02, -0.02],
    candidates: 36,
    response: false,
  },
  hard: {
    name: "战术搜索",
    aimError: 0.35,
    targets: 6,
    slopes: [0, 0.004, -0.004, 0.012, -0.012, 0.025, -0.025],
    candidates: 72,
    response: true,
  },
} as const;
