import type { Preferences } from "../preferences";
import { Slider } from "../ui/Controls";
import type { GameSizing } from "./model";

export function GameSizeSettings({
  preferences,
  info,
  onChange,
}: {
  preferences: Preferences;
  info: GameSizing;
  onChange: (value: Preferences) => void;
}) {
  const update = (value: number) =>
    onChange({
      ...preferences,
      gameSizes: {
        ...preferences.gameSizes,
        [info.profile]: Math.max(info.min, Math.min(info.max, value)),
      },
    });
  return (
    <section className="settings-section">
      <h3>游戏显示</h3>
      <label>
        游戏元素大小 · {Math.round(info.scale * 100)}%
        <Slider
          aria-label="游戏元素大小"
          min={info.min}
          max={info.max}
          step={0.05}
          value={info.scale}
          disabled={!info.profile}
          onValueChange={update}
        />
      </label>
      <p className="muted">
        当前可调 {Math.round(info.min * 100)}%–{Math.round(info.max * 100)}% ·
        按本机显示配置保存
      </p>
      {info.requested > info.max && (
        <p className="muted">
          当前窗口空间不足，已临时使用 {Math.round(info.scale * 100)}
          %。扩大窗口后恢复。
        </p>
      )}
      <button
        disabled={!info.profile || (info.scale === 1 && info.requested === 1)}
        onClick={() => update(1)}
      >
        恢复 100%
      </button>
    </section>
  );
}
