import { minerModes } from "../../domain/miner/content";
import type { MinerMode, MinerOptions } from "../../domain/miner/types";
import { Select } from "../ui/Controls";

export function MinerOptionsControl({
  value,
  onChange,
}: {
  value: MinerOptions;
  onChange: (value: MinerOptions) => void;
}) {
  return (
    <label className="setting-row">
      模式
      <Select
        aria-label="黄金矿脉模式"
        value={value.mode}
        onValueChange={(mode) =>
          onChange({ ...value, mode: mode as MinerMode })
        }
      >
        {Object.entries(minerModes).map(([id, mode]) => (
          <option key={id} value={id}>
            {mode.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
