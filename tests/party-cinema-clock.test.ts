import { expect, it, vi } from "vitest";
const port = vi.hoisted(() => ({
  tracks: [] as {
    seek: ReturnType<typeof vi.fn>;
    revert: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
  }[],
}));
vi.mock("animejs", () => ({
  stagger: () => 65,
  svg: { createDrawable: (targets: unknown) => targets },
  createTimeline: () => {
    const track = { seek: vi.fn(), revert: vi.fn(), add: vi.fn() };
    port.tracks.push(track);
    return track;
  },
}));
import { PartyCinema } from "../src/client/party/cinema";
import type { PartyEvent } from "../src/domain/party";
it("矢量场景只由播放时钟驱动，暂停、倒放定位和十秒末尾保持同一场景", () => {
  const root = {
    setAttribute: vi.fn(),
    classList: { add: vi.fn() },
    innerHTML: "",
    querySelectorAll: () => [{}],
    style: { opacity: "" },
    remove: vi.fn(),
  };
  vi.stubGlobal("document", { createElementNS: () => root });
  const host = { append: vi.fn() } as unknown as HTMLElement;
  const cinema = new PartyCinema(host),
    event: PartyEvent = {
      id: "ice",
      item: "frost",
      from: "a",
      target: "b",
      time: 1000,
      duration: 10000,
      seed: 6,
      caption: "冰封",
      density: 1,
    };
  try {
    cinema.update([event], 1500);
    const track = port.tracks.at(-1)!;
    expect(track.seek).toHaveBeenLastCalledWith(500, true);
    cinema.update([event], 1500);
    expect(track.seek).toHaveBeenLastCalledWith(500, true);
    cinema.update([event], 10500);
    expect(track.seek).toHaveBeenLastCalledWith(9500, true);
    expect(Number(root.style.opacity)).toBe(1);
    cinema.update([event], 2000);
    expect(track.seek).toHaveBeenLastCalledWith(1000, true);
    expect(host.append).toHaveBeenCalledTimes(1);
    cinema.update([], 11000);
    expect(track.revert).toHaveBeenCalledOnce();
    expect(root.remove).toHaveBeenCalledOnce();
  } finally {
    cinema.destroy();
    vi.unstubAllGlobals();
  }
});
