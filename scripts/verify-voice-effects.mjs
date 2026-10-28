import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runInThisContext } from "node:vm";
import assert from "node:assert/strict";
import {
  voiceStretchParameters,
  voiceInterpolationStrategy,
} from "../src/domain/voice-effects.ts";
const source = await readFile(
  fileURLToPath(import.meta.resolve("@soundtouchjs/audio-worklet/processor")),
  "utf8",
);
const results = [];
for (const semitones of [7, 12, -12]) {
  let Processor;
  const metrics = [];
  runInThisContext(
    `(function(AudioWorkletProcessor,registerProcessor,sampleRate){${source}\n})`,
  )(
    class {
      port = { postMessage: (value) => metrics.push(value), onmessage: null };
    },
    (_name, type) => {
      Processor = type;
    },
    48000,
  );
  const processor = new Processor({
    processorOptions: { interpolationStrategy: voiceInterpolationStrategy },
  });
  processor.port.onmessage({
    data: { type: "set-stretch-parameters", params: voiceStretchParameters },
  });
  const signalFrames = 48000 * 3,
    total = 48000 * 4,
    output = new Float32Array(total);
  const started = performance.now();
  for (let offset = 0; offset < total; offset += 128) {
    const input = new Float32Array(128),
      rendered = new Float32Array(128);
    for (let i = 0; i < 128; i++)
      if (offset + i < signalFrames)
        input[i] = 0.25 * Math.sin((2 * Math.PI * 440 * (offset + i)) / 48000);
    processor.process([[input]], [[rendered]], {
      pitch: new Float32Array([1]),
      pitchSemitones: new Float32Array([semitones]),
      playbackRate: new Float32Array([1]),
    });
    output.set(rendered.subarray(0, Math.min(128, total - offset)), offset);
  }
  const elapsed = performance.now() - started;
  let first = -1,
    last = 0,
    crossings = 0,
    peak = 0;
  for (let i = 0; i < total; i++) {
    assert.ok(Number.isFinite(output[i]));
    peak = Math.max(peak, Math.abs(output[i]));
    if (Math.abs(output[i]) > 0.01) {
      if (first < 0) first = i;
      last = i;
    }
    if (i > 48000 && i <= 96000 && output[i - 1] < 0 && output[i] >= 0)
      crossings++;
  }
  const expected = 440 * 2 ** (semitones / 12),
    durationMs = (last - first) / 48,
    latencyMs = first / 48;
  assert.ok(
    Math.abs(crossings - expected) / expected < 0.02,
    `frequency ${crossings} != ${expected}`,
  );
  assert.ok(Math.abs(durationMs - 3000) < 70, `duration ${durationMs}`);
  assert.ok(latencyMs < 100, `latency ${latencyMs}`);
  assert.ok(peak < 1);
  results.push({
    semitones,
    expectedHz: expected,
    measuredHz: crossings,
    activeDurationMs: durationMs,
    firstOutputLatencyMs: latencyMs,
    peak,
    renderWallTimeMs: elapsed,
    signalSeconds: 4,
    metrics: metrics.at(-1),
  });
}
await mkdir("artifacts/voice-effects", { recursive: true });
await writeFile(
  "artifacts/voice-effects/dsp.json",
  JSON.stringify(
    {
      runtime: process.version,
      platform: process.platform,
      arch: process.arch,
      sampleRate: 48000,
      blockFrames: 128,
      source:
        "installed AudioWorklet processor executed offline; no browser or microphone",
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results));
