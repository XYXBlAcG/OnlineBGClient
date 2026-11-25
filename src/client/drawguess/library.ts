import { drawWordSchema, type DrawWord, type DrawWordLibrary } from "../../domain/drawguess/words";

const storageKey = "onlinebg.drawguess.library.v1";

export function loadDrawWordLibrary(): DrawWordLibrary {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { version: 1, words: [] };
    const parsed = JSON.parse(raw) as { words?: unknown };
    return {
      version: 1,
      words: Array.isArray(parsed.words)
        ? parsed.words.flatMap((word) => {
            const result = drawWordSchema.safeParse(word);
            return result.success ? [result.data] : [];
          })
        : [],
    };
  } catch {
    return { version: 1, words: [] };
  }
}

export function saveDrawWordLibrary(library: DrawWordLibrary) {
  localStorage.setItem(storageKey, JSON.stringify(library));
}

export function mergeDrawWords(words: DrawWord[]) {
  const seen = new Set<string>();
  return words.filter((word) => {
    const key = word.word.normalize("NFKC");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseDrawWords(text: string) {
  const json = (() => {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined;
    }
  })();
  if (json && typeof json === "object" && "words" in json) {
    const words: DrawWord[] = [];
    let invalid = 0;
    const list = (json as { words?: unknown }).words;
    if (!Array.isArray(list)) return { words, invalid };
    for (const item of list) {
      const result = drawWordSchema.safeParse(item);
      if (result.success) words.push(result.data);
      else invalid++;
    }
    return { words, invalid };
  }
  const words: DrawWord[] = [];
  let invalid = 0;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[,，|]/).map((value) => value.trim());
    const word = parts[0];
    const aliasText = parts.length >= 3 ? parts[1] : "";
    const category = parts.length >= 3 ? parts[2] : parts[1];
    const parsed = drawWordSchema.safeParse({
      word,
      aliases: aliasText ? aliasText.split(/[、/]/).filter(Boolean) : [],
      category: category || "物件",
    });
    if (parsed.success) words.push(parsed.data);
    else invalid++;
  }
  return { words, invalid };
}

export function serializeDrawWordLibrary(library: DrawWordLibrary) {
  return JSON.stringify(
    { format: "onlinebg.drawguess.library", version: 1, words: library.words },
    null,
    2,
  );
}
