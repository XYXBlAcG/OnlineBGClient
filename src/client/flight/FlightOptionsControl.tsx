import type { FlightOptions } from "../../domain/flight";
import { RadioChoice } from "../ui/Controls";

export function FlightOptionsControl({
  value,
  onChange,
}: {
  value: FlightOptions;
  onChange: (value: FlightOptions) => void;
}) {
  return (
    <RadioChoice
      label="飞行棋玩法"
      value={value.mode}
      onValueChange={(mode) => onChange({ mode })}
      options={[
        { value: "classic", label: "经典航线" },
        { value: "storm", label: "风暴航线" },
      ]}
    />
  );
}
