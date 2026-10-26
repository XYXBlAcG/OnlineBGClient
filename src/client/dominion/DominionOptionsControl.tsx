import {
  cardDefinition,
  firstKingdom,
  kingdomCards,
} from "../../domain/dominion/cards";
import type { DominionOptions } from "../../domain/dominion/types";
import { Select } from "../ui/Controls";
export function DominionOptionsControl({
  value,
  onChange,
}: {
  value: DominionOptions;
  onChange: (options: DominionOptions) => void;
}) {
  return (
    <>
      <label className="setting-row">
        王国组合
        <Select
          aria-label="领土王国组合"
          value={value.mode}
          onValueChange={(mode) =>
            onChange({
              mode: mode as DominionOptions["mode"],
              kingdom:
                value.kingdom.length === 10 ? value.kingdom : [...firstKingdom],
            })
          }
        >
          <option value="first">首局推荐</option>
          <option value="random">随机十种</option>
          <option value="custom">自选十种</option>
        </Select>
      </label>
      {value.mode === "custom" && (
        <fieldset className="dominion-options">
          <legend>王国卡 · {value.kingdom.length}/10</legend>
          {kingdomCards.map((card) => (
            <label key={card} title={cardDefinition(card).text}>
              <input
                type="checkbox"
                checked={value.kingdom.includes(card)}
                disabled={
                  value.kingdom.length >= 10 && !value.kingdom.includes(card)
                }
                onChange={(event) =>
                  onChange({
                    ...value,
                    kingdom: event.target.checked
                      ? [...value.kingdom, card]
                      : value.kingdom.filter((id) => id !== card),
                  })
                }
              />
              {cardDefinition(card).name}{" "}
              <small>{cardDefinition(card).cost}</small>
            </label>
          ))}
        </fieldset>
      )}
    </>
  );
}
