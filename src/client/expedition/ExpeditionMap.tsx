import "./world-art.css";
import { VoteStatus } from "./VoteStatus";
import { ChoiceButton, useConfirmedAction } from "../ui/ConfirmedChoice";
import { useGameCommands } from "../use-game-commands";
import { useState } from "react";
import {
  mapChoices,
  nodeNames,
} from "../../domain/expedition/map";
import { ballotOption, routeLabel } from "../../domain/expedition/ballot";
import { NodeSymbol } from "./NodeSymbol";
import type { ExpeditionRun } from "../../domain/expedition/adventure-types";
import { MapViewport } from "../MapViewport";
import { routeLayout } from "./map-layout";
import { ascensionProfile } from "../../domain/expedition/ascension";
export function ExpeditionMap({
  run,
  actor = -1,
  available,
  names,
  avatars,
  onVote,
  pending = false,
}: {
  run: ExpeditionRun;
  actor?: number;
  available: string[];
  names: string[];
  avatars?: string[];
  onVote: (id: string) => void;
  pending?: boolean;
}) {
  const [selected, select] = useState<string | null>(null);
  const nodes = run.map.flat();
  const options = mapChoices(run).filter(
    (node) => run.phase !== "tie" || run.tieChoices.includes(node.id),
  );
  const confirm = useConfirmedAction(run.sequence, pending, (id: string) => {
    if (!available.includes(id) || run.votes[actor] === id) return false;
    onVote(id);
  });
  const chosen = options.find((node) => node.id === selected);
  const leader = Math.max(0, run.floor) % run.combat.heroes.length;
  useGameCommands([
    ...Array.from({ length: 9 }, (_, index) => ({
      id: `expedition.route-${index + 1}`,
      title: `选择第 ${index + 1} 条路线`,
      scope: "expedition",
      binding: String(index + 1),
      enabled: () => !pending && !!options[index],
      run: () => {
        if (options[index]) select(options[index].id);
      },
    })),
    {
      id: "expedition.vote-route",
      title: "投票所选路线",
      scope: "expedition",
      binding: "Enter",
      enabled: () =>
        !!chosen &&
        available.includes(chosen.id) &&
        run.votes[actor] !== chosen.id &&
        !pending,
      run: () => {
        if (chosen) confirm(chosen.id);
      },
    },
  ]);
  const layout = routeLayout(run.map);
  const { points } = layout,
    routeCost = 1 + ascensionProfile(run.ascension).extraRouteCost;
  return (
    <div
      className={`exp-route exp-biome-${run.chapter ?? 0}`}
      data-guide-target="expedition.map"
    >
      <aside className="exp-route-choice">
        <VoteStatus run={run} names={names} actor={actor} avatars={avatars} />
        <strong>
          {run.phase === "tie"
            ? `平票 · 由${names[leader] || `玩家 ${leader + 1}`}领队裁决`
            : "选择路线"}
        </strong>
        <div className="exp-route-legend" aria-label="路线图例">
          <span data-kind="shortcut">捷径 · {routeCost} 罗盘</span>
          <span data-kind="backward">回溯 · {routeCost} 罗盘</span>
        </div>
        <div className="exp-route-options">
          {options.map((node) => {
            const option = ballotOption(run, "map", node.id);
            return (
              <ChoiceButton
                key={node.id}
                value={node.id}
                selected={selected === node.id}
                onChoose={select}
                onConfirm={available.includes(node.id) ? confirm : undefined}
                disabled={pending}
              >
                <NodeSymbol kind={node.kind} />
                <span>
                  <strong>{option.label}</strong>
                </span>
              </ChoiceButton>
            );
          })}
        </div>
        {chosen && available.includes(chosen.id) && (
          <button
            className="primary"
            disabled={pending || run.votes[actor] === chosen.id}
            onClick={() => confirm(chosen.id)}
          >
            {run.votes[actor] === chosen.id
              ? "已投票"
              : run.phase === "tie"
                ? "确认前往"
                : "投票"}
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
            <defs>
              <marker
                id="exp-route-shortcut-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="4.5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--exp-blue)" />
              </marker>
              <marker
                id="exp-route-backward-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="4.5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--exp-red)" />
              </marker>
            </defs>
            <g className="exp-route-links" fill="none">
              {layout.links.map((link) => (
                <path
                  key={`${link.from}:${link.to}`}
                  data-visited={
                    run.path.includes(link.from) && run.path.includes(link.to)
                  }
                  data-reachable={link.from === run.current}
                  data-shortcut={link.shortcut}
                  data-backward={link.backward}
                  data-route-kind={
                    link.backward
                      ? "backward"
                      : link.shortcut
                        ? "shortcut"
                        : "normal"
                  }
                  data-focus={
                    chosen
                      ? (link.from === run.current && link.to === chosen.id) ||
                        link.from === chosen.id
                        ? "active"
                        : "muted"
                      : undefined
                  }
                  markerEnd={
                    link.backward
                      ? "url(#exp-route-backward-arrow)"
                      : link.shortcut
                        ? "url(#exp-route-shortcut-arrow)"
                        : undefined
                  }
                  d={link.path}
                />
              ))}
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
                <ChoiceButton
                  value={node.id}
                  selected={selected === node.id}
                  onChoose={select}
                  onConfirm={available.includes(node.id) ? confirm : undefined}
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
                  data-route={node.route}
                  data-preview={selected === node.id}
                  disabled={
                    pending || !options.some((option) => option.id === node.id)
                  }
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
                </ChoiceButton>
              );
            })}
          </div>
        </div>
      </MapViewport>
      <small className="muted">单击选择，双击投票</small>
    </div>
  );
}
