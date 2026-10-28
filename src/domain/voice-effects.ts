import { z } from "zod";
export const voiceEffects = {
  original: "原声",
  helium: "氦气声",
  "octave-up": "升八度",
  "octave-down": "降八度",
  robot: "机器人",
  telephone: "老电话",
  radio: "对讲机",
  chorus: "合唱",
  cave: "洞穴回声",
  underwater: "水下声音",
  custom: "自定义音高",
} as const;
export const voiceEffectSchema = z.object({
  preset: z
    .enum(
      Object.keys(voiceEffects) as [
        keyof typeof voiceEffects,
        ...(keyof typeof voiceEffects)[],
      ],
    )
    .default("original"),
  amount: z.number().min(0).max(1).default(1),
  pitch: z.number().min(-12).max(12).default(0),
});
export type VoiceEffect = z.infer<typeof voiceEffectSchema>;
export function effectParameters(effect: VoiceEffect) {
  const preset = effect.preset;
  return {
    semitones:
      preset === "helium"
        ? 7
        : preset === "octave-up"
          ? 12
          : preset === "octave-down"
            ? -12
            : preset === "custom"
              ? effect.pitch
              : 0,
    wet: preset === "original" ? 0 : effect.amount,
    filter: (preset === "helium"
      ? "highshelf"
      : preset === "telephone" || preset === "radio"
        ? "bandpass"
        : preset === "underwater"
          ? "lowpass"
          : "allpass") as BiquadFilterType,
    frequency:
      preset === "helium" ? 1200 : preset === "underwater" ? 650 : 1500,
    distortion: preset === "radio" ? 2.5 : 0,
    delay: preset === "cave" ? 0.18 : preset === "chorus" ? 0.022 : 0,
    feedback: preset === "cave" ? 0.22 : preset === "chorus" ? 0.12 : 0,
    modulation:
      preset === "robot"
        ? 40
        : preset === "chorus"
          ? 1.7
          : preset === "underwater"
            ? 0.65
            : 0,
  };
}
export const voiceStretchParameters = {
  sequenceMs: 30,
  seekWindowMs: 10,
  overlapMs: 8,
  quickSeek: true,
} as const;
export const voiceInterpolationStrategy = "lanczos" as const;
