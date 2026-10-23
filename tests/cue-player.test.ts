import { expect, it, vi } from "vitest";
import { CuePlayer } from "../src/client/sound";
it("reuses one audio context, honors volume and throttles overlapping cues", async () => {
  const oscillator = () => ({
    connect: vi.fn(),
    frequency: { value: 0 },
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  });
  const context = {
    state: "running",
    currentTime: 0,
    createOscillator: vi.fn(oscillator),
    createGain: () => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    }),
  };
  const create = vi.fn(() => context as unknown as AudioContext);
  const player = new CuePlayer(create);
  player.play("turn");
  expect(create).not.toHaveBeenCalled();
  await player.unlock();
  await player.unlock();
  player.setVolume(0);
  player.play("turn");
  expect(context.createOscillator).not.toHaveBeenCalled();
  player.setVolume(0.5);
  player.play("turn");
  player.play("message");
  expect(create).toHaveBeenCalledTimes(1);
  expect(context.createOscillator).toHaveBeenCalledTimes(2);
  context.currentTime = 1;
  player.play("message");
  expect(context.createOscillator).toHaveBeenCalledTimes(3);
});
