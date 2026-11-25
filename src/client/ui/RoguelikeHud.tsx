import type { ReactNode } from "react";
import "./roguelike-hud.css";

export interface HudMetric {
  name: string;
  value: number | string;
  limit?: number;
  tone?: "health" | "gold" | "energy";
}

export function RoguelikeHud({
  metrics,
  className = "",
  children,
}: {
  metrics: readonly HudMetric[];
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`roguelike-hud ${className}`}
      role="group"
      aria-label="远征状态"
    >
      {metrics.map(({ name, value, limit, tone }) => (
        <span
          className="roguelike-metric"
          key={name}
          data-tone={tone}
          aria-label={`${name} ${value}${limit === undefined ? "" : ` / ${limit}`}`}
        >
          <span>{name}</span>
          <strong>{value}</strong>
          {limit !== undefined && <small>/{limit}</small>}
        </span>
      ))}
      {children}
    </div>
  );
}
