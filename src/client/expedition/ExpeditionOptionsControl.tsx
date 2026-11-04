import {
  expeditionDifficulties,
  type ResolvedExpeditionOptions,
} from "../../domain/expedition/adventure-types";
import { ascensionLevels } from "../../domain/expedition/ascension";
import { Select } from "../ui/Controls";
export const expeditionAiDifficultyNames = {
  easy: "能力较弱",
  normal: "能力中等",
  hard: "能力较强",
} as const;
type ExpeditionOptionValue = {
  difficulty: ResolvedExpeditionOptions["difficulty"];
  ascension: number;
};
export function ExpeditionOptionsControl({
  value,
  onChange,
}: {
  value: ExpeditionOptionValue;
  onChange: (value: ExpeditionOptionValue) => void;
}) {
  const ascension = value.ascension ?? 0;
  const level = ascensionLevels[ascension];
  return (
    <>
      <label className="setting-row">
        远征难度
        <Select
          aria-label="远征难度"
          value={value.difficulty}
          onValueChange={(difficulty) =>
            onChange({
              ...value,
              difficulty: difficulty as ExpeditionOptionValue["difficulty"],
            })
          }
        >
          {Object.entries(expeditionDifficulties).map(([id, config]) => (
            <option key={id} value={id}>
              {config.label}
              {` · 敌人数值 ${Math.round(config.multiplier * 100)}%`}
            </option>
          ))}
        </Select>
      </label>
      <label className="setting-row">
        进阶阶位
        <Select
          aria-label="远征进阶阶位"
          value={String(ascension)}
          onValueChange={(next) =>
            onChange({ ...value, ascension: Number(next) })
          }
        >
          {ascensionLevels.map((item) => (
            <option key={item.level} value={item.level}>
              {item.name}
            </option>
          ))}
        </Select>
      </label>
      <div className="exp-ascension-summary">
        {level.penalties.length > 0 && (
          <p>
            <strong>负面</strong> {level.penalties.join("；")}
          </p>
        )}
        {level.boosts.length > 0 && (
          <p>
            <strong>补偿</strong> {level.boosts.join("；")}
          </p>
        )}
      </div>
    </>
  );
}
