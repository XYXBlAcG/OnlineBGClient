import { Switch } from "./ui/Controls";
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
      <Switch
        label="界面动画"
        checked={preferences.motion}
        onCheckedChange={(motion) => onChange({ ...preferences, motion })}
      />
      <Switch
        label="增强游戏动画"
        checked={preferences.enhancedGameMotion}
        onCheckedChange={(enhancedGameMotion) =>
          onChange({ ...preferences, enhancedGameMotion })
        }
      />
    </div>
  );
}
