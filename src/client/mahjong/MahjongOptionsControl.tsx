import type { MahjongOptions } from "../../domain/mahjong/types";
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
        四川麻将封顶
        <Select
          aria-label="四川麻将封顶"
          value={value.cap}
          onValueChange={(cap) =>
            onChange({ ...value, cap: Number(cap) as MahjongOptions["cap"] })
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
  );
}
