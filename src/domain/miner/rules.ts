import type { GameOptions } from "../game-options";
import type { Rules } from "../plugin";
import type { Action, Candidate } from "../types";
import {
  minerContractPool,
  minerContracts,
  minerGemFamilies,
  minerGems,
  minerItems,
  minerNodeDefinitions,
  minerRelics,
  minerDynamics,
} from "./content";
import {
  createMinerNode,
  generateMinerMap,
  minerNodeChoices,
  shuffled,
} from "./map";
import type {
  MinerContractId,
  MinerDeposit,
  MinerDynamicId,
  MinerGameState,
  MinerItemId,
  MinerMove,
  MinerPlayerView,
  MinerRelicId,
  MinerNodeKind,
  MinerView,
} from "./types";

const BASE_STAMINA = 10;
const BASE_CAPACITY = 6;
const LAYER_SIZE = 3;

function playerName(seat: number) {
  return `玩家 ${seat + 1}`;
}

function makePlayer(seat: number): MinerPlayerView {
  return {
    seat,
    stamina: BASE_STAMINA,
    maxStamina: BASE_STAMINA,
    pickPower: 1,
    capacity: BASE_CAPACITY,
    bag: [],
    bagCount: 0,
    items: [],
    relics: [],
    relicUses: {},
    status: {
      alert: 0,
      wanted: 0,
      frozen: 0,
      exposed: 0,
      luck: 0,
      nodeSteal: 0,
      nodeGuard: 0,
      nodePick: 0,
      nextProgress: 0,
    },
    worn: false,
    score: 0,
    delivered: 0,
    stolen: 0,
    stolenFrom: 0,
  };
}

function rotateOrder(players: number, offset: number): number[] {
  if (!players) return [];
  const start = ((offset % players) + players) % players;
  return Array.from({ length: players }, (_, index) => (start + index) % players);
}

function sumBy<T>(values: readonly T[], select: (value: T) => number): number {
  return values.reduce((total, value) => total + select(value), 0);
}

function itemEffects(player: MinerPlayerView) {
  const effects = player.items
    .filter((id) => !minerItems[id].effects.consumable)
    .map((id) => minerItems[id].effects);
  const relics = player.relics.map((id) => minerRelics[id].effects);
  const tags = [
    ...player.items.flatMap((id) => {
      const category = minerItems[id].category;
      return category === "tool" || category === "bag"
        ? (["engineer"] as const)
        : category === "steal"
          ? (["thief"] as const)
          : category === "team"
            ? (["leader"] as const)
            : [];
    }),
    ...player.relics.map((id) => minerRelics[id].tag),
  ];
  const tagCount = (tag: (typeof tags)[number]) =>
    tags.filter((item) => item === tag).length;
  const engineer = tagCount("engineer") >= 4 ? 2 : tagCount("engineer") >= 2 ? 1 : 0;
  const thief = tagCount("thief") >= 4 ? 0.2 : tagCount("thief") >= 2 ? 0.1 : 0;
  const leader = tagCount("leader") >= 4 ? 0.1 : tagCount("leader") >= 2 ? 0.05 : 0;
  const gambler = tagCount("gambler") >= 4 ? 0.1 : tagCount("gambler") >= 2 ? 0.05 : 0;
  const all = [...effects, ...relics] as Array<{
    pickBonus?: number;
    capacityBonus?: number;
    stealBonus?: number;
    defenseBonus?: number;
    hazardReduction?: number;
    autoProgress?: number;
    teamQuotaBonus?: number;
    dividend?: number;
    pairProgress?: number;
    valueBonus?: number;
  }>;
  return {
    pickBonus: sumBy(all, (effect) => effect.pickBonus ?? 0) + engineer,
    capacityBonus: sumBy(all, (effect) => effect.capacityBonus ?? 0),
    stealBonus: sumBy(all, (effect) => effect.stealBonus ?? 0) + thief,
    defenseBonus: sumBy(all, (effect) => effect.defenseBonus ?? 0),
    hazardReduction: sumBy(all, (effect) => effect.hazardReduction ?? 0),
    autoProgress: sumBy(all, (effect) => effect.autoProgress ?? 0),
    teamQuotaBonus:
      sumBy(all, (effect) => effect.teamQuotaBonus ?? 0) + leader,
    dividend: sumBy(all, (effect) => effect.dividend ?? 0),
    pairProgress: sumBy(all, (effect) => effect.pairProgress ?? 0),
    valueBonus: sumBy(all, (effect) => effect.valueBonus ?? 0) + gambler,
    hasFreeze: player.relics.includes("frostHeart"),
    failNoExpose:
      player.relics.includes("nightCloak") ||
      player.relics.includes("shadowGlove"),
    icePick:
      player.relics.includes("icePick") ||
      player.relics.includes("echoPick"),
    luckyDice: player.relics.includes("luckyDice"),
    springBoots: player.relics.includes("springBoots"),
  };
}

function refreshPlayer(
  player: MinerPlayerView,
  contract?: MinerContractId | null,
): void {
  const effects = itemEffects(player);
  player.pickPower = 1 + effects.pickBonus;
  player.capacity =
    BASE_CAPACITY +
    effects.capacityBonus -
    (contract === "heavyPack" ? 1 : 0);
  player.bagCount = player.bag.length;
}

function depositName(deposit: MinerDeposit): string {
  if (deposit.kind === "gem" && deposit.gem) {
    const family = minerGemFamilies[deposit.gem.family];
    return `${family.name}（${deposit.gem.grade === "chipped" ? "碎" : deposit.gem.grade === "whole" ? "整" : "净"}）`;
  }
  if (deposit.kind === "item" && deposit.item)
    return minerItems[deposit.item].name;
  if (deposit.kind === "relic" && deposit.relic)
    return minerRelics[deposit.relic].name;
  return "矿位";
}

function depositScoreValue(deposit: MinerDeposit): number {
  return deposit.gem ? Math.max(1, Math.round(deposit.gem.value * (deposit.spoiled ? 0.8 : 1))) : 0;
}

function log(view: MinerView, text: string): void {
  view.sequence++;
  view.log.push({ id: view.sequence, text });
  if (view.log.length > 80) view.log.splice(0, view.log.length - 80);
}

function setLastAction(
  view: MinerView,
  actor: number,
  kind: string,
  text: string,
  depositId?: string,
): void {
  view.lastAction = { actor, kind, text, ...(depositId ? { depositId } : {}) };
  log(view, text);
}

function currentLayer(floor: number): number {
  return Math.floor(floor / LAYER_SIZE);
}

function nodePhase(kind: MinerNodeKind): MinerView["phase"] {
  if (kind === "shop") return "shop";
  if (kind === "rest") return "rest";
  if (kind === "event") return "event";
  return "mine";
}

function setNodePhase(view: MinerView, node: NonNullable<MinerView["node"]>): void {
  view.phase = nodePhase(node.kind);
  view.round = node.round;
  view.node = node;
}

function availableDeposits(view: MinerView): MinerDeposit[] {
  return view.node?.deposits.filter((deposit) => !deposit.completed) ?? [];
}

function nodeComplete(view: MinerView): boolean {
  const node = view.node;
  if (!node) return true;
  if (node.kind === "rest" || node.kind === "event") return true;
  return node.deposits.every((deposit) => deposit.completed);
}

export class MinerRules implements Rules<"miner"> {
  constructor(private readonly random: () => number) {}

  create(
    players: number,
    _team: boolean,
    options?: GameOptions,
  ): MinerGameState {
    const floors = options?.miner?.floors ?? 9;
    const quota = options?.miner?.quota ?? 400 + players * 200;
    const map = generateMinerMap(players, floors, this.random);
    const view: MinerView = {
      phase: "contract",
      floor: 0,
      round: 0,
      map,
      node: null,
      votes: {},
      contract: null,
      contractOffers: this.contractOffers(),
      contractVotes: {},
      players: Array.from({ length: players }, (_, seat) => makePlayer(seat)),
      teamQuota: quota,
      teamDelivered: 0,
      activeActor: -1,
      order: [],
      orderIndex: 0,
      log: [],
      sequence: 0,
    };
    log(view, `矿灯亮起，${players} 名矿工下井。先选择本层矿脉契约。`);
    return { kind: "miner", view };
  }

  finished(state: MinerGameState): boolean {
    return state.view.phase === "won" || state.view.phase === "lost";
  }

  actors(state: MinerGameState): number[] {
    const view = state.view;
    if (this.finished(state) || view.phase === "bank") return [];
    if (view.phase === "map")
      return view.players
        .map((player) => player.seat)
        .filter((seat) => !(seat in view.votes));
    if (view.phase === "contract")
      return view.players
        .map((player) => player.seat)
        .filter((seat) => !(seat in view.contractVotes));
    return view.activeActor >= 0 ? [view.activeActor] : [];
  }

  candidates(state: MinerGameState, actor: number): Candidate[] {
    return this.legalMoves(state, actor).map((move) => ({
      action: { type: "miner-action", move },
      label: this.moveLabel(state, move),
    }));
  }

  needsResolution(state: MinerGameState): boolean {
    const view = state.view;
    if (view.phase === "bank") return true;
    if (view.phase === "map")
      return view.players.every((player) => player.seat in view.votes);
    if (view.phase === "contract")
      return view.players.every(
        (player) => player.seat in view.contractVotes,
      );
    if (
      view.phase === "mine" ||
      view.phase === "shop" ||
      view.phase === "rest" ||
      view.phase === "event"
    )
      return view.orderIndex >= view.order.length;
    return false;
  }

  resolutionDelay(): number {
    return 600;
  }

  actionDelay(): number {
    return 0;
  }

  actionWindow(state: MinerGameState, action: Action): string | undefined {
    if (action.type !== "miner-action") return;
    if (state.view.phase === "contract")
      return action.move.type === "contract"
        ? `miner-contract-${state.view.floor}`
        : undefined;
    if (state.view.phase !== "map") return;
    return action.move.type === "vote"
      ? `miner-vote-${state.view.floor}`
      : undefined;
  }

  apply(state: MinerGameState, actor: number, action: Action): MinerGameState {
    if (action.type !== "miner-action") throw new Error("不是矿工动作");
    const legal = this.legalMoves(state, actor);
    if (
      !legal.some((move) => JSON.stringify(move) === JSON.stringify(action.move))
    )
      throw new Error("不是合法的矿工动作");
    const view = structuredClone(state.view);
    const player = view.players[actor]!;
    const move = action.move;
    if (view.phase === "contract") {
      if (move.type !== "contract") throw new Error("请选择矿脉契约");
      view.contractVotes[actor] = move.contractId;
      setLastAction(
        view,
        actor,
        "contract",
        `${playerName(actor)} 选择了 ${minerContracts[move.contractId].name}。`,
      );
      return { kind: "miner", view };
    }
    if (view.phase === "map") {
      if (move.type !== "vote") throw new Error("请选择矿图路线");
      view.votes[actor] = move.nodeId;
      setLastAction(
        view,
        actor,
        "vote",
        `${playerName(actor)} 选择前往 ${this.floorNodeName(view, move.nodeId)}。`,
      );
      return { kind: "miner", view };
    }
    if (move.type === "vote") throw new Error("现在不能投票");
    if (view.phase === "rest") {
      if (move.type !== "rest") throw new Error("休息站只能休整");
      if (move.choice === "stamina") {
        player.stamina = Math.min(player.maxStamina, player.stamina + 4);
        setLastAction(view, actor, "rest", `${playerName(actor)} 恢复 4 点体力。`);
      } else {
        player.worn = false;
        setLastAction(view, actor, "rest", `${playerName(actor)} 修好了工具。`);
      }
    } else if (view.phase === "event") {
      if (move.type !== "event") throw new Error("事件节点只能选择事件");
      this.resolveEvent(view, actor, move.choice);
    } else {
      this.applyNodeMove(view, actor, move);
    }
    this.advanceActor(view, actor);
    return { kind: "miner", view };
  }

  resolve(state: MinerGameState): MinerGameState {
    const view = structuredClone(state.view);
    if (view.phase === "contract")
      return { kind: "miner", view: this.resolveContract(view) };
    if (view.phase === "map") return { kind: "miner", view: this.resolveVote(view) };
    if (view.phase === "bank") return { kind: "miner", view: this.resolveBank(view) };
    if (view.phase === "rest" || view.phase === "event") {
      this.finishNode(view);
      return { kind: "miner", view };
    }
    return { kind: "miner", view: this.resolveRound(view) };
  }

  project(state: MinerGameState, actor: number): MinerGameState {
    const result = structuredClone(state);
    result.view.players = result.view.players.map((player) => ({
      ...player,
      bag: player.seat === actor ? player.bag : [],
      bagCount: player.bag.length,
    }));
    return result;
  }

  private legalMoves(state: MinerGameState, actor: number): MinerMove[] {
    const view = state.view;
    if (this.finished(state)) return [];
    if (view.phase === "contract") {
      if (actor in view.contractVotes) return [];
      return view.contractOffers.map((contractId) => ({
        type: "contract" as const,
        contractId,
      }));
    }
    if (view.phase === "map") {
      if (actor in view.votes) return [];
      return minerNodeChoices(view.map, view.floor).map((node) => ({
        type: "vote" as const,
        nodeId: node.id,
      }));
    }
    if (view.phase === "bank" || view.activeActor !== actor) return [];
    const player = view.players[actor]!;
    if (view.phase === "rest")
      return [
        { type: "rest", choice: "stamina" },
        { type: "rest", choice: "repair" },
      ];
    if (view.phase === "event")
      return [
        { type: "event", choice: "gamble" },
        { type: "event", choice: "rest" },
        { type: "event", choice: "relic" },
      ];
    if (view.phase !== "mine" && view.phase !== "shop") return [];
    const moves: MinerMove[] = [];
    const frozen = player.status.frozen > 0;
    if (!frozen && player.stamina > 0) {
      for (const deposit of availableDeposits(view)) {
        if (deposit.owner !== null && deposit.owner !== actor) {
          if (deposit.progress > 0)
            moves.push({ type: "steal", depositId: deposit.id });
          continue;
        }
        if (deposit.kind === "gem" && this.bagFull(player)) continue;
        moves.push({ type: "mine", depositId: deposit.id });
      }
    }
    for (const itemId of player.items) {
      const item = minerItems[itemId];
      if (!item.effects.consumable) continue;
      if (
        item.effects.consumable === "dynamite" &&
        !availableDeposits(view).some(
          (deposit) => deposit.owner === null || deposit.owner === actor,
        )
      )
        continue;
      if (item.effects.rescue) {
        for (const target of view.players)
          if (target.seat !== actor)
            moves.push({ type: "use-item", itemId, target: target.seat });
      } else moves.push({ type: "use-item", itemId });
    }
    if (this.canUseFrost(view, actor)) {
      for (const target of view.players)
        if (target.seat !== actor)
          moves.push({ type: "use-relic", relicId: "frostHeart", target: target.seat });
    }
    moves.push({ type: "pass" });
    return moves;
  }

  private moveLabel(state: MinerGameState, move: MinerMove): string {
    const view = state.view;
    if (move.type === "contract")
      return `选择：${minerContracts[move.contractId].name}`;
    if (move.type === "vote") return `投票：${this.floorNodeName(view, move.nodeId)}`;
    if (move.type === "mine") {
      const deposit = view.node?.deposits.find((item) => item.id === move.depositId);
      return deposit ? `挖 ${depositName(deposit)} · ${deposit.progress}/${deposit.required}` : "挖矿";
    }
    if (move.type === "steal") {
      const deposit = view.node?.deposits.find((item) => item.id === move.depositId);
      return deposit
        ? `偷 ${deposit.owner === null ? "" : playerName(deposit.owner)} 的 ${depositName(deposit)}`
        : "偷矿";
    }
    if (move.type === "use-item")
      return `使用 ${minerItems[move.itemId].name}${move.target !== undefined ? ` → ${playerName(move.target)}` : ""}`;
    if (move.type === "use-relic")
      return `冻结 ${move.target !== undefined ? playerName(move.target) : ""}`;
    if (move.type === "rest")
      return move.choice === "stamina" ? "恢复体力" : "修理工具";
    if (move.type === "event")
      return move.choice === "gamble"
        ? "赌一把：60% 宝石，40% 失去体力"
        : move.choice === "rest"
          ? "稳妥：恢复 1 体力"
          : "寻找藏品";
    return "跳过";
  }

  private bagFull(player: MinerPlayerView): boolean {
    return player.bag.length >= player.capacity;
  }

  private canUseFrost(view: MinerView, actor: number): boolean {
    const player = view.players[actor]!;
    if (!player.relics.includes("frostHeart")) return false;
    const layer = currentLayer(view.floor);
    return (player.relicUses.frostHeart ?? -1) !== layer;
  }

  private floorNodeName(view: MinerView, nodeId: string): string {
    const node = minerNodeChoices(view.map, view.floor).find(
      (candidate) => candidate.id === nodeId,
    );
    return node
      ? `${minerNodeDefinitions[node.kind].name}（${node.id}）`
      : "未知矿点";
  }

  private advanceActor(view: MinerView, actor: number): void {
    const player = view.players[actor]!;
    if (player.status.frozen > 0) player.status.frozen--;
    view.orderIndex++;
    if (view.orderIndex >= view.order.length) {
      view.activeActor = -1;
      return;
    }
    view.activeActor = view.order[view.orderIndex]!;
  }

  private contractOffers(): MinerContractId[] {
    return shuffled(minerContractPool, this.random).slice(0, 2);
  }

  private resolveContract(view: MinerView): MinerView {
    const counts = new Map<MinerContractId, number>();
    for (const contractId of Object.values(view.contractVotes))
      counts.set(contractId, (counts.get(contractId) ?? 0) + 1);
    const contract = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0];
    if (!contract) throw new Error("矿脉契约投票无效");
    view.contract = contract;
    if (contract === "thief") view.teamQuota = Math.floor(view.teamQuota * 1.1);
    for (const player of view.players) refreshPlayer(player, contract);
    view.contractVotes = {};
    view.phase = "map";
    view.votes = {};
    view.activeActor = -1;
    view.order = [];
    view.orderIndex = 0;
    setLastAction(
      view,
      -1,
      "contract",
      `本层契约：${minerContracts[contract].name}。${minerContracts[contract].description}`,
    );
    return view;
  }

  private applyContractToNode(node: NonNullable<MinerView["node"]>, view: MinerView): void {
    const contract = view.contract;
    if (!contract) return;
    if (view.players.some((player) => player.relics.includes("hourglass")))
      node.maxRounds += 1;
    if (contract === "speed") node.maxRounds = Math.max(2, node.maxRounds - 1);
    if (contract === "minecart" || contract === "iceRush") {
      const dynamic: MinerDynamicId = contract === "minecart" ? "minecart" : "ice";
      if (!node.dynamic.includes(dynamic)) node.dynamic.push(dynamic);
    }
    if (contract === "iceRush")
      for (const deposit of node.deposits) deposit.frozen = true;
    if (contract === "collapseEcho")
      for (const deposit of node.deposits) deposit.hazard += 0.1;
    if (contract === "richVein")
      for (const deposit of node.deposits) deposit.hazard += 0.2;
    if (contract === "minecart")
      for (const deposit of node.deposits)
        if (deposit.kind === "item")
          deposit.required = Math.floor(deposit.required * 1.15);
  }

  private resolveVote(view: MinerView): MinerView {
    const votes = Object.entries(view.votes);
    const counts = new Map<string, number>();
    for (const [, nodeId] of votes)
      counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
    const nodeId = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0];
    const mapNode = nodeId
      ? minerNodeChoices(view.map, view.floor).find((node) => node.id === nodeId)
      : undefined;
    if (!mapNode) throw new Error("路线投票无效");
    mapNode.visited = true;
    const node = createMinerNode(mapNode, view.players.length, this.random);
    this.applyContractToNode(node, view);
    setNodePhase(view, node);
    view.votes = {};
    view.order = rotateOrder(view.players.length, view.floor);
    view.orderIndex = 0;
    view.activeActor = view.order[0] ?? -1;
    view.round = node.round;
    for (const player of view.players) {
      player.status.alert = 0;
      player.status.wanted = 0;
      player.status.exposed = 0;
      player.status.nodeSteal = 0;
      player.status.nodeGuard = 0;
      player.status.nodePick = 0;
      player.status.nextProgress = 0;
    }
    const auto = view.players.map((player) => itemEffects(player).autoProgress);
    for (let seat = 0; seat < view.players.length; seat++) {
      const amount = auto[seat] ?? 0;
      const deposit = node.deposits.find((item) => !item.completed);
      if (amount > 0 && deposit) deposit.progress += amount;
    }
    setLastAction(
      view,
      view.order[0] ?? -1,
      "enter",
      `全队进入 ${node.name}。${node.dynamic.length ? `动态效果：${minerDynamics[node.dynamic[0]!].name}。` : ""}`,
    );
    return view;
  }

  private applyNodeMove(view: MinerView, actor: number, move: MinerMove): void {
    const player = view.players[actor]!;
    const node = view.node!;
    if (move.type === "pass") {
      setLastAction(view, actor, "pass", `${playerName(actor)} 跳过行动。`);
      return;
    }
    if (move.type === "use-item") {
      this.useItem(view, actor, move.itemId, move.target);
      return;
    }
    if (move.type === "use-relic") {
      if (move.relicId !== "frostHeart" || move.target === undefined)
        throw new Error("藏品目标无效");
      const target = view.players[move.target]!;
      if (target.seat === actor) throw new Error("不能冻结自己");
      target.status.frozen = 1;
      player.relicUses.frostHeart = currentLayer(view.floor);
      setLastAction(
        view,
        actor,
        "freeze",
        `${playerName(actor)} 使用冰霜之心，冻结了 ${playerName(target.seat)} 1 个行动。`,
      );
      return;
    }
    if (move.type === "mine") {
      const deposit = node.deposits.find((item) => item.id === move.depositId);
      if (!deposit) throw new Error("矿位不存在");
      if (player.stamina <= 0) throw new Error("体力不足");
      if (deposit.kind === "gem" && this.bagFull(player))
        throw new Error("背包已满");
      const effects = itemEffects(player);
      const pick =
        1 +
        effects.pickBonus +
        player.status.nodePick -
        (player.worn ? 1 : 0);
      let step = 52 + pick * 12 - deposit.hardness * 8;
      if (deposit.frozen) step = Math.floor(step / 2);
      if (effects.icePick && (deposit.frozen || deposit.hardness > 0))
        step = Math.floor(step * 1.5);
      if (effects.pairProgress > 0 && view.players.length > 1)
        step = Math.floor(step * (1 + effects.pairProgress));
      if (view.contract === "speed") step = Math.floor(step * 1.2);
      deposit.owner = actor;
      deposit.progress = Math.min(deposit.required, deposit.progress + step);
      deposit.frozen = false;
      player.status.nextProgress = 0;
      player.stamina--;
      const hazardChance =
        deposit.hazard +
        (view.contract === "collapseEcho" ? 0.1 : 0) +
        (node.dynamic.includes("collapse") ? 0.1 : 0);
      if (this.random() < hazardChance) {
        const reduction = Math.min(0.8, effects.hazardReduction);
        const lucky =
          effects.luckyDice &&
          (player.relicUses.luckyDice ?? -1) !== currentLayer(view.floor);
        if (lucky) player.relicUses.luckyDice = currentLayer(view.floor);
        if (!lucky || this.random() >= reduction) {
          player.stamina = Math.max(0, player.stamina - 1);
          player.worn = true;
          deposit.progress = Math.max(0, deposit.progress - 10);
          log(
            view,
            `${playerName(actor)} 在 ${depositName(deposit)} 触发落石，损失 1 体力与 10 点进度。`,
          );
        }
      }
      setLastAction(
        view,
        actor,
        "mine",
        `${playerName(actor)} 挖 ${depositName(deposit)}，进度 ${deposit.progress}/${deposit.required}。`,
        deposit.id,
      );
      if (deposit.progress >= deposit.required)
        this.extractDeposit(view, actor, deposit);
      return;
    }
    if (move.type === "steal") {
      const deposit = node.deposits.find((item) => item.id === move.depositId);
      if (!deposit || deposit.owner === null || deposit.owner === actor)
        throw new Error("偷矿目标无效");
      if (player.stamina <= 0) throw new Error("体力不足");
      const target = view.players[deposit.owner]!;
      const thiefEffects = itemEffects(player);
      const targetEffects = itemEffects(target);
      let chance =
        0.62 +
        thiefEffects.stealBonus +
        player.status.nodeSteal -
        targetEffects.defenseBonus -
        target.status.nodeGuard -
        target.status.alert * 0.15 +
        (target.status.wanted > 0 ? 0.15 : 0) +
        (node.kind === "contested" ? 0.1 : 0) +
        (view.contract === "thief" ? 0.1 : 0) +
        (view.contract === "collapseEcho" ? 0.1 : 0) +
        (view.contract === "greedMark" ? 0.15 : 0);
      chance = Math.max(0.1, Math.min(0.95, chance));
      player.stamina--;
      player.stolen++;
      if (this.random() < chance) {
        target.stolenFrom++;
        const stolenProgress = deposit.progress;
        deposit.owner = actor;
        deposit.progress = stolenProgress;
        target.status.alert = 1;
        player.status.wanted = 1;
        setLastAction(
          view,
          actor,
          "steal",
          `${playerName(actor)} 从 ${playerName(target.seat)} 处偷走了 ${depositName(deposit)} 的一半以上进度！`,
          deposit.id,
        );
      } else {
        target.status.alert = 1;
        if (!thiefEffects.failNoExpose) player.status.exposed = 1;
        setLastAction(
          view,
          actor,
          "steal-fail",
          `${playerName(actor)} 想偷 ${playerName(target.seat)} 的矿，被发现了。`,
          deposit.id,
        );
      }
      return;
    }
    throw new Error("该阶段不能执行这个动作");
  }

  private useItem(
    view: MinerView,
    actor: number,
    itemId: MinerItemId,
    targetSeat?: number,
  ): void {
    const player = view.players[actor]!;
    const item = minerItems[itemId];
    if (!player.items.includes(itemId)) throw new Error("没有这个道具");
    const index = player.items.indexOf(itemId);
    player.items.splice(index, 1);
    if (item.effects.consumable === "stamina") {
      if (item.effects.rescue) {
        if (targetSeat === undefined) throw new Error("请选择救援目标");
        const target = view.players[targetSeat]!;
        target.stamina = Math.min(target.maxStamina, target.stamina + 2);
        setLastAction(
          view,
          actor,
          "item",
          `${playerName(actor)} 使用救援绳，${playerName(target.seat)} 恢复 2 体力。`,
        );
      } else {
        player.stamina = Math.min(player.maxStamina, player.stamina + 2);
        setLastAction(view, actor, "item", `${playerName(actor)} 喝下体力药剂。`);
      }
      return;
    }
    if (item.effects.consumable === "repair") {
      player.worn = false;
      setLastAction(view, actor, "item", `${playerName(actor)} 修好了工具。`);
      return;
    }
    if (item.effects.consumable === "luck") {
      player.status.luck = 1;
      setLastAction(view, actor, "item", `${playerName(actor)} 的下一块宝石品级提升。`);
      return;
    }
    if (item.effects.consumable === "map") {
      const node = view.node;
      setLastAction(
        view,
        actor,
        "item",
        `${playerName(actor)} 展开矿图：${node?.dynamic.map((id) => minerDynamics[id].name).join("、") || "本层暂时安全"}。`,
      );
      return;
    }
    if (item.effects.consumable === "dynamite") {
      const deposit = availableDeposits(view).find(
        (item) => item.owner === actor || item.owner === null,
      );
      if (!deposit) throw new Error("没有可炸的矿位");
      deposit.owner = actor;
      deposit.progress = Math.min(
        deposit.required,
        deposit.progress + 50,
      );
      deposit.spoiled = true;
      setLastAction(
        view,
        actor,
        "item",
        `${playerName(actor)} 用雷管炸开 ${depositName(deposit)}。`,
        deposit.id,
      );
      if (deposit.progress >= deposit.required)
        this.extractDeposit(view, actor, deposit);
      return;
    }
    setLastAction(view, actor, "item", `${playerName(actor)} 使用了 ${item.name}。`);
  }

  private extractDeposit(
    view: MinerView,
    actor: number,
    deposit: MinerDeposit,
  ): void {
    const player = view.players[actor]!;
    deposit.completed = true;
    if (deposit.kind === "gem" && deposit.gem) {
      const effects = itemEffects(player);
      const contractBonus =
        (view.contract === "richVein" &&
        view.node &&
        ["rich", "crystal", "vault"].includes(view.node.kind)
          ? 0.25
          : 0) +
        (view.contract === "heavyPack" ? 0.15 : 0) -
        (view.contract === "greedMark" ? 0.1 : 0);
      let value = Math.floor(
        depositScoreValue(deposit) * (1 + effects.valueBonus + contractBonus),
      );
      if (player.status.luck > 0) {
        value = Math.floor(value * 1.5);
        player.status.luck--;
      }
      const gem = { ...deposit.gem, value };
      if (player.bag.length < player.capacity) player.bag.push(gem);
      else player.score += gem.value;
      player.bagCount = player.bag.length;
      if (deposit.gem.family === "topaz")
        player.status.nextProgress += 15;
      if (deposit.gem.family === "amethyst") player.status.nodePick += 1;
      if (deposit.gem.family === "emerald")
        player.stamina = Math.min(player.maxStamina, player.stamina + 1);
      if (deposit.gem.family === "ruby") player.status.nodeSteal += 0.1;
      if (deposit.gem.family === "sapphire") player.status.nodeGuard += 0.1;
      setLastAction(
        view,
        actor,
        "extract",
        `${playerName(actor)} 挖出 ${gem.value} 分值的 ${depositName(deposit)}。`,
        deposit.id,
      );
    } else if (deposit.kind === "item" && deposit.item) {
      player.items.push(deposit.item);
      refreshPlayer(player, view.contract);
      setLastAction(
        view,
        actor,
        "buy",
        `${playerName(actor)} 从商品箱挖出 ${minerItems[deposit.item].name}。`,
        deposit.id,
      );
    } else if (deposit.kind === "relic" && deposit.relic) {
      if (player.relics.length < 4 && !player.relics.includes(deposit.relic))
        player.relics.push(deposit.relic);
      else player.score += 30;
      refreshPlayer(player, view.contract);
      setLastAction(
        view,
        actor,
        "relic",
        `${playerName(actor)} 挖出藏品 ${minerRelics[deposit.relic].name}。`,
        deposit.id,
      );
    }
  }

  private resolveEvent(
    view: MinerView,
    actor: number,
    choice: "gamble" | "rest" | "relic",
  ): void {
    const player = view.players[actor]!;
    if (choice === "rest") {
      player.stamina = Math.min(player.maxStamina, player.stamina + 1);
      setLastAction(view, actor, "event", `${playerName(actor)} 稳妥恢复 1 体力。`);
      return;
    }
    if (this.random() < 0.6) {
      if (choice === "gamble") {
        const gem = minerGems[Math.floor(this.random() * minerGems.length)]!;
        const value =
          view.contract === "gambler"
            ? Math.floor(gem.value * 1.25)
            : gem.value;
        if (player.bag.length < player.capacity)
          player.bag.push({ ...gem, value });
        else player.score += value;
        setLastAction(
          view,
          actor,
          "event",
          `${playerName(actor)} 赌石成功，获得 ${gem.name}。`,
        );
      } else {
        const relic = (Object.keys(minerRelics) as MinerRelicId[])[
          Math.floor(this.random() * 12)
        ]!;
        if (player.relics.length < 4 && !player.relics.includes(relic))
          player.relics.push(relic);
        else player.score += 30;
        refreshPlayer(player, view.contract);
        setLastAction(
          view,
          actor,
          "event",
          `${playerName(actor)} 从赌石中挖出藏品 ${minerRelics[relic].name}。`,
        );
      }
    } else {
      player.stamina = Math.max(0, player.stamina - 1);
      setLastAction(view, actor, "event", `${playerName(actor)} 赌石失败，失去 1 体力。`);
    }
  }

  private resolveRound(view: MinerView): MinerView {
    const node = view.node!;
    const dynamic = node.dynamic;
    for (const id of dynamic) this.resolveDynamic(view, node, id);
    for (const player of view.players) {
      player.status.alert = Math.max(0, player.status.alert - 1);
      player.status.wanted = Math.max(0, player.status.wanted - 1);
      player.status.exposed = Math.max(0, player.status.exposed - 1);
    }
    node.round++;
    view.round = node.round;
    if (node.round >= node.maxRounds || nodeComplete(view)) {
      this.finishNode(view);
      return view;
    }
    view.order = [...view.order.slice(1), view.order[0]!];
    view.orderIndex = 0;
    view.activeActor = view.order[0] ?? -1;
    log(view, `第 ${node.round + 1} 回合开始。`);
    return view;
  }

  private resolveDynamic(
    view: MinerView,
    node: NonNullable<MinerView["node"]>,
    id: MinerDynamicId,
  ): void {
    if (id === "minecart") {
      const candidates = availableDeposits(view);
      if (!candidates.length) return;
      const deposit = candidates[Math.floor(this.random() * candidates.length)]!;
      deposit.progress = Math.min(deposit.required, deposit.progress + 15);
      log(view, `矿车经过，${depositName(deposit)} 进度 +15。`);
      if (deposit.progress >= deposit.required)
        this.extractDeposit(view, deposit.owner ?? 0, deposit);
      return;
    }
    if (id === "conveyor") {
      const deposits = availableDeposits(view);
      if (deposits.length < 2) return;
      const first = deposits[0]!;
      const second = deposits[1]!;
      [first.owner, second.owner] = [second.owner, first.owner];
      [first.progress, second.progress] = [second.progress, first.progress];
      log(view, "传送带移动了两个矿位的进度。");
      return;
    }
    if (id === "lava") {
      const seat = (node.hazardColumn + view.floor) % view.players.length;
      const player = view.players[seat]!;
      player.stamina = Math.max(0, player.stamina - 1);
      log(view, `岩浆喷口灼伤 ${playerName(seat)}，失去 1 体力。`);
      return;
    }
    if (id === "magnetic") {
      if (node.round % 2 !== 1) return;
      const deposits = availableDeposits(view);
      if (deposits.length < 2) return;
      const first = deposits[0]!;
      const second = deposits[deposits.length - 1]!;
      [first.owner, second.owner] = [second.owner, first.owner];
      [first.progress, second.progress] = [second.progress, first.progress];
      log(view, "磁力场交换了两个矿位的进度与主人。");
      return;
    }
    if (id === "gas") {
      const seat = Math.floor(this.random() * view.players.length);
      const player = view.players[seat]!;
      player.stamina = Math.max(0, player.stamina - 1);
      log(view, `毒气扩散，${playerName(seat)} 失去 1 体力。`);
      return;
    }
    if (id === "flood" || id === "earthquake") {
      const amount = id === "flood" ? 10 : 15;
      for (const deposit of availableDeposits(view)) {
        if (id === "flood" && deposit.owner === null) continue;
        deposit.progress = Math.max(0, deposit.progress - amount);
      }
      log(view, id === "flood" ? "积水侵蚀矿位进度。" : "地震让所有矿位进度倒退。");
      return;
    }
    if (id === "rotatingHook") {
      view.order = shuffled(view.order, this.random);
      log(view, "旋转钩爪打乱了行动顺序。");
    }
  }

  private finishNode(view: MinerView): void {
    const node = view.node!;
    if (node.round >= node.maxRounds) {
      const unfinished = node.deposits.filter(
        (deposit) => !deposit.completed && deposit.owner !== null,
      );
      for (const deposit of unfinished) {
        const owner = view.players[deposit.owner!]!;
        owner.stamina = Math.max(0, owner.stamina - 1);
        deposit.progress = 0;
      }
      if (unfinished.length)
        log(view, "矿层塌方，未完成的矿位作废。");
    }
    const floor = node.floor;
    view.node = null;
    view.activeActor = -1;
    view.order = [];
    view.orderIndex = 0;
    if (floor >= view.map.length - 1 || (floor + 1) % LAYER_SIZE === 0) {
      view.phase = "bank";
      log(view, "到达升降机，准备交矿。");
      return;
    }
    view.floor = floor + 1;
    view.phase = "map";
    view.votes = {};
    view.round = 0;
    log(view, "回到矿道，选择下一处矿点。");
  }

  private resolveBank(view: MinerView): MinerView {
    let total = 0;
    for (const player of view.players) {
      const value = player.bag.reduce((sum, gem) => sum + gem.value, 0);
      const effects = itemEffects(player);
      const bonus = Math.floor(value * Math.min(0.2, effects.teamQuotaBonus));
      total += value + bonus;
      player.delivered += value;
      player.score += value;
      player.bag = [];
      player.bagCount = 0;
      refreshPlayer(player, view.contract);
      if (effects.springBoots)
        player.stamina = Math.min(player.maxStamina, player.stamina + 1);
    }
    for (const player of view.players) {
      const effects = itemEffects(player);
      if (effects.dividend > 0) {
        const teammates = view.players.filter((other) => other.seat !== player.seat);
        const dividend = Math.floor(
          sumBy(teammates, (other) => other.delivered) * effects.dividend,
        );
        player.score += dividend;
      }
    }
    for (const player of view.players) {
      player.stamina = player.maxStamina;
      player.worn = false;
    }
    view.teamDelivered += total;
    const final = view.floor >= view.map.length - 1;
    log(view, `本层交矿 ${total}，团队累计 ${view.teamDelivered}/${view.teamQuota}。`);
    if (final) {
      const won = view.teamDelivered >= view.teamQuota;
      view.phase = won ? "won" : "lost";
      view.result = {
        won,
        quota: view.teamQuota,
        delivered: view.teamDelivered,
        ranking: [...view.players]
          .sort((a, b) => b.delivered - a.delivered || b.score - a.score)
          .map((player) => ({
            seat: player.seat,
            delivered: player.delivered,
            score: player.score,
          })),
      };
      log(view, won ? "全队升井成功！" : "团队指标未达成，矿灯熄灭。");
      return view;
    }
    view.floor++;
    view.phase = "contract";
    view.contract = null;
    view.votes = {};
    view.contractVotes = {};
    view.contractOffers = this.contractOffers();
    view.node = null;
    view.round = 0;
    view.activeActor = -1;
    view.order = [];
    view.orderIndex = 0;
    return view;
  }

}
