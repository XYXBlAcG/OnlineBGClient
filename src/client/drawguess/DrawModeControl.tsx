import { drawModeChoices } from "../../domain/setup-choices";
import type { DrawMode } from "../../domain/drawguess/types";
import { Select } from "../ui/Controls";

const drawingSecondsChoices = [45, 60, 75, 90, 120, 150, 180];

export function DrawModeControl({
  value,
  onChange,
  drawingSeconds = 75,
  onDrawingSecondsChange,
  wordSource = "all",
  onWordSourceChange,
}: {
  value: DrawMode;
  onChange: (mode: DrawMode) => void;
  drawingSeconds?: number;
  onDrawingSecondsChange?: (seconds: number) => void;
  wordSource?: "all" | "custom";
  onWordSourceChange?: (source: "all" | "custom") => void;
}) {
  return (
    <>
      <label className="setting-row">
        玩法
        <Select
          aria-label="你画我猜玩法"
          value={value}
          onValueChange={(mode) => {
            const choice = drawModeChoices.find(({ value }) => value === mode);
            if (choice) onChange(choice.value);
          }}
        >
          {drawModeChoices.map(({ value: option, label }) => (
            <option key={option} value={option}>{label}</option>
          ))}
        </Select>
      </label>
      {value === "classic" && (
        <>
          <label className="setting-row">
            绘图用时
            <Select
              aria-label="绘图用时"
              value={String(drawingSeconds)}
              onValueChange={(seconds) => onDrawingSecondsChange?.(Number(seconds))}
            >
              {drawingSecondsChoices.map((seconds) => (
                <option key={seconds} value={String(seconds)}>{seconds} 秒</option>
              ))}
            </Select>
          </label>
          <label className="setting-row">
            题词来源
            <Select
              aria-label="题词来源"
              value={wordSource}
              onValueChange={(source) => onWordSourceChange?.(source === "custom" ? "custom" : "all")}
            >
              <option value="all">系统词 + 我的词库</option>
              <option value="custom">只用我的词库</option>
            </Select>
          </label>
        </>
      )}
    </>
  );
}
