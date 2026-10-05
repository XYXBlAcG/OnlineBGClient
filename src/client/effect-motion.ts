import type { InteractionStyle } from "../domain/social";
export function effectMotion(style: InteractionStyle, dx: number, dy: number) {
  const at = (x: number, y: number, scale = 1, angle = 0) =>
    `translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) rotate(${angle}deg) scale(${scale})`;
  const spin = ["impact", "confetti", "orbit", "bounce"].includes(style);
  const body: Keyframe[] = [
    { opacity: 0, transform: at(0, 0, 0.4) },
    {
      opacity: 1,
      offset: 0.3,
      transform: at(
        dx / 2,
        dy / 2 - (style === "fire" ? 200 : 130),
        1.3,
        spin ? 160 : -12,
      ),
    },
    {
      opacity: 1,
      offset: 0.5,
      transform: at(dx, dy, style === "shock" ? 3 : 2, spin ? 340 : 0),
    },
    {
      opacity: 1,
      offset: 0.68,
      transform: at(
        dx + (style === "shock" ? 14 : style === "bounce" ? -30 : 0),
        dy - (style === "bounce" ? 70 : style === "float" ? 30 : 0),
        style === "shine" ? 2.8 : 1.8,
        spin ? 390 : -6,
      ),
    },
    {
      opacity: 0,
      transform: at(
        dx,
        dy - (style === "fire" || style === "float" ? 100 : 0),
        style === "cloud" ? 4 : 2.4,
        spin ? 480 : 10,
      ),
    },
  ];
  const count = style === "orbit" ? 12 : style === "confetti" ? 18 : 14;
  const fragments = Array.from({ length: count }, (_, index): Keyframe[] => {
    const angle = (index * Math.PI * 2) / count,
      x = Math.cos(angle) * 125,
      y = Math.sin(angle) * 95;
    if (style === "rain")
      return [
        { opacity: 0, transform: at(x, -130, 0.6) },
        { opacity: 1, offset: 0.2, transform: at(x, -85) },
        { opacity: 0, transform: at(x + 15, 160, 0.5) },
      ];
    if (style === "orbit")
      return [
        { opacity: 0, transform: at(x, y, 0.5) },
        { opacity: 1, offset: 0.4, transform: at(-y, x, 0.9, 180) },
        { opacity: 0, transform: at(-x, -y, 0.2, 360) },
      ];
    if (style === "fire" || style === "float")
      return [
        { opacity: 0, transform: at(x * 0.3, 30, 0.3) },
        { opacity: 1, offset: 0.2, transform: at(x * 0.5, -15) },
        { opacity: 0, transform: at(x * 0.8, -180, 0.5) },
      ];
    if (style === "cloud")
      return [
        { opacity: 0, transform: at(0, 0, 0) },
        { opacity: 0.9, offset: 0.2, transform: at(x * 0.4, y * 0.4, 1.2) },
        { opacity: 0, transform: at(x, y - 50, 2.5) },
      ];
    return [
      { opacity: 0, transform: at(0, 0, 0) },
      {
        opacity: 1,
        offset: 0.15,
        transform: at(x * 0.3, y * 0.3, style === "shine" ? 1.8 : 1),
      },
      {
        opacity: 0,
        transform: at(
          x,
          y + (style === "confetti" ? 90 : style === "bounce" ? -50 : 0),
          0.3,
          index * (style === "bloom" ? 10 : 90),
        ),
      },
    ];
  });
  return { body, fragments };
}
