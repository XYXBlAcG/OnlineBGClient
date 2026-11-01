import "./world-art.css";
import { useState } from "react";
import { mapChoices } from "../../domain/expedition/map";
import { ballotOption, routeLabel } from "../../domain/expedition/ballot";
import { NodeSymbol } from "./NodeSymbol";
import type { ExpeditionRun } from "../../domain/expedition/adventure-types";
import { nodeNames } from "../../domain/expedition/map";
import { MapViewport } from "../MapViewport";
import { routeLayout } from "./map-layout";
export function ExpeditionMap({
  run,
  actor = -1,
  available,
  names,
  onVote,
}: {
  run: ExpeditionRun;
  actor?: number;
  available: string[];
  names: string[];
  onVote: (id: string) => void;
}) {
  const [selected, select] = useState<string | null>(null);
  const nodes = run.map.flat();
  const options = mapChoices(run).filter(
    (node) => run.phase !== "tie" || run.tieChoices.includes(node.id),
  );
  const chosen = options.find((node) => node.id === selected);
  const leader = Math.max(0, run.floor) % run.combat.heroes.length;

  const layout = routeLayout(run.map);
  const { points } = layout;
  return (
    <div
      className={`exp-route exp-biome-${run.chapter ?? 0}`}
      data-guide-target="expedition.map"
    >
      <aside className="exp-route-choice">
        <strong>
          {run.phase === "tie"
            ? `平票 · 由${names[leader] || `玩家 ${leader + 1}`}领队裁决`
            : "选择路线并确认投票"}
        </strong>
        <div className="exp-route-options">
          {options.map((node) => {
            const option = ballotOption(run, "map", node.id);
            return (
              <button
                key={node.id}
                aria-pressed={selected === node.id}
                onClick={() => select(node.id)}
              >
                <NodeSymbol kind={node.kind} />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </span>
              </button>
            );
          })}
        </div>
        {chosen && (
          <p>
            {routeLabel(run.map, chosen)}
            {run.votes[actor] === chosen.id ? " · 已投给此路线" : ""}
          </p>
        )}
        {chosen && available.includes(chosen.id) && (
          <button className="primary" onClick={() => onVote(chosen.id)}>
            {run.phase === "tie" ? "确认前往" : "确认投票"} ·{" "}
            {routeLabel(run.map, chosen)}
          </button>
        )}
      </aside>
      <MapViewport
        naturalSize={layout}
        initialZoom={0.85}
        fitWidthOnMount
        focusLabel="当前位置"
        focusTarget={`[data-route-node="${chosen?.id ?? run.current ?? run.map[0][0].id}"]`}
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
                  data-preview={selected === node.id}
                  disabled={!options.some((option) => option.id === node.id)}
                  onClick={() => select(node.id)}
                  aria-label={` ${routeLabel(run.map, node)}${voters.length ? `，${voters.join("、")}已投票` : ""}`}
                >
                  <NodeSymbol kind={node.kind} />
                  <span>{nodeNames[node.kind]}</span>
                  {voters.length > 0 && (
                    <small>
                      {voters.length} 票
                      {run.votes[actor] === node.id ? " · 我的选择" : ""}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </MapViewport>
      <small className="muted">
        地图图标与上方候选对应 · 全员投票后按多数决定，平票由领队裁决
      </small>
    </div>
  );
}
