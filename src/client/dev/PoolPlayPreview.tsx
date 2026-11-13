import { useEffect, useMemo, useState } from "react";
import { PoolRules } from "../../domain/pool/rules";
import { PoolStrategy } from "../../domain/pool/strategy";
import type { PoolMode, PoolState } from "../../domain/pool/types";
import type { Action } from "../../domain/types";
import { POOL_PLAYBACK_RATE } from "../pool/frames";
import { PoolGame } from "../pool/PoolGame";
import { POOL_OPPONENT_LEAD_IN } from "../pool/use-pool-playback";
import { Button } from "../ui/Controls";
import "../pool/pool.css";

const create = (rules: PoolRules, mode: PoolMode): PoolState =>
  rules.create(2, false, {
    pool: { mode, shotSeconds: 0, assist: true },
  });

export function PoolPlayPreview() {
  const rules = useMemo(() => new PoolRules(() => Math.random()), []);
  const strategy = useMemo(() => new PoolStrategy(), []);
  const [mode, setMode] = useState<PoolMode>("eight-ball");
  const [state, setState] = useState<PoolState>(() => create(rules, mode));
  const [notice, setNotice] = useState("");
  const [animating, setAnimating] = useState(false);
  useEffect(() => {
    const shot = state.view.lastShot;
    if (!shot?.frames.length) {
      setAnimating(false);
      return;
    }
    const leadIn = shot.actor === 1 ? POOL_OPPONENT_LEAD_IN : 0;
    const duration =
      leadIn + (shot.frames.at(-1)!.t / 1000 / POOL_PLAYBACK_RATE) * 1000 + 250;
    setAnimating(true);
    const timer = window.setTimeout(() => setAnimating(false), duration);
    return () => window.clearTimeout(timer);
  }, [state.view.shotNumber, state.view.lastShot]);
  const act = (action: Action) => {
    if (action.type !== "pool-shot") return;
    setState((current) =>
      current.view.turn === 0 && current.view.phase !== "finished"
        ? rules.apply(current, 0, action)
        : current,
    );
  };
  useEffect(() => {
    if (animating || state.view.turn !== 1 || state.view.phase === "finished")
      return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const decision = strategy.decide(
          state,
          1,
          "normal",
          `dev-pool-${state.view.shotNumber}`,
        );
        const chosen = decision.chosen;
        if (chosen.type !== "pool-shot") {
          setNotice("AI 没有可用击球");
          return;
        }
        setState((current) =>
          current.view.turn === 1 ? rules.apply(current, 1, chosen) : current,
        );
        setNotice("");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "AI 击球失败");
      }
    }, 550);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [state, rules, strategy, animating]);
  const reset = (next: PoolMode) => {
    setMode(next);
    setState(create(rules, next));
    setNotice("");
  };
  const result =
    state.view.winner === 0
      ? "你赢了"
      : state.view.winner === 1
        ? "AI 获胜"
        : "";
  return (
    <main className="app-shell pool-preview">
      <header>
        <div>
          <h1>台球 3D 试玩</h1>
          <p>玩家 1 对 AI，默认 3D；WebGL 不可用时回退 2D。</p>
        </div>
        <div className="pool-preview-actions">
          <Button
            variant={mode === "eight-ball" ? "primary" : "secondary"}
            onClick={() => reset("eight-ball")}
          >
            8-Ball
          </Button>
          <Button
            variant={mode === "nine-ball" ? "primary" : "secondary"}
            onClick={() => reset("nine-ball")}
          >
            9-Ball
          </Button>
          <Button onClick={() => reset(mode)}>重开</Button>
        </div>
      </header>
      {result || notice ? (
        <p className={notice ? "pool-preview-notice" : "pool-preview-result"}>
          {result || notice}
        </p>
      ) : null}
      <PoolGame
        view={state.view}
        actor={0}
        act={act}
        replay={false}
        pending={false}
        renderer="3d"
      />
    </main>
  );
}
