import type { MahjongOptions } from "./mahjong/types";
import type { GraphwarOptions, GraphwarInitial } from "./graphwar/types";
import type { FlightOptions } from "./flight";
import type { CheckersOptions } from "./checkers";
import type { MinerOptions } from "./miner/types";
export interface GameOptions {
  hostActor?: number;
  golf?: { difficulty: import("./golf/types").GolfDifficulty };
  golfCourses?: readonly import("./golf/types").GolfCourse[];
  roundSeed?: string;
  arcadeScenario?: import("./arcade/scenario").ArcadeScenario;
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
  miner?: MinerOptions;
  pool?: import("./pool/types").PoolOptions;
  drawguess?: {
    mode?: import("./drawguess/types").DrawMode;
    words?: import("./drawguess/words").DrawWord[];
  };
}
