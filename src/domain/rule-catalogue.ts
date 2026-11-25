import type { GameKind } from "./catalogue";
import type { GameRules } from "./plugin";
import { GameAdapter } from "./plugin";
import type { UpstreamRuntime } from "../upstream/runtime";
import { DrawGameRules } from "./drawguess/game-rules";
import { GolfRules } from "./golf/rules";
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
  minerPlugin,
} from "./builtin-rules";

export const gameRules: Record<
  GameKind,
  (runtime: UpstreamRuntime) => GameRules
> = {
  miner: minerPlugin,
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
  drawguess: (runtime) =>
    new GameAdapter("drawguess", new DrawGameRules(() => runtime.random())),
  golf: () => new GameAdapter("golf", new GolfRules()),
};
