import type { Rules } from "../plugin";
import type { Action, Candidate } from "../types";
import {
  cardDefinition,
  firstKingdom,
  kingdomCards,
  type Card,
  type CardId,
} from "./cards";
import {
  dominionOptionsSchema,
  type DominionView,
  type DominionPlayer,
  type DominionPrompt,
  type DominionState,
  type DominionTask,
} from "./types";
import type { GameOptions } from "../game-options";
const visible = (cards: Card[]): CardId[] =>
  cards.filter((card): card is CardId => card !== "hidden");
const unique = (cards: Card[]) => [...new Set(visible(cards))];
export class DominionRules implements Rules<"dominion"> {
  constructor(private random: () => number) {}
  private shuffle(cards: Card[]) {
    const copy = [...cards];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  private take(player: DominionPlayer, count: number): CardId[] {
    const result: CardId[] = [];
    for (let index = 0; index < count; index++) {
      if (!player.deck.length) {
        player.deck = this.shuffle(player.discard);
        player.discard = [];
      }
      const card = player.deck.shift();
      if (!card) break;
      if (card === "hidden") throw new Error("不可执行隐藏牌序");
      result.push(card);
    }
    return result;
  }
  private draw(player: DominionPlayer, count: number) {
    player.hand.push(...this.take(player, count));
  }
  private log(view: DominionView, actor: number, text: string) {
    view.log.push({ sequence: ++view.sequence, actor, text });
    view.log = view.log.slice(-100);
  }
  private gain(
    view: DominionView,
    actor: number,
    card: CardId,
    destination: "deck" | "hand" | "discard" = "discard",
  ) {
    if (!(view.supply[card]! > 0)) return;
    view.supply[card]!--;
    view.events.push({ type: "gain", actor, card });
    if (destination === "deck") view.players[actor].deck.unshift(card);
    else view.players[actor][destination].push(card);
    this.log(
      view,
      actor,
      `获得${cardDefinition(card).name}${destination === "hand" ? "，加入手牌" : destination === "deck" ? "，放到牌库顶" : ""}`,
    );
  }
  create(players: number, _team = false, options?: GameOptions): DominionState {
    const config = dominionOptionsSchema.parse(options?.dominion ?? {});
    const kingdom =
      config.mode === "random"
        ? visible(this.shuffle(kingdomCards)).slice(0, 10)
        : config.mode === "custom"
          ? [...config.kingdom]
          : [...firstKingdom];
    const view: DominionView = {
      kingdom,
      supply: {
        copper: 60 - 7 * players,
        silver: 40,
        gold: 30,
        estate: players === 2 ? 8 : 12,
        duchy: players === 2 ? 8 : 12,
        province: players === 2 ? 8 : 12,
        curse: (players - 1) * 10,
      },
      players: Array.from({ length: players }, () => ({
        hand: [],
        deck: this.shuffle([
          ...Array(7).fill("copper"),
          ...Array(3).fill("estate"),
        ]),
        discard: [],
        aside: [],
        turns: 0,
      })),
      trash: [],
      inPlay: [],
      turn: 0,
      round: 1,
      phase: "action",
      actions: 1,
      buys: 1,
      coins: 0,
      merchants: 0,
      silverPlayed: false,
      bought: false,
      queue: [],
      prompt: null,
      events: [],
      log: [],
      sequence: 0,
      scores: [],
      winners: [],
    };
    for (const card of kingdom)
      view.supply[card] =
        cardDefinition(card).type === "victory" ? (players === 2 ? 8 : 12) : 10;
    for (const player of view.players) this.draw(player, 5);
    view.players[0].turns = 1;
    return { kind: "dominion", view };
  }
  finished(state: DominionState) {
    return state.view.phase === "finished";
  }
  actors(state: DominionState) {
    return this.finished(state)
      ? []
      : [state.view.prompt?.actor ?? state.view.turn];
  }
  private choices(view: DominionView, prompt: DominionPrompt): string[] {
    const player = view.players[prompt.actor];
    const cards = unique(prompt.cards);
    switch (prompt.kind) {
      case "response":
        return [];
      case "moat":
        return ["block", "accept"];
      case "library":
        return ["keep", "aside"];
      case "sentry":
        return ["trash", "discard", "keep"];
      case "vassal":
        return ["play", "done"];
      case "gain":
        return (Object.keys(view.supply) as CardId[]).filter(
          (card) =>
            view.supply[card]! > 0 &&
            cardDefinition(card).cost <= prompt.limit! &&
            (!prompt.treasure || cardDefinition(card).type === "treasure"),
        );
      case "cellar":
      case "chapel":
      case "harbinger":
      case "mine":
      case "moneylender":
      case "throne":
        return [...cards, "done"];
      case "militia":
      case "poacher":
      case "remodel":
      case "topdeck":
      case "bureaucrat":
        return unique(player.hand).filter(
          (card) =>
            prompt.kind !== "bureaucrat" ||
            cardDefinition(card).type === "victory",
        );
      case "bandit":
        return cards.filter(
          (card) =>
            cardDefinition(card).type === "treasure" && card !== "copper",
        );
      case "order":
        return cards;
    }
  }
  private ask(view: DominionView, prompt: DominionPrompt) {
    view.prompt = this.choices(view, prompt).length ? prompt : null;
  }
  candidates(state: DominionState, actor: number): Candidate[] {
    const view = state.view;
    if (this.finished(state) || actor !== this.actors(state)[0]) return [];
    const candidate = (
      move: Extract<Action, { type: "dominion-action" }>["move"],
      label: string,
    ): Candidate => ({ action: { type: "dominion-action", move }, label });
    if (view.prompt) {
      const labels: Record<string, string> = {
        done: "完成／跳过",
        block: "展示护城河，抵挡攻击",
        accept: "不使用护城河",
        keep: "保留",
        aside: "暂放一旁",
        trash: "移除",
        discard: "弃置",
        play: "立即打出",
      };
      return this.choices(view, view.prompt).map((choice) =>
        candidate(
          { type: "choose", choice },
          `${view.prompt!.title}：${labels[choice] ?? cardDefinition(choice as CardId).name}`,
        ),
      );
    }
    const result: Candidate[] = [];
    for (const card of unique(view.players[actor].hand)) {
      const definition = cardDefinition(card);
      if (
        (definition.type === "action" &&
          view.phase === "action" &&
          view.actions > 0) ||
        (definition.type === "treasure" && view.phase === "buy" && !view.bought)
      )
        result.push(
          candidate({ type: "play", card }, `打出${definition.name}`),
        );
    }
    if (view.phase === "action")
      result.push(candidate({ type: "buy-phase" }, "进入购买阶段"));
    if (
      !view.bought &&
      visible(view.players[actor].hand).some(
        (card) => cardDefinition(card).type === "treasure",
      )
    )
      result.push(
        candidate({ type: "treasures" }, "打出全部财宝，进入购买阶段"),
      );
    if (view.phase === "buy" && view.buys > 0)
      for (const card of Object.keys(view.supply) as CardId[])
        if (view.supply[card]! > 0 && cardDefinition(card).cost <= view.coins)
          result.push(
            candidate(
              { type: "buy", card },
              `购买${cardDefinition(card).name}`,
            ),
          );
    result.push(candidate({ type: "end" }, "结束回合"));
    return result;
  }
  private play(
    view: DominionView,
    actor: number,
    card: CardId,
    source: "hand" | "discard",
  ) {
    const pile = view.players[actor][source];
    pile.splice(pile.indexOf(card), 1);
    view.inPlay.push(card);
    view.events.push({ type: "play", actor, card });
    this.log(view, actor, `打出${cardDefinition(card).name}`);
    view.queue.unshift({ type: "card", actor, card });
  }
  apply(state: DominionState, actor: number, action: Action): DominionState {
    if (
      action.type !== "dominion-action" ||
      !this.candidates(state, actor).some(
        (candidate) =>
          JSON.stringify(candidate.action) === JSON.stringify(action),
      )
    )
      throw new Error("当前不能执行这个领土动作");
    const view = structuredClone(state.view);
    view.events = [];
    const move = action.move;
    switch (move.type) {
      case "play":
        if (cardDefinition(move.card).type === "action") view.actions--;
        this.play(view, actor, move.card, "hand");
        break;
      case "treasures":
        view.phase = "buy";
        for (const card of [...visible(view.players[actor].hand)].reverse())
          if (cardDefinition(card).type === "treasure")
            this.play(view, actor, card, "hand");
        break;
      case "buy-phase":
        view.phase = "buy";
        break;
      case "buy":
        view.coins -= cardDefinition(move.card).cost;
        view.buys--;
        view.bought = true;
        this.gain(view, actor, move.card);
        break;
      case "choose":
        this.choose(view, move.choice);
        break;
      case "end":
        this.end(view);
        break;
    }
    this.drain(view);
    return { kind: "dominion", view };
  }
  private drain(view: DominionView) {
    while (!view.prompt && view.queue.length) {
      const task = view.queue.shift()!;
      if (task.type === "card") this.effect(view, task.actor, task.card);
      if (task.type === "attack")
        this.attack(view, task.actor, task.card, false);
      if (task.type === "library") this.library(view, task.actor);
      if (task.type === "topdeck" && view.players[task.actor].hand.length)
        this.ask(view, {
          kind: "topdeck",
          actor: task.actor,
          cards: [],
          title: "选择一张手牌放到牌库顶",
        });
    }
  }
  private effect(view: DominionView, actor: number, card: CardId) {
    const definition = cardDefinition(card),
      player = view.players[actor];
    this.draw(player, definition.cards ?? 0);
    view.actions += definition.actions ?? 0;
    view.buys += definition.buys ?? 0;
    view.coins += definition.coins ?? definition.value ?? 0;
    if (card === "silver" && !view.silverPlayed) {
      view.coins += view.merchants;
      view.silverPlayed = true;
    }
    const kind = definition.effect;
    if (!kind) return;
    const prompt = (
      kind: DominionPrompt["kind"],
      cards: Card[],
      title: string,
      extra: Partial<DominionPrompt> = {},
    ) => this.ask(view, { kind, actor, cards: [...cards], title, ...extra });
    switch (kind) {
      case "cellar":
        prompt("cellar", player.hand, "地窖：选择弃牌，完成后换牌", {
          count: 0,
        });
        break;
      case "chapel":
        prompt("chapel", player.hand, "礼拜堂：移除至多四张手牌", { count: 0 });
        break;
      case "harbinger":
        prompt("harbinger", player.discard, "先驱：可将一张弃牌放到牌库顶");
        break;
      case "merchant":
        view.merchants++;
        break;
      case "workshop":
        prompt("gain", [], "工坊：获得一张供应牌", {
          limit: 4,
          destination: "discard",
        });
        break;
      case "moneylender":
        prompt(
          "moneylender",
          player.hand.filter((card) => card === "copper"),
          "放债人：可移除铜币换三金币",
        );
        break;
      case "remodel":
        if (player.hand.length)
          prompt("remodel", player.hand, "改建：选择要移除的手牌");
        break;
      case "mine":
        prompt(
          "mine",
          visible(player.hand).filter(
            (card) => cardDefinition(card).type === "treasure",
          ),
          "矿井：可移除一张财宝",
        );
        break;
      case "throne":
        prompt(
          "throne",
          visible(player.hand).filter(
            (card) => cardDefinition(card).type === "action",
          ),
          "王座厅：选择要执行两次的行动牌",
        );
        break;
      case "vassal": {
        const revealed = this.take(player, 1);
        player.discard.push(...revealed);
        if (revealed.length)
          this.log(view, actor, `附庸弃置${cardDefinition(revealed[0]).name}`);
        if (revealed.length && cardDefinition(revealed[0]).type === "action")
          prompt("vassal", revealed, "附庸：可以打出刚弃置的行动牌");
        break;
      }
      case "poacher": {
        const limit = Object.values(view.supply).filter(
          (count) => count === 0,
        ).length;
        if (limit && player.hand.length)
          prompt(
            "poacher",
            player.hand,
            `偷猎者：须弃置 ${Math.min(limit, player.hand.length)} 张`,
            { limit, count: 0 },
          );
        break;
      }
      case "council":
        view.players.forEach((player, index) => {
          if (index !== actor) this.draw(player, 1);
        });
        break;
      case "library":
        this.library(view, actor);
        break;
      case "sentry": {
        const cards = this.take(player, 2);
        if (cards.length)
          prompt("sentry", cards, "哨兵：处理牌库顶的牌", { kept: [] });
        break;
      }
      case "artisan":
        view.queue.unshift({ type: "topdeck", actor });
        prompt("gain", [], "工匠：获得一张供应牌到手中", {
          limit: 5,
          destination: "hand",
        });
        break;
      case "bureaucrat":
      case "bandit":
      case "militia":
      case "witch": {
        if (kind === "bureaucrat") this.gain(view, actor, "silver", "deck");
        if (kind === "bandit") this.gain(view, actor, "gold");
        const attacks: DominionTask[] = Array.from(
          { length: view.players.length - 1 },
          (_, index) => ({
            type: "attack",
            actor: (actor + index + 1) % view.players.length,
            source: actor,
            card,
          }),
        );
        view.queue.unshift(...attacks);
        break;
      }
    }
  }
  private attack(
    view: DominionView,
    actor: number,
    card: CardId,
    accepted: boolean,
  ) {
    const player = view.players[actor];
    if (!accepted && player.hand.includes("moat")) {
      this.ask(view, {
        kind: "moat",
        actor,
        cards: [],
        title: `应对${cardDefinition(card).name}`,
        attack: card,
      });
      return;
    }
    if (card === "witch") this.gain(view, actor, "curse");
    if (card === "militia" && player.hand.length > 3)
      this.ask(view, {
        kind: "militia",
        actor,
        cards: [...player.hand],
        title: "民兵：将手牌弃至三张",
      });
    if (card === "bureaucrat") {
      const cards = visible(player.hand).filter(
        (card) => cardDefinition(card).type === "victory",
      );
      if (cards.length)
        this.ask(view, {
          kind: "bureaucrat",
          actor,
          cards,
          title: "官僚：将一张胜利牌放到牌库顶",
        });
      else
        this.log(
          view,
          actor,
          `没有胜利牌，展示：${
            visible(player.hand)
              .map((card) => cardDefinition(card).name)
              .join("、") || "空手牌"
          }`,
        );
    }
    if (card === "bandit") {
      const cards = this.take(player, 2);
      if (cards.length)
        this.log(
          view,
          actor,
          `强盗展示：${cards.map((card) => cardDefinition(card).name).join("、")}`,
        );
      const treasures = cards.filter(
        (card) => cardDefinition(card).type === "treasure" && card !== "copper",
      );
      if (treasures.length)
        this.ask(view, {
          kind: "bandit",
          actor,
          cards,
          title: "强盗：移除其中一张非铜币财宝",
        });
      else player.discard.push(...cards);
    }
  }
  private library(view: DominionView, actor: number) {
    const player = view.players[actor];
    while (player.hand.length < 7) {
      const cards = this.take(player, 1);
      if (!cards.length) break;
      if (cardDefinition(cards[0]).type === "action") {
        this.ask(view, {
          kind: "library",
          actor,
          cards,
          title: "图书馆：保留行动牌，还是暂时放到一旁？",
        });
        return;
      }
      player.hand.push(cards[0]);
    }
    player.discard.push(...player.aside);
    player.aside = [];
  }
  private choose(view: DominionView, choice: string) {
    const prompt = view.prompt!,
      actor = prompt.actor,
      player = view.players[actor];
    view.prompt = null;
    const card = choice as CardId;
    const remove = (pile: Card[]) => {
      pile.splice(pile.indexOf(card), 1);
    };
    const trash = () => {
      remove(player.hand);
      view.trash.push(card);
      this.log(view, actor, `移除${cardDefinition(card).name}`);
    };
    switch (prompt.kind) {
      case "response":
        throw new Error("不可执行其他玩家的隐藏响应");
      case "moat":
        if (choice === "accept") this.attack(view, actor, prompt.attack!, true);
        else
          this.log(
            view,
            actor,
            `展示护城河，抵挡${cardDefinition(prompt.attack!).name}`,
          );
        break;
      case "cellar":
        if (choice === "done") this.draw(player, prompt.count!);
        else {
          remove(player.hand);
          player.discard.push(card);
          prompt.count!++;
          prompt.cards = [...player.hand];
          view.prompt = prompt;
        }
        break;
      case "chapel":
        if (choice !== "done") {
          trash();
          prompt.count!++;
          prompt.cards = [...player.hand];
          if (prompt.count! < 4 && player.hand.length) view.prompt = prompt;
        }
        break;
      case "moneylender":
        if (choice !== "done") {
          trash();
          view.coins += 3;
        }
        break;
      case "harbinger":
        if (choice !== "done") {
          remove(player.discard);
          player.deck.unshift(card);
          this.log(view, actor, `先驱将${cardDefinition(card).name}放到牌库顶`);
        }
        break;
      case "remodel":
      case "mine":
        if (choice !== "done") {
          trash();
          this.ask(view, {
            kind: "gain",
            actor,
            cards: [],
            title: "选择要获得的牌",
            limit: cardDefinition(card).cost + (prompt.kind === "mine" ? 3 : 2),
            destination: prompt.kind === "mine" ? "hand" : "discard",
            treasure: prompt.kind === "mine",
          });
        }
        break;
      case "gain":
        this.gain(view, actor, card, prompt.destination);
        break;
      case "throne":
        if (choice !== "done") {
          this.play(view, actor, card, "hand");
          view.queue.splice(1, 0, { type: "card", actor, card });
        }
        break;
      case "vassal":
        if (choice === "play")
          this.play(view, actor, visible(prompt.cards)[0], "discard");
        break;
      case "militia":
      case "poacher":
        remove(player.hand);
        player.discard.push(card);
        prompt.cards = [...player.hand];
        prompt.count = (prompt.count ?? 0) + 1;
        if (
          prompt.kind === "militia"
            ? player.hand.length > 3
            : prompt.count < prompt.limit! && player.hand.length > 0
        )
          view.prompt = prompt;
        break;
      case "topdeck":
      case "bureaucrat":
        remove(player.hand);
        player.deck.unshift(card);
        this.log(view, actor, `将${cardDefinition(card).name}放到牌库顶`);
        break;
      case "bandit":
        remove(prompt.cards);
        view.trash.push(card);
        player.discard.push(...prompt.cards);
        this.log(view, actor, `强盗移除${cardDefinition(card).name}`);
        break;
      case "library":
        player[choice === "keep" ? "hand" : "aside"].push(...prompt.cards);
        view.queue.unshift({ type: "library", actor });
        break;
      case "sentry": {
        const revealed = visible(prompt.cards)[0];
        prompt.cards.shift();
        if (choice === "trash") {
          view.trash.push(revealed);
          this.log(view, actor, `哨兵移除${cardDefinition(revealed).name}`);
        }
        if (choice === "discard") player.discard.push(revealed);
        if (choice === "keep") prompt.kept!.push(revealed);
        if (prompt.cards.length) view.prompt = prompt;
        else if (prompt.kept!.length > 1)
          this.ask(view, {
            kind: "order",
            actor,
            cards: prompt.kept!,
            title: "选择最先抽到的牌",
          });
        else player.deck.unshift(...prompt.kept!);
        break;
      }
      case "order":
        remove(prompt.cards);
        player.deck.unshift(card, ...prompt.cards);
        break;
    }
  }
  private end(view: DominionView) {
    const player = view.players[view.turn];
    player.discard.push(...player.hand, ...view.inPlay);
    player.hand = [];
    view.inPlay = [];
    this.draw(player, 5);
    if (
      view.supply.province === 0 ||
      Object.values(view.supply).filter((count) => count === 0).length >= 3
    ) {
      view.phase = "finished";
      view.scores = view.players.map((player) => {
        const cards = visible([
          ...player.hand,
          ...player.deck,
          ...player.discard,
        ]);
        return cards.reduce(
          (total, card) =>
            total +
            (card === "gardens"
              ? Math.floor(cards.length / 10)
              : (cardDefinition(card).points ?? 0)),
          0,
        );
      });
      const maximum = Math.max(...view.scores),
        turns = Math.min(
          ...view.players
            .filter((_, index) => view.scores[index] === maximum)
            .map((player) => player.turns),
        );
      view.winners = view.players.flatMap((player, index) =>
        view.scores[index] === maximum && player.turns === turns ? [index] : [],
      );
      this.log(view, view.turn, "对局结束，按总分及已进行回合数结算");
      return;
    }
    view.turn = (view.turn + 1) % view.players.length;
    if (!view.turn) view.round++;
    view.players[view.turn].turns++;
    view.phase = "action";
    view.actions = 1;
    view.buys = 1;
    view.coins = 0;
    view.merchants = 0;
    view.silverPlayed = false;
    view.bought = false;
    this.log(view, view.turn, "开始回合");
  }
  project(state: DominionState, actor: number): DominionState {
    const view = structuredClone(state.view);
    view.queue = [];
    view.players.forEach((player, index) => {
      const cards = visible([
        ...player.hand,
        ...player.deck,
        ...player.discard,
        ...player.aside,
        ...(index === view.turn ? view.inPlay : []),
        ...(view.prompt?.actor === index &&
        ["sentry", "library", "order", "bandit"].includes(view.prompt.kind)
          ? [...view.prompt.cards, ...(view.prompt.kept ?? [])]
          : []),
      ]);
      if (index === actor || view.phase === "finished")
        player.inventory = cards.reduce<Partial<Record<CardId, number>>>(
          (counts, card) => {
            counts[card] = (counts[card] ?? 0) + 1;
            return counts;
          },
          {},
        );
      if (view.phase === "finished") return;
      player.deck = player.deck.map(() => "hidden");
      if (index !== actor) {
        player.hand = player.hand.map(() => "hidden");
        player.aside = player.aside.map(() => "hidden");
        player.discard = player.discard.map((card, i) =>
          i === player.discard.length - 1 ? card : "hidden",
        );
        delete player.inventory;
      }
    });
    if (view.prompt && view.prompt.actor !== actor)
      view.prompt = {
        kind: "response",
        actor: view.prompt.actor,
        cards: [],
        title: "等待玩家处理卡牌效果",
      };
    return { kind: "dominion", view };
  }
}
