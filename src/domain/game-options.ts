import type { MahjongOptions } from "./mahjong/types";
import type { GraphwarOptions, GraphwarInitial } from "./graphwar/types";
export interface GameOptions {
  expeditionMap?: import("./expedition/adventure-types").MapNode[][];
  expeditionLayout?: 1 | 2;
  expedition?: import("./expedition/adventure-types").ExpeditionOptions;
  dominion?: import("./dominion/types").DominionOptions;
  mahjong?: MahjongOptions;
  graphwar?: GraphwarOptions;
  graphwarInitial?: GraphwarInitial;
}
