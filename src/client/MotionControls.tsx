import type { Preferences } from "./preferences";
export type MotionPreferences = Pick<
  Preferences,
  "motion" | "enhancedGameMotion"
>;
export function MotionControls({
  preferences,
  onChange,
}: {
  preferences: MotionPreferences;
  onChange: (preferences: MotionPreferences) => void;
}) {
  return (
    <div className="motion-controls">
      <label className="checkbox">
        <input
          type="checkbox"
          checked={preferences.motion}
          onChange={(event) =>
            onChange({ ...preferences, motion: event.target.checked })
          }
        />
        界面动画
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={preferences.enhancedGameMotion}
          onChange={(event) =>
            onChange({
              ...preferences,
              enhancedGameMotion: event.target.checked,
            })
          }
        />
        游戏动画
      </label>
      <p className="muted">未勾选：当前版；勾选：增强版</p>
    </div>
  );
}
