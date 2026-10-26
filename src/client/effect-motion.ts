import type { InteractionStyle } from "../domain/social";
export function effectMotion(
  style: InteractionStyle,
  dx: number,
  dy: number,
  particleLimit = Infinity,
  exaggeration = 1,
  enhanced = false,
  clock?: { impactAt: number; duration: number },
) {
  const at = (x: number, y: number, scale = 1, angle = 0) =>
    `translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) rotate(${angle}deg) scale(${scale * exaggeration})`;
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
  const count = Math.min(
    particleLimit,
    style === "orbit" ? 12 : style === "confetti" ? 18 : 14,
  );
  const fragments = Array.from({ length: count }, (_, index): Keyframe[] => {
    const angle = (index * Math.PI * 2) / count,
      x = Math.cos(angle) * 125 * exaggeration,
      y = Math.sin(angle) * 95 * exaggeration;
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
  const distance = Math.hypot(dx, dy);
  const impactAt =
    clock?.impactAt ?? (enhanced ? 380 + Math.min(440, distance * 0.45) : 950);
  const duration = clock?.duration ?? (enhanced ? impactAt + 620 : 1900);
  if (enhanced) {
    const direction = dx < 0 ? -1 : 1;
    const arc = Math.min(210, Math.max(45, distance * 0.22));
    const launchAt = 120 / duration;
    const hitAt = impactAt / duration;
    const rotation = spin ? 540 * direction : 30 * direction;
    body.splice(
      0,
      body.length,
      { offset: 0, opacity: 0, transform: at(0, 0, 0.45) },
      {
        offset: launchAt * 0.7,
        opacity: 1,
        transform: at(-direction * 22, 10, 0.85, -direction * 25),
      },
      { offset: launchAt, opacity: 1, transform: at(0, 0, 1.12, 0) },
    );
    for (let i = 1; i <= 18; i++) {
      const t = i / 18;
      const progress = t ** 1.3;
      body.push({
        offset: launchAt + (hitAt - launchAt) * t,
        opacity: 1,
        transform: at(
          dx * progress,
          dy * progress - 4 * arc * progress * (1 - progress),
          1.12 + 0.25 * Math.sin(progress * Math.PI),
          rotation * progress,
        ),
      });
    }
    body.push(
      {
        offset: hitAt + 0.04,
        opacity: 1,
        transform:
          at(
            dx,
            dy + 7,
            style === "shock" ? 2.5 : 1.65,
            rotation + 20 * direction,
          ) + " scale(1.2, .72)",
        easing: "cubic-bezier(.2,.8,.3,1)",
      },
      {
        offset: hitAt + 0.14,
        opacity: 1,
        transform: at(
          dx + direction * 18,
          dy - (style === "impact" || style === "bounce" ? 60 : 20),
          1.2,
          rotation + 90 * direction,
        ),
      },
      {
        offset: 1,
        opacity: 0,
        transform: at(
          dx + direction * 30,
          dy + (style === "impact" ? 50 : -65),
          style === "splat" || style === "cloud" ? 2.6 : 0.6,
          rotation + 160 * direction,
        ),
      },
    );
  }
  return {
    body,
    fragments,
    duration,
    impactAt,
    fragmentDuration: enhanced ? 520 : 750,
  };
}
