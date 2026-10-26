import {
  expeditionDifficulties,
  type ExpeditionOptions,
} from "../../domain/expedition/adventure-types";
import { Select } from "../ui/Controls";
export function ExpeditionOptionsControl({
  value,
  onChange,
}: {
  value: ExpeditionOptions;
  onChange: (value: ExpeditionOptions) => void;
}) {
  return (
    <label className="setting-row">
      远征难度
      <Select
        aria-label="远征难度"
        value={value.difficulty}
        onValueChange={(difficulty) =>
          onChange({
            difficulty: difficulty as ExpeditionOptions["difficulty"],
          })
        }
      >
        {Object.entries(expeditionDifficulties).map(([id, config]) => (
          <option key={id} value={id}>
            {config.label}
            {config.multiplier !== 1
              ? ` · 敌人数值 ${Math.round(config.multiplier * 100)}%`
              : ""}
          </option>
        ))}
      </Select>
    </label>
  );
}
