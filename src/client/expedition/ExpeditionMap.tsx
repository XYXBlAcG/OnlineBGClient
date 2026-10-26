import type { ExpeditionRun } from "../../domain/expedition/adventure-types";
import { nodeNames, nodeIcons } from "../../domain/expedition/map";
import { MapViewport } from "../MapViewport";
import { routeLayout } from "./map-layout";
export function ExpeditionMap({
  run,
  available,
  names,
  onVote,
}: {
  run: ExpeditionRun;
  available: string[];
  names: string[];
  onVote: (id: string) => void;
}) {
  const nodes = run.map.flat();
  const layout = routeLayout(run.map);
  const { points } = layout;
  return (
    <div className="exp-route" data-guide-target="expedition.map">
      <MapViewport
        naturalSize={layout}
        initialZoom={0.85}
        fitWidthOnMount
        focusLabel="当前位置"
        focusTarget={`[data-route-node="${run.current ?? run.map[0][0].id}"]`}
      >
        <div className="exp-route-canvas">
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            aria-label="秘塔路线图"
            className="exp-route-svg"
          >
            <g className="exp-route-links" fill="none">
              {nodes.flatMap((node) =>
                node.next.map((id) => {
                  const from = points.get(node.id)!,
                    to = points.get(id)!,
                    visited =
                      run.path.includes(node.id) && run.path.includes(id);
                  return (
                    <path
                      key={`${node.id}:${id}`}
                      data-visited={visited}
                      data-reachable={node.id === run.current}
                      d={`M${from.x},${from.y} C${from.x},${from.y - 58} ${to.x},${to.y + 58} ${to.x},${to.y}`}
                    />
                  );
                }),
              )}
            </g>
            {run.map.map((_, floor) => (
              <text
                key={floor}
                x="12"
                y={layout.floors[floor]}
                className="exp-route-floor"
              >
                {floor + 1}
              </text>
            ))}
          </svg>
          <div className="exp-route-nodes">
            {nodes.map((node) => {
              const point = points.get(node.id)!,
                voters = Object.entries(run.votes)
                  .filter(([, id]) => id === node.id)
                  .map(([actor]) => names[Number(actor)]);
              return (
                <button
                  key={node.id}
                  style={{
                    left: `${(point.x / layout.width) * 100}%`,
                    top: `${(point.y / layout.height) * 100}%`,
                    width: `${(layout.nodeWidth / layout.width) * 100}%`,
                    height: `${(layout.nodeHeight / layout.height) * 100}%`,
                  }}
                  className="exp-route-node"
                  data-control="custom"
                  data-route-node={node.id}
                  data-current={node.id === run.current}
                  data-available={available.includes(node.id)}
                  data-visited={run.path.includes(node.id)}
                  disabled={!available.includes(node.id)}
                  onClick={() => onVote(node.id)}
                  aria-label={`第 ${node.floor + 1} 层，${nodeNames[node.kind]}${voters.length ? `，${voters.join("、")}已投票` : ""}`}
                >
                  <b>{nodeIcons[node.kind]}</b>
                  <span>{nodeNames[node.kind]}</span>
                  {voters.length > 0 && <small>{voters.join("、")}</small>}
                </button>
              );
            })}
          </div>
        </div>
      </MapViewport>
      <small className="muted">
        高亮节点可以前往 · 先投票，再由全队确认路线
      </small>
    </div>
  );
}
