import type { GameKind } from "./catalogue";
import type { GameRules } from "./plugin";
import type { UpstreamRuntime } from "../upstream/runtime";
import {
  catanPlugin,
  checkersPlugin,
  ddzPlugin,
  dominionPlugin,
  expeditionPlugin,
  flightPlugin,
  graphwarPlugin,
  poolPlugin,
  poisonPlugin,
  sgsPlugin,
  sichuanPlugin,
  splendorPlugin,
  unoPlugin,
} from "./builtin-rules";

export const gameRules: Record<
  GameKind,
  (runtime: UpstreamRuntime) => GameRules
> = {
  expedition: expeditionPlugin,
  dominion: dominionPlugin,
  graphwar: graphwarPlugin,
  scmj: sichuanPlugin,
  ccbs: splendorPlugin,
  ktd: catanPlugin,
  dy: poisonPlugin,
  sgs: sgsPlugin,
  uno: unoPlugin,
  ddz: ddzPlugin,
  tq: checkersPlugin,
  fxq: flightPlugin,
  pool: poolPlugin,
};
