import { workshopPurchaseIssue } from "./workshop/availability";
import {
  type WorkshopVisual,
  roomPluginsSchema,
  workshopVisualSchema,
} from "./workshop/model";
import { partyPurchaseIssue } from "./party/availability";
import {
  partyItems,
  partyPrice,
  discountedPartyPrice,
  partyTier,
  slashLines,
  type PartyItemId,
} from "./party/catalogue";
import {
  partyEconomy,
  partyPolicySchema,
  type PartyAction,
  type PartyContext,
  type PartyEvent,
  type PartySnapshot,
  type PartyState,
  awardTitles,
} from "./party/model";
import { PredictionPool } from "./party/predictions";
import { PartyMiniGames } from "./party/minigames";
import type { PartySignal } from "./party/facts";
export * from "./party/model";
export * from "./party/catalogue";
export class PartyLedger {
  private state: PartyState;
  private revision = 0;
  private cachedSnapshot?: {
    revision: number;
    observers: string;
    snapshot: PartySnapshot;
  };
  constructor(saved?: PartyState) {
    const empty: PartyState = {
      sequence: 0,
      plugins: [],
      enabled: false,
      policy: partyPolicySchema.parse({}),
      balances: {},
      round: "",
      settled: false,
      support: {},
      awards: {},
      processed: [],
      lastBuy: {},
      events: [],
      receipts: [],
      markets: [],
      minigames: [],
      observedOutcomes: [],
    };
    this.state = { ...empty, ...structuredClone(saved) };
    this.state.policy = {
      ...empty.policy,
      ...saved?.policy,
      enabled: this.state.enabled,
    };
    for (const account of Object.values(this.state.balances)) {
      account.pluginAuras ??= [];
      account.earned ??= 0;
      account.equipment ??= [];
      account.auras ??= [];
    }
    for (const market of this.state.markets)
      if (market.status === "open")
        this.payMarket(market.id, [], true, Date.now());
  }
  post(
    id: string,
    amount: number,
    label: string,
    earned = amount > 0 ? amount : 0,
    now = Date.now(),
  ): void {
    const account = this.state.balances[id];
    if (!account || !Number.isSafeInteger(amount) || account.coins + amount < 0)
      throw Error("彩蛋币账户或金额无效");
    account.coins += amount;
    account.earned += Math.max(0, earned);
    this.revision++;
    this.state.receipts.push({
      id: `${this.state.round}:${this.state.sequence++}`,
      member: id,
      time: now,
      label,
      delta: amount,
      balance: account.coins,
    });
    this.state.receipts = this.state.receipts.slice(-200);
  }
  payMarket(id: string, winners: string[], cancel: boolean, now: number): void {
    const market = this.state.markets.find((m) => m.id === id);
    if (!market || market.status === "settled" || market.status === "refunded")
      return;
    const pool = new PredictionPool("", "", "", [], 0, 0, market),
      payouts = cancel ? pool.cancel() : pool.resolve(winners, now);
    Object.assign(market, pool.state);
    for (const [member, n] of Object.entries(payouts))
      this.post(
        member,
        n,
        pool.state.status === "refunded" ? "竞猜退款" : "竞猜结算",
        pool.state.status === "refunded"
          ? 0
          : Math.max(0, n - (market.stakes[member]?.amount ?? 0)),
        now,
      );
    this.revision++;
  }
  miniGames(now = Date.now()): PartyMiniGames {
    return new PartyMiniGames(
      this.state.minigames,
      (id, n, label) =>
        this.post(
          id,
          n,
          label,
          label.includes("退款") ? 0 : Math.max(0, n),
          now,
        ),
      (id, item) => this.emit(`wish:${now}`, item, id, id, now),
    );
  }
  sync(context: PartyContext, now = Date.now()): boolean {
    const revision = this.revision,
      s = this.state;
    if (!s.enabled) return false;
    for (const player of context.players)
      if (player.human && !s.balances[player.id]) {
        s.balances[player.id] = {
          coins: 0,
          earned: 0,
          shield: false,
          equipment: [],
          auras: [],
          pluginAuras: [],
        };
        this.post(player.id, partyEconomy.initial, "加入房间", 0, now);
      }
    if (s.round !== context.round) {
      this.cancel(now);
      if (s.settled)
        for (const title of Object.keys(awardTitles)) {
          const counts = new Map<string, number>();
          Object.values(s.awards)
            .filter((v) => v.title === title)
            .forEach((v) =>
              counts.set(v.target, (counts.get(v.target) ?? 0) + 1),
            );
          const best = Math.max(0, ...counts.values());
          for (const [id, count] of counts)
            if (count === best && s.balances[id])
              this.post(
                id,
                partyEconomy.award,
                "本局奖章",
                partyEconomy.award,
                now,
              );
        }
      s.round = context.round;
      s.settled = false;
      s.support = {};
      s.awards = {};
      s.observedOutcomes = [];
      s.markets = s.markets.slice(-12);
      s.minigames = s.minigames.slice(-8);
      for (const a of Object.values(s.balances)) {
        a.shield = false;
        a.equipment = [];
        a.auras = [];
        a.pluginAuras = [];
      }
      this.revision++;
    }
    for (const market of s.markets) {
      if (market.status === "open" && now >= market.closesAt) {
        market.status = "locked";
        this.revision++;
      }
      if (
        market.round !== context.round ||
        (!context.playing && !context.finished)
      )
        this.payMarket(market.id, [], true, now);
    }
    for (const outcome of context.outcomes ?? []) {
      const id = `${context.round}:${outcome.id}`,
        market = s.markets.find((m) => m.id === id);
      if (outcome.result) {
        if (market && (market.status === "open" || market.status === "locked"))
          this.payMarket(id, outcome.result, false, now);
      } else if (
        context.playing &&
        !market &&
        !s.observedOutcomes.includes(id) &&
        outcome.options.length >= 2 &&
        context.observers.some((i) => context.players[i]?.human)
      ) {
        s.markets.push(
          new PredictionPool(
            id,
            context.round,
            outcome.title,
            outcome.options.map((o) => o.id),
            now,
            s.policy.betSeconds * 1000,
          ).state,
        );
        s.observedOutcomes.push(id);
        this.revision++;
      }
    }
    if (this.miniGames(now).tick(now)) this.revision++;
    if (context.finished && !s.settled) {
      s.settled = true;
      for (const player of context.players)
        if (player.human)
          this.post(
            player.id,
            partyEconomy.completion +
              (context.winners?.some(
                (i) => context.players[i]?.id === player.id,
              )
                ? partyEconomy.winner
                : 0),
            "完成对局奖励",
            undefined,
            now,
          );
      for (const market of s.markets)
        if (market.status === "open" || market.status === "locked")
          this.payMarket(market.id, [], true, now);
      this.revision++;
    }
    for (const e of s.events.filter(
      (e) =>
        e.audience !== "table" &&
        e.time > now &&
        !context.players.some((p) => p.id === e.target),
    )) {
      if (e.charged)
        this.post(e.charged.member, e.charged.amount, "目标离开退款", 0, now);
      s.events = s.events.filter((v) => v.id !== e.id);
      this.revision++;
    }
    const events = s.events.filter((e) => now < e.time + e.duration + 30000);
    if (events.length !== s.events.length) {
      s.events = events;
      this.revision++;
    }
    return revision !== this.revision;
  }
  cancel(now = Date.now()): void {
    for (const m of this.state.markets)
      if (m.status === "open" || m.status === "locked")
        this.payMarket(m.id, [], true, now);
    this.miniGames(now).cancel();
    const pending = this.state.events.filter((e) => e.time > now);
    for (const e of pending) {
      if (e.charged)
        this.post(e.charged.member, e.charged.amount, "排队演出退款", 0, now);
    }
    this.state.events = this.state.events.filter((e) => e.time <= now);
    if (pending.length) this.revision++;
  }
  private routeAttack(
    from: string,
    target: string,
  ): { from: string; target: string; guard?: PartyItemId } {
    const defender = this.state.balances[target];
    const guard = (["blackHole", "decoy", "umbrella"] as PartyItemId[]).find(
      (e) => defender?.equipment.includes(e),
    );
    if (!guard) return { from, target };
    defender.equipment = defender.equipment.filter((e) => e !== guard);
    defender.shield = defender.equipment.includes("umbrella");
    return guard === "umbrella"
      ? { from: target, target: from }
      : { from, target, guard };
  }
  emit(
    id: string,
    item: PartyItemId,
    from: string,
    target: string,
    now: number,
    caption?: string,
    density = 1,
    visual?: WorkshopVisual,
  ): PartyEvent {
    let seed = 2166136261;
    for (const c of id)
      seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
    const active = this.state.events.filter((e) => e.time + e.duration > now);
    let start = now;
    while (
      active.filter((e) => e.time <= start && e.time + e.duration > start)
        .length >= 3
    )
      start = Math.min(
        ...active
          .filter((e) => e.time + e.duration > start)
          .map((e) => e.time + e.duration),
      );
    const event: PartyEvent = {
      id,
      item,
      from,
      target,
      time: start,
      createdAt: now,
      duration: visual?.duration ?? partyItems[item].duration,
      ...(visual ? { visual: workshopVisualSchema.strip().parse(visual) } : {}),
      seed,
      caption: caption ?? partyItems[item].name,
      density,
    };
    this.state.events.push(event);
    this.revision++;
    return event;
  }
  trigger(
    signals: PartySignal[],
    context: PartyContext,
    version: number,
    now = Date.now(),
  ): void {
    if (!this.state.enabled) return;
    for (const signal of signals) {
      const owner = context.players[signal.actor],
        target = context.players[signal.target ?? signal.actor];
      if (!owner) continue;
      const ownerAccount = this.state.balances[owner.id];
      if (!ownerAccount) continue;
      for (const equipped of ownerAccount.pluginAuras) {
        const pack = this.state.plugins.find((p) => p.id === equipped.pack),
          effect = pack?.effects.find(
            (e) => e.id === equipped.effect && e.trigger === signal.item,
          );
        if (!pack || !effect) continue;
        const id = `plugin-aura:${context.round}:${version}:${owner.id}:${pack.id}:${effect.id}`;
        if (this.state.events.some((e) => e.id === id)) continue;
        const event = this.emit(
          id,
          signal.item,
          owner.id,
          target?.id ?? owner.id,
          now,
          effect.caption,
          1,
          effect,
        );
        event.plugin = {
          id: pack.id,
          version: pack.version,
          effect: effect.id,
        };
      }
      if (!ownerAccount.auras.includes(signal.item)) continue;
      const id = `aura:${context.round}:${version}:${owner.id}:${signal.item}`;
      if (this.state.events.some((e) => e.id === id)) continue;
      const text =
        signal.item === "sgsSlash"
          ? `${signal.label}！${slashLines[(version + signal.actor) % slashLines.length]}`
          : signal.label;
      const account = this.state.balances[owner.id],
        echo = account.equipment.includes("echo"),
        amplify = account.equipment.includes("amplifier");
      account.equipment = account.equipment.filter(
        (e) => e !== "echo" && e !== "amplifier",
      );
      this.emit(
        id,
        signal.item,
        owner.id,
        target?.id ?? owner.id,
        now,
        echo ? `${text} · ${text} · ${text}` : text,
        amplify ? 2 : 1,
      );
    }
  }
  execute(
    actor: number,
    id: string,
    action: PartyAction,
    context: PartyContext,
    manager: boolean,
    now = Date.now(),
  ): PartyEvent | undefined {
    const s = this.state,
      source = context.players[actor],
      key = `${source?.id ?? "host"}:${id}`;
    if (s.processed.includes(key)) return;
    if (action.type === "plugins") {
      if (!manager) throw Error("只有房主可以配置插件");
      if (context.playing) throw Error("本局插件已锁定，请在对局结束后配置");
      s.plugins = roomPluginsSchema.parse(action.packs);
    } else if (action.type === "enabled" || action.type === "policy") {
      if (!manager) throw Error("只有房主可以开关派对");
      const policy =
        action.type === "policy"
          ? action.policy
          : { ...s.policy, enabled: action.enabled };
      if (!policy.enabled) this.cancel(now);
      s.policy = policy;
      s.enabled = policy.enabled;
      this.sync(context, now);
    } else {
      if (!s.enabled) throw Error("房间派对未开启");
      this.sync(context, now);
      if (!source?.human) throw Error("仅房间玩家可以参与");
      const account = s.balances[source.id];
      if (action.type === "bet") {
        if (!context.playing || !context.observers.includes(actor))
          throw Error("离场旁观者才可以竞猜");
        const market = s.markets.find(
          (m) => m.id === action.market && m.round === context.round,
        );
        if (!market) throw Error("竞猜不存在");
        const pool = new PredictionPool("", "", "", [], 0, 0, market);
        const delta = pool.bet(
          source.id,
          action.option,
          action.amount,
          account.coins,
          now,
        );
        this.post(
          source.id,
          delta,
          delta > 0 ? "撤回竞猜本金" : "竞猜托管",
          0,
          now,
        );
        Object.assign(market, pool.state);
      } else if (action.type === "buy-plugin") {
        if (!context.playing || action.round !== context.round)
          throw Error("请在当前对局购买");
        const pack = s.plugins.find((p) => p.id === action.pack),
          effect = pack?.effects.find((e) => e.id === action.effect);
        if (!pack || !effect) throw Error("本房间未启用此特效");
        const issue = workshopPurchaseIssue(
          effect,
          pack.id,
          account,
          context,
          actor,
          s.policy.unlockAll,
        );
        if (issue) throw Error(issue);
        const price = discountedPartyPrice(effect.price, account.earned),
          destination =
            action.target === "table" ? source : context.players[action.target];
        if (!destination) throw Error("互动目标不存在");
        if (now - (s.lastBuy[source.id] ?? -Infinity) < partyEconomy.cooldownMs)
          throw Error("道具冷却中，请稍候");
        this.post(source.id, -price, effect.name, 0, now);
        s.lastBuy[source.id] = now;
        if (effect.trigger !== "manual")
          account.pluginAuras.push({ pack: pack.id, effect: effect.id });
        else {
          const route =
            effect.scope === "target" && action.target !== "table"
              ? this.routeAttack(source.id, destination.id)
              : {
                  from: source.id,
                  target: effect.scope === "self" ? source.id : destination.id,
                };
          const event = this.emit(
            `party:${key}`,
            route.guard ?? "comic",
            route.from,
            route.target,
            now,
            effect.caption,
            1,
            route.guard ? undefined : effect,
          );
          event.charged = { member: source.id, amount: price };
          event.audience = action.target === "table" ? "table" : "player";
          event.plugin = {
            id: pack.id,
            version: pack.version,
            effect: effect.id,
          };
          s.processed.push(key);
          return event;
        }
      } else if (action.type === "minigame") {
        this.miniGames(now).act(
          source.id,
          action,
          context.observers.includes(actor),
          account.coins,
          now,
        );
      } else {
        const destination =
          action.target === "table" ? source : context.players[action.target];
        if (!destination) throw Error("互动目标不存在");
        if (action.type === "award") {
          if (!context.finished) throw Error("整局结束后才可以颁奖");
          if (s.awards[source.id]) throw Error("本局已经颁奖");
          if (destination.id === source.id) throw Error("请选择其他场上玩家");
          s.awards[source.id] = { target: destination.id, title: action.title };
        } else {
          if (!context.playing) throw Error("对局中才可以使用");
          if (action.type === "support" || action.item === "cheer") {
            if (!context.observers.includes(actor))
              throw Error("离场后进入旁观玩法");
            if (
              (typeof action.target === "number" &&
                context.observers.includes(action.target)) ||
              action.target === actor
            )
              throw Error("请选择仍在场上的玩家");
          }
          if (action.type === "support") {
            if (s.support[source.id]) throw Error("本局已经选择支持对象");
            s.support[source.id] = destination.id;
            this.post(
              source.id,
              partyEconomy.support,
              "首次助威",
              undefined,
              now,
            );
          } else {
            if (action.round !== undefined && action.round !== context.round)
              throw Error("该购买属于上一局");
            const item = partyItems[action.item],
              price = partyPrice(action.item, account.earned);
            const issue = partyPurchaseIssue(
              action.item,
              account,
              context,
              actor,
              s.policy.unlockAll,
              action.voiceReady,
            );
            if (issue) throw Error(issue);
            if (
              action.item === "voiceStage" &&
              s.events.some(
                (e) =>
                  e.item === "voiceStage" &&
                  e.from === source.id &&
                  e.time + e.duration > now,
              )
            )
              throw Error("舞台变声正在生效");
            if (
              now - (s.lastBuy[source.id] ?? -Infinity) <
              partyEconomy.cooldownMs
            )
              throw Error("道具冷却中，请稍候");
            if (account.coins < price) throw Error("彩蛋币不足");
            if (["coinGrab", "boss", "relay", "wish"].includes(action.item))
              this.miniGames(now).create(
                `mini:${key}`,
                action.item as "coinGrab" | "boss" | "relay" | "wish",
                source.id,
                price,
                context,
                now,
              );
            this.post(source.id, -price, item.name, 0, now);
            s.lastBuy[source.id] = now;
            if (item.category === "装扮") account.auras.push(action.item);
            else if (item.category === "装备" && action.item !== "timeStop") {
              account.equipment.push(action.item);
              account.shield = account.equipment.includes("umbrella");
            } else {
              const route =
                item.category === "轰炸" && action.target !== "table"
                  ? this.routeAttack(source.id, destination.id)
                  : { from: source.id, target: destination.id };
              const from = route.from,
                to = route.target,
                visual = route.guard ?? action.item;
              const amplify = account.equipment.includes("amplifier"),
                echo = account.equipment.includes("echo");
              account.equipment = account.equipment.filter(
                (e) => e !== "amplifier" && e !== "echo",
              );
              if (action.item === "timeStop")
                for (const event of s.events)
                  if (
                    event.item !== "voiceStage" &&
                    event.time + event.duration > now
                  ) {
                    if (event.time > now) event.time += 3000;
                    else {
                      const pauses = (event.pauses ??= []);
                      pauses.push({
                        at: Math.max(
                          now,
                          ...pauses.map((p) => p.at + p.duration),
                        ),
                        duration: 3000,
                      });
                      event.duration += 3000;
                    }
                  }
              const event = this.emit(
                `party:${key}`,
                visual,
                from,
                to,
                now,
                `${item.name}${echo ? `！${item.name}！${item.name}！` : ""}`,
                amplify ? 2 : 1,
              );
              event.charged = { member: source.id, amount: price };
              event.audience = action.target === "table" ? "table" : "player";
              s.processed.push(key);
              return event;
            }
          }
        }
      }
    }
    s.processed.push(key);
    this.revision++;
  }
  snapshot(context: PartyContext): PartySnapshot {
    const observers = context.observers.join(",");
    if (
      this.cachedSnapshot?.revision === this.revision &&
      this.cachedSnapshot.observers === observers
    )
      return this.cachedSnapshot.snapshot;
    const {
      processed: _processed,
      lastBuy: _lastBuy,
      observedOutcomes: _observed,
      ...state
    } = this.state;
    const snapshot = structuredClone({
      ...state,
      observers: context.observers,
    });
    this.cachedSnapshot = { revision: this.revision, observers, snapshot };
    return snapshot;
  }
  export(): PartyState {
    return structuredClone(this.state);
  }
}
