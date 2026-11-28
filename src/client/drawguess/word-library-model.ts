import type { WordPreferences } from "../../domain/drawguess/word-preferences";

export interface LibraryWord {
  word: string;
  aliases: string[];
  category: string;
  pos?: string;
}

export interface WordRow<Word extends LibraryWord> {
  id: string;
  key: string;
  word: Word;
  original?: Word;
  disabled: boolean;
  modified: boolean;
}

export function makeWordRows<Word extends LibraryWord>(
  custom: readonly Word[],
  system: readonly Word[],
  builtin: WordPreferences<Word> | undefined,
  keyOf: (text: string, word: Word) => string,
): WordRow<Word>[] {
  return [
    ...system.map((original) => {
      const key = keyOf(original.word, original);
      const item = builtin?.[key];
      return { id: `system:${key}`, key, original, word: item?.word ?? original, disabled: !!item?.disabled, modified: !!item?.word };
    }),
    ...custom.map((word) => {
      const key = keyOf(word.word, word);
      return { id: `custom:${key}`, key, word, disabled: false, modified: false };
    }),
  ];
}

export type WordSource = "all" | "system" | "custom";
export type WordStatus = "all" | "enabled" | "disabled" | "modified";

export function filterWordRows<Word extends LibraryWord>(
  rows: WordRow<Word>[], query: string, source: WordSource, status: WordStatus, pos: string, category: string,
) {
  const search = query.normalize("NFKC").trim().toLowerCase();
  return rows.filter((row) =>
    (source === "all" || (source === "system") === !!row.original) &&
    (status === "all" || (status === "modified" ? row.modified : row.disabled === (status === "disabled"))) &&
    (!pos || row.word.pos === pos) && (!category || row.word.category === category) &&
    (!search || [row.word.word, row.original?.word, row.word.category, row.original?.category,
      ...row.word.aliases, ...(row.original?.aliases ?? [])]
      .some((text) => text?.normalize("NFKC").toLowerCase().includes(search))),
  );
}

export function setSystemWords<Word extends LibraryWord>(
  existing: WordPreferences<Word> | undefined, rows: WordRow<Word>[], operation: "enable" | "disable" | "reset",
): WordPreferences<Word> {
  const next = { ...existing };
  for (const row of rows) {
    if (!row.original) continue;
    const override = next[row.key]?.word;
    if (operation === "reset" || (operation === "enable" && !override)) delete next[row.key];
    else next[row.key] = { ...(override ? { word: override } : {}), ...(operation === "disable" ? { disabled: true } : {}) };
  }
  return next;
}
