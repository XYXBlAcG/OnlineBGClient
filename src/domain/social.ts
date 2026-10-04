import { z } from "zod";

export const interactionKinds = {
  egg: "🥚",
  slipper: "🩴",
  flower: "🌹",
  like: "👍",
} as const;
export const interactionSchema = z.enum(["egg", "slipper", "flower", "like"]);
export type InteractionKind = z.infer<typeof interactionSchema>;
export interface InteractionEvent {
  id: string;
  from: number;
  target: number;
  kind: InteractionKind;
  time: number;
}
export const assetIdSchema = z
  .string()
  .regex(/^(?:builtin-[a-z]+|[a-f0-9]{64})$/);
export const stickerLimit = 5 * 1024 * 1024;
export const stickerDimension = 2048;
export interface StickerAsset {
  id: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  preview: string;
}
export const builtinStickers = [
  { id: "builtin-happy", name: "开心", emoji: "😄" },
  { id: "builtin-think", name: "思考", emoji: "🤔" },
  { id: "builtin-wow", name: "惊讶", emoji: "😮" },
  { id: "builtin-cry", name: "哭哭", emoji: "😭" },
  { id: "builtin-win", name: "胜利", emoji: "🏆" },
  { id: "builtin-love", name: "喜欢", emoji: "❤️" },
] as const;
export type ChatContent = { text: string } & (
  { type: "text"; asset?: never } | { type: "sticker"; asset: string }
);
export type ChatMessage = ChatContent & {
  id: string;
  sequence: number;
  sender: string;
  name: string;
  time: number;
};
