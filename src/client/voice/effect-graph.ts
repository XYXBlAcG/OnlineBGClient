import type { VoiceEffect } from "../../domain/voice-effects";
import {
  effectParameters,
  voiceStretchParameters,
  voiceInterpolationStrategy,
} from "../../domain/voice-effects";
import processorUrl from "@soundtouchjs/audio-worklet/processor?url";
const registrations = new WeakMap<BaseAudioContext, Promise<void>>();
export class VoiceEffectGraph {
  readonly input: GainNode;
  readonly output: GainNode;
  private nodes: AudioNode[] = [];
  private oscillators: OscillatorNode[] = [];
  private worklet: AudioWorkletNode | null = null;
  private mix: GainNode;
  private closed = false;
  private constructor(private context: AudioContext) {
    this.input = context.createGain();
    this.output = context.createGain();
    this.mix = context.createGain();
    this.nodes.push(this.input, this.output, this.mix);
    this.mix.gain.value = 0;
  }
  static async create(
    context: AudioContext,
    effect: VoiceEffect,
    onError: (error: Error) => void,
  ): Promise<VoiceEffectGraph> {
    const graph = new VoiceEffectGraph(context);
    try {
      await graph.build(effect, onError);
      return graph;
    } catch (error) {
      graph.close();
      throw new Error("变声效果启动失败，请恢复原声后重试。", { cause: error });
    }
  }
  private async build(effect: VoiceEffect, onError: (error: Error) => void) {
    const c = this.context,
      p = effectParameters(effect);
    if (p.wet === 0) {
      this.input.connect(this.mix);
      this.mix.connect(this.output);
      return;
    }
    const dry = c.createGain(),
      wet = c.createGain(),
      limiter = c.createDynamicsCompressor();
    dry.gain.value = 1 - p.wet;
    wet.gain.value = p.wet;
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;
    this.nodes.push(dry, wet, limiter);
    this.input.connect(dry);
    dry.connect(limiter);
    let tail: AudioNode = this.input;
    if (p.wet > 0 && p.semitones !== 0) {
      const { SoundTouchNode } = await import("@soundtouchjs/audio-worklet");
      let registration = registrations.get(c);
      if (!registration) {
        registration = SoundTouchNode.register(c, processorUrl);
        registrations.set(c, registration);
        registration.catch(() => registrations.delete(c));
      }
      await registration;
      if (this.closed) throw new Error("变声处理已取消");
      const pitch = new SoundTouchNode({
        context: c,
        outputChannelCount: 1,
        interpolationStrategy: voiceInterpolationStrategy,
      });
      pitch.setStretchParameters(voiceStretchParameters);
      pitch.pitchSemitones.value = p.semitones;
      pitch.playbackRate.value = 1;
      pitch.onprocessorerror = () =>
        onError(new Error("变声处理已停止，请切换原声后重试。"));
      this.worklet = pitch;
      this.nodes.push(pitch);
      tail.connect(pitch);
      tail = pitch;
    }
    const filter = c.createBiquadFilter();
    filter.type = p.filter;
    filter.frequency.value = p.frequency;
    filter.Q.value = p.filter === "bandpass" ? 0.8 : 0.7;
    filter.gain.value = p.filter === "highshelf" ? 6 : 0;
    this.nodes.push(filter);
    tail.connect(filter);
    tail = filter;
    if (p.distortion) {
      const shape = c.createWaveShaper(),
        curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        const x = (i * 2) / (curve.length - 1) - 1;
        curve[i] = Math.tanh(p.distortion * x) / Math.tanh(p.distortion);
      }
      shape.curve = curve;
      shape.oversample = "2x";
      this.nodes.push(shape);
      tail.connect(shape);
      tail = shape;
    }
    let delay: DelayNode | undefined;
    if (p.delay) {
      delay = c.createDelay(0.5);
      delay.delayTime.value = p.delay;
      const feedback = c.createGain();
      feedback.gain.value = p.feedback;
      this.nodes.push(delay, feedback);
      tail.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      tail.connect(wet);
      tail = delay;
    }
    if (p.modulation) {
      const oscillator = c.createOscillator(),
        depth = c.createGain();
      oscillator.frequency.value = p.modulation;
      this.oscillators.push(oscillator);
      this.nodes.push(oscillator, depth);
      if (effect.preset === "robot") {
        const mod = c.createGain();
        mod.gain.value = 0.55;
        depth.gain.value = 0.45;
        oscillator.connect(depth);
        depth.connect(mod.gain);
        tail.connect(mod);
        tail = mod;
        this.nodes.push(mod);
      } else if (delay) {
        depth.gain.value = 0.005;
        oscillator.connect(depth);
        depth.connect(delay.delayTime);
      } else {
        depth.gain.value = 230;
        oscillator.connect(depth);
        depth.connect(filter.frequency);
      }
      oscillator.start();
    }
    tail.connect(wet);
    wet.connect(limiter);
    limiter.connect(this.mix);
    this.mix.connect(this.output);
  }
  fade(value: number) {
    const t = this.context.currentTime;
    this.mix.gain.cancelScheduledValues(t);
    this.mix.gain.setValueAtTime(this.mix.gain.value, t);
    this.mix.gain.linearRampToValueAtTime(value, t + 0.04);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.oscillators.forEach((node) => {
      node.stop();
    });
    this.worklet?.port.close();
    this.nodes.forEach((node) => node.disconnect());
  }
}
export class VoiceEffectPipeline {
  readonly output: GainNode;
  private active: VoiceEffectGraph | null = null;
  private generation = 0;
  private retiring = new Map<VoiceEffectGraph, ReturnType<typeof setTimeout>>();
  constructor(
    private context: AudioContext,
    private source: AudioNode,
    private onError: (error: Error) => void,
  ) {
    this.output = context.createGain();
  }
  async set(effect: VoiceEffect) {
    const generation = ++this.generation;
    const graph = await VoiceEffectGraph.create(
      this.context,
      effect,
      this.onError,
    );
    if (generation !== this.generation) {
      graph.close();
      return;
    }
    this.source.connect(graph.input);
    graph.output.connect(this.output);
    graph.fade(1);
    const previous = this.active;
    this.active = graph;
    if (previous) {
      previous.fade(0);
      this.retiring.set(
        previous,
        setTimeout(() => {
          this.source.disconnect(previous.input);
          previous.close();
          this.retiring.delete(previous);
        }, 60),
      );
    }
  }
  close() {
    ++this.generation;
    if (this.active) {
      this.source.disconnect(this.active.input);
      this.active.close();
      this.active = null;
    }
    for (const [graph, timer] of this.retiring) {
      clearTimeout(timer);
      this.source.disconnect(graph.input);
      graph.close();
    }
    this.retiring.clear();
    this.output.disconnect();
  }
}
