export const poolModeChoices = [
  { value: "eight-ball", label: "8 球" },
  { value: "nine-ball", label: "9 球" },
  { value: "party", label: "派对台球（3–4 人）" },
] as const;
export const poolTimeChoices = [0, 45, 60, 90].map((value) => ({
  value: String(value),
  label: value === 0 ? "不限时" : `${value} 秒`,
}));
export const flightModeChoices = [
  { value: "classic", label: "经典航线" },
  { value: "storm", label: "风暴航线" },
] as const;
export const checkersModeChoices = [
  { value: "classic", label: "经典竞速" },
  { value: "siege", label: "据点攻防" },
] as const;
export const dominionModeChoices = [
  { value: "first", label: "首局推荐" },
  { value: "random", label: "随机十种" },
  { value: "custom", label: "自选十种" },
] as const;
export const mahjongDrawChoices = [
  { value: "base", label: "加底" },
  { value: "fan", label: "加番" },
] as const;

export const drawModeChoices = [
  { value: "classic", label: "经典 · 轮流画题" },
  { value: "fayu", label: "法语 · 同时作画猜句" },
] as const;
