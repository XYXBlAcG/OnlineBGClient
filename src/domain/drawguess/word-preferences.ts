export type WordPreferences<Word> = Record<string, { disabled?: boolean; word?: Word }>;

export function enabledSystemWords<Word>(
  original: readonly Word[],
  preferences: WordPreferences<Word> | undefined,
  key: (word: Word) => string,
): Word[] {
  return original.flatMap((word) => {
    const preference = preferences?.[key(word)];
    return preference?.disabled ? [] : [preference?.word ?? word];
  });
}
