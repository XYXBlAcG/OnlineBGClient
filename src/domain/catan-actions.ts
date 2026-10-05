import { z } from "zod";
const id = z.number().int().min(0).max(255);
export const catanResourcesSchema = z
  .array(z.number().int().min(0).max(64))
  .length(5);
export const catanMoveSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("build"),
    building: z.enum(["house", "road", "city"]),
    id,
  }),
  z.object({ kind: z.literal("roll") }),
  z.object({ kind: z.literal("end") }),
  z.object({ kind: z.literal("buy-dev") }),
  z.object({ kind: z.literal("road-card"), id }),
  z.object({
    kind: z.literal("robber"),
    tile: z.number().int().min(0).max(36),
    target: z.number().int().min(-1).max(7),
    knight: z.boolean(),
  }),
  z.object({ kind: z.literal("abundance"), resources: catanResourcesSchema }),
  z.object({
    kind: z.literal("monopoly"),
    resource: z.number().int().min(0).max(4),
  }),
  z.object({ kind: z.literal("discard"), resources: catanResourcesSchema }),
  z.object({
    kind: z.literal("bank"),
    give: catanResourcesSchema,
    take: catanResourcesSchema,
  }),
  z.object({
    kind: z.literal("trade"),
    give: catanResourcesSchema,
    take: catanResourcesSchema,
    targets: z.array(z.number().int().min(0).max(7)).min(1).max(7),
  }),
  z.object({ kind: z.literal("respond"), accept: z.boolean() }),
  z.object({ kind: z.literal("cancel-trade") }),
  z.object({ kind: z.literal("request-build") }),
]);
export type CatanMove = z.infer<typeof catanMoveSchema>;
export interface CatanPlayer {
  resources: number[];
  cards: number[];
  houses: number[];
  roads: number[];
  longestRoad: number;
  robberCount: number;
}
export interface CatanView {
  tradeCount?: number;
  mapId: number;
  mapProp: number[];
  state: number;
  devCard: number;
  robber: number;
  lastDice: number;
  newCards: number[];
  actionRequest?: number;
  exchangeData?: { needs: number[]; costs: number[]; responses: number[] };
  lastOp?: {
    type: number;
    playerId: number;
    house?: number;
    road?: number;
    from?: number;
    to?: number;
    withPlayerId?: number;
    needs?: number[];
    costs?: number[];
  };
  bankData: {
    resources: number[];
    cards: number[];
    longestRoad: number;
    longestRoadPos: number;
    maxRobberCount: number;
    maxRobberCountPos: number;
  };
  playerData: CatanPlayer[];
}
