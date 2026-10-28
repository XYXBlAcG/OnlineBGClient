import { afterEach, expect, it, vi } from "vitest";
import { VoiceEffectProcessor } from "../src/client/voice/effect-processor";
import { voiceEffectSchema } from "../src/domain/voice-effects";
const parameter = () => ({
  value: 0,
  cancelScheduledValues: vi.fn(),
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
});
class Node {
  connections = new Set<Node>();
  gain = parameter();
  frequency = parameter();
  Q = parameter();
  delayTime = parameter();
  threshold = parameter();
  knee = parameter();
  ratio = parameter();
  attack = parameter();
  release = parameter();
  stop = vi.fn();
  start = vi.fn();
  connect(target: Node) {
    this.connections.add(target);
    return target;
  }
  disconnect(target?: Node) {
    if (target) this.connections.delete(target);
    else this.connections.clear();
  }
}
function context() {
  const nodes: Node[] = [],
    tracks: { stop: ReturnType<typeof vi.fn> }[] = [];
  const node = () => {
    const n = new Node();
    nodes.push(n);
    return n;
  };
  const makeDestination = () => {
    const n = node(),
      track = { stop: vi.fn() };
    tracks.push(track);
    return Object.assign(n, {
      stream: { getAudioTracks: () => [track], getTracks: () => [track] },
    });
  };
  const value = {
    currentTime: 0,
    createMediaStreamSource: node,
    createMediaStreamDestination: makeDestination,
    createGain: node,
    createDynamicsCompressor: node,
    createBiquadFilter: node,
    createDelay: node,
    createOscillator: node,
    createWaveShaper: node,
  };
  return { value: value as unknown as AudioContext, nodes, tracks };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("shares the processor graph across effect changes and releases destinations without stopping the caller's raw microphone", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "MediaStream",
    class {
      constructor(public tracks: unknown[]) {}
    },
  );
  const audio = context(),
    raw = { stop: vi.fn() },
    error = vi.fn(),
    processor = new VoiceEffectProcessor(error);
  await processor.init({
    audioContext: audio.value,
    track: raw as unknown as MediaStreamTrack,
    kind: "audio" as never,
  });
  expect(processor.processedTrack).toBe(audio.tracks[0]);
  for (const preset of [
    "robot",
    "telephone",
    "radio",
    "chorus",
    "cave",
    "underwater",
    "original",
  ] as const) {
    await processor.set(voiceEffectSchema.parse({ preset }));
    vi.advanceTimersByTime(70);
  }
  await processor.destroy();
  expect(audio.tracks[0].stop).toHaveBeenCalledOnce();
  expect(raw.stop).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
  expect(audio.nodes.every((n) => n.connections.size === 0)).toBe(true);
  expect(
    audio.nodes
      .filter((n) => n.start.mock.calls.length)
      .every((n) => n.stop.mock.calls.length === 1),
  ).toBe(true);
});
it("restarts around the new device and destroys each processed destination once", async () => {
  vi.stubGlobal("MediaStream", class {});
  const audio = context(),
    processor = new VoiceEffectProcessor(() => {}),
    track = {} as MediaStreamTrack;
  await processor.init({
    audioContext: audio.value,
    track,
    kind: "audio" as never,
  });
  const first = processor.processedTrack;
  await processor.restart({
    audioContext: audio.value,
    track,
    kind: "audio" as never,
  });
  expect(processor.processedTrack).not.toBe(first);
  expect(audio.tracks[0].stop).toHaveBeenCalledOnce();
  await processor.destroy();
  await processor.destroy();
  expect(audio.tracks[1].stop).toHaveBeenCalledOnce();
});
