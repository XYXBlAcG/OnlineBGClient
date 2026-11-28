import { z } from "zod";
import { enabledSystemWords, type WordPreferences } from "./word-preferences";
import { fayuBuiltinWords } from "../fayu/words";

export const drawWordSchema = z.object({
  word: z.string().trim().min(1).max(20),
  aliases: z.array(z.string().trim().min(1).max(20)).max(3).default([]),
  category: z.string().trim().max(12).default("物件"),
});
export type DrawWord = z.infer<typeof drawWordSchema>;
export const drawWordPoolSchema = z.array(drawWordSchema).max(1500);

export const drawWordPreferenceSchema = z.object({ disabled: z.boolean().optional(), word: drawWordSchema.optional() });

export const drawWordLibrarySchema = z.object({
  version: z.literal(1).default(1),
  words: z.array(drawWordSchema).max(1000),
  builtin: z.record(z.string(), drawWordPreferenceSchema).optional(),
});
export type DrawWordLibrary = z.infer<typeof drawWordLibrarySchema>;

export const drawguessBuiltinWords: DrawWord[] = [
  ...fayuBuiltinWords
    .filter((word) => word.pos === "noun" || word.pos === "proper" || word.pos === "place")
    .map((word) => ({
      word: word.word,
      aliases: word.aliases,
      category: word.category || "物件",
    })),
  { word: "仙人掌", aliases: [], category: "植物" },
  { word: "冰淇淋", aliases: ["冰激凌"], category: "食物" },
  { word: "滑板", aliases: [], category: "物件" },
  { word: "雪人", aliases: [], category: "冬天" },
  { word: "降落伞", aliases: [], category: "物件" },
  { word: "摩天轮", aliases: [], category: "地点" },
  { word: "热气球", aliases: [], category: "交通" },
  { word: "电风扇", aliases: ["风扇"], category: "物件" },
  { word: "潜水艇", aliases: ["潜艇"], category: "交通" },
  { word: "自行车", aliases: ["单车"], category: "交通" },
  { word: "纸飞机", aliases: [], category: "物件" },
  { word: "放大镜", aliases: [], category: "物件" },
  { word: "指南针", aliases: [], category: "物件" },
  { word: "蜘蛛网", aliases: [], category: "物件" },
  { word: "小丑", aliases: [], category: "角色" },
  { word: "独角兽", aliases: [], category: "角色" },
  { word: "灯塔", aliases: [], category: "建筑" },
].filter(
  (word, index, list) =>
    list.findIndex(
      (candidate) =>
        candidate.word.normalize("NFKC") === word.word.normalize("NFKC"),
    ) === index,
);

export function normalizeDrawWord(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[\s\p{P}]/gu, "")
    .toLowerCase();
}

export function uniqueDrawWords(words: DrawWord[]) {
  const seen = new Set<string>();
  return words.filter((word) => {
    const key = normalizeDrawWord(word.word);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function drawWordBank(custom: readonly DrawWord[] = [], builtin?: WordPreferences<DrawWord>) {
  return uniqueDrawWords([...custom, ...enabledSystemWords(drawguessBuiltinWords, builtin, (word) => normalizeDrawWord(word.word))]);
}
