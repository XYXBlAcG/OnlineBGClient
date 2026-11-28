import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  gameCatalogue,
  gameKinds,
  gameSeatMinimum,
  type GameKind,
} from "../src/domain/catalogue";
import { fitSeats } from "../src/domain/room-seats";
import { configSchema } from "../src/domain/protocol";
import { mahjongModeNames } from "../src/domain/mahjong/types";
import { expeditionDifficulties } from "../src/domain/expedition/adventure-types";
import { ascensionLevels } from "../src/domain/expedition/ascension";
import {
  cardDefinition,
  firstKingdom,
  kingdomCards,
} from "../src/domain/dominion/cards";
import {
  checkersModeChoices,
  dominionModeChoices,
  flightModeChoices,
  drawModeChoices,
  mahjongDrawChoices,
  poolModeChoices,
  poolTimeChoices,
} from "../src/domain/setup-choices";
import type { RoomConfig } from "../src/domain/protocol";

type OptionGroup =
  "mahjong" | "pool" | "flight" | "checkers" | "expedition" | "dominion" | "drawguess";
type SetupField = {
  [G in OptionGroup]: {
    group: G;
    key: keyof RoomConfig[G] & string;
    title: string;
    format: "string" | "number" | "boolean" | "strings";
    choices: readonly { value: string; label: string; detail?: string }[];
    visibleWhen?: { key: string; value: string };
    count?: number;
  };
}[OptionGroup];
const fields: Partial<Record<GameKind, SetupField[]>> = {
  drawguess: [{ group: "drawguess", key: "mode", title: "你画我猜玩法", format: "string", choices: drawModeChoices }],
  scmj: [
    {
      group: "mahjong",
      key: "mode",
      title: "麻将模式",
      format: "string",
      choices: Object.entries(mahjongModeNames).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      group: "mahjong",
      key: "cap",
      title: "四川麻将封顶",
      format: "number",
      choices: [3, 4, 5].map((cap) => ({
        value: String(cap),
        label: `${cap} 番`,
      })),
      visibleWhen: { key: "mode", value: "sichuan" },
    },
    {
      group: "mahjong",
      key: "selfDraw",
      title: "自摸计分",
      format: "string",
      choices: mahjongDrawChoices,
      visibleWhen: { key: "mode", value: "sichuan" },
    },
  ],
  pool: [
    {
      group: "pool",
      key: "mode",
      title: "台球玩法",
      format: "string",
      choices: poolModeChoices,
    },
    {
      group: "pool",
      key: "shotSeconds",
      title: "击球时限",
      format: "number",
      choices: poolTimeChoices,
    },
  ],
  fxq: [
    {
      group: "flight",
      key: "mode",
      title: "飞行棋玩法",
      format: "string",
      choices: flightModeChoices,
    },
  ],
  tq: [
    {
      group: "checkers",
      key: "mode",
      title: "跳棋玩法",
      format: "string",
      choices: checkersModeChoices,
    },
  ],
  expedition: [
    {
      group: "expedition",
      key: "difficulty",
      title: "远征难度",
      format: "string",
      choices: Object.entries(expeditionDifficulties).map(([value, item]) => ({
        value,
        label: item.label,
      })),
    },
    {
      group: "expedition",
      key: "ascension",
      title: "进阶阶位",
      format: "number",
      choices: ascensionLevels.map((item) => ({
        value: String(item.level),
        label: item.name,
      })),
    },
    {
      group: "expedition",
      key: "advanced",
      title: "进阶机制",
      format: "boolean",
      choices: [
        { value: "false", label: "关闭" },
        { value: "true", label: "开启" },
      ],
    },
    {
      group: "expedition",
      key: "endless",
      title: "无尽模式",
      format: "boolean",
      choices: [
        { value: "false", label: "关闭" },
        { value: "true", label: "开启" },
      ],
    },
  ],
  dominion: [
    {
      group: "dominion",
      key: "mode",
      title: "王国组合",
      format: "string",
      choices: dominionModeChoices,
    },
    {
      group: "dominion",
      key: "kingdom",
      title: "王国卡",
      format: "strings",
      count: 10,
      visibleWhen: { key: "mode", value: "custom" },
      choices: kingdomCards.map((value) => ({
        value,
        label: `${cardDefinition(value).name} · ${cardDefinition(value).cost}`,
        detail: cardDefinition(value).text,
      })),
    },
  ],
};
export const nativeCatalogue = gameKinds.map((id) => {
  const game = gameCatalogue[id];
  const config = configSchema.parse({
    kind: id,
    humans: game.minPlayers,
    ai: [],
    team: false,
    training: false,
  });
  const gameFields = fields[id] ?? [];
  const groups = [...new Set(gameFields.map((field) => field.group))];
  const defaults = Object.fromEntries(
    groups.map((group) => [group, config[group]]),
  );
  if (id === "dominion")
    defaults.dominion = { ...config.dominion, kingdom: [...firstKingdom] };
  const modeField = gameFields.find((field) => field.key === "mode");
  const variants: Record<string, string>[] = modeField?.choices.map(
    (choice) => ({ mode: choice.value }),
  ) ?? [{}];
  const seatRanges = variants.map((when) => {
    const pool = modeField?.group === "pool" ? { mode: when.mode } : undefined;
    const checkers =
      modeField?.group === "checkers" ? { mode: when.mode } : undefined;
    const fittedCount = (count: number) =>
      fitSeats({
        kind: id,
        humans: 1,
        pool,
        checkers,
        ai: Array.from({ length: count - 1 }, () => ({
          difficulty: "normal" as const,
          name: "",
        })),
      }).ai.length + 1;
    return {
      when,
      min: fittedCount(gameSeatMinimum(id, when.mode === "fayu" ? "fayu" : "classic")),
      max: fittedCount(game.maxPlayers),
    };
  });
  return {
    ...game,
    id,
    subtitle: game.description,
    fields: gameFields,
    defaults,
    seatRanges,
    selections: Object.fromEntries(
      gameFields.map((field) => {
        const value =
          (defaults[field.group] as Record<string, unknown>)[field.key] ??
          (field.format === "boolean" ? false : field.choices[0].value);
        return [
          field.key,
          Array.isArray(value) ? value.join(",") : String(value),
        ];
      }),
    ),
  };
});
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const target = resolve(process.argv[2] ?? "dist/native-catalogue.json");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(nativeCatalogue));
}
