import { balance, battlefields } from "../../domain/graphwar/balance";
import type { GraphwarOptions } from "../../domain/graphwar/types";
import { graphwarModes, graphwarMaps } from "../../domain/graphwar/types";
import { Select, Switch } from "../ui/Controls";
export function GraphwarOptionsControl({
  value,
  onChange,
}: {
  value: GraphwarOptions;
  onChange: (options: GraphwarOptions) => void;
}) {
  return (
    <>
      <label className="setting-row">
        函数战玩法
        <Select
          aria-label="函数战玩法"
          value={value.mode}
          onValueChange={(mode) =>
            onChange({ ...value, mode: mode as GraphwarOptions["mode"] })
          }
        >
          {Object.entries(graphwarModes).map(([key, mode]) => (
            <option key={key} value={key}>
              {mode.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="setting-row">
        战场
        <Select
          aria-label="Graphwar 战场"
          value={value.map}
          onValueChange={(map) =>
            onChange({ ...value, map: map as GraphwarOptions["map"] })
          }
        >
          {Object.entries(graphwarMaps).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </Select>
      </label>
      <label className="setting-row">
        地图尺寸
        <Select
          aria-label="Graphwar 地图尺寸"
          value={value.size}
          onValueChange={(size) =>
            onChange({ ...value, size: size as GraphwarOptions["size"] })
          }
        >
          {Object.entries(battlefields).map(([key, size]) => (
            <option value={key} key={key}>
              {size.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="setting-row">
        每人士兵
        <Select
          aria-label="每人士兵"
          value={value.soldiers}
          onValueChange={(soldiers) =>
            onChange({ ...value, soldiers: Number(soldiers) })
          }
        >
          {Array.from({ length: balance.maxSoldiers }, (_, i) => i + 1).map(
            (n) => (
              <option key={n} value={n}>
                {n} 名
              </option>
            ),
          )}
        </Select>
      </label>
      <label className="setting-row">
        每回合
        <Select
          aria-label="Graphwar 回合时间"
          value={value.turnSeconds}
          onValueChange={(seconds) =>
            onChange({
              ...value,
              turnSeconds: Number(seconds) as GraphwarOptions["turnSeconds"],
            })
          }
        >
          {[45, 60, 90, 0].map((n) => (
            <option key={n} value={n}>
              {n ? `${n} 秒` : "不限时"}
            </option>
          ))}
        </Select>
      </label>
      <Switch
        label="允许弹道预览"
        checked={value.preview}
        onCheckedChange={(preview) => onChange({ ...value, preview })}
      />
    </>
  );
}
