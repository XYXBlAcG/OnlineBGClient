import { useMemo } from "react";
import { Movement } from "../../domain/graphwar/movement";
import { balance } from "../../domain/graphwar/balance";
import {
  battlefield,
  type GraphwarView,
  type Point,
} from "../../domain/graphwar/types";
export function MovementOverlay({
  view,
  point,
}: {
  view: GraphwarView;
  point?: Point;
}) {
  const movement = useMemo(
    () => new Movement(view, view.currentSoldier),
    [view],
  );
  const cells = useMemo(() => {
    const cells: Point[] = [];
    for (let x = -balance.moveDistance; x <= balance.moveDistance; x += 0.3)
      for (let y = -balance.moveDistance; y <= balance.moveDistance; y += 0.3) {
        const p = { x: movement.unit.x + x, y: movement.unit.y + y };
        if (movement.check(p).allowed) cells.push(p);
      }
    return cells;
  }, [movement]);
  const b = battlefield(view),
    unit = movement.unit,
    verdict = point ? movement.check(point) : null;
  return (
    <svg
      className="gw-movement-overlay"
      viewBox={`${-b.width / 2} ${-b.height / 2} ${b.width} ${b.height}`}
      aria-hidden="true"
    >
      <circle
        cx={unit.x}
        cy={-unit.y}
        r={balance.moveDistance}
        fill="#2cad7710"
        stroke="#2cad77"
        strokeWidth=".1"
        strokeDasharray=".3 .2"
      />
      {cells.map((p) => (
        <rect
          key={`${p.x}:${p.y}`}
          x={p.x - 0.15}
          y={-p.y - 0.15}
          width=".3"
          height=".3"
          fill="#2cad7748"
        />
      ))}
      {point && (
        <g
          stroke={verdict?.allowed ? "#209568" : "#dc5244"}
          fill="none"
          strokeWidth=".16"
        >
          <path d={`M${unit.x} ${-unit.y}L${point.x} ${-point.y}`} />
          <circle cx={point.x} cy={-point.y} r={balance.soldierRadius} />
        </g>
      )}
    </svg>
  );
}
