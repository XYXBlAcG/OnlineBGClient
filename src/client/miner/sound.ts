type SoundKind =
  | "drop"
  | "catch"
  | "special"
  | "tnt"
  | "spin"
  | "gamble"
  | "win"
  | "lose";

let context: AudioContext | null = null;

const tones: Record<SoundKind, [number, number, OscillatorType]> = {
  drop: [320, 0.08, "triangle"],
  catch: [760, 0.16, "sine"],
  special: [520, 0.3, "sawtooth"],
  tnt: [90, 0.4, "square"],
  spin: [600, 0.18, "triangle"],
  gamble: [430, 0.22, "sawtooth"],
  win: [880, 0.5, "sine"],
  lose: [180, 0.45, "triangle"],
};

export function playMinerSound(kind: SoundKind): void {
  if (typeof window === "undefined") return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const [frequency, duration, type] = tones[kind];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration,
    );
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  } catch {}
}
