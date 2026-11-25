import { UpstreamRuntime } from "../upstream/runtime";

const cards = new UpstreamRuntime().load(6435);
export const unoColorName = (color: number): string =>
  cards.SV[color] ?? "未知";
export const unoFaceName = (type: number): string =>
  type === 14 ? "万能" : type === 15 ? "+4" : (cards.uj[type] ?? "未知");
export function unoCardLabel(card: number): string {
  if (!Number.isInteger(card) || card < 0 || card >= 108) return "未知";
  const type = cards.Vz(card);
  return type > 13
    ? unoFaceName(type)
    : `${unoColorName(Math.floor(card / 25))} ${unoFaceName(type)}`;
}
