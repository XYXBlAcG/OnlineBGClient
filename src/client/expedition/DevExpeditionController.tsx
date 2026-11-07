import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExpeditionStrategy,
  type ExpeditionRouteStyle,
} from "../../domain/expedition/ai";
import {
  expeditionBreakpointReached,
  type ExpeditionBreakpoint,
} from "../../domain/expedition/lab";
import { nodeNames } from "../../domain/expedition/map";
import type { NodeKind } from "../../domain/expedition/adventure-types";
import type { Action } from "../../domain/types";
import type { GameSnapshot } from "../OriginalGame";
import { Select } from "../ui/Controls";

const routeStyles: Record<ExpeditionRouteStyle, string> = {
  balanced: "均衡",
  explorer: "裂隙回溯",
  aggressive: "精英猎杀",
  cautious: "稳健求生",
  gambler: "赌博爆发",
  recruiter: "招募伙伴",
  adaptive: "风险适应",
};
const nodeKinds = Object.keys(nodeNames) as NodeKind[];

export function DevExpeditionController({
  snapshot,
  act,
  pending,
  manualActionToken,
  manualActionVersion,
}: {
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  pending: boolean;
  manualActionToken: number;
  manualActionVersion: number;
}) {
  const [style, setStyle] = useState<ExpeditionRouteStyle>("explorer"),
    [timing, setTiming] =
      useState<ExpeditionBreakpoint["timing"]>("before"),
    [nodeKind, setNodeKind] = useState<NodeKind>("elite"),
    [running, setRunning] = useState(false),
    [status, setStatus] = useState("就绪"),
    [steps, setSteps] = useState(0),
    [awaitingOverride, setAwaitingOverride] = useState(false),
    afterSequence = useRef(-1),
    manualVersion = useRef<number | null>(null),
    previousManualToken = useRef(manualActionToken),
    strategy = useMemo(() => new ExpeditionStrategy(style), [style]),
    state =
      snapshot.state?.kind === "expedition" ? snapshot.state : undefined;
  const step = useCallback(() => {
    if (!state || snapshot.actor < 0 || pending) return false;
    const candidates = snapshot.candidates ?? [];
    if (!candidates.length) {
      setStatus("等待其他角色行动，房间 AI 会继续推进");
      return false;
    }
    const request = {
        observation: state,
        actor: snapshot.actor,
        difficulty: "hard" as const,
        seed: `dev-expedition:${snapshot.room}:${snapshot.version}`,
        audit: false,
      },
      decision = strategy
        .score(request, candidates)
        .sort((left, right) => right.score - left.score)[0];
    if (!decision) {
      setRunning(false);
      setStatus("AI 没有生成合法决策");
      return false;
    }
    setSteps((value) => value + 1);
    setStatus(decision.label);
    act(decision.action);
    return true;
  }, [act, pending, snapshot, state, strategy]);
  useEffect(() => {
    if (!running || pending || !state) return;
    const breakpoint = { timing, nodeKind };
    if (expeditionBreakpointReached(state, breakpoint, afterSequence.current)) {
      setRunning(false);
      setAwaitingOverride(true);
      previousManualToken.current = manualActionToken;
      setStatus(
        `${nodeNames[nodeKind]}节点${timing === "before" ? "开始前" : "结算后"}已暂停，请在牌桌手动选择`,
      );
      return;
    }
    const timer = setInterval(step, 280);
    return () => clearInterval(timer);
  }, [manualActionToken, nodeKind, pending, running, state, step, timing]);
  useEffect(() => {
    if (
      !awaitingOverride ||
      manualActionToken === previousManualToken.current
    )
      return;
    previousManualToken.current = manualActionToken;
    if (snapshot.version > manualActionVersion) {
      manualVersion.current = null;
      setAwaitingOverride(false);
      afterSequence.current = state?.view.lastNodeResult?.sequence ?? -1;
      setStatus("手动选择已生效，继续自动前进");
      setRunning(true);
    } else {
      manualVersion.current = manualActionVersion;
      setStatus("已收到手动选择，等待房间确认后继续");
    }
  }, [
    awaitingOverride,
    manualActionToken,
    manualActionVersion,
    snapshot.version,
    state,
  ]);
  useEffect(() => {
    if (
      !awaitingOverride ||
      manualVersion.current === null ||
      snapshot.version <= manualVersion.current
    )
      return;
    manualVersion.current = null;
    setAwaitingOverride(false);
    afterSequence.current = state?.view.lastNodeResult?.sequence ?? -1;
    setStatus("手动选择已生效，继续自动前进");
    setRunning(true);
  }, [awaitingOverride, snapshot.version, state]);
  if (!state) return null;
  const start = () => {
    afterSequence.current = state.view.lastNodeResult?.sequence ?? -1;
    setSteps(0);
    setAwaitingOverride(false);
    manualVersion.current = null;
    setStatus("自动代理运行中");
    setRunning(true);
  };
  return (
    <section className="exp-dev-controls" aria-label="远征开发调试">
      <div className="exp-dev-title">
        <strong>DEV</strong>
        <span>{status}</span>
        <small>{steps} 步</small>
      </div>
      <label>
        策略
        <Select
          value={style}
          onValueChange={(value) => setStyle(value as ExpeditionRouteStyle)}
        >
          {Object.entries(routeStyles).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </Select>
      </label>
      <label>
        断点
        <Select
          value={timing}
          onValueChange={(value) =>
            setTiming(value as ExpeditionBreakpoint["timing"])
          }
        >
          <option value="before">开始前</option>
          <option value="after">结算后</option>
        </Select>
      </label>
      <label>
        节点
        <Select
          value={nodeKind}
          onValueChange={(value) => setNodeKind(value as NodeKind)}
        >
          {nodeKinds.map((kind) => (
            <option value={kind} key={kind}>
              {nodeNames[kind]}
            </option>
          ))}
        </Select>
      </label>
      <div className="exp-dev-actions">
        <button onClick={step} disabled={running || pending}>
          单步
        </button>
        <button
          className={running ? "" : "primary"}
          onClick={() => (running ? setRunning(false) : start())}
          disabled={pending}
        >
          {running ? "暂停" : "自动运行"}
        </button>
      </div>
    </section>
  );
}
