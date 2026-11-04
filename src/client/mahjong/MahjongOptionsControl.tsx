import {
  mahjongModeNames,
  type MahjongOptions,
} from "../../domain/mahjong/types";
import { Select } from "../ui/Controls";
export function MahjongOptionsControl({
  value,
  onChange,
}: {
  value: MahjongOptions;
  onChange: (value: MahjongOptions) => void;
}) {
  return (
    <>
      <label className="setting-row">
        麻将模式
        <Select
          aria-label="麻将模式"
          value={value.mode ?? "sichuan"}
          onValueChange={(mode) =>
            onChange({
              ...value,
              mode: mode === "washizu" ? "washizu" : "sichuan",
            })
          }
        >
          {Object.entries(mahjongModeNames).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>
      </label>
      {value.mode !== "washizu" && (
        <>
          <label className="setting-row">
            四川麻将封顶
            <Select
              aria-label="四川麻将封顶"
              value={value.cap}
              onValueChange={(cap) =>
                onChange({
                  ...value,
                  cap: Number(cap) as MahjongOptions["cap"],
                })
              }
            >
              {[3, 4, 5].map((cap) => (
                <option key={cap} value={cap}>
                  {cap} 番
                </option>
              ))}
            </Select>
          </label>
          <label className="setting-row">
            自摸计分
            <Select
              aria-label="自摸计分"
              value={value.selfDraw}
              onValueChange={(selfDraw) =>
                onChange({
                  ...value,
                  selfDraw: selfDraw as MahjongOptions["selfDraw"],
                })
              }
            >
              <option value="base">加底</option>
              <option value="fan">加番</option>
            </Select>
          </label>
        </>
      )}
    </>
  );
}
