import { createTimeline, stagger, svg } from "animejs";
import { partyAppearance, type PartyEvent } from "../../domain/party";
import { resolvePartyArt } from "../../domain/party/stage";
import { cinemaArtwork } from "./cinema-art";
import { cinemaScore } from "./cinema-score";
import { partyElapsed } from "./timeline";
export class PartyCinema {
  private actors = new Map<
    string,
    { root: SVGSVGElement; timeline: ReturnType<typeof createTimeline> }
  >();
  constructor(private host: HTMLElement) {}
  update(events: PartyEvent[], now: number): void {
    for (const [id, actor] of this.actors)
      if (!events.some((e) => e.id === id)) {
        actor.timeline.revert();
        actor.root.remove();
        this.actors.delete(id);
      }
    for (const event of events) {
      let actor = this.actors.get(event.id);
      if (!actor) {
        const root = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        root.setAttribute("viewBox", "0 0 1000 700");
        root.setAttribute("preserveAspectRatio", "xMidYMid meet");
        root.classList.add("party-cinematic");
        root.innerHTML = cinemaArtwork(
          resolvePartyArt(event).scene,
          partyAppearance(event).color,
          `party-${crypto.randomUUID()}`,
          event.seed,
        );
        this.host.append(root);
        const timeline = createTimeline({ autoplay: false });
        for (const track of cinemaScore(
          resolvePartyArt(event).scene,
          partyAppearance(event).duration,
        )) {
          const targets = root.querySelectorAll<SVGGeometryElement>(
            `[data-${track.role}]`,
          );
          if (!targets.length) continue;
          timeline.add(
            track.drawable ? svg.createDrawable(targets) : targets,
            { ...track.parameters, delay: stagger(track.stagger) },
            track.at,
          );
        }
        actor = { root, timeline };
        this.actors.set(event.id, actor);
      }
      const elapsed = partyElapsed(event, now);
      actor.timeline.seek(Math.max(0, elapsed), true);
      actor.root.style.opacity = String(
        Math.min(
          1,
          elapsed / 300,
          (partyAppearance(event).duration - elapsed) / 500,
        ),
      );
    }
  }
  destroy(): void {
    for (const actor of this.actors.values()) {
      actor.timeline.revert();
      actor.root.remove();
    }
    this.actors.clear();
  }
}
