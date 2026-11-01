export function effectGesture(
  kind: "damage" | "block" | "heal" | "status",
  dx: number,
): Keyframe[] {
  const direction = Math.sign(dx) || 1;
  return kind === "damage"
    ? [
        { transform: "none", offset: 0 },
        {
          transform: `translateX(${-direction * 6}px) rotate(${-direction * 4}deg)`,
          offset: 0.25,
        },
        {
          transform: `translateX(${direction * 16}px) rotate(${direction * 6}deg)`,
          offset: 0.48,
        },
        { transform: "none", offset: 1 },
      ]
    : [
        { transform: "none", offset: 0 },
        { transform: "translateY(-3px) scale(1.04)", offset: 0.4 },
        { transform: "none", offset: 1 },
      ];
}
