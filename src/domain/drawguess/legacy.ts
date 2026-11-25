import { gameCatalogue } from "../catalogue";

const renamedActions: Record<string, string> = {
  "fayu-clear": "draw-clear",
  "fayu-delete": "draw-delete",
  "fayu-end": "draw-end",
  "fayu-fill": "draw-fill",
  "fayu-finish": "draw-finish",
  "fayu-guess": "draw-cloze",
  "fayu-next": "draw-round",
  "fayu-prompt": "draw-prompt",
  "fayu-restore": "draw-restore",
  "fayu-transform": "draw-transform",
  "fayu-vote": "draw-vote",
};

export function upgradeDrawRecord(input: unknown): unknown {
  if (typeof input !== "object" || !input || !("config" in input)) return input;
  const { config } = input;
  if (typeof config !== "object" || !config || !("kind" in config)) return input;
  const fayu = config.kind === "fayu";
  if (!fayu && !(config.kind === "drawguess" && "rulesVersion" in input && input.rulesVersion === "2"))
    return input;
  const { fayuStart, ...record } = input as Record<string, unknown>;
  return {
    ...record,
    config: { ...config, kind: "drawguess", drawguess: { mode: fayu ? "fayu" : "classic" } },
    rulesVersion: gameCatalogue.drawguess.version,
    ...(fayu ? { drawStart: fayuStart } : {}),
    events: Array.isArray(record.events) ? record.events.map((event) => {
      const action = event?.action;
      const type = typeof action?.type === "string" ? renamedActions[action.type] : undefined;
      return type ? { ...event, action: { ...action, type } } : event;
    }) : record.events,
  };
}
