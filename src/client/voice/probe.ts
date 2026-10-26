export class MicrophoneProbe {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  async start(
    input: string,
    loopback: boolean,
    onLevel: (level: number) => void,
  ) {
    this.stop();
    const generation = this.generation;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: input,
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }
    let context: AudioContext;
    let analyser: AnalyserNode;
    try {
      this.stream = stream;
      context = new AudioContext();
      this.context = context;
      const source = context.createMediaStreamSource(stream),
        gain = context.createGain();
      analyser = context.createAnalyser();
      analyser.fftSize = 256;
      gain.gain.value = loopback ? 0.25 : 0;
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(context.destination);
      await context.resume();
    } catch (error) {
      if (generation !== this.generation) return false;
      this.stop();
      throw error;
    }
    if (generation !== this.generation) return false;
    const samples = new Uint8Array(analyser.fftSize);
    this.timer = setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      const energy =
        samples.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) /
        samples.length;
      onLevel(Math.min(1, Math.sqrt(energy) * 4));
    }, 100);
    return true;
  }
  stop() {
    ++this.generation;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
