import type { MahjongOptions } from "./mahjong/types";
import type { GraphwarOptions, GraphwarInitial } from "./graphwar/types";
import type { FlightOptions } from "./flight";
import type { CheckersOptions } from "./checkers";
export interface GameOptions {
  expeditionMap?: import("./expedition/adventure-types").MapNode[][];
  expeditionCampaign?: 1 | 2;
  expeditionTuning?: 1 | 2;
  expeditionLayout?: 1 | 2;
  expedition?: import("./expedition/adventure-types").ExpeditionOptions;
  dominion?: import("./dominion/types").DominionOptions;
  mahjong?: MahjongOptions;
  graphwar?: GraphwarOptions;
  graphwarInitial?: GraphwarInitial;
  flight?: FlightOptions;
  checkers?: CheckersOptions;
}
