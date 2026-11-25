import { drawModeChoices } from "../../domain/setup-choices";
import type { DrawMode } from "../../domain/drawguess/types";
import { Select } from "../ui/Controls";

export function DrawModeControl({
  value,
  onChange,
}: { value: DrawMode; onChange: (mode: DrawMode) => void }) {
  return (
    <label className="setting-row">
      玩法
      <Select aria-label="你画我猜玩法" value={value} onValueChange={(mode) => {
        const choice = drawModeChoices.find(({ value }) => value === mode);
        if (choice) onChange(choice.value);
      }}>
        {drawModeChoices.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>
    </label>
  );
}
