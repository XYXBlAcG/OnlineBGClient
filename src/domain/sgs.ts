import { UpstreamRuntime } from "../upstream/runtime";
import type { Action, Candidate, GameState, SgsView } from "./types";
import { cardName, heroName, skillName } from "./terms";
type SgsState = Extract<GameState, { kind: "sgs" }>;
export class SgsRules {
  readonly sgs;
  readonly constants;
  readonly rules;
  readonly cards;
  constructor(readonly runtime: UpstreamRuntime) {
    this.sgs = runtime.load(5051);
    this.constants = runtime.load(8655);
    this.rules = runtime.load(6749);
    this.cards = runtime.load(8280);
  }
  create(players: number, team = false): SgsState {
    const codec = this.runtime.load(575).L;
    const data = this.sgs.Lq(
      { playerList: Array.from({ length: players }, () => ({})) },
      codec.encode({ rule: 1 | (team ? 2 : 0) }).finish(),
    );
    return { kind: "sgs", view: this.sgs.my(data, players) };
  }
  finished(state: SgsState): boolean {
    return state.view.stage === this.constants.PR.FINISH;
  }
  actors(state: SgsState): number[] {
    if (this.finished(state)) return [];
    const view = state.view;
    if (view.stage === this.constants.PR.CHOOSE0)
      return [view.roles.indexOf(this.constants.XP.ZHU)];
    if (view.stage === this.constants.PR.CHOOSE1)
      return view.hero
        .map((hero, id) => (hero ? -1 : id))
        .filter((id) => id >= 0);
    if (this.needsResolution(state))
      return view.dcdWuXiePlayers
        .map((value, id) => (value ? id : -1))
        .filter((id) => id >= 0);
    return [view.dcdPlayerId];
  }
  needsResolution(state: SgsState): boolean {
    return (
      state.kind === "sgs" &&
      [
        this.constants.qy.RESPOND_TO_JIN_NANG,
        this.constants.qy.RESPOND_TO_WU_XIE,
      ].includes(state.view.dcdType) &&
      !this.finished(state)
    );
  }
  resolve(state: SgsState, seed: string): SgsState {
    if (!this.needsResolution(state) || state.kind !== "sgs")
      throw new Error("没有待结算的无懈可击阶段");
    const next = structuredClone(state.view);
    this.rules.resolveCounterspell(next);
    return { kind: "sgs", view: this.normalizeSgs(next) };
  }
  candidates(state: SgsState, actor: number): Candidate[] {
    if (this.finished(state)) return [];
    const view = state.view;
    if ([1, 2].includes(view.stage)) {
      if (!this.actors(state).includes(actor)) return [];
      const team =
        this.sgs.bg(view.rule, view.hero.length)[1] ===
        this.constants.D7.TEAM_MODE;
      const heroes =
        view.heroCandidates[
          team ? (view.roles[actor] === this.constants.XP.FAN ? 1 : 0) : actor
        ];
      return heroes
        .filter((hero) => !view.hero.includes(hero))
        .map((hero) => ({
          action: { type: "sgs-hero", hero },
          label: `选择${heroName(hero)}`,
        }));
    }
    const spec = this.rules.actionSpec(view, actor + 1);
    const selections = [
      { skill: -1, tuple: spec.usableAction },
      ...spec.usableSkills.map((tuple: unknown[]) => ({
        skill: tuple[0] as number,
        tuple,
      })),
    ];
    const result: Candidate[] = [];
    for (const selection of selections) {
      if (!selection.tuple) continue;
      const normalized = this.selection(
        view,
        actor,
        selection.skill,
        selection.tuple,
      );
      const pool = normalized.pool;
      const count = this.rules.cardCount(normalized.cardType);
      const hands: number[][] = [[]];
      if (normalized.cardType === this.constants.sl.SELECT_GUAN_XING)
        hands.push(pool, [...pool].reverse());
      else {
        if (count !== 0) hands.push(...pool.map((card) => [card]));
        if (count === 2 || count < 0) {
          for (let i = 0; i < pool.length; i++)
            for (let j = i + 1; j < pool.length; j++)
              hands.push([pool[i], pool[j]]);
        }
        if (count < 0) {
          hands.push(pool);
          const excess = Math.max(
            0,
            view.playerHandCard[actor].length - view.playerBlood[actor],
          );
          if (excess) {
            const ordered = [...pool].sort(
              (a, b) => this.keepValue(a) - this.keepValue(b),
            );
            hands.push(ordered.slice(0, excess));
          }
        }
      }
      for (const cards of hands) {
        const targetChoices: number[][] = [[]];
        const maxTargets =
          normalized.targetType === this.constants.Ld.SELECT_BY_CARD
            ? 3
            : Math.max(
                this.rules.targetCount(normalized.targetType),
                normalized.targetType === 5
                  ? 2
                  : normalized.targetType === 6
                    ? 3
                    : 0,
              );
        for (let depth = 0; depth < maxTargets; depth++) {
          for (const prefix of targetChoices.filter(
            (targets) => targets.length === depth,
          )) {
            const possible: number[] = normalized.targetFunc
              ? normalized.targetFunc(cards, prefix)
              : normalized.targets;
            for (const target of possible)
              if (!prefix.includes(target))
                targetChoices.push([...prefix, target]);
          }
        }
        for (const targets of targetChoices) {
          const labels = normalized.buttons(cards, targets);
          for (let button = 0; button < labels.length - 1; button++) {
            if (!labels[button + 1]) continue;
            const options =
              normalized.cardType ===
              this.constants.sl.SELECT_OTHER_HAND_CARD1_SUIT
                ? [0, 1, 2, 3]
                : [0];
            for (const option of options) {
              const action: Action = {
                type: "sgs-choice",
                cards,
                targets,
                button,
                option,
                skill: selection.skill,
              };
              if (this.isValidSgs(view, actor, action))
                result.push({
                  action,
                  label: `${selection.skill >= 0 ? skillName(selection.skill) + "：" : ""}${labels[button + 1]}${cards.length ? " " + cards.map((card) => (card < 0 ? "暗牌" : cardName(this.cards.e3(card)))).join("、") : ""}${targets.length ? " → 玩家" + targets.map((target) => target + 1).join("、") : ""}`,
                });
            }
          }
        }
      }
    }
    return [
      ...new Map(
        result.map((candidate) => [
          JSON.stringify(candidate.action),
          candidate,
        ]),
      ).values(),
    ];
  }
  apply(state: SgsState, actor: number, action: Action): SgsState {
    if (action.type === "sgs-hero") {
      if (
        !this.candidates(state, actor).some(
          (candidate) =>
            candidate.action.type === "sgs-hero" &&
            candidate.action.hero === action.hero,
        )
      )
        throw new Error("不能选择这个武将");
      return {
        kind: "sgs",
        view: this.normalizeSgs(
          this.rules.chooseHero(state.view, action.hero, actor),
        ),
      };
    }
    if (
      action.type !== "sgs-choice" ||
      !this.isValidSgs(state.view, actor, action)
    )
      throw new Error("不是合法的三国杀动作");
    const spec = this.rules.actionSpec(state.view, actor + 1);
    const tuple =
      action.skill === -1
        ? spec.usableAction
        : spec.usableSkills.find(
            (skill: unknown[]) => skill[0] === action.skill,
          );
    const next = structuredClone(state.view);
    if (action.skill === -1 && next.dcdType === this.constants.qy.PLAY_CARD)
      this.rules.resetPlay(next);
    else this.rules.reset(next);
    const operation = tuple[action.skill === -1 ? 5 : 6];
    operation(next, action.cards, action.targets, action.button, action.option);
    return { kind: "sgs", view: this.normalizeSgs(next) };
  }
  project(state: SgsState, actor: number): SgsState {
    const projected = structuredClone(state);
    const view = projected.view;
    const own = new Set(view.playerHandCard[actor]);
    const publicCards = new Set([
      ...view.playedCards,
      ...view.playerEquip.flatMap((equip) =>
        Object.values(equip).map((card) => card[0]),
      ),
      ...view.playerJudge.flatMap((cards) => cards.map((card) => card[0])),
    ]);
    const hiddenHands = new Set(
      view.playerHandCard.flatMap((cards, id) => (id === actor ? [] : cards)),
    );
    for (const event of view.eventStack)
      for (const card of event.cardIds || [])
        if (!hiddenHands.has(card) && !view.drawCards.includes(card))
          publicCards.add(card);
    for (const card of view.showCards)
      if (
        !card.isBack ||
        card.fromPlayerPos === actor + 1 ||
        card.toPlayerPos === actor + 1
      )
        publicCards.add(card.cardId);
    const hideCard = (card: number) =>
      card < 0 || own.has(card) || publicCards.has(card) ? card : -1;
    const team =
      this.sgs.bg(view.rule, view.hero.length)[1] ===
      this.constants.D7.TEAM_MODE;
    view.roles = view.roles.map((role, id) =>
      team ||
      view.hero.length < 4 ||
      id === actor ||
      role === this.constants.XP.ZHU ||
      !view.alivePlayerIds.includes(id) ||
      this.finished(state)
        ? role
        : -1,
    );
    if (!team)
      view.heroCandidates = view.heroCandidates.map((heroes, id) =>
        id === actor ? heroes : [],
      );
    view.playerHandCard = view.playerHandCard.map((cards, id) =>
      id === actor
        ? cards
        : cards.map((card, index) =>
            publicCards.has(card) ? card : -index - 1,
          ),
    );
    view.drawCards.fill(-1);
    view.drawCardPos = [];
    view.cardPos = view.cardPos.map((position, card) =>
      own.has(card) || publicCards.has(card) ? position : -1,
    );
    view.showCards = view.showCards.map((card) =>
      card.isBack &&
      card.fromPlayerPos !== actor + 1 &&
      card.toPlayerPos !== actor + 1
        ? { ...card, cardId: -1 }
        : card,
    );
    view.eventStack = view.eventStack.map((event) => {
      const result = { ...event };
      if (event.cardIds) result.cardIds = event.cardIds.map(hideCard);
      if (Array.isArray(event.sourceCardIds))
        result.sourceCardIds = (event.sourceCardIds as number[]).map(hideCard);
      if (
        Array.isArray(event.wuGuCardIds) &&
        [
          this.constants.qy.DCD_SKILL_GUAN_XING,
          this.constants.qy.DCD_SKILL_GUAN_XING2,
          this.constants.qy.DCD_SKILL_YI_JI,
          this.constants.qy.DCD_SKILL_YI_JI2,
        ].includes(view.dcdType) &&
        view.dcdPlayerId !== actor
      )
        result.wuGuCardIds = (event.wuGuCardIds as number[]).map(() => -1);
      return result;
    });
    view.dcdWuXiePlayers = view.dcdWuXiePlayers.map((flag, id) =>
      id === actor
        ? flag
        : this.needsResolution(state) && view.alivePlayerIds.includes(id)
          ? 1
          : 0,
    );
    return projected;
  }
  keepValue(card: number): number {
    const type = this.cards.e3(card);
    return type === 4
      ? 10
      : type === 3
        ? 8
        : type === 6
          ? 7
          : type === 7
            ? 9
            : type < 3
              ? 5
              : 3;
  }
  private normalizeSgs(view: SgsView): SgsView {
    return this.sgs.my(this.sgs.qA(view), view.hero.length);
  }
  private selection(view: SgsView, actor: number, skill: number, tuple: any[]) {
    const active = skill >= 0;
    const cardType: number = tuple[active ? 2 : 0];
    const targetType: number = tuple[active ? 3 : 1];
    const allowed: number[] | undefined = tuple[active ? 4 : 2];
    const targets: number[] = tuple[active ? 5 : 3] || [];
    const target = targets[0];
    let pool = [...view.playerHandCard[actor]];
    if (cardType === 0) pool = [];
    if ([4, 5, 6].includes(cardType))
      pool.push(
        ...Object.values(view.playerEquip[actor]).map((card) => card[0]),
      );
    if ([8, 9, 10, 11, 12, 13].includes(cardType)) {
      pool = [8, 9, 10, 11, 12].includes(cardType)
        ? (view.playerHandCard[target] || []).map((_, index) => -index - 1)
        : [];
      if ([10, 11, 12, 13].includes(cardType))
        pool.push(
          ...Object.entries(view.playerEquip[target] || {})
            .filter(([slot]) => cardType !== 13 || Number(slot) >= 2)
            .map(([, card]) => card[0]),
        );
      if (cardType === 12)
        pool.push(...(view.playerJudge[target] || []).map((card) => card[0]));
    }
    if (allowed) pool = allowed;
    const hint = active ? tuple[1] : null;
    return {
      cardType,
      targetType,
      targets,
      targetFunc: tuple[active ? 7 : 6],
      pool,
      buttons: active
        ? () => (typeof hint === "string" ? [hint, "确定"] : hint)
        : tuple[4],
    };
  }
  private isValidSgs(
    view: SgsView,
    actor: number,
    action: Extract<Action, { type: "sgs-choice" }>,
  ): boolean {
    if (
      !view.playerHandCard[actor] ||
      view.stage !== 0 ||
      !this.sgs.Hk(view, actor)
    )
      return false;
    const spec = this.rules.actionSpec(view, actor + 1);
    const tuple =
      action.skill === -1
        ? spec.usableAction
        : spec.usableSkills.find(
            (skill: unknown[]) => skill[0] === action.skill,
          );
    if (
      !tuple ||
      new Set(action.cards).size !== action.cards.length ||
      new Set(action.targets).size !== action.targets.length
    )
      return false;
    const selection = this.selection(view, actor, action.skill, tuple);
    if (!action.cards.every((card) => selection.pool.includes(card)))
      return false;
    const buttons: string[] = selection.buttons(action.cards, action.targets);
    if (!Number.isInteger(action.button) || !buttons[action.button + 1])
      return false;
    if (
      !Number.isInteger(action.option) ||
      action.option < 0 ||
      action.option > 3
    )
      return false;
    if (action.button === 0 || action.skill >= 0) {
      const count = this.rules.cardCount(selection.cardType);
      if (selection.cardType === 15) {
        if (
          action.cards.length !== selection.pool.length ||
          !selection.pool.every((card) => action.cards.includes(card))
        )
          return false;
      } else if (count >= 0 && action.cards.length !== count) return false;
      const targets = this.rules.targetCount(selection.targetType);
      if (targets >= 0 && action.targets.length !== targets) return false;
      if (
        selection.targetType === 5 &&
        (action.targets.length < 1 || action.targets.length > 2)
      )
        return false;
      if (
        selection.targetType === 6 &&
        (action.targets.length < 1 || action.targets.length > 3)
      )
        return false;
    }
    for (let index = 0; index < action.targets.length; index++) {
      const available: number[] = selection.targetFunc
        ? selection.targetFunc(action.cards, action.targets.slice(0, index))
        : selection.targets;
      if (!available.includes(action.targets[index])) return false;
    }
    return true;
  }
}
