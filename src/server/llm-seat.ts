export function parseCandidateChoice(
  text: string,
  count: number,
): number | null {
  const value = text.trim();
  if (!/^(0|[1-9]\d*)$/.test(value)) return null;
  const index = Number(value);
  return Number.isSafeInteger(index) && index >= 0 && index < count
    ? index
    : null;
}
