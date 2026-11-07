import {
  mahjongModeNames,
  type MahjongOptions,
} from "../../domain/mahjong/types";
import { RadioChoice, Select } from "../ui/Controls";
export function MahjongOptionsControl({
  value,
  onChange,
}: {
  value: MahjongOptions;
  onChange: (value: MahjongOptions) => void;
}) {
  return (
    <>
      <RadioChoice
        label="麻将模式"
        value={value.mode ?? "sichuan"}
        onValueChange={(mode) => onChange({ ...value, mode })}
        options={Object.entries(mahjongModeNames).map(([id, label]) => ({
          value: id as NonNullable<MahjongOptions["mode"]>,
          label,
        }))}
      />
      {(!value.mode || value.mode === "sichuan") && (
        <>
          <label className="setting-row">
            四川麻将封顶
            <Select
              aria-label="四川麻将封顶"
              value={value.cap}
              onValueChange={(cap) =>
                onChange({
                  ...value,
                  cap: Number(cap) as MahjongOptions["cap"],
                })
              }
            >
              {[3, 4, 5].map((cap) => (
                <option key={cap} value={cap}>
                  {cap} 番
                </option>
              ))}
            </Select>
          </label>
          <RadioChoice
            label="自摸计分"
            value={value.selfDraw}
            onValueChange={(selfDraw) => onChange({ ...value, selfDraw })}
            options={[
              { value: "base", label: "加底" },
              { value: "fan", label: "加番" },
            ]}
          />
        </>
      )}
    </>
  );
}
