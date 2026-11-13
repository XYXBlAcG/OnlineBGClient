import {
  expeditionDifficulties,
  type ResolvedExpeditionOptions,
} from "../../domain/expedition/adventure-types";
import { ascensionLevels } from "../../domain/expedition/ascension";
import {
  legacyEffectLines,
  legacyNodes as legacyCatalog,
  legacyProfile,
  type LegacyNodeId,
} from "../../domain/expedition/legacy";
import type { ExpeditionJournal } from "../../domain/expedition/journal";
import { Select, Switch } from "../ui/Controls";
import "./journal.css";
export const expeditionAiDifficultyNames = {
  easy: "能力较弱",
  normal: "能力中等",
  hard: "能力较强",
} as const;
type ExpeditionOptionValue = {
  difficulty: ResolvedExpeditionOptions["difficulty"];
  ascension: number;
  advanced?: boolean;
  legacy: LegacyNodeId[];
};
export function ExpeditionOptionsControl({
  value,
  onChange,
  journal,
}: {
  value: ExpeditionOptionValue;
  onChange: (value: ExpeditionOptionValue) => void;
  journal?: ExpeditionJournal;
}) {
  const ascension = value.ascension ?? 0,
    level = ascensionLevels[ascension],
    legacyNodes = journal?.legacy ?? value.legacy ?? [],
    legacy = legacyProfile(legacyNodes),
    legacyLines = legacyEffectLines({
      ...legacy,
      campHealing: legacy.campHealing - 1,
    });
  return (
    <>
      <Switch
        label="进阶机制：协作契约、机关与罗盘补给"
        checked={value.advanced ?? false}
        onCheckedChange={(advanced) => onChange({ ...value, advanced })}
      />
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
      <div className="exp-legacy-summary">
        <div>
          <strong>远征传承</strong>
          <span>
            {legacyNodes.length} / {legacyCatalog.length}
          </span>
        </div>
        <p>{legacyLines.join(" · ") || "尚未解锁传承，前往远征档案研究。"}</p>
        <small>
          {journal
            ? "来自房主档案，自动带入本局，全队生效。"
            : "创建房间时读取房主档案。"}
        </small>
      </div>
    </>
  );
}
