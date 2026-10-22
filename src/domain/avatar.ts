import { z } from "zod";
const segments = new Intl.Segmenter("zh", { granularity: "grapheme" });
export const avatarSchema = z
  .string()
  .trim()
  .max(128)
  .refine((value) => {
    if ([...segments.segment(value)].length !== 1) return false;
    if (/^\p{Script=Han}$/u.test(value)) return true;
    return (
      /\p{Extended_Pictographic}|^\p{Regional_Indicator}{2}$|^[0-9#*]\uFE0F?\u20E3$/u.test(
        value,
      ) &&
      /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\uFE0F\u200D\u20E30-9#*\u{E0020}-\u{E007F}])+$/u.test(
        value,
      )
    );
  }, "请输入一个 emoji 或单个汉字");
export const avatarPresets = [
  "😊",
  "😎",
  "🤓",
  "🥰",
  "🤣",
  "🥺",
  "😱",
  "🤡",
  "🐱",
  "🐼",
  "🐉",
  "🦊",
  "曹",
  "刘",
  "孙",
  "龙",
];
export function seatAvatar(seat: {
  avatar?: string;
  difficulty: unknown;
}): string {
  return seat.avatar || (seat.difficulty ? "🤖" : "😊");
}
