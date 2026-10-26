import seedrandom from "seedrandom";
export function shuffled<T>(cards: readonly T[], seed: string): T[] {
  const random = seedrandom(seed),
    result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
