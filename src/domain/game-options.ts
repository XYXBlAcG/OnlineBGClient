import type { MahjongOptions } from "./mahjong/types";
import type { GraphwarOptions, GraphwarInitial } from "./graphwar/types";
export interface GameOptions {
  mahjong?: MahjongOptions;
  graphwar?: GraphwarOptions;
  graphwarInitial?: GraphwarInitial;
}
