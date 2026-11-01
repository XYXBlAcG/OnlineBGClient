import { useState } from "react";
import type { Snapshot } from "../../domain/protocol";
import {
  partyItems,
  type PartyAction,
  type PartyMiniGame,
} from "../../domain/party";
import { Emoji } from "../Emoji";
import { Select } from "../ui/Controls";
export function PartyActivities({
  snapshot,
  send,
  now,
}: {
  snapshot: Snapshot;
  send: (action: PartyAction) => void;
  now: number;
}) {
  const members = [...snapshot.seats, ...(snapshot.spectators ?? [])],
    actor = snapshot.partyActor ?? snapshot.actor;
  const own = members[actor]?.id;
  const [amount, setAmount] = useState(5),
    [option, setOption] = useState("");
  const markets = snapshot.party.markets
    .filter((m) => m.round === snapshot.party.round)
    .slice(-4);
  const observer = snapshot.party.observers.includes(actor);
  const label = (id: string) =>
    members.find((s) => s.id === id)?.name ??
    {
      lord: "主公与忠臣",
      rebel: "反贼",
      spy: "内奸",
      "team:0": "蓝队",
      "team:1": "橙队",
    }[id] ??
    id;
  return (
    <>
      {markets.map((m) => {
        const selected = m.options.includes(option) ? option : m.options[0],
          stake = own ? m.stakes[own] : undefined;
        return (
          <section className="party-market" key={m.id}>
            <header>
              <strong>{m.title}</strong>
              <small>
                {m.status === "open"
                  ? `思考时间 ${Math.max(0, Math.ceil((m.closesAt - now) / 1000))} 秒`
                  : m.status === "locked"
                    ? "已锁定，等待结果"
                    : m.status === "refunded"
                      ? "已退款"
                      : "已结算"}
              </small>
            </header>
            <small>
              至少两位观众参与；异向下注时奖池另加 20%（最多 100 币）。
            </small>
            <div className="party-market-choices">
              {m.options.map((id) => (
                <span key={id}>
                  {label(id)} ·{" "}
                  {Object.values(m.stakes)
                    .filter((s) => s.option === id)
                    .reduce((a, b) => a + b.amount, 0)}{" "}
                  币
                </span>
              ))}
            </div>
            {m.status === "open" && observer && (
              <div className="party-bet-controls">
                <Select
                  aria-label="竞猜对象"
                  value={selected}
                  onValueChange={setOption}
                >
                  {m.options.map((id) => (
                    <option key={id} value={id}>
                      {label(id)}
                    </option>
                  ))}
                </Select>
                <input
                  aria-label="下注彩蛋币"
                  type="number"
                  min={5}
                  step={5}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <button
                  className="primary"
                  disabled={now >= m.closesAt}
                  onClick={() =>
                    send({
                      type: "bet",
                      market: m.id,
                      option: selected,
                      amount,
                    })
                  }
                >
                  {stake ? "修改下注" : "确认下注"}
                </button>
                {stake && (
                  <button
                    onClick={() =>
                      send({
                        type: "bet",
                        market: m.id,
                        option: stake.option,
                        amount: 0,
                      })
                    }
                  >
                    撤回
                  </button>
                )}
              </div>
            )}
            {stake && (
              <small>
                你的选择：{label(stake.option)} · {stake.amount} 币
                {m.payouts[own!] !== undefined
                  ? ` · 返还 ${m.payouts[own!]} 币`
                  : ""}
              </small>
            )}
          </section>
        );
      })}
      {snapshot.party.minigames
        .filter((g) => g.status === "open" || now < g.closesAt + 15000)
        .slice(-4)
        .map((game) => (
          <Activity
            key={game.id}
            game={game}
            own={own}
            observer={observer}
            now={now}
            send={send}
          />
        ))}
    </>
  );
}
function Activity({
  game,
  own,
  observer,
  now,
  send,
}: {
  game: PartyMiniGame;
  own: string | undefined;
  observer: boolean;
  now: number;
  send: (action: PartyAction) => void;
}) {
  const [text, setText] = useState("");
  const active = game.status === "open" && now < game.closesAt,
    joined = own !== undefined && own in game.players;
  const act = (
    operation: Extract<PartyAction, { type: "minigame" }>["operation"],
    value = "",
  ) => send({ type: "minigame", game: game.id, operation, value });
  const score = Object.values(game.players).reduce((a, b) => a + b, 0),
    total = Object.values(game.contributions).reduce((a, b) => a + b, 0);
  return (
    <section className="party-activity">
      <header>
        <strong>
          <Emoji text={partyItems[game.item].emoji} />{" "}
          {partyItems[game.item].name}
        </strong>
        <small>
          {active
            ? `${Math.ceil((game.closesAt - now) / 1000)} 秒`
            : {
                won: "挑战成功",
                failed: "挑战结束",
                refunded: "已退款",
                open: "结算中",
              }[game.status]}
        </small>
      </header>
      {game.item === "wish" ? (
        <>
          <progress max={100} value={total} />
          <small>共同筹集 {total}/100 币 · 未达标原额退回</small>
          {active && (
            <div className="party-bet-controls">
              <button
                onClick={() =>
                  act("contribute", String(Math.min(10, 100 - total)))
                }
                disabled={total >= 100}
              >
                捐 10 币
              </button>
              <Select
                aria-label="愿望演出"
                value={own ? (game.votes[own] ?? "eggWeather") : "eggWeather"}
                onValueChange={(v) => act("vote", v)}
              >
                {["eggWeather", "disco", "galaxy", "underwater"].map((id) => (
                  <option key={id} value={id}>
                    {partyItems[id as keyof typeof partyItems].name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </>
      ) : (
        <>
          {game.item === "boss" && (
            <>
              <progress max={20} value={20 - score} />
              <small>BOSS · {Math.max(0, 100 - score * 5)} HP</small>
            </>
          )}
          <small>
            {Object.keys(game.players).length} 位观众参与 · 至少两位才生效
          </small>
          {active &&
            observer &&
            (!joined ? (
              <button onClick={() => act("join")}>参加活动</button>
            ) : (
              <>
                {game.item === "coinGrab" && (
                  <div className="party-coin-grid">
                    {Array.from({ length: 20 }, (_, i) => (
                      <button
                        aria-label={`拾取金币 ${i + 1}`}
                        key={i}
                        disabled={game.coins.includes(i)}
                        onClick={() => act("collect", String(i))}
                      >
                        <Emoji text={game.coins.includes(i) ? "✨" : "🪙"} />
                      </button>
                    ))}
                  </div>
                )}
                {game.item === "boss" && (
                  <button
                    className="party-boss-button"
                    onClick={() => act("hit")}
                    disabled={score >= 20}
                  >
                    <Emoji text="👾" /> 攻击！
                  </button>
                )}
                {game.item === "relay" && (
                  <form
                    className="party-bet-controls"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act("say", text);
                      setText("");
                    }}
                  >
                    <input
                      maxLength={80}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      aria-label="接龙台词"
                    />
                    <button
                      disabled={
                        Object.keys(game.players)[
                          game.lines.length % Object.keys(game.players).length
                        ] !== own
                      }
                    >
                      接一句
                    </button>
                  </form>
                )}
              </>
            ))}
          {game.lines.map((line, i) => (
            <p key={i}>{line.text}</p>
          ))}
          {joined && <small>你的贡献：{game.players[own!]}</small>}
        </>
      )}
    </section>
  );
}
