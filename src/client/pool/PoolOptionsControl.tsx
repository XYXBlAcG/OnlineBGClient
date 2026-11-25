import { poolModeChoices, poolTimeChoices } from "../../domain/setup-choices";
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
          {poolModeChoices.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
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
          {poolTimeChoices.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </label>
    </>
  );
}
