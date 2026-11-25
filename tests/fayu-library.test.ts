import { describe, expect, it } from "vitest";
import {
  fayuCombinedPool,
  fayuLibraryReady,
  mergeFayuWords,
  parseFayuWords,
  serializeFayuLibrary,
} from "../src/client/fayu/library";
import { fayuBuiltinWords } from "../src/domain/fayu/words";

describe("fayu local library", () => {
  it("merges duplicates and keeps POS separate", () => {
    const words = mergeFayuWords([
      { word: "火焰", pos: "noun", aliases: [], category: "" },
      { word: "火焰", pos: "noun", aliases: [], category: "" },
      { word: "火焰", pos: "adj", aliases: [], category: "" },
    ]);
    expect(words).toHaveLength(2);
  });

  it("imports JSON words and reports invalid entries", () => {
    const parsed = parseFayuWords(
      JSON.stringify({
        words: [
          { word: "火焰", pos: "noun" },
          { word: "跳", pos: "verb", transitive: false },
          { word: "", pos: "noun" },
        ],
      }),
    );
    expect(parsed.words).toHaveLength(2);
    expect(parsed.invalid).toBe(1);
  });

  it("round-trips exported libraries and combines builtins", () => {
    const library = {
      version: 1 as const,
      words: [
        { word: "火焰", pos: "noun" as const, aliases: [], category: "测试" },
        { word: "漂浮", pos: "verb" as const, aliases: [], transitive: false, category: "测试" },
      ],
    };
    const text = serializeFayuLibrary(library);
    expect(parseFayuWords(text).words).toHaveLength(2);
    const words = fayuCombinedPool(library).words;
    const expectedKeys = new Set([...fayuBuiltinWords, ...library.words].map((item) => `${item.pos}:${item.word.normalize("NFKC")}`));
    expect(words.length).toBe(expectedKeys.size);
    for (const entry of library.words)
      expect(words.find((item) => item.pos === entry.pos && item.word === entry.word)).toEqual(entry);
    expect(fayuLibraryReady(library)).toBe(true);
  });
});

it("edits and disables individual builtin entries without duplicating the original", () => {
  const source = fayuBuiltinWords.find(({ word }) => word === "猫") ?? fayuBuiltinWords[0]!;
  const disabled = fayuBuiltinWords.find((word) => word !== source)!;
  const words = fayuCombinedPool({
    version: 1, words: [],
    builtin: {
      [`${source.pos}:${source.word}`]: { word: { ...source, word: "新词条" } },
      [`${disabled.pos}:${disabled.word}`]: { disabled: true },
    },
  }).words;
  expect(words.find(({ word }) => word === "新词条")).toMatchObject({ pos: source.pos });
  expect(words).not.toContainEqual(source);
  expect(words).not.toContainEqual(disabled);
});
