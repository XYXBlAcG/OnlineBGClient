import type { PartyEvent } from "../../domain/party";
export function partyElapsed(event: PartyEvent, now: number): number {
  return (
    now -
    event.time -
    (event.pauses ?? []).reduce(
      (sum, p) => sum + Math.max(0, Math.min(p.duration, now - p.at)),
      0,
    )
  );
}
export function eventStatus(
  event: PartyEvent,
  now: number,
): "queued" | "playing" | "expired" {
  return now < event.time
    ? "queued"
    : now >= event.time + event.duration
      ? "expired"
      : "playing";
}
export function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class PartyClock {
  private anchor = performance.now();
  constructor(
    private time: number,
    public rate = 1,
  ) {}
  seek(time: number): void {
    this.time = time;
    this.anchor = performance.now();
  }
  setRate(rate: number): void {
    this.seek(this.now());
    this.rate = rate;
  }
  now = (): number => this.time + (performance.now() - this.anchor) * this.rate;
}
export class PartyPlayback {
  private initialized = false;
  constructor(private resumeInitial = false) {}
  private starts = new Map<string, { pending: boolean; shift: number }>();
  project(
    events: PartyEvent[],
    now: number,
    ready: boolean,
    replay = false,
    serverTime = now,
  ): { events: PartyEvent[]; waiting: number } {
    if (replay) return { events, waiting: 0 };
    const initial = this.resumeInitial && !this.initialized;
    this.initialized = true;
    let waiting = 0;
    const visible: PartyEvent[] = [];
    for (const event of events) {
      let start = this.starts.get(event.id);
      if (!start) {
        const fresh =
          serverTime - (event.createdAt ?? event.time) <= 2000 &&
          serverTime < event.time + event.duration;
        start = { pending: fresh && !initial, shift: now - serverTime };
        this.starts.set(event.id, start);
      }
      if (start.pending) {
        if (!ready) {
          waiting++;
          continue;
        }
        start.shift = Math.max(start.shift, now - event.time);
        start.pending = false;
      }
      visible.push(
        start.shift
          ? {
              ...event,
              time: event.time + start.shift,
              pauses: event.pauses?.map((p) => ({
                ...p,
                at: p.at + start.shift,
              })),
            }
          : event,
      );
    }
    const known = new Set(events.map((e) => e.id));
    for (const id of this.starts.keys())
      if (!known.has(id)) this.starts.delete(id);
    return { events: visible, waiting };
  }
}
