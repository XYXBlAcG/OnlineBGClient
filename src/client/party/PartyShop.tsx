import { useRef, useState } from "react";
import type { Snapshot } from "../../domain/protocol";
import {
  partyItems,
  type PartyAction,
  type PartyCategory,
  type PartyContext,
  type PartyItemId,
} from "../../domain/party";
import { Emoji } from "../Emoji";
import { Select } from "../ui/Controls";
import { preparePartyPurchase, type PartySelection } from "./purchase";
export function PartyShop({
  snapshot,
  context,
  actor,
  voiceReady,
  onSend,
}: {
  snapshot: Snapshot;
  context: PartyContext;
  actor: number;
  voiceReady: boolean;
  onSend: (action: PartyAction) => void;
}) {
  const [category, setCategory] = useState<PartyCategory>("轰炸"),
    [selection, setSelection] = useState<PartySelection>(),
    [target, setTarget] = useState("table");
  const sent = useRef(false),
    selected = preparePartyPurchase(
      selection,
      snapshot,
      context,
      actor,
      target,
      voiceReady,
    );
  const choices: { key: string; selection: PartySelection }[] = (
    Object.entries(partyItems) as [
      PartyItemId,
      (typeof partyItems)[PartyItemId],
    ][]
  )
    .filter(
      ([, item]) =>
        item.category === category &&
        (!item.game || item.game === snapshot.kind),
    )
    .map(([id]) => ({
      key: id,
      selection: { type: "builtin" as const, item: id },
    }));
  return (
    <section className="party-composer" aria-label="选择并发送派对特效">
      <nav className="party-categories" aria-label="派对商品分类">
        {(["轰炸", "场景", "装扮", "装备", "观众"] as PartyCategory[]).map(
          (c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ),
        )}
      </nav>
      <div className="party-shop">
        {choices.map((choice) => {
          const prepared = preparePartyPurchase(
            choice.selection,
            snapshot,
            context,
            actor,
            target,
            voiceReady,
          )!;
          const chosen =
            JSON.stringify(selection) === JSON.stringify(choice.selection);
          return (
            <button
              key={choice.key}
              className="party-shop-card"
              aria-pressed={chosen}
              title={prepared.description}
              onClick={() => {
                sent.current = false;
                setSelection(choice.selection);
              }}
            >
              <span className="party-item-icon">
                <Emoji text={prepared.emoji} />
              </span>
              <strong>{prepared.name}</strong>
              <span>{prepared.description}</span>
              <small>
                {prepared.equipped
                  ? "本局装备"
                  : `${prepared.duration / 1000} 秒演出`}{" "}
                · {prepared.price} 币
              </small>
              {prepared.issue && <small>{prepared.issue}</small>}
            </button>
          );
        })}
      </div>
      <footer className="party-send-bar">
        {!selected ? (
          <p role="status">先选择特效，再选择对象并确认发送。</p>
        ) : (
          <>
            <div className="party-selection-summary">
              <strong>
                <Emoji text={selected.emoji} /> {selected.name}
              </strong>
              <span>{selected.description}</span>
              <small>
                {selected.equipped
                  ? "装备持续本局，实际游戏动作发生时触发"
                  : `演出 ${selected.duration / 1000} 秒`}{" "}
                · {selected.price} 币
              </small>
            </div>
            {selected.self ? (
              <span>使用对象：自己</span>
            ) : selected.all ? (
              <span>互动对象：全桌</span>
            ) : (
              <label>
                互动对象
                <Select
                  aria-label="特效发送对象"
                  value={target}
                  onValueChange={setTarget}
                >
                  <option value="table">全桌（包括自己）</option>
                  {snapshot.seats
                    .filter((s) => s.name)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </label>
            )}
            {selected.issue && <small role="status">{selected.issue}</small>}
            <button
              className="primary"
              disabled={!!selected.issue}
              onClick={() => {
                if (sent.current || selected.issue) return;
                sent.current = true;
                onSend(selected.action);
              }}
            >
              {selected.equipped ? "确认装备" : "确认发送"} · {selected.price}{" "}
              币
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
