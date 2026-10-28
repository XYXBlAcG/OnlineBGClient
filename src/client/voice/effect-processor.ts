import type {
  AudioProcessorOptions,
  TrackProcessor,
  Track,
} from "livekit-client";
import {
  voiceEffectSchema,
  type VoiceEffect,
} from "../../domain/voice-effects";
import { VoiceEffectPipeline } from "./effect-graph";
export class VoiceEffectProcessor implements TrackProcessor<
  Track.Kind.Audio,
  AudioProcessorOptions
> {
  constructor(private onError: (error: Error) => void) {}
  readonly name = "OnlineBGClient voice effects";
  processedTrack?: MediaStreamTrack;
  private pipeline: VoiceEffectPipeline | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private generation = 0;
  private effect = voiceEffectSchema.parse({});
  async set(effect: VoiceEffect) {
    this.effect = effect;
    await this.pipeline?.set(effect);
  }
  async init({ audioContext, track }: AudioProcessorOptions) {
    const generation = ++this.generation;
    try {
      this.source = audioContext.createMediaStreamSource(
        new MediaStream([track]),
      );
      this.destination = audioContext.createMediaStreamDestination();
      this.pipeline = new VoiceEffectPipeline(
        audioContext,
        this.source,
        this.onError,
      );
      const pipeline = this.pipeline;
      await pipeline.set(this.effect);
      if (generation !== this.generation) return;
      pipeline.output.connect(this.destination);
      this.processedTrack = this.destination.stream.getAudioTracks()[0];
    } catch (error) {
      if (generation === this.generation) await this.destroy();
      throw error;
    }
  }
  async restart(options: AudioProcessorOptions) {
    await this.destroy();
    await this.init(options);
  }
  async destroy() {
    ++this.generation;
    this.destination?.stream.getTracks().forEach((track) => track.stop());
    this.pipeline?.close();
    this.pipeline = null;
    this.source?.disconnect();
    this.source = null;
    this.destination?.disconnect();
    this.destination = null;
    this.processedTrack = undefined;
  }
}
