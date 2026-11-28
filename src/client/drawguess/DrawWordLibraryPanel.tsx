import { useState } from "react";
import { drawWordBank, drawguessBuiltinWords, drawWordSchema, normalizeDrawWord, type DrawWordLibrary } from "../../domain/drawguess/words";
import { loadDrawWordLibrary, mergeDrawWords, parseDrawWords, saveDrawWordLibrary, serializeDrawWordLibrary } from "./library";
import { makeWordRows, setSystemWords } from "./word-library-model";
import { WordLibraryWorkspace } from "./WordLibraryWorkspace";

export function DrawWordLibraryPanel() {
  const [library, setLibrary] = useState(loadDrawWordLibrary);
  const change = (next: DrawWordLibrary) => {
    saveDrawWordLibrary(next);
    setLibrary(next);
  };
  const rows = makeWordRows(library.words, drawguessBuiltinWords, library.builtin, normalizeDrawWord);
  return <WordLibraryWorkspace rows={rows} operations={{
    add: () => ({ word: "", category: "物件", aliases: [] }),
    canReset: Object.keys(library.builtin ?? {}).length > 0,
    save: (row, input) => {
      const parsed = drawWordSchema.safeParse(input);
      if (!parsed.success) throw new Error("词语和别名最多 20 字，别名最多 3 个");
      const word = parsed.data;
      const key = normalizeDrawWord(word.word);
      if (!key || rows.some((entry) => entry.id !== row?.id && normalizeDrawWord(entry.word.word) === key))
        throw new Error("这个词语已存在或没有可搜索的内容");
      if (row?.original) {
        change({ ...library, builtin: { ...library.builtin, [row.key]: { ...library.builtin?.[row.key], word } } });
        return row.id;
      }
      const words = row ? library.words.map((entry) => normalizeDrawWord(entry.word) === row.key ? word : entry) : [...library.words, word];
      if (words.length > 1000) throw new Error("自定义词最多 1000 条");
      change({ ...library, words });
      return `custom:${key}`;
    },
    remove: (row) => change({ ...library, words: library.words.filter((word) => normalizeDrawWord(word.word) !== row.key) }),
    system: (items, operation) => change({ ...library, builtin: setSystemWords(library.builtin, items, operation) }),
    import: async (file) => {
      const parsed = parseDrawWords(await file.text());
      const words = mergeDrawWords([...library.words, ...parsed.words]);
      if (words.length > 1000) throw new Error("导入后超过 1000 条自定义词");
      change({ ...library, words, ...(parsed.builtin ? { builtin: { ...library.builtin, ...parsed.builtin } } : {}) });
      return `新增 ${words.length - library.words.length} 条，格式无效 ${parsed.invalid} 条`;
    },
    export: (format) => ({
      filename: `drawguess-library.${format}`,
      contents: format === "json" ? serializeDrawWordLibrary(library) : library.words.map((word) => `${word.word},${word.aliases.join("、")},${word.category}`).join("\n"),
    }),
    sample: () => {
      const pool = drawWordBank(library.words, library.builtin);
      const word = pool[Math.floor(Math.random() * pool.length)];
      if (!word) throw new Error("请先启用或新增词条");
      return word.word;
    },
  }} />;
}
