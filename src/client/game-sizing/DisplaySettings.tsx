import type { Preferences } from "../preferences";
import { Button, Select, Slider, Switch } from "../ui/Controls";
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
      <label>
        手牌大小 · {Math.round(preferences.cardScale * 100)}%
        <Slider
          aria-label="手牌大小"
          min={0.85}
          max={1.6}
          step={0.05}
          value={preferences.cardScale}
          onValueChange={(cardScale) => update({ cardScale })}
        />
      </label>
      <Switch
        label="卡牌点击动画"
        checked={preferences.cardClickMotion}
        onCheckedChange={(cardClickMotion) => update({ cardClickMotion })}
      />
      <Switch
        label="显示帧率"
        checked={preferences.showFps}
        onCheckedChange={(showFps) => update({ showFps })}
      />
      <label className="setting-row">
        台球渲染
        <Select
          aria-label="台球渲染"
          value={preferences.poolRenderer}
          onValueChange={(poolRenderer) =>
            update({
              poolRenderer: poolRenderer as Preferences["poolRenderer"],
            })
          }
        >
          <option value="auto">自动（桌面 3D）</option>
          <option value="3d">3D</option>
          <option value="2d">2D</option>
        </Select>
      </label>
      <label className="setting-row">
        高尔夫渲染
        <Select
          aria-label="高尔夫渲染"
          value={preferences.golfRenderer}
          onValueChange={(golfRenderer) =>
            update({
              golfRenderer: golfRenderer as Preferences["golfRenderer"],
            })
          }
        >
          <option value="auto">自动（桌面 3D）</option>
          <option value="3d">3D</option>
          <option value="2d">2D</option>
        </Select>
      </label>
      <label className="setting-row">
        台球环境
        <Select
          aria-label="台球环境"
          value={preferences.poolEnvironment}
          onValueChange={(poolEnvironment) =>
            update({
              poolEnvironment: poolEnvironment as Preferences["poolEnvironment"],
            })
          }
        >
          <option value="midnight">午夜球房</option>
          <option value="arena">锦标赛舞台</option>
        </Select>
      </label>
      <label className="setting-row">
        高尔夫环境
        <Select
          aria-label="高尔夫环境"
          value={preferences.golfEnvironment}
          onValueChange={(golfEnvironment) =>
            update({
              golfEnvironment: golfEnvironment as Preferences["golfEnvironment"],
            })
          }
        >
          <option value="coast">海滨灯塔</option>
          <option value="forest">森林午后</option>
        </Select>
      </label>
      <label className="setting-row">
        3D 画质
        <Select
          aria-label="3D 画质"
          value={preferences.scene3dQuality}
          onValueChange={(scene3dQuality) =>
            update({
              scene3dQuality: scene3dQuality as Preferences["scene3dQuality"],
            })
          }
        >
          <option value="high">高（后处理 · 精细阴影）</option>
          <option value="balanced">均衡（推荐）</option>
          <option value="performance">流畅（关闭后处理）</option>
        </Select>
      </label>
      <p className="muted">自动模式在桌面启用 3D，WebGL 不可用时回退 2D。</p>
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
