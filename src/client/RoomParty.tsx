import { PartyShop } from "./party/PartyShop";
import { useEffect, useState } from "react";
import { v4 as randomId } from "uuid";
import {
  partyItems,
  partyEconomy,
  partyTier,
  partyTiers,
  awardTitles,
  type PartyAction,
  type PartyContext,
} from "../domain/party";
import type { Snapshot } from "../domain/protocol";
import { Emoji } from "./Emoji";
import { Panel, Select, Switch } from "./ui/Controls";
import { useVoice } from "./voice/VoiceProvider";
import { PartyActivities } from "./party/PartyActivities";
import "./party/party.css";
export function RoomParty({
  snapshot,
  onAction,
  observer = false,
  interactionsEnabled = true,
  open,
  onOpenChange,
}: {
  snapshot: Snapshot;
  onAction: (id: string, action: PartyAction) => void;
  observer?: boolean;
  interactionsEnabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [targetId, setTargetId] = useState(""),
    [title, setTitle] = useState<keyof typeof awardTitles>("teammate"),
    [now, setNow] = useState(Date.now);
  const { view: voice } = useVoice();
  const voiceReady = voice.phase === "connected";
  const members = [...snapshot.seats, ...(snapshot.spectators ?? [])],
    actor = snapshot.partyActor ?? snapshot.actor;
  const party = snapshot.party,
    own = members[actor],
    account = own ? party.balances[own.id] : undefined;
  const targets = snapshot.seats
    .map((seat, index) => ({ ...seat, index }))
    .filter(
      (s) =>
        s.index !== actor &&
        s.name &&
        (snapshot.finished || !party.observers.includes(s.index)),
    );
  const chosen = targets.find((s) => s.id === targetId) ?? targets[0];
  const context: PartyContext = {
    players: members.map((s) => ({
      id: s.id,
      name: s.name,
      human: !("difficulty" in s && s.difficulty),
    })),
    round: party.round,
    playing: snapshot.playing,
    finished: snapshot.finished,
    observers: party.observers,
    state: snapshot.state,
  };
  const send = (action: PartyAction) => onAction(randomId(), action);
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [open]);
  const tier = partyTier(account?.earned ?? 0),
    next = partyTiers[tier + 1];
  return (
    <>
      <Panel
        title={observer ? "旁观席与房间派对" : "房间派对"}
        open={open}
        onOpenChange={onOpenChange}
        className="party-panel"
      >
        {!interactionsEnabled && (
          <p role="status">
            本机已隐藏互动特效，其他玩家仍会收到。可在设置 → 消息与互动中开启。
          </p>
        )}
        <header className="party-heading">
          <strong>彩蛋币 · {account?.coins ?? 0}</strong>
          {snapshot.canManage && (
            <Switch
              checked={party.enabled}
              onCheckedChange={(enabled) => send({ type: "enabled", enabled })}
              label="启用房间派对"
            />
          )}
        </header>
        {!party.enabled ? (
          <p className="muted">
            由房主开启。加入获得 {partyEconomy.initial} 币，完成一局获得{" "}
            {partyEconomy.completion} 币。
          </p>
        ) : (
          <>
            <div className="party-wealth">
              <strong>
                财富 {tier} 级 · 商品{" "}
                {Math.round(partyTiers[tier].discount * 100)}% 价格
              </strong>
              <small>
                累计获得 {account?.earned ?? 0} 币
                {next ? ` · 下一级 ${next.earned} 币` : " · 已全部解锁"}
              </small>
              {next && (
                <progress value={account?.earned ?? 0} max={next.earned} />
              )}
            </div>
            {snapshot.canManage && (
              <details className="party-policy">
                <summary>本房间规则</summary>
                <Switch
                  label="直接解锁全部商品"
                  checked={party.policy.unlockAll}
                  onCheckedChange={(unlockAll) =>
                    send({
                      type: "policy",
                      policy: { ...party.policy, unlockAll },
                    })
                  }
                />
                <label>
                  竞猜思考时间
                  <Select
                    aria-label="竞猜思考时间"
                    value={party.policy.betSeconds}
                    onValueChange={(v) =>
                      send({
                        type: "policy",
                        policy: {
                          ...party.policy,
                          betSeconds: Number(v) as 15 | 30 | 60,
                        },
                      })
                    }
                  >
                    {[15, 30, 60].map((v) => (
                      <option key={v} value={v}>
                        {v} 秒
                      </option>
                    ))}
                  </Select>
                </label>
              </details>
            )}
            <PartyActivities snapshot={snapshot} send={send} now={now} />
            {chosen &&
              (snapshot.finished || party.observers.includes(actor)) && (
                <label className="party-target">
                  {snapshot.finished ? "颁奖给" : "助威对象"}
                  <Select
                    aria-label="派对互动对象"
                    value={chosen.id}
                    onValueChange={setTargetId}
                  >
                    {targets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </label>
              )}
            {snapshot.playing && own && (
              <>
                {party.observers.includes(actor) && (
                  <div className="party-observer">
                    <strong>本局已离场，观众席也有自己的舞台</strong>
                    <button
                      disabled={
                        !chosen ||
                        !!party.support[own.id] ||
                        party.observers.includes(chosen.index)
                      }
                      onClick={() =>
                        chosen &&
                        send({ type: "support", target: chosen.index })
                      }
                    >
                      {party.support[own.id]
                        ? "本局已支持"
                        : `支持朋友 · 获得 ${partyEconomy.support} 币`}
                    </button>
                  </div>
                )}
                {account &&
                  (account.auras.length > 0 ||
                    account.equipment.length > 0) && (
                    <div className="party-market-choices">
                      {[...account.auras, ...account.equipment].map((id) => (
                        <span key={id}>
                          <Emoji text={partyItems[id].emoji} />{" "}
                          {partyItems[id].name}
                        </span>
                      ))}
                    </div>
                  )}
                <PartyShop
                  snapshot={snapshot}
                  context={context}
                  actor={actor}
                  voiceReady={voiceReady}
                  onSend={send}
                />
              </>
            )}
            {snapshot.finished && party.settled && own && (
              <div className="party-awards">
                <label>
                  奖项
                  <Select
                    aria-label="趣味奖项"
                    value={title}
                    onValueChange={(v) =>
                      setTitle(v as keyof typeof awardTitles)
                    }
                  >
                    {Object.entries(awardTitles).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </label>
                <button
                  disabled={!chosen || !!party.awards[own.id]}
                  onClick={() =>
                    chosen &&
                    send({ type: "award", target: chosen.index, title })
                  }
                >
                  {party.awards[own.id] ? "本局已颁奖" : "送出本局奖章"}
                </button>
              </div>
            )}
            <details>
              <summary>房间积分榜</summary>
              <div className="party-scoreboard">
                {members
                  .filter((s) => party.balances[s.id])
                  .map((s) => (
                    <div key={s.id}>
                      <strong>{s.name}</strong>
                      <span>
                        {party.balances[s.id].coins} 币 · 财富{" "}
                        {partyTier(party.balances[s.id].earned)} 级
                      </span>
                    </div>
                  ))}
              </div>
            </details>
            <details>
              <summary>我的收支</summary>
              <div className="party-receipts">
                {party.receipts
                  .filter((r) => r.member === own?.id)
                  .slice(-20)
                  .reverse()
                  .map((r, i) => (
                    <div key={`${r.id}:${i}`}>
                      <span>{r.label}</span>
                      <strong>
                        {r.delta > 0 ? "+" : ""}
                        {r.delta} 币
                      </strong>
                      <small>余额 {r.balance}</small>
                    </div>
                  ))}
              </div>
            </details>
          </>
        )}
      </Panel>
    </>
  );
}
