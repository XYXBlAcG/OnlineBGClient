import type { Preferences } from "../preferences";
import { Button, Slider, Switch } from "../ui/Controls";
import type { GameSizing } from "./model";

export function DisplaySettings({
  preferences,
  info,
  onChange,
}: {
  preferences: Preferences;
  info: GameSizing;
  onChange: (value: Preferences) => void;
}) {
  const update = (patch: Partial<Preferences>) =>
    onChange({ ...preferences, ...patch });
  const updateGameSize = (value: number) =>
    update({
      gameSizes: {
        ...preferences.gameSizes,
        [info.profile]: Math.max(info.min, Math.min(info.max, value)),
      },
    });
  const preset = (scale: number) =>
    update({ uiFontScale: scale, uiScale: scale });
  return (
    <section className="settings-section">
      <h3>界面显示</h3>
      <label>
        界面字体大小 · {Math.round(preferences.uiFontScale * 100)}%
        <Slider
          aria-label="界面字体大小"
          min={0.9}
          max={1.2}
          step={0.01}
          value={preferences.uiFontScale}
          onValueChange={(uiFontScale) => update({ uiFontScale })}
        />
      </label>
      <label>
        界面元素大小 · {Math.round(preferences.uiScale * 100)}%
        <Slider
          aria-label="界面元素大小"
          min={1}
          max={1.25}
          step={0.01}
          value={preferences.uiScale}
          onValueChange={(uiScale) => update({ uiScale })}
        />
      </label>
      <div className="display-presets">
        <Button
          aria-pressed={
            preferences.uiFontScale === 1 && preferences.uiScale === 1
          }
          onClick={() => preset(1)}
        >
          标准
        </Button>
        <Button
          aria-pressed={
            preferences.uiFontScale === 1.05 && preferences.uiScale === 1.05
          }
          onClick={() => preset(1.05)}
        >
          舒适
        </Button>
        <Button
          aria-pressed={
            preferences.uiFontScale === 1.1 && preferences.uiScale === 1.1
          }
          onClick={() => preset(1.1)}
        >
          大
        </Button>
      </div>
      <Switch
        label="显示帧率"
        checked={preferences.showFps}
        onCheckedChange={(showFps) => update({ showFps })}
      />
      <h4>牌桌元素</h4>
      <label>
        牌桌元素大小 · {Math.round(info.scale * 100)}%
        <Slider
          aria-label="牌桌元素大小"
          min={info.min}
          max={info.max}
          step={0.001}
          value={info.scale}
          disabled={!info.profile}
          onValueChange={updateGameSize}
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
      <div className="display-presets">
        <Button
          disabled={
            preferences.uiFontScale === 1 &&
            preferences.uiScale === 1 &&
            (!info.profile || (info.scale === 1 && info.requested === 1))
          }
          onClick={() => {
            preset(1);
            updateGameSize(1);
          }}
        >
          恢复默认
        </Button>
      </div>
    </section>
  );
}
