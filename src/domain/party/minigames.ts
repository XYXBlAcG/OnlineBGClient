import type { PartyAction, PartyContext, PartyMiniGame } from "./model";
import { partyItems, type PartyItemId } from "./catalogue";
import { splitPool } from "./predictions";
export class PartyMiniGames {
  constructor(
    readonly games: PartyMiniGame[],
    readonly pay: (id: string, amount: number, label: string) => void,
    readonly show: (id: string, item: PartyItemId) => void,
  ) {}
  create(
    id: string,
    item: PartyMiniGame["item"],
    owner: string,
    price: number,
    context: PartyContext,
    now: number,
  ): void {
    if (this.games.some((g) => g.item === item && g.status === "open"))
      throw Error("同类观众活动已在进行");
    if (
      item !== "wish" &&
      context.observers.filter((i) => context.players[i]?.human).length < 2
    )
      throw Error("需要至少两位已离场的真人观众");
    this.games.push({
      id,
      item,
      owner,
      closesAt: now + partyItems[item].duration,
      status: "open",
      price,
      players: {},
      lastHit: {},
      coins: [],
      lines: [],
      contributions: {},
      votes: {},
    });
  }
  act(
    member: string,
    action: Extract<PartyAction, { type: "minigame" }>,
    observer: boolean,
    available: number,
    now: number,
  ): void {
    const game = this.games.find(
      (g) => g.id === action.game && g.status === "open",
    );
    if (!game || now >= game.closesAt) throw Error("活动已结束");
    if (game.item !== "wish" && !observer) throw Error("离场观众才可以参与");
    if (action.operation === "join") {
      game.players[member] ??= 0;
      return;
    }
    if (game.item === "wish") {
      if (action.operation === "contribute") {
        const amount = Number(action.value);
        if (!Number.isSafeInteger(amount) || amount < 1 || amount > available)
          throw Error("捐币金额无效");
        if (
          Object.values(game.contributions).reduce((a, b) => a + b, 0) +
            amount >
          100
        )
          throw Error("只需筹集 100 币");
        this.pay(member, -amount, "愿望瓶捐币");
        game.contributions[member] = (game.contributions[member] ?? 0) + amount;
      } else if (action.operation === "vote") {
        if (
          !["eggWeather", "disco", "galaxy", "underwater"].includes(
            action.value,
          )
        )
          throw Error("请选择愿望演出");
        game.votes[member] = action.value as PartyItemId;
      } else throw Error("活动操作无效");
      return;
    }
    if (!(member in game.players)) throw Error("请先参加活动");
    if (now - (game.lastHit[member] ?? -Infinity) < 300)
      throw Error("操作太快，请稍候");
    if (game.item === "coinGrab" && action.operation === "collect") {
      const coin = Number(action.value);
      if (
        !Number.isSafeInteger(coin) ||
        coin < 0 ||
        coin >= 20 ||
        game.coins.includes(coin)
      )
        throw Error("这枚金币已被拾取");
      game.coins.push(coin);
      game.players[member]++;
    } else if (game.item === "boss" && action.operation === "hit") {
      if (Object.values(game.players).reduce((a, b) => a + b, 0) >= 20)
        throw Error("BOSS 已被击败");
      game.players[member]++;
    } else if (game.item === "relay" && action.operation === "say") {
      const ids = Object.keys(game.players);
      if (ids[game.lines.length % ids.length] !== member)
        throw Error("请等待轮到自己接龙");
      if (!action.value.trim() || game.lines.length >= 30)
        throw Error("请输入一句话");
      game.lines.push({ member, text: action.value.trim() });
      game.players[member]++;
    } else throw Error("活动操作无效");
    game.lastHit[member] = now;
  }
  tick(now: number): boolean {
    let changed = false;
    for (const game of this.games) {
      if (game.status !== "open" || now < game.closesAt) continue;
      changed = true;
      const count = Object.keys(game.players).length,
        score = Object.values(game.players).reduce((a, b) => a + b, 0);
      if (game.item === "wish") {
        const total = Object.values(game.contributions).reduce(
          (a, b) => a + b,
          0,
        );
        if (total >= 100) {
          const votes = new Map<PartyItemId, number>();
          Object.values(game.votes).forEach((v) =>
            votes.set(v, (votes.get(v) ?? 0) + 1),
          );
          const chosen =
            [...votes].sort(
              (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
            )[0]?.[0] ?? "eggWeather";
          this.show(game.owner, chosen);
          game.status = "won";
        } else {
          Object.entries(game.contributions).forEach(([id, n]) =>
            this.pay(id, n, "愿望瓶退款"),
          );
          game.status = "refunded";
        }
      } else if (count < 2) {
        this.pay(game.owner, game.price, "参与人数不足退款");
        game.status = "refunded";
      } else if (game.item === "relay") {
        game.status = "won";
      } else if (score && (game.item === "coinGrab" || score >= 20)) {
        Object.entries(
          splitPool(game.price + Math.floor(game.price * 0.2), game.players),
        ).forEach(([id, n]) => this.pay(id, n, "观众活动奖励"));
        game.status = "won";
      } else game.status = "failed";
    }
    return changed;
  }
  cancel(): void {
    for (const game of this.games)
      if (game.status === "open") {
        this.pay(game.owner, game.price, "活动取消退款");
        Object.entries(game.contributions).forEach(([id, n]) =>
          this.pay(id, n, "愿望瓶退款"),
        );
        game.status = "refunded";
      }
  }
}
