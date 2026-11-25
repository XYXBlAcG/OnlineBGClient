import { checkersModeChoices } from "../../domain/setup-choices";
import type { CheckersOptions } from "../../domain/checkers";
import { RadioChoice } from "../ui/Controls";

export function CheckersOptionsControl({
  value,
  onChange,
}: {
  value: CheckersOptions;
  onChange: (value: CheckersOptions) => void;
}) {
  return (
    <RadioChoice
      label="跳棋玩法"
      value={value.mode}
      onValueChange={(mode) => onChange({ mode })}
      options={checkersModeChoices}
    />
  );
}
