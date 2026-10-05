import { z } from "zod";
import type { GameKind } from "./catalogue";
import presets from "./phrase-presets.json";
export const phraseGroupsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(24),
      items: z.array(z.string().trim().min(1).max(500)).max(60),
    }),
  )
  .max(12);
export type PhraseGroup = z.infer<typeof phraseGroupsSchema>[number];
export const defaultPhraseGroups = phraseGroupsSchema.parse(presets);
const gamePhrases: Record<GameKind, string[]> = {
  ccbs: [
    "这张卡我先预留了。",
    "差一颗宝石！",
    "贵族快来了。",
    "最后一轮，冲分！",
  ],
  ktd: [
    "谁愿意换一点木材？",
    "港口今天开张！",
    "这条路我先修啦。",
    "强盗能不能换个地方？",
  ],
  uno: ["UNO！", "这个颜色很不错。", "换个颜色，换个心情。"],
  sgs: ["请出杀。", "有没有桃？", "队友，配合一下！", "我还有一张闪。"],
  fxq: ["来个六！", "准备起飞！", "跑道已经清空，等我起飞。"],
  tq: ["这一步跳得漂亮！", "快到营地啦！", "借你的棋子搭个桥。"],
  ddz: ["不要。", "这把我来当地主！", "队友加油！", "你的牌也太整齐了吧。"],
  dy: ["这锅快满啦！", "小心毒药！", "这锅汤有点危险。"],
};
export function phraseGroups(
  kind: GameKind,
  custom = defaultPhraseGroups,
): PhraseGroup[] {
  return [...custom, { name: "本局用语", items: gamePhrases[kind] }];
}
