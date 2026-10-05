import { z } from "zod";
export const interactionCatalogue = {
  egg: {
    emoji: "🥚",
    name: "鸡蛋",
    style: "splat",
    particles: "✦",
    color: "#ffcf31",
  },
  slipper: {
    emoji: "🩴",
    name: "拖鞋",
    style: "impact",
    particles: "💥",
    color: "#ff7b3a",
  },
  flower: {
    emoji: "🌹",
    name: "鲜花",
    style: "bloom",
    particles: "🌸",
    color: "#f372a3",
  },
  like: {
    emoji: "👍",
    name: "点赞",
    style: "shine",
    particles: "✨",
    color: "#ffc94a",
  },
  nerd: {
    emoji: "🤓",
    name: "学霸",
    style: "orbit",
    particles: "🧠",
    color: "#68afff",
  },
  laugh: {
    emoji: "🤣",
    name: "笑翻了",
    style: "bounce",
    particles: "😂",
    color: "#ffca45",
  },
  love: {
    emoji: "🥰",
    name: "爱心环绕",
    style: "bloom",
    particles: "💕",
    color: "#ff6fae",
  },
  cool: {
    emoji: "😎",
    name: "闪亮登场",
    style: "shine",
    particles: "⭐",
    color: "#7f9fff",
  },
  plead: {
    emoji: "🥺",
    name: "可怜巴巴",
    style: "float",
    particles: "💧",
    color: "#89c9ff",
  },
  shock: {
    emoji: "😱",
    name: "惊吓",
    style: "shock",
    particles: "⚡",
    color: "#ba8bff",
  },
  angry: {
    emoji: "😡",
    name: "怒火",
    style: "fire",
    particles: "🔥",
    color: "#ff573a",
  },
  cry: {
    emoji: "😭",
    name: "泪如雨下",
    style: "rain",
    particles: "💦",
    color: "#75bbff",
  },
  yawn: {
    emoji: "🥱",
    name: "困了",
    style: "float",
    particles: "💤",
    color: "#ab9dde",
  },
  poop: {
    emoji: "💩",
    name: "臭臭攻击",
    style: "cloud",
    particles: "💨",
    color: "#ad875c",
  },
  clown: {
    emoji: "🤡",
    name: "小丑派对",
    style: "confetti",
    particles: "🎉",
    color: "#fc7197",
  },
  celebrate: {
    emoji: "🥳",
    name: "开派对",
    style: "confetti",
    particles: "🎊",
    color: "#ffd15f",
  },
  lightning: {
    emoji: "⚡",
    name: "雷霆一击",
    style: "shock",
    particles: "⚡",
    color: "#bdadff",
  },
  snow: {
    emoji: "❄️",
    name: "冰雪",
    style: "rain",
    particles: "❄️",
    color: "#7adeff",
  },
  rocket: {
    emoji: "🚀",
    name: "火箭起飞",
    style: "fire",
    particles: "✨",
    color: "#ff9a55",
  },
  kiss: {
    emoji: "😘",
    name: "飞吻",
    style: "bloom",
    particles: "💋",
    color: "#ff7bac",
  },
} as const;
export type InteractionKind = keyof typeof interactionCatalogue;
export type InteractionStyle =
  (typeof interactionCatalogue)[InteractionKind]["style"];
export const interactionSchema = z.enum(
  Object.keys(interactionCatalogue) as [InteractionKind, ...InteractionKind[]],
);
export interface InteractionEvent {
  id: string;
  from: number;
  target: number;
  kind: InteractionKind;
  time: number;
}
export type ChatContent = { type: "text"; text: string };
export type ChatMessage = ChatContent & {
  id: string;
  sequence: number;
  sender: string;
  name: string;
  time: number;
};
