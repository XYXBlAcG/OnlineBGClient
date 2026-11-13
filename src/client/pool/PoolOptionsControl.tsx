import type { PoolOptions } from "../../domain/pool/types";
import { Select } from "../ui/Controls";

export function PoolOptionsControl({
  value,
  onChange,
}: {
  value: PoolOptions;
  onChange: (value: PoolOptions) => void;
}) {
  return (
    <>
      <label className="setting-row">
        玩法
        <Select
          aria-label="台球玩法"
          value={value.mode}
          onValueChange={(mode) =>
            onChange({ ...value, mode: mode as PoolOptions["mode"] })
          }
        >
          <option value="eight-ball">8 球</option>
          <option value="nine-ball">9 球</option>
          <option value="party">派对台球（3–4 人）</option>
        </Select>
      </label>
      <label className="setting-row">
        击球时限
        <Select
          aria-label="台球击球时限"
          value={String(value.shotSeconds)}
          onValueChange={(seconds) =>
            onChange({
              ...value,
              shotSeconds: Number(seconds) as 0 | 45 | 60 | 90,
            })
          }
        >
          <option value="0">不限时</option>
          <option value="45">45 秒</option>
          <option value="60">60 秒</option>
          <option value="90">90 秒</option>
        </Select>
      </label>
    </>
  );
}
