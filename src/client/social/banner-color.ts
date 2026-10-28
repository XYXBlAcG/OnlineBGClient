export function bannerContrast(color: string): string {
  const [r, g, b] = [0, 2, 4].map((offset) =>
    Number.parseInt(color.slice(offset + 1, offset + 3), 16),
  );
  return r * 0.299 + g * 0.587 + b * 0.114 > 140 ? "#252532" : "#ffffff";
}
