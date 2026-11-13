import { ExpeditionHint } from "./ExpeditionHint";
import styles from "./ExpeditionMap.module.css";
import { Emoji } from "../Emoji";
import "./world-art.css";
import { VoteStatus } from "./VoteStatus";
import { ChoiceButton, useConfirmedAction } from "../ui/ConfirmedChoice";
import { useGameCommands } from "../use-game-commands";
import { useEffect, useState } from "react";
import { mapChoices, nodeNames } from "../../domain/expedition/map";
import { ballotOption, routeLabel } from "../../domain/expedition/ballot";
import { NodeSymbol } from "./NodeSymbol";
import type { ExpeditionRun } from "../../domain/expedition/adventure-types";
import { MapViewport } from "../MapViewport";
import { routeLayout } from "./map-layout";
import { ascensionProfile } from "../../domain/expedition/ascension";
import { ExpeditionDrawer } from "./ExpeditionDrawer";
import { useMediaQuery, useMobile } from "../use-mobile";

const WIDE_MAP_KEY = "expedition.wide-map";

function storedMapPreference(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

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
  const [wideChoice, setWideChoice] = useState(() =>
    storedMapPreference(WIDE_MAP_KEY),
  );
  const [routeOpen, setRouteOpen] = useState(() =>
    storedMapPreference("expedition.vote-panel"),
  );
  useEffect(() => select(null), [run.current, run.chapter]);
  const mobile = useMobile();
  const landscape = useMediaQuery("(orientation: landscape)");
  const wide = mobile ? landscape : wideChoice;
  const compact = true;
  const setPanel = (next: boolean) => {
    setRouteOpen(next);
    try {
      localStorage.setItem("expedition.vote-panel", next ? "1" : "0");
    } catch {}
  };
  const nodes = run.map.flat();
  const options = mapChoices(run).filter(
    (node) => run.phase !== "tie" || run.tieChoices.includes(node.id),
  );
  const confirm = useConfirmedAction(run.sequence, pending, (id: string) => {
    if (!available.includes(id) || run.votes[actor] === id) return false;
    onVote(id);
    if (mobile) setPanel(false);
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
  const layout = routeLayout(run.map, wide ? "landscape" : "portrait");
  const { points } = layout,
    routeCost = 1 + ascensionProfile(run.ascension).extraRouteCost;
  const toggleWide = () => {
    const next = !wideChoice;
    setWideChoice(next);
    try {
      localStorage.setItem(WIDE_MAP_KEY, next ? "1" : "0");
    } catch {}
  };
  const routePanel = (
    <>
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
    </>
  );
  return (
    <div
      className={`exp-route exp-biome-${run.chapter ?? 0}`}
      data-guide-target="expedition.map"
      data-compact={compact}
      data-wide={wide}
    >
      <div className="exp-route-toolbar">
        <button
          className="exp-drawer-trigger"
          aria-expanded={routeOpen}
          onClick={() => setPanel(!routeOpen)}
        >
          {routeOpen ? "关闭投票面板" : "投票面板"}
        </button>
        <span className="exp-route-toolbar-choice">
          {chosen
            ? ballotOption(run, "map", chosen.id).label
            : run.phase === "tie"
              ? `等待领队${names[leader] ? `（${names[leader]}）` : ""}在地图裁决`
              : `第 ${Math.max(1, run.floor + 1)} 站`}
        </span>
        {chosen && available.includes(chosen.id) && (
          <button
            className="primary"
            disabled={pending || run.votes[actor] === chosen.id}
            onClick={() => confirm(chosen.id)}
          >
            {pending
              ? "正在提交…"
              : run.votes[actor] === chosen.id
                ? "已投票"
                : run.phase === "tie"
                  ? "确认前往"
                  : "投票"}
          </button>
        )}
        {!mobile && (
          <button className="exp-drawer-trigger" onClick={toggleWide}>
            {wide ? "竖屏地图" : "横屏地图"}
          </button>
        )}
      </div>

      <div className={styles.body}>
        <MapViewport
          key={wide ? "landscape" : "portrait"}
          naturalSize={layout}
          initialZoom={wide ? 1 : 0.85}
          fitWidthOnMount={!wide}
          readingSize={
            wide
              ? {
                  width: Math.min(layout.width, 784),
                  height: Math.min(layout.height, 480),
                }
              : undefined
          }
          compact={compact}
          focusLabel="当前位置"
          focusTarget={`[data-route-node="${run.current ?? run.map[0][0].id}"]`}
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
                        ? (link.from === run.current &&
                            link.to === chosen.id) ||
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
                  x={layout.floorLabels[floor].x}
                  y={layout.floorLabels[floor].y}
                  textAnchor={wide ? "middle" : "start"}
                  className="exp-route-floor"
                >
                  {floor + 1}
                </text>
              ))}
            </svg>
            <div className="exp-route-nodes">
              {nodes.map((node) => {
                const point = points.get(node.id)!,
                  voterIds = Object.entries(run.votes)
                    .filter(([, id]) => id === node.id)
                    .map(([actor]) => Number(actor)),
                  voters = voterIds.map((index) => names[index]);
                return (
                  <ChoiceButton
                    value={node.id}
                    selected={selected === node.id}
                    onChoose={select}
                    onConfirm={
                      available.includes(node.id) ? confirm : undefined
                    }
                    key={node.id}
                    style={{
                      fontSize:
                        "calc(var(--font-size-control) * var(--map-zoom, 1))",
                      left: `${(point.x / layout.width) * 100}%`,
                      top: `${(point.y / layout.height) * 100}%`,
                      width: `${(layout.nodeWidth / layout.width) * 100}%`,
                      height: `${(layout.nodeHeight / layout.height) * 100}%`,
                    }}
                    className="exp-route-node"
                    data-control="custom"
                    data-route-node={node.id}
                    data-my-vote={run.votes[actor] === node.id}
                    data-current={node.id === run.current}
                    data-available={available.includes(node.id)}
                    data-visited={run.path.includes(node.id)}
                    data-route={node.route}
                    data-preview={selected === node.id}
                    disabled={
                      pending ||
                      !options.some((option) => option.id === node.id)
                    }
                    aria-label={` ${routeLabel(run.map, node)}${voters.length ? `，${voters.join("、")}已投票` : ""}`}
                  >
                    <NodeSymbol kind={node.kind} />
                    <span>{nodeNames[node.kind]}</span>
                    {voters.length > 0 && (
                      <span className={styles.voters} title={voters.join("、")}>
                        {voterIds.slice(0, 2).map((index) => (
                          <span
                            key={index}
                            aria-label={`${names[index]}已投票`}
                          >
                            <Emoji text={avatars?.[index] ?? "👤"} />
                          </span>
                        ))}
                        {voters.length > 2 && (
                          <small>+{voters.length - 2}</small>
                        )}
                        <small>
                          {voters.length} 票
                          {run.votes[actor] === node.id ? " · 我" : ""}
                        </small>
                      </span>
                    )}
                  </ChoiceButton>
                );
              })}
            </div>
          </div>
        </MapViewport>
        {routeOpen && !mobile && (
          <aside className={`exp-route-choice ${styles.panel}`}>
            {routePanel}
          </aside>
        )}
      </div>
      <ExpeditionHint
        text={
          pending ? "正在提交投票…" : "单击选择，双击投票；也可选中后按 Enter"
        }
      />
      <ExpeditionDrawer
        open={routeOpen && mobile}
        title={run.phase === "tie" ? "裁决路线" : "选择路线"}
        onClose={() => setPanel(false)}
      >
        <div className="exp-route-drawer">{routePanel}</div>
      </ExpeditionDrawer>
    </div>
  );
}
