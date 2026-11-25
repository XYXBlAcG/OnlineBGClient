import { orderedCanvasLayer } from "../../domain/drawguess/canvas-order";
import type { ReactNode } from "react";
import { Fragment, memo, useId } from "react";
import { drawLayerLimit, type DrawPoint, type DrawStroke } from "../../domain/drawguess/types";
import type { FayuFill } from "../../domain/fayu/types";

const inkColors: Record<string, string> = {
  ink: "#2f2a24",
  blue: "#3778c2",
  red: "#c94b45",
  green: "#3f8a5b",
  gold: "#c58a2e",
  erase: "#fbf6ea",
};

const paper = "#fbf6ea";

export function strokeColor(stroke: DrawStroke) {
  return stroke.tool === "eraser" || stroke.ink === "erase"
    ? paper
    : (stroke.color ?? inkColors[stroke.ink] ?? inkColors.ink);
}

function isEraser(stroke: DrawStroke) {
  return stroke.tool === "eraser" || stroke.ink === "erase";
}

function baseWidth(stroke: DrawStroke) {
  return stroke.width ?? (isEraser(stroke) ? 18 : 6);
}

function smoothPath(points: DrawPoint[]) {
  if (!points.length) return "";
  let path = `M ${points[0]![0]} ${points[0]![1]}`;
  for (let index = 1; index < points.length - 1; index++) {
    const current = points[index]!;
    const next = points[index + 1]!;
    const middleX = (current[0] + next[0]) / 2;
    const middleY = (current[1] + next[1]) / 2;
    path += ` Q ${current[0]} ${current[1]} ${middleX} ${middleY}`;
  }
  const last = points.at(-1)!;
  path += ` L ${last[0]} ${last[1]}`;
  return path;
}

export const FayuStroke = memo(function FayuStroke({ stroke }: { stroke: DrawStroke }) {
  const color = strokeColor(stroke);
  const opacity = stroke.opacity ?? 1;
  const width = baseWidth(stroke);
  if (stroke.tool === "sticker" && stroke.points[0]) {
    return (
      <text
        x={stroke.points[0][0]}
        y={stroke.points[0][1]}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={(stroke.width ?? 12) * 4}
      >
        {stroke.text}
      </text>
    );
  }
  if (stroke.tool === "text" && stroke.points[0]) {
    return (
      <text
        x={stroke.points[0][0]}
        y={stroke.points[0][1]}
        fill={color}
        fillOpacity={opacity}
        fontSize={(stroke.width ?? 6) * 4}
        fontFamily="sans-serif"
      >
        {stroke.text}
      </text>
    );
  }
  const shape = { stroke: color, strokeWidth: width, strokeOpacity: opacity, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (stroke.tool === "line" && stroke.points.length >= 2) {
    const [a, b] = [stroke.points[0]!, stroke.points.at(-1)!];
    return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...shape} />;
  }
  if (stroke.tool === "rect" && stroke.points.length >= 2) {
    const [a, b] = [stroke.points[0]!, stroke.points.at(-1)!];
    return <rect x={Math.min(a[0], b[0])} y={Math.min(a[1], b[1])} width={Math.abs(b[0] - a[0])} height={Math.abs(b[1] - a[1])} rx={2} {...shape} />;
  }
  if (stroke.tool === "ellipse" && stroke.points.length >= 2) {
    const [a, b] = [stroke.points[0]!, stroke.points.at(-1)!];
    return (
      <ellipse
        cx={(a[0] + b[0]) / 2}
        cy={(a[1] + b[1]) / 2}
        rx={Math.abs(b[0] - a[0]) / 2}
        ry={Math.abs(b[1] - a[1]) / 2}
        {...shape}
      />
    );
  }
  if (stroke.points.length <= 1) {
    if (!stroke.points[0]) return null;
    return (
      <circle
        cx={stroke.points[0][0]}
        cy={stroke.points[0][1]}
        r={width / 2}
        fill={color}
        fillOpacity={opacity}
      />
    );
  }
  return (
    <path d={smoothPath(stroke.points)} {...shape} />
  );
});

export const FayuLayers = memo(function FayuLayers({
  strokes,
  fills,
}: {
  strokes: DrawStroke[];
  fills: FayuFill[];
}) {
  const instance = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <>
      {Array.from({ length: drawLayerLimit }, (_, layer) => {
        const entries = orderedCanvasLayer(strokes, fills, layer);
        const defs: ReactNode[] = [];
        let ink: ReactNode[] = [];
        for (let index = 0; index < entries.length; index++) {
          const entry = entries[index]!;
          if ("fill" in entry) {
            ink.push(<image key={entry.fill.id} href={entry.fill.data} width="1000" height="625" />);
          } else if (!isEraser(entry.stroke)) {
            ink.push(<FayuStroke key={entry.stroke.id} stroke={entry.stroke} />);
          } else if (ink.length) {
            const id = `fayu-mask-${instance}-${layer}-${index}`;
            const erasers: ReactNode[] = [];
            while (index < entries.length) {
              const current = entries[index]!;
              if (!("stroke" in current) || !isEraser(current.stroke)) break;
              const stroke = current.stroke;
              erasers.push(<FayuStroke key={stroke.id} stroke={{ ...stroke, ink: "ink", tool: "brush", color: "#000" }} />);
              index++;
            }
            index--;
            defs.push(
              <mask key={id} id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="625">
                <rect width="1000" height="625" fill="#fff" />
                {erasers}
              </mask>,
            );
            ink = [<g key={id} mask={`url(#${id})`}>{ink}</g>];
          }
        }
        return <Fragment key={layer}>{defs.length > 0 && <defs>{defs}</defs>}{ink}</Fragment>;
      })}
    </>
  );
});

export function FayuDrawing({
  strokes,
  fills = [],
  className,
  background = true,
}: {
  strokes: DrawStroke[];
  fills?: FayuFill[];
  className?: string;
  background?: boolean;
}) {
  return (
    <svg className={className} viewBox="0 0 1000 625" role="img" aria-label="画作">
      {background && <rect width="1000" height="625" fill={paper} />}
      <FayuLayers strokes={strokes} fills={fills} />
    </svg>
  );
}
