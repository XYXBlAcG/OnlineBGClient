import { canSelectOutput, outputChoice } from "./audio-output";
import { VoiceEffectPipeline } from "./effect-graph";
import {
  voiceEffectSchema,
  type VoiceEffect,
} from "../../domain/voice-effects";
export class MicrophoneProbe {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private outputId = "default";
  async output(id: string) {
    const context = this.context as
      (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null;
    const choice = outputChoice(
      id,
      canSelectOutput() && !!context?.setSinkId,
      this.outputId,
    );
    if (choice && context?.setSinkId) {
      await context.setSinkId(choice === "default" ? "" : choice);
      this.outputId = id;
    }
  }
  private pipeline: VoiceEffectPipeline | null = null;
  async effect(effect: VoiceEffect) {
    await this.pipeline?.set(effect);
  }
  async start(
    input: string,
    loopback: boolean,
    onLevel: (level: number) => void,
    effect: VoiceEffect = voiceEffectSchema.parse({}),
    output = "default",
    onFailure?: (error: Error) => void,
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
      await this.output(output);
      if (generation !== this.generation) return false;
      const source = context.createMediaStreamSource(stream),
        gain = context.createGain();
      analyser = context.createAnalyser();
      analyser.fftSize = 256;
      gain.gain.value = loopback ? 0.25 : 0;
      this.pipeline = new VoiceEffectPipeline(context, source, (error) => {
        this.stop();
        onFailure?.(error);
      });
      await this.pipeline.set(effect);
      if (generation !== this.generation) return false;
      this.pipeline.output.connect(analyser);
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
    this.pipeline?.close();
    this.pipeline = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.context?.close().catch(() => {});
    this.context = null;
    this.outputId = "default";
  }
}
