import { expeditionItemArt } from "./item-art";
import {
  cardServices,
  campRecovery,
} from "../../domain/expedition/card-services";
import { useState } from "react";
import type {
  ExpeditionMove,
  ShopItem,
} from "../../domain/expedition/adventure-types";
import { effectsText } from "../../domain/expedition/content";
import { shopRaidBalance } from "../../domain/expedition/map";
import type { Hero } from "../../domain/expedition/types";
import {
  potions,
  relics,
  relicText,
  relicValue,
} from "../../domain/expedition/world";
import { CardService } from "./CardService";
import { ExpeditionCard } from "./ExpeditionCard";

export function RestSite({
  hero,
  moves,
  send,
  recovery = false,
  recoveryMultiplier = 1,
}: {
  hero: Hero;
  moves: ExpeditionMove[];
  send: (move: ExpeditionMove) => void;
  recovery?: boolean;
  recoveryMultiplier?: number;
}) {
  const [mode, setMode] = useState<"upgrade" | "remove" | null>(null);
  const active = recovery
    ? moves.some((move) => move.type === "upgrade")
      ? "upgrade"
      : moves.some((move) => move.type === "remove")
        ? "remove"
        : null
    : mode;
  return (
    <section className="exp-rest-site" data-guide-target="expedition.choices">
      <header>
        <span aria-hidden="true">♨︎</span>
        <h2>{recovery ? "整理行装" : "围炉休整"}</h2>
      </header>
      {!recovery && (
        <div className="exp-rest-options">
          <button
            disabled={!moves.some((move) => move.type === "rest")}
            onClick={() => send({ type: "rest" })}
          >
            <strong>休息</strong>
            <span>
              恢复 {Math.ceil(campRecovery(hero) * recoveryMultiplier)} 生命
            </span>
            <small>
              当前 {hero.hp}/{hero.maxHp}
            </small>
          </button>
          <button
            aria-pressed={active === "upgrade"}
            disabled={!moves.some((move) => move.type === "upgrade")}
            onClick={() => setMode("upgrade")}
          >
            <strong>锻造</strong>
            <span>升级一张牌</span>
            <small>查看升级前后变化</small>
          </button>
          <button
            aria-pressed={active === "remove"}
            disabled={!moves.some((move) => move.type === "remove")}
            onClick={() => setMode("remove")}
          >
            <strong>精简</strong>
            <span>移除一张牌</span>
            <small>保留更需要的牌</small>
          </button>
        </div>
      )}
      {active && (
        <CardService
          key={active}
          mode={active}
          hero={hero}
          moves={moves}
          onChoose={send}
        />
      )}
      {moves.some((move) => move.type === "done") && (
        <button onClick={() => send({ type: "done" })}>
          {recovery ? "跳过" : "离开营地"}
        </button>
      )}
      {!moves.length && <p className="muted">已完成选择，等待队友</p>}
    </section>
  );
}

export function Shop({
  hero,
  items,
  moves,
  send,
  removalPrice = cardServices.removalPrice,
  onRaid,
  shopRaidFailed = false,
  progress,
}: {
  hero: Hero;
  items: ShopItem[];
  moves: ExpeditionMove[];
  send: (move: ExpeditionMove) => void;
  removalPrice?: number;
  onRaid?: () => void;
  shopRaidFailed?: boolean;
  progress: { nodes: number; battles: number; cards: number };
}) {
  const [tab, setTab] = useState("goods");
  const tradable = [...new Set(hero.relics)].filter(
    (id) => relicValue(id, progress) > 0,
  );
  return (
    <section className="exp-shop-scene" data-guide-target="expedition.shop">
      <header>
        <h2>旅途商店</h2>
        <strong>{hero.gold} 金币</strong>
      </header>
      {shopRaidFailed && (
        <p className="exp-shop-failed" role="status">
          老板带着商品逃走了。本店已经关门，但后续商店仍会出现。
        </p>
      )}
      {onRaid && (
        <button className="exp-shop-raid" onClick={onRaid}>
          抢走商店
          <small>
            {shopRaidBalance.roundLimit} 回合内击败老板；胜利后本店免费但本局不再出现商店，超时老板会带走全部商品
          </small>
        </button>
      )}
      <div className="exp-inventory-tabs" role="tablist" aria-label="商店服务">
        <button
          role="tab"
          aria-selected={tab === "goods"}
          aria-controls="exp-shop-goods"
          onClick={() => setTab("goods")}
        >
          商品
        </button>
        <button
          role="tab"
          aria-selected={tab === "remove"}
          aria-controls="exp-shop-remove"
          onClick={() => setTab("remove")}
        >
          移除服务 · {removalPrice} 金币
        </button>
        {tradable.length > 0 && (
          <button
            role="tab"
            aria-selected={tab === "trade"}
            aria-controls="exp-shop-trade"
            onClick={() => setTab("trade")}
          >
            交易遗物 · {tradable.length}
          </button>
        )}
      </div>
      {tab === "goods" ? (
        <div
          id="exp-shop-goods"
          role="tabpanel"
          aria-label="商品"
          className="exp-shop"
        >
          {items.map((item) => (
            <article key={item.id} data-sold={item.sold || undefined}>
              {item.kind === "card" ? (
                <ExpeditionCard
                  instance={{ id: item.id, card: item.card, upgradeLevel: 0 }}
                />
              ) : (
                <div className="exp-shop-item">
                  <span aria-hidden="true">
                    <img
                      className="exp-service-item-art"
                      src={expeditionItemArt(
                        item.kind === "relic"
                          ? relics[item.relic].effects
                          : potions[item.potion].effects,
                      )}
                      alt=""
                    />
                  </span>
                  <h3>
                    {item.kind === "relic"
                      ? relics[item.relic].name
                      : potions[item.potion].name}
                  </h3>
                  <p>
                    {item.kind === "relic"
                      ? relicText(item.relic)
                      : effectsText(potions[item.potion].effects)}
                  </p>
                </div>
              )}
              <button
                disabled={
                  !moves.some(
                    (move) => move.type === "buy" && move.item === item.id,
                  )
                }
                onClick={() => send({ type: "buy", item: item.id })}
              >
                {item.sold ? "已购买" : `${item.price} 金币 · 购买`}
              </button>
            </article>
          ))}
        </div>
      ) : tab === "remove" ? (
        <div id="exp-shop-remove" role="tabpanel" aria-label="移除服务">
          <CardService
            mode="remove"
            hero={hero}
            moves={moves}
            onChoose={send}
            price={removalPrice}
          />
        </div>
      ) : (
        <div id="exp-shop-trade" role="tabpanel" aria-label="交易遗物">
          <p className="muted">老板按当前成长进度回收可升值遗物。</p>
          <div className="exp-shop-trade">
            {tradable.map((id) => {
              const value = relicValue(id, progress);
              return (
                <article key={id}>
                  <div>
                    <h3>{relics[id].name}</h3>
                    <p>{relicText(id)}</p>
                    <small>
                      估值 {value} 金币 · 节点 {progress.nodes} · 战斗{" "}
                      {progress.battles} · 已打出 {progress.cards} 张牌
                    </small>
                  </div>
                  <button
                    disabled={
                      !moves.some(
                        (move) =>
                          move.type === "sell-relic" && move.relic === id,
                      )
                    }
                    onClick={() => send({ type: "sell-relic", relic: id })}
                  >
                    卖给老板 · {value} 金币
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
      {moves.some((move) => move.type === "done") && (
        <button onClick={() => send({ type: "done" })}>离开商店</button>
      )}
    </section>
  );
}
