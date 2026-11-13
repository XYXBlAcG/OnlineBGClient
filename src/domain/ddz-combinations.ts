export function ddzCombinations(
  hand: number[],
  rank: (card: number) => number,
): number[][] {
  const groups = new Map<number, number[]>();
  for (const card of [...hand].sort((a, b) => a - b)) {
    const key = rank(card);
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  const result = new Map<string, number[]>();
  const add = (cards: number[]) => {
    const sorted = [...cards].sort((a, b) => a - b);
    result.set(sorted.join(","), sorted);
  };
  const attach = (base: number[], count: number, size: number) => {
    const remaining = [...groups.values()].filter(
      (g) => !base.includes(g[0]) && g.length >= size,
    );
    const visit = (start: number, chosen: number[], needed: number) => {
      if (!needed) {
        add([...base, ...chosen]);
        return;
      }
      for (let i = start; i <= remaining.length - needed; i++)
        visit(i + 1, [...chosen, ...remaining[i].slice(0, size)], needed - 1);
    };
    visit(0, [], count);
  };
  for (const group of groups.values()) {
    for (let n = 1; n <= group.length; n++) add(group.slice(0, n));
    if (group.length >= 3) {
      attach(group.slice(0, 3), 1, 1);
      attach(group.slice(0, 3), 1, 2);
    }
    if (group.length === 4) {
      attach(group, 2, 1);
      attach(group, 1, 2);
      attach(group, 2, 2);
    }
  }
  const jokers = hand.filter((c) => rank(c) >= 53);
  if (jokers.length === 2) add(jokers);
  for (const size of [1, 2, 3]) {
    const minimum = size === 1 ? 5 : size === 2 ? 3 : 2;
    for (let start = 3; start <= 14; start++) {
      const base: number[] = [];
      for (let end = start; end <= 14; end++) {
        const g = groups.get(end);
        if (!g || g.length < size) break;
        base.push(...g.slice(0, size));
        const length = end - start + 1;
        if (length < minimum) continue;
        add(base);
        if (size === 3) {
          attach(base, length, 1);
          attach(base, length, 2);
        }
      }
    }
  }
  return [...result.values()];
}
