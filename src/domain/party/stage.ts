import type { PartyItemId } from "./catalogue";
import type { PartyEvent } from "./model";
export const partyScenes = [
  "cash",
  "circus",
  "shadow",
  "heal",
  "tiles",
  "graph",
  "runway",
  "trail",
  "umbrella",
  "clock",
  "speech",
  "monster",
  "wish",
  "meteor",
  "band",
  "eggstorm",
  "tornado",
  "tomato",
  "bubbles",
  "rocket",
  "blast",
  "ice",
  "lightning",
  "bloom",
  "parade",
  "ink",
  "galaxy",
  "spotlight",
  "train",
  "arcade",
  "disco",
  "comic",
  "ocean",
  "slash",
  "cards",
  "dragon",
  "crown",
  "harvest",
  "gems",
  "alchemy",
  "runes",
] as const;
export type PartySceneId = (typeof partyScenes)[number];
export const partyGlyphs = [
  "emoji",
  "spark",
  "star",
  "crystal",
  "bubble",
  "petal",
  "ribbon",
  "card",
  "coin",
  "smoke",
  "note",
] as const;
export type PartyGlyph = (typeof partyGlyphs)[number];
export type PartyShader = "none" | "glow" | "shockwave" | "rays" | "void";
export interface PartyArt {
  scene: PartySceneId;
  glyph: PartyGlyph;
  shader: PartyShader;
}
const art = (
  scene: PartySceneId,
  glyph: PartyGlyph,
  shader: PartyShader = "none",
): PartyArt => ({ scene, glyph, shader });
export const partyArt = {
  cometEgg: art("eggstorm", "emoji", "glow"),
  giantSlipper: art("tornado", "emoji"),
  tomato: art("tomato", "emoji"),
  bubbles: art("bubbles", "bubble"),
  rainbowRocket: art("rocket", "spark", "glow"),
  meteors: art("meteor", "spark", "shockwave"),
  frost: art("ice", "crystal", "glow"),
  thunder: art("lightning", "spark", "glow"),
  roses: art("bloom", "petal"),
  clowns: art("circus", "ribbon"),
  zombies: art("parade", "smoke"),
  ink: art("ink", "smoke"),
  eggWeather: art("eggstorm", "emoji"),
  slipperWeather: art("tornado", "emoji"),
  moneyWeather: art("cash", "card"),
  galaxy: art("galaxy", "star", "void"),
  redCarpet: art("spotlight", "star", "rays"),
  train: art("train", "smoke"),
  pinball: art("arcade", "bubble"),
  disco: art("disco", "note", "rays"),
  comic: art("comic", "spark"),
  underwater: art("ocean", "bubble"),
  sgsSlash: art("slash", "spark", "shockwave"),
  sgsDodge: art("shadow", "spark"),
  sgsPeach: art("heal", "petal"),
  unoNeon: art("cards", "card", "glow"),
  unoFour: art("cards", "card", "shockwave"),
  mahjongWin: art("tiles", "ribbon", "rays"),
  mahjongKong: art("dragon", "spark", "glow"),
  ddzBomb: art("blast", "spark", "shockwave"),
  graphwarRift: art("graph", "spark", "glow"),
  flightTower: art("runway", "spark"),
  checkersTrail: art("trail", "star"),
  dominionCrown: art("crown", "ribbon", "rays"),
  catanHarvest: art("harvest", "coin"),
  splendorCrown: art("gems", "crystal", "glow"),
  poisonAccident: art("alchemy", "smoke"),
  expeditionAwaken: art("runes", "star", "glow"),
  umbrella: art("umbrella", "bubble"),
  blackHole: art("galaxy", "star", "void"),
  echo: art("speech", "note"),
  decoy: art("circus", "ribbon"),
  timeStop: art("clock", "star"),
  amplifier: art("disco", "spark"),
  cheer: art("band", "ribbon"),
  voiceStage: art("band", "note"),
  relay: art("speech", "card"),
  coinGrab: art("cash", "coin"),
  boss: art("monster", "spark", "shockwave"),
  wish: art("wish", "star"),
} satisfies Record<PartyItemId, PartyArt>;
export function resolvePartyArt(event: PartyEvent): PartyArt {
  if (!event.plugin) return partyArt[event.item];
  const scene =
    event.visual?.scene ??
    (
      {
        rain: "eggstorm",
        orbit: "galaxy",
        burst: "blast",
        bounce: "arcade",
        parade: "train",
        ink: "ink",
        beam: "runes",
        waves: "ocean",
      } as const
    )[event.visual?.pattern ?? "burst"];
  return {
    scene,
    glyph: event.visual?.particle ?? "emoji",
    shader: partyArt[event.item].shader,
  };
}
