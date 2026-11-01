import type { Preferences } from "../preferences";
import { Select, Switch } from "../ui/Controls";
export function PartySettings({
  preferences,
  onChange,
}: {
  preferences: Preferences;
  onChange: (p: Preferences) => void;
}) {
  const policy = preferences.party;
  return (
    <fieldset className="party-settings">
      <legend>房间派对</legend>
      <Switch
        label="创建房间时自动开启派对"
        checked={policy.autoEnable}
        onCheckedChange={(autoEnable) =>
          onChange({ ...preferences, party: { ...policy, autoEnable } })
        }
      />
      <label>
        本机演出质量
        <Select
          aria-label="派对演出质量"
          value={policy.quality}
          onValueChange={(quality) =>
            onChange({
              ...preferences,
              party: { ...policy, quality: quality as typeof policy.quality },
            })
          }
        >
          <option value="auto">自动（手机精简，电脑高画质）</option>
          <option value="light">轻量</option>
          <option value="high">高画质</option>
          <option value="ultra">极致 · 更密集粒子</option>
          <option value="text">仅显示文字</option>
        </Select>
      </label>
      <label>
        特效帧率
        <Select
          aria-label="派对特效帧率"
          value={policy.fps}
          onValueChange={(fps) =>
            onChange({
              ...preferences,
              party: { ...policy, fps: Number(fps) as typeof policy.fps },
            })
          }
        >
          {[0, 60, 120, 144, 165, 240].map((fps) => (
            <option key={fps} value={fps}>
              {fps === 0 ? "跟随屏幕 · 不限帧率" : `${fps} FPS`}
            </option>
          ))}
        </Select>
      </label>
    </fieldset>
  );
}
