import sources from "../../public/art/sources.json";
import type { InteractionStyle } from "../domain/social";
export const cardBackArt = "/art/card-back.png";
export function fighterArt(kind: string) {
  if (kind === "crystal") return { url: "/art/light_01.png", ratio: "1/1" };
  const source = sources.find(
    (source) => source.file === `${kind}.png` && "frames" in source,
  );
  return source
    ? { url: `/art/${source.file}`, ratio: `${source.width}/${source.height}` }
    : undefined;
}
export function effectTexture(style: InteractionStyle): string {
  const file =
    style === "fire"
      ? "fire_01"
      : style === "impact" || style === "shock"
        ? "muzzle_01"
        : style === "bloom" || style === "shine"
          ? "magic_01"
          : style === "orbit" || style === "confetti"
            ? "twirl_01"
            : style === "rain" || style === "float"
              ? "circle_01"
              : style === "cloud" || style === "splat"
                ? "smoke_01"
                : "spark_01";
  return `/art/${file}.png`;
}
