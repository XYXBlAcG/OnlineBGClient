import { Select, Slider } from "../ui/Controls";
import { voiceEffects, type VoiceEffect } from "../../domain/voice-effects";
export function VoiceEffectControls({
  value,
  onChange,
  compact = false,
}: {
  value: VoiceEffect;
  onChange: (value: VoiceEffect) => void;
  compact?: boolean;
}) {
  return (
    <div className="voice-effect-controls" role="group" aria-label="变声器">
      {compact ? <span>变声</span> : <strong>变声器</strong>}
      <Select
        aria-label="变声效果"
        value={value.preset}
        onValueChange={(preset) =>
          onChange({ ...value, preset: preset as VoiceEffect["preset"] })
        }
      >
        {Object.entries(voiceEffects).map(([key, name]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </Select>
      {!compact && (
        <>
          <label>
            效果强度 · {Math.round(value.amount * 100)}%
            <Slider
              aria-label="变声效果强度"
              value={value.amount}
              min={0}
              max={1}
              step={0.05}
              onValueChange={(amount) => onChange({ ...value, amount })}
            />
          </label>
          <label>
            自定义音高 · {value.pitch > 0 ? "+" : ""}
            {value.pitch} 半音
            <Slider
              aria-label="变声音高"
              value={value.pitch}
              min={-12}
              max={12}
              step={1}
              onValueChange={(pitch) =>
                onChange({ ...value, pitch, preset: "custom" })
              }
            />
          </label>
          <small>
            开麦后发送变声；测试麦克风时开启耳返可试听。±12
            半音为一个八度，语速不变。
          </small>
        </>
      )}
      {value.preset !== "original" && (
        <button
          type="button"
          onClick={() => onChange({ ...value, preset: "original" })}
        >
          恢复原声
        </button>
      )}
    </div>
  );
}
