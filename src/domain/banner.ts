import { maxRoomSeats } from "./catalogue";
import { z } from "zod";
import { interactionCatalogue, interactionSchema } from "./social";
export const bannerPolicySchema = z.object({
  mode: z.enum(["host", "selected", "all", "off"]),
  members: z.array(z.string().min(1).max(100)).max(maxRoomSeats),
});
export type BannerPolicy = z.infer<typeof bannerPolicySchema>;
const caption = z
  .string()
  .trim()
  .min(1)
  .refine((value) => Array.from(value).length <= 40, "文字须为 1–40 个字");
export const bannerSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.enum(["title", "subtitle", "actionbar"]),
    text: caption,
    style: z.enum(["gold", "red"]).optional(),
  }),
  z.object({
    kind: z.literal("effect"),
    effect: interactionSchema,
    text: caption,
  }),
  z.object({ kind: z.literal("announce"), text: caption }),
  z.object({
    kind: z.literal("countdown"),
    seconds: z.number().int().min(1).max(10),
    text: caption,
  }),
  z.object({
    kind: z.literal("combo"),
    effects: z.array(interactionSchema).min(1).max(3),
    text: caption,
  }),
]);
export type Banner = z.infer<typeof bannerSchema>;
export const bannerDuration = 2500;
export function bannerLifetime(banner: Banner): number {
  return banner.kind === "countdown"
    ? (banner.seconds + 1) * 1000
    : banner.kind === "combo"
      ? banner.effects.length * 1100
      : bannerDuration;
}
const effect = (input: string) => {
  const entry = Object.entries(interactionCatalogue).find(([key, value]) =>
    [key, value.emoji, value.name].includes(input),
  );
  if (!entry) throw new Error("请选择支持的表情，如 /effect 🤣");
  return entry[0] as keyof typeof interactionCatalogue;
};
const narrativeSchema = z.object({
  kind: z.literal("emote"),
  text: z.string().trim().min(1).max(120),
});
const rollSchema = z.object({
  kind: z.literal("roll"),
  count: z.number().int().min(1).max(6),
  sides: z.number().int().min(2).max(100),
});
export const rollResultSchema = z.object({
  type: z.literal("roll"),
  text: z.string().max(160),
  sides: z.number().int().min(2).max(100),
  results: z.array(z.number().int().min(1).max(100)).min(1).max(6),
});
export const chatEventSchema = z.union([
  rollResultSchema,
  z.object({ type: z.literal("emote"), text: z.string().max(120) }),
  z.object({ type: z.literal("clear"), text: z.string().max(100) }),
]);
export type ChatEvent = z.infer<typeof chatEventSchema>;
type ParsedCommand =
  | Banner
  | z.infer<typeof narrativeSchema>
  | z.infer<typeof rollSchema>
  | { kind: "clear" }
  | { kind: "help" };
interface ChatCommandDefinition {
  command: string;
  kind: ParsedCommand["kind"];
  permission: "banner" | "room" | "host" | "local";
  label: string;
  example: string;
  parse: (args: string[]) => ParsedCommand;
}
export const bannerCommands: readonly ChatCommandDefinition[] = [
  ...(["title", "subtitle", "actionbar"] as const).map((kind) => ({
    command: `/${kind}`,
    kind,
    permission: "banner" as const,
    label: { title: "中央大字", subtitle: "副标题", actionbar: "底部提示" }[
      kind
    ],
    example:
      kind === "title" ? "/title --style red 绝地反击" : `/${kind} 好牌！`,
    parse: (args: string[]) => {
      let style: "gold" | "red" | undefined;
      if (args[0] === "--style") {
        style = z.enum(["gold", "red"]).parse(args[1]);
        args = args.slice(2);
      }
      return bannerSchema.parse({
        kind,
        text: args.join(" "),
        ...(style ? { style } : {}),
      });
    },
  })),
  {
    command: "/effect",
    kind: "effect",
    permission: "banner",
    label: "全屏表情",
    example: "/effect 🤣",
    parse: (args) => {
      const kind = effect(args.join(" "));
      return {
        kind: "effect",
        effect: kind,
        text: interactionCatalogue[kind].name,
      };
    },
  },
  {
    command: "/announce",
    kind: "announce",
    permission: "banner",
    label: "房间公告",
    example: "/announce 今晚最后一局",
    parse: (args) =>
      bannerSchema.parse({ kind: "announce", text: args.join(" ") }),
  },
  {
    command: "/countdown",
    kind: "countdown",
    permission: "banner",
    label: "同步倒数（仅提醒）",
    example: "/countdown 3 准备开局",
    parse: (args) =>
      bannerSchema.parse({
        kind: "countdown",
        seconds: Number(args[0]),
        text: args.slice(1).join(" ") || "准备",
      }),
  },
  {
    command: "/combo",
    kind: "combo",
    permission: "banner",
    label: "表情连击",
    example: "/combo 🤣 😱",
    parse: (args) =>
      bannerSchema.parse({
        kind: "combo",
        effects: args.map(effect),
        text: "表情连击",
      }),
  },
  {
    command: "/roll",
    kind: "roll",
    permission: "room",
    label: "娱乐掷骰（不计入牌局）",
    example: "/roll 1d6",
    parse: (args) => {
      const match = /^(\d{1,2})d(\d{1,3})$/u.exec(args.join(""));
      if (!match) throw new Error("用法：/roll 1d6，最多 6 枚、2–100 面");
      return rollSchema.parse({
        kind: "roll",
        count: Number(match[1]),
        sides: Number(match[2]),
      });
    },
  },
  {
    command: "/me",
    kind: "emote",
    permission: "room",
    label: "行为描述",
    example: "/me 正在思考",
    parse: (args) =>
      narrativeSchema.parse({ kind: "emote", text: args.join(" ") }),
  },
  {
    command: "/clearbanner",
    kind: "clear",
    permission: "host",
    label: "房主清屏",
    example: "/clearbanner",
    parse: (args) => {
      if (args.length) throw new Error("清屏指令不接受参数");
      return { kind: "clear" };
    },
  },
  {
    command: "/help",
    kind: "help",
    permission: "local",
    label: "指令帮助",
    example: "/help",
    parse: () => ({ kind: "help" }),
  },
];
export function parseChatCommand(input: string): ParsedCommand | null {
  const text = input.trim();
  if (!text.startsWith("/")) return null;
  const [command, ...args] = text.split(/\s+/u);
  const entry = bannerCommands.find((entry) => entry.command === command);
  if (!entry) throw new Error("未知指令，输入 /help 查看帮助");
  try {
    return entry.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new Error(
        `${entry.example}；文字最多 40 字，倒数 1–10 秒，连击最多 3 个表情`,
      );
    throw error;
  }
}
export function rollDice(count: number, sides: number): number[] {
  rollSchema.parse({ kind: "roll", count, sides });
  const limit = Math.floor(0x100000000 / sides) * sides;
  return Array.from({ length: count }, () => {
    const sample = new Uint32Array(1);
    do {
      crypto.getRandomValues(sample);
    } while (sample[0] >= limit);
    return (sample[0] % sides) + 1;
  });
}
