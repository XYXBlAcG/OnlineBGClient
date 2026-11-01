export interface PredictionState {
  id: string;
  round: string;
  title: string;
  options: string[];
  closesAt: number;
  status: "open" | "locked" | "settled" | "refunded";
  stakes: Record<string, { option: string; amount: number }>;
  payouts: Record<string, number>;
  winners: string[];
}
export function splitPool(
  total: number,
  weights: Record<string, number>,
): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (!sum) return {};
  const entries = Object.entries(weights).sort(([a], [b]) =>
    a.localeCompare(b, "en"),
  );
  const shares = entries.map(([id, n]) => ({
    id,
    whole: Math.floor((total * n) / sum),
    remainder: (total * n) % sum,
  }));
  let left = total - shares.reduce((s, x) => s + x.whole, 0);
  shares.sort(
    (a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id, "en"),
  );
  for (const share of shares)
    if (left > 0) {
      share.whole++;
      left--;
    }
  return Object.fromEntries(shares.map((x) => [x.id, x.whole]));
}
export class PredictionPool {
  readonly state: PredictionState;
  constructor(
    id: string,
    round: string,
    title: string,
    options: string[],
    now: number,
    windowMs: number,
    restored?: PredictionState,
  ) {
    this.state = restored
      ? structuredClone(restored)
      : {
          id,
          round,
          title,
          options,
          closesAt: now + windowMs,
          status: "open",
          stakes: {},
          payouts: {},
          winners: [],
        };
  }
  bet(
    member: string,
    option: string,
    amount: number,
    available: number,
    now: number,
  ): number {
    const s = this.state;
    if (s.status !== "open" || now >= s.closesAt) throw Error("竞猜已锁定");
    if (!s.options.includes(option)) throw Error("竞猜选项无效");
    const previous = s.stakes[member]?.amount ?? 0;
    if (
      !Number.isSafeInteger(amount) ||
      (amount !== 0 && amount < 5) ||
      amount > available + previous
    )
      throw Error("下注最少 5 币，且不能超过余额");
    if (amount === 0) delete s.stakes[member];
    else s.stakes[member] = { option, amount };
    return previous - amount;
  }
  lock(now: number): boolean {
    if (this.state.status !== "open" || now < this.state.closesAt) return false;
    this.state.status = "locked";
    return true;
  }
  cancel(): Record<string, number> {
    if (this.state.status === "settled" || this.state.status === "refunded")
      return {};
    this.state.status = "refunded";
    return (this.state.payouts = Object.fromEntries(
      Object.entries(this.state.stakes).map(([id, s]) => [id, s.amount]),
    ));
  }
  resolve(winners: string[], now: number): Record<string, number> {
    const s = this.state;
    if (s.status === "settled" || s.status === "refunded") return {};
    if (
      s.status === "open" ||
      now < s.closesAt ||
      Object.keys(s.stakes).length < 2
    )
      return this.cancel();
    const correct = Object.entries(s.stakes).filter(([, v]) =>
      winners.includes(v.option),
    );
    if (!correct.length) return this.cancel();
    const pool = Object.values(s.stakes).reduce((a, v) => a + v.amount, 0);
    const bonus =
      new Set(Object.values(s.stakes).map((v) => v.option)).size > 1
        ? Math.min(100, Math.floor(pool * 0.2))
        : 0;
    s.status = "settled";
    s.winners = winners;
    return (s.payouts = splitPool(
      pool + bonus,
      Object.fromEntries(correct.map(([id, v]) => [id, v.amount])),
    ));
  }
}
