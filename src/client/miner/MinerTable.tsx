import type { GameSnapshot } from "../OriginalGame";
import type { Action } from "../../domain/types";
import type {
  MinerDeposit,
  MinerGameState,
  MinerMove,
  MinerPlayerView,
  MinerView,
} from "../../domain/miner/types";
import {
  minerContracts,
  minerDynamics,
  minerGemFamilies,
  minerItems,
  minerNodeDefinitions,
  minerRelics,
} from "../../domain/miner/content";
import "./miner.css";

function depositLabel(deposit: MinerDeposit): string {
  if (deposit.kind === "gem" && deposit.gem) {
    const family = minerGemFamilies[deposit.gem.family];
    return `${family.name} · ${deposit.gem.grade === "chipped" ? "碎" : deposit.gem.grade === "whole" ? "整" : "净"}`;
  }
  if (deposit.kind === "item" && deposit.item)
    return minerItems[deposit.item].name;
  if (deposit.kind === "relic" && deposit.relic)
    return minerRelics[deposit.relic].name;
  return "矿位";
}

function playerName(view: MinerView, seat: number): string {
  return `玩家 ${seat + 1}`;
}

function PlayerCard({
  player,
  view,
  active,
  actor,
}: {
  player: MinerPlayerView;
  view: MinerView;
  active: boolean;
  actor: number;
}) {
  const own = player.seat === actor;
  const value = player.bag.reduce((sum, gem) => sum + gem.value, 0);
  const tags = [
    ...player.items.flatMap((id) => {
      const category = minerItems[id].category;
      return category === "tool" || category === "bag"
        ? ["工程"]
        : category === "steal"
          ? ["盗贼"]
          : category === "team"
            ? ["队长"]
            : [];
    }),
    ...player.relics.map((id) => {
      const tag = minerRelics[id].tag;
      return tag === "engineer"
        ? "工程"
        : tag === "thief"
          ? "盗贼"
          : tag === "leader"
            ? "队长"
            : tag === "gambler"
              ? "赌徒"
              : "冰霜";
    }),
  ].reduce<Record<string, number>>((counts, tag) => {
    counts[tag] = (counts[tag] ?? 0) + 1;
    return counts;
  }, {});
  return (
    <article className={`miner-player ${active ? "is-active" : ""}`}>
      <header>
        <strong>{playerName(view, player.seat)}</strong>
        <span>{player.stamina}/{player.maxStamina} 体力</span>
      </header>
      <div className="miner-player-stats">
        <span>镐力 {player.pickPower}</span>
        <span>背包 {player.bag.length}/{player.capacity}</span>
        <span>{own ? `${value} 分` : `${player.bagCount} 块`}</span>
      </div>
      <div className="miner-player-inventory">
        {player.items.map((item) => (
          <span key={item} title={minerItems[item].description}>
            {minerItems[item].name}
          </span>
        ))}
        {player.relics.map((relic) => (
          <span className="miner-relic" key={relic} title={minerRelics[relic].description}>
            {minerRelics[relic].name}
          </span>
        ))}
      </div>
      <div className="miner-player-tags">
        {Object.entries(tags).map(([tag, count]) => (
          <span key={tag} data-count={count >= 2 ? "active" : undefined}>
            {tag} {count}
          </span>
        ))}
      </div>
      <div className="miner-player-bag">
        {own ? (
          player.bag.length ? (
            player.bag.map((gem, index) => (
              <span key={`${gem.id}-${index}`} title={gem.id}>
                {minerGemFamilies[gem.family].name} {gem.value}
              </span>
            ))
          ) : (
            <span className="muted">背包空</span>
          )
        ) : (
          <span className="muted">{player.bagCount} 块宝石</span>
        )}
      </div>
      <div className="miner-player-status">
        {player.status.frozen > 0 && <em>冰冻</em>}
        {player.status.wanted > 0 && <em>通缉</em>}
        {player.status.alert > 0 && <em>警觉</em>}
        {player.status.exposed > 0 && <em>暴露</em>}
        {player.worn && <em>工具磨损</em>}
      </div>
    </article>
  );
}

function DepositCard({
  deposit,
  view,
  moves,
  send,
  pending,
}: {
  deposit: MinerDeposit;
  view: MinerView;
  moves: MinerMove[];
  send: (move: MinerMove) => void;
  pending: boolean;
}) {
  const mine = moves.find(
    (move) => move.type === "mine" && move.depositId === deposit.id,
  );
  const steal = moves.find(
    (move) => move.type === "steal" && move.depositId === deposit.id,
  );
  const percent = Math.min(100, Math.round((deposit.progress / deposit.required) * 100));
  const last = view.lastAction?.depositId === deposit.id;
  return (
    <article
      className={`miner-deposit ${deposit.completed ? "is-complete" : ""} ${deposit.frozen ? "is-frozen" : ""} ${last ? "is-last" : ""}`}
      data-deposit-kind={deposit.kind}
    >
      <div className="miner-deposit-title">
        <strong>{depositLabel(deposit)}</strong>
        {deposit.kind === "relic" && <span className="miner-tag">藏品</span>}
        {deposit.frozen && <span className="miner-tag frozen">冰冻</span>}
        {deposit.hazard > 0.15 && <span className="miner-tag danger">危险</span>}
      </div>
      <div className="miner-progress" aria-label={`进度 ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <small>
        {deposit.completed
          ? "已挖出"
          : deposit.owner === null
            ? "无人认领"
            : `主人：${playerName(view, deposit.owner)}`}
        {" · "}
        {deposit.progress}/{deposit.required}
      </small>
      <div className="miner-deposit-actions">
        {mine && (
          <button type="button" disabled={pending} onClick={() => send(mine)}>
            挖矿
          </button>
        )}
        {steal && (
          <button
            type="button"
            className="danger"
            disabled={pending}
            onClick={() => send(steal)}
          >
            偷进度
          </button>
        )}
      </div>
    </article>
  );
}

function ContractBoard({
  view,
  moves,
  send,
  pending,
}: {
  view: MinerView;
  moves: MinerMove[];
  send: (move: MinerMove) => void;
  pending: boolean;
}) {
  return (
    <section className="miner-contract-board">
      <div className="miner-map-heading">
        <h3>第 {view.floor + 1} 层 · 矿脉契约</h3>
        <span>
          {Object.keys(view.contractVotes).length}/{view.players.length} 已选择
        </span>
      </div>
      {view.contract && (
        <p className="muted">
          本层契约：{minerContracts[view.contract].name} ·{" "}
          {minerContracts[view.contract].description}
        </p>
      )}
      <div className="miner-contract-options">
        {view.contractOffers.map((id) => {
          const move = moves.find(
            (item) => item.type === "contract" && item.contractId === id,
          );
          return (
            <button
              type="button"
              key={id}
              className={`miner-contract-option ${minerContracts[id].kind}`}
              disabled={pending || !move}
              onClick={() => move && send(move)}
            >
              <strong>{minerContracts[id].name}</strong>
              <small>{minerContracts[id].description}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MapBoard({
  view,
  moves,
  send,
  pending,
}: {
  view: MinerView;
  moves: MinerMove[];
  send: (move: MinerMove) => void;
  pending: boolean;
}) {
  const nodes = view.map[view.floor] ?? [];
  return (
    <section className="miner-map-board">
      <div className="miner-map-heading">
        <h3>第 {view.floor + 1} 层 · 选择矿点</h3>
        <span>
          {view.votes && Object.keys(view.votes).length}/{view.players.length} 已投票
        </span>
      </div>
      <div className="miner-map-nodes">
        {nodes.map((node) => {
          const move = moves.find(
            (item) => item.type === "vote" && item.nodeId === node.id,
          );
          return (
            <button
              type="button"
              key={node.id}
              className="miner-map-node"
              disabled={pending || !move}
              onClick={() => move && send(move)}
            >
              <span className="miner-node-symbol">
                {node.kind === "shop"
                  ? "▣"
                  : node.kind === "rest"
                    ? "☕"
                    : node.kind === "event"
                      ? "?"
                      : node.kind === "guardian"
                        ? "♜"
                        : node.kind === "vault"
                          ? "★"
                          : "⛏"}
              </span>
              <strong>{minerNodeDefinitions[node.kind].name}</strong>
              <small>{minerNodeDefinitions[node.kind].description}</small>
            </button>
          );
        })}
      </div>
      <div className="miner-floor-strip">
        {view.map.map((floor, index) => (
          <span
            key={index}
            className={index === view.floor ? "active" : index < view.floor ? "past" : ""}
            title={`第 ${index + 1} 层`}
          >
            {index + 1}
          </span>
        ))}
      </div>
    </section>
  );
}

function NodeBoard({
  view,
  moves,
  send,
  pending,
}: {
  view: MinerView;
  moves: MinerMove[];
  send: (move: MinerMove) => void;
  pending: boolean;
}) {
  const node = view.node;
  if (!node) return null;
  const actionMoves = moves.filter(
    (move) =>
      move.type === "pass" ||
      move.type === "use-item" ||
      move.type === "use-relic" ||
      move.type === "rest" ||
      move.type === "event",
  );
  if (view.phase === "rest" || view.phase === "event") {
    return (
      <section className="miner-node-board">
        <div className="miner-node-heading">
          <h3>{node.name}</h3>
          <span>第 {node.round + 1} 回合</span>
        </div>
        <p className="muted">{minerNodeDefinitions[node.kind].description}</p>
        <div className="miner-action-grid">
          {actionMoves.map((move, index) => (
            <button
              type="button"
              key={index}
              disabled={pending}
              onClick={() => send(move)}
            >
              {move.type === "rest"
                ? move.choice === "stamina"
                  ? "恢复 4 体力"
                  : "修理工具"
                : move.type === "event"
                  ? move.choice === "gamble"
                    ? "赌一把"
                    : move.choice === "rest"
                      ? "稳妥恢复"
                      : "寻找藏品"
                  : "跳过"}
            </button>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="miner-node-board">
      <div className="miner-node-heading">
        <div>
          <h3>{node.name}</h3>
          <small>
            第 {node.round + 1}/{node.maxRounds} 回合 · 当前：
            {view.activeActor >= 0 ? playerName(view, view.activeActor) : "结算中"}
          </small>
        </div>
        <div className="miner-dynamics">
          {node.dynamic.map((id) => (
            <span key={id} title={minerDynamics[id].description}>
              {minerDynamics[id].name}
            </span>
          ))}
        </div>
      </div>
      <div className="miner-deposits">
        {node.deposits.map((deposit) => (
          <DepositCard
            key={deposit.id}
            deposit={deposit}
            view={view}
            moves={moves}
            send={send}
            pending={pending}
          />
        ))}
      </div>
      <div className="miner-action-grid">
        {actionMoves.map((move, index) => {
          if (move.type === "pass")
            return (
              <button type="button" key={index} disabled={pending} onClick={() => send(move)}>
                跳过
              </button>
            );
          if (move.type === "use-item")
            return (
              <button type="button" key={index} disabled={pending} onClick={() => send(move)}>
                {minerItems[move.itemId].name}
                {move.target !== undefined ? ` → ${playerName(view, move.target)}` : ""}
              </button>
            );
          if (move.type === "use-relic")
            return (
              <button type="button" key={index} disabled={pending} onClick={() => send(move)}>
                冰冻 {move.target !== undefined ? playerName(view, move.target) : ""}
              </button>
            );
          return null;
        })}
      </div>
    </section>
  );
}

export function MinerTable({
  snapshot,
  act,
  pending,
  replay,
}: {
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  pending: boolean;
  replay: boolean;
}) {
  const state = snapshot.state;
  if (!state || state.kind !== "miner") return null;
  const game = state as MinerGameState;
  const view = game.view;
  const actor = snapshot.actor;
  const candidates = snapshot.candidates ?? [];
  const moves =
    !pending && !replay && actor >= 0
      ? candidates.flatMap((candidate) =>
          candidate.action.type === "miner-action"
            ? [candidate.action.move]
            : [],
        )
      : [];
  const send = (move: MinerMove) => {
    const candidate = candidates.find(
      (item) =>
        item.action.type === "miner-action" &&
        JSON.stringify(item.action.move) === JSON.stringify(move),
    );
    if (candidate) act(candidate.action);
  };
  return (
    <div
      className="miner-table"
      data-phase={view.phase}
      data-last={view.lastAction?.kind}
    >
      <header className="miner-hud">
        <div>
          <strong>黄金矿脉</strong>
          <span>
            第 {Math.floor(view.floor / 3) + 1} 层 · 第 {view.floor + 1} 个矿点
          </span>
        </div>
        <div className="miner-quota">
          <span>团队交矿</span>
          <strong>
            {view.teamDelivered}/{view.teamQuota}
          </strong>
        </div>
        <div className="miner-active-seat">
          {view.contract && (
            <span className="miner-contract-chip">
              {minerContracts[view.contract].name}
            </span>
          )}
          {view.activeActor >= 0 ? `轮到 ${playerName(view, view.activeActor)}` : "等待结算"}
        </div>
      </header>
      <div className="miner-players">
        {view.players.map((player) => (
          <PlayerCard
            key={player.seat}
            player={player}
            view={view}
            active={player.seat === view.activeActor}
            actor={actor}
          />
        ))}
      </div>
      {view.phase === "contract" ? (
        <ContractBoard
          view={view}
          moves={moves}
          send={send}
          pending={pending || replay}
        />
      ) : view.phase === "map" ? (
        <MapBoard view={view} moves={moves} send={send} pending={pending || replay} />
      ) : view.phase === "bank" ? (
        <section className="miner-bank">
          <h3>升降机 · 交矿</h3>
          <p>队友们正在把背包里的宝石倒进矿车。</p>
          <div className="miner-bank-total">
            <strong>{view.teamDelivered}</strong>
            <span>/ {view.teamQuota}</span>
          </div>
        </section>
      ) : view.phase === "won" || view.phase === "lost" ? (
        <section className={`miner-result ${view.phase}`}>
          <h3>{view.phase === "won" ? "全队升井成功！" : "矿灯熄灭"}</h3>
          <p>
            团队交矿 {view.teamDelivered} / {view.teamQuota}
          </p>
          <ol>
            {view.result?.ranking.map((entry) => (
              <li key={entry.seat}>
                {playerName(view, entry.seat)} · {entry.delivered} 分
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <NodeBoard
          view={view}
          moves={moves}
          send={send}
          pending={pending || replay}
        />
      )}
      <div className="miner-log" aria-label="矿工日志">
        {view.log.slice(-8).map((entry) => (
          <p key={entry.id}>{entry.text}</p>
        ))}
      </div>
    </div>
  );
}
