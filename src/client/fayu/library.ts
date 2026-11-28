import { z } from "zod";
import { enabledSystemWords, type WordPreferences } from "../../domain/drawguess/word-preferences";
import {
  fayuBuiltinPool,
  fayuPoolComplete,
  fayuWordSchema,
  type FayuPool,
  type FayuWord,
} from "../../domain/fayu/words";

const storageKey = "onlinebg.fayu.library.v1";

const builtinPreferenceSchema = z.object({ disabled: z.boolean().optional(), word: fayuWordSchema.optional() });

export const fayuWordKey = (word: FayuWord) => `${word.pos}:${word.word.normalize("NFKC")}`;

export interface FayuLibrary {
  version: 1;
  words: FayuWord[];
  builtin?: WordPreferences<FayuWord>;
}

export function loadFayuLibrary(): FayuLibrary {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { version: 1, words: [] };
    const parsed = JSON.parse(raw) as { words?: unknown; builtin?: unknown };
    return {
      version: 1,
      builtin: parseBuiltinPreferences(parsed.builtin),
      words: Array.isArray(parsed.words)
        ? parsed.words.flatMap((word) => {
            const result = fayuWordSchema.safeParse(word);
            return result.success ? [result.data] : [];
          })
        : [],
    };
  } catch {
    return { version: 1, words: [] };
  }
}

export function saveFayuLibrary(library: FayuLibrary) {
  localStorage.setItem(storageKey, JSON.stringify(library));
  window.dispatchEvent(new Event(storageKey));
}

export function fayuCombinedPool(library: FayuLibrary): FayuPool {
  return { words: mergeFayuWords([...library.words, ...enabledSystemWords(fayuBuiltinPool.words, library.builtin, fayuWordKey)]) };
}

export function fayuLibraryReady(library: FayuLibrary) {
  return fayuPoolComplete(fayuCombinedPool(library));
}

export function normalizeFayuWord(word: FayuWord) {
  return { ...word, word: word.word.trim().normalize("NFKC") };
}

export function mergeFayuWords(words: FayuWord[]) {
  const seen = new Set<string>();
  const result: FayuWord[] = [];
  for (const word of words) {
    const normalized = normalizeFayuWord(word);
    const key = fayuWordKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function parseBuiltinPreferences(value: unknown): FayuLibrary["builtin"] {
  if (!value || typeof value !== "object") return undefined;
  const entries = value as Record<string, unknown>;
  return Object.fromEntries(fayuBuiltinPool.words.flatMap((word) => {
    const key = fayuWordKey(word);
    const parsed = builtinPreferenceSchema.safeParse(entries[key]);
    return parsed.success && (parsed.data.disabled || parsed.data.word) ? [[key, parsed.data]] : [];
  }));
}

export function parseFayuWords(text: string): { words: FayuWord[]; invalid: number; builtin?: FayuLibrary["builtin"] } {
  const words: FayuWord[] = [];
  let invalid = 0;
  const payload = JSON.parse(text) as unknown;
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "words" in payload
      ? (payload as { words: unknown }).words
      : null;
  if (!Array.isArray(list)) throw new Error("词库需要包含 words 数组");
  for (const item of list) {
    if (typeof item === "string") {
      const result = fayuWordSchema.safeParse({ word: item, pos: "noun" });
      if (result.success) words.push(result.data);
      else invalid++;
      continue;
    }
    const result = fayuWordSchema.safeParse(item);
    if (result.success) words.push(result.data);
    else invalid++;
  }
  const builtin = payload && typeof payload === "object" && "builtin" in payload
    ? parseBuiltinPreferences(payload.builtin) : undefined;
  return { words, invalid, builtin };
}

export function serializeFayuLibrary(library: FayuLibrary) {
  return JSON.stringify(
    { format: "onlinebg.fayu.library", version: 1, words: library.words, builtin: library.builtin },
    null,
    2,
  );
}

export function parseTextWords(text: string, pos: FayuWord["pos"]) {
  return mergeFayuWords(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [word, rawPos] = line.split(/[,，]/).map((value) => value.trim());
        const parsed = rawPos ? fayuWordSchema.shape.pos.safeParse(rawPos) : null;
        return {
          word: word ?? "",
          pos: parsed?.success ? parsed.data : pos,
          aliases: [] as string[],
          category: "",
        };
      })
      .filter((word) => word.word),
  );
}


export function subscribeFayuLibrary(listener: () => void) {
  const external = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) listener();
  };
  window.addEventListener("storage", external);
  window.addEventListener(storageKey, listener);
  return () => {
    window.removeEventListener("storage", external);
    window.removeEventListener(storageKey, listener);
  };
}
