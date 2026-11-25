import { golfDifficulties, type GolfDifficulty } from "../../domain/golf/types";
import { Select } from "../ui/Controls";

export function GolfDifficultyControl({ value, onChange }: {
  value: GolfDifficulty;
  onChange: (difficulty: GolfDifficulty) => void;
}) {
  return (
    <label className="setting-row">
      球场难度
      <Select aria-label="球场难度" value={value} onValueChange={(next) => {
        const difficulty = golfDifficulties.find((item) => item === next);
        if (difficulty) onChange(difficulty);
      }}>
        <option value="standard">标准</option>
        <option value="challenge">挑战</option>
      </Select>
    </label>
  );
}
