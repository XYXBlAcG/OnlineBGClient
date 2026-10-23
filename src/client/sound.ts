export type Cue =
  "message" | "turn" | "phase" | "finish" | "reject" | "interaction";
const notes: Record<Cue, number[]> = {
  message: [680],
  turn: [523, 784],
  phase: [440, 554],
  finish: [523, 659, 784],
  reject: [220, 165],
  interaction: [740],
};
export class CuePlayer {
  private context: AudioContext | null = null;
  private lastAt = -Infinity;
  private volume = 0.5;
  constructor(private create: () => AudioContext = () => new AudioContext()) {}
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }
  async unlock(): Promise<void> {
    this.context ??= this.create();
    if (this.context.state === "suspended") await this.context.resume();
  }
  play(kind: Cue, volume = this.volume): void {
    if (!volume || (typeof document !== "undefined" && document.hidden)) return;
    const context = this.context;
    if (
      !context ||
      context.state !== "running" ||
      context.currentTime - this.lastAt < 0.25
    )
      return;
    this.lastAt = context.currentTime;
    notes[kind].forEach((note, index) => {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      const start = context.currentTime + index * 0.1;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.value = note;
      gain.gain.setValueAtTime(0.055 * volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      oscillator.start(start);
      oscillator.stop(start + 0.15);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
}
export const cuePlayer = new CuePlayer();
