class PoolAudio {
  private context: AudioContext | null = null;
  private volume = 0.5;
  private enabled = true;
  private lastPocket = 0;
  private lastBallImpact = 0;
  private lastRailImpact = 0;

  configure(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
  }

  async unlock(): Promise<void> {
    if (!this.enabled || typeof AudioContext === "undefined") return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      this.context = null;
    }
  }

  strike(power: number) {
    this.tone(
      "triangle",
      180 + power * 60,
      72,
      0.1,
      (0.04 + power * 0.06) * this.volume,
    );
  }

  pocket() {
    if (!this.volume) return;
    const now = performance.now();
    if (now - this.lastPocket < 90) return;
    this.lastPocket = now;
    this.tone("sine", 165, 58, 0.2, 0.055 * this.volume);
  }

  impact(kind: "ball" | "rail", intensity: number) {
    if (!this.volume || intensity <= 0) return;
    const now = performance.now();
    if (kind === "ball") {
      if (now - this.lastBallImpact < 28) return;
      this.lastBallImpact = now;
      this.tone(
        "triangle",
        720 + intensity * 380,
        420,
        0.045,
        (0.018 + intensity * 0.035) * this.volume,
      );
      return;
    }
    if (now - this.lastRailImpact < 35) return;
    this.lastRailImpact = now;
    this.tone("sine", 260, 120, 0.07, (0.016 + intensity * 0.03) * this.volume);
  }

  private tone(
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    volume: number,
  ) {
    const context = this.context;
    if (!context || context.state !== "running" || !this.enabled || !volume)
      return;
    try {
      const start = context.currentTime,
        oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, start);
      oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch {
      this.context = null;
    }
  }
}

export const poolAudio = new PoolAudio();
