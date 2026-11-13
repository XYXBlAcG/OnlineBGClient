import { useMemo, useState } from "react";
import type { Action } from "../../domain/types";
import { PoolRules } from "../../domain/pool/rules";
import type { PoolMode, PoolState } from "../../domain/pool/types";
import { Button } from "../ui/Controls";
import { PoolTable } from "../pool/PoolTable";
import { usePoolPlayback } from "../pool/use-pool-playback";

const create = (rules: PoolRules, mode: PoolMode): PoolState =>
  rules.create(2, false, {
    pool: { mode, shotSeconds: 60, assist: true },
  });

export function PoolPreview() {
  const rules = useMemo(() => new PoolRules(() => 0.42), []);
  const [mode, setMode] = useState<PoolMode>("eight-ball");
  const [state, setState] = useState<PoolState>(() => create(rules, mode));
  const playback = usePoolPlayback(state.view, -1);
  const act = (action: Action) => {
    if (action.type !== "pool-shot") return;
    setState(rules.apply(state, state.view.turn, action));
  };
  const reset = (next: PoolMode) => {
    setMode(next);
    setState(create(rules, next));
  };
  return (
    <main className="app-shell pool-preview">
      <header>
        <div>
          <h1>台球原型</h1>
          <p>
            当前为双人同屏验收：高亮玩家击球后自动切换。正式入口在体育分类。
          </p>
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
      <PoolTable
        view={state.view}
        actor={state.view.turn}
        act={act}
        playback={playback}
        replay={false}
        pending={false}
      />
    </main>
  );
}
